-- Phase 4: Location & Proximity Signals for Turnout Prediction
-- Adds geocoded coordinates and location confidence to events and beneficiaries
-- Enables proximity-based heuristics for improved turnout predictions

-- Add location fields to events table
alter table if exists public.events
add column if not exists event_latitude numeric,
add column if not exists event_longitude numeric,
add column if not exists location_confidence numeric default 0.5;

-- Add location fields to beneficiaries table
alter table if exists public.beneficiaries
add column if not exists beneficiary_latitude numeric,
add column if not exists beneficiary_longitude numeric,
add column if not exists location_confidence numeric default 0.3;

-- Create helper function to calculate distance between two points (Haversine formula)
-- Returns distance in kilometers
create or replace function public.calculate_distance_km(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
returns numeric
language plpgsql
immutable
as $$
declare
  earth_radius_km numeric := 6371;
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
begin
  if lat1 is null or lon1 is null or lat2 is null or lon2 is null then
    return null;
  end if;

  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);

  a := sin(dlat / 2) * sin(dlat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon / 2) * sin(dlon / 2);

  c := 2 * asin(sqrt(a));

  return earth_radius_km * c;
end;
$$;

-- Create helper function to calculate average distance from event to beneficiaries
create or replace function public.calculate_avg_distance_to_beneficiaries(
  event_id uuid
)
returns numeric
language plpgsql
stable
as $$
declare
  event_lat numeric;
  event_lon numeric;
  avg_dist numeric;
begin
  select event_latitude, event_longitude
  into event_lat, event_lon
  from public.events
  where id = event_id;

  if event_lat is null or event_lon is null then
    return null;
  end if;

  select coalesce(avg(public.calculate_distance_km(
    event_lat,
    event_lon,
    b.beneficiary_latitude,
    b.beneficiary_longitude
  )), 0)
  into avg_dist
  from public.beneficiaries b
  where b.status = 'approved'
    and b.beneficiary_latitude is not null
    and b.beneficiary_longitude is not null;

  return avg_dist;
end;
$$;

-- Create helper function to calculate percentage of beneficiaries within a radius
create or replace function public.calculate_beneficiaries_within_radius(
  event_id uuid,
  radius_km numeric
)
returns numeric
language plpgsql
stable
as $$
declare
  event_lat numeric;
  event_lon numeric;
  total_beneficiaries integer;
  beneficiaries_in_radius integer;
  percentage numeric;
begin
  select event_latitude, event_longitude
  into event_lat, event_lon
  from public.events
  where id = event_id;

  if event_lat is null or event_lon is null then
    return null;
  end if;

  select count(*)
  into total_beneficiaries
  from public.beneficiaries
  where status = 'approved';

  if total_beneficiaries = 0 then
    return 0;
  end if;

  select count(*)
  into beneficiaries_in_radius
  from public.beneficiaries b
  where b.status = 'approved'
    and b.beneficiary_latitude is not null
    and b.beneficiary_longitude is not null
    and public.calculate_distance_km(
      event_lat,
      event_lon,
      b.beneficiary_latitude,
      b.beneficiary_longitude
    ) <= radius_km;

  percentage := (beneficiaries_in_radius::numeric / total_beneficiaries::numeric) * 100;
  return percentage;
end;
$$;

-- Extend the turnout prediction function to include location factors
create or replace function public.predict_event_turnout(
  target_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events;
  approved_beneficiary_pool integer := 0;
  historical_event_count integer := 0;
  historical_avg_turnout numeric := 0;
  weekday_avg_turnout numeric := 0;
  weekday_sample_count integer := 0;
  timeslot_avg_turnout numeric := 0;
  timeslot_sample_count integer := 0;
  base_rate numeric := 0.62;
  predicted_turnout integer := 0;
  recommended_buffer integer := 0;
  recommended_prep_target integer := 0;
  confidence_score numeric := 0.35;
  confidence_label text := 'low';
  allocation_capacity integer := null;
  allocation_item_count integer := 0;
  timeslot_label text := 'daytime';
  explanation_factors jsonb := '[]'::jsonb;
  location_adjustment integer := 0;
  avg_distance numeric := 0;
  accessibility_percentage numeric := 0;
  location_confidence numeric := 0;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can generate turnout predictions';
  end if;

  select *
  into target_event
  from public.events
  where id = target_event_id;

  if target_event.id is null then
    raise exception 'Event not found';
  end if;

  if extract(hour from timezone('Asia/Manila', target_event.starts_at)) < 11 then
    timeslot_label := 'morning';
  elsif extract(hour from timezone('Asia/Manila', target_event.starts_at)) < 17 then
    timeslot_label := 'afternoon';
  else
    timeslot_label := 'evening';
  end if;

  select count(*)
  into approved_beneficiary_pool
  from public.beneficiaries
  where status = 'approved';

  with historical_events as (
    select
      e.id,
      e.starts_at,
      count(distinct d.beneficiary_id) as turnout
    from public.events e
    left join public.distributions d on d.event_id = e.id
    where e.id <> target_event_id
      and e.starts_at < target_event.starts_at
      and e.status in ('active', 'cancelled', 'archived')
    group by e.id, e.starts_at
  )
  select
    count(*),
    coalesce(avg(turnout), 0)
  into
    historical_event_count,
    historical_avg_turnout
  from historical_events;

  with historical_events as (
    select
      e.id,
      e.starts_at,
      count(distinct d.beneficiary_id) as turnout
    from public.events e
    left join public.distributions d on d.event_id = e.id
    where e.id <> target_event_id
      and e.starts_at < target_event.starts_at
      and e.status in ('active', 'cancelled', 'archived')
      and extract(isodow from timezone('Asia/Manila', e.starts_at)) =
        extract(isodow from timezone('Asia/Manila', target_event.starts_at))
    group by e.id, e.starts_at
  )
  select
    count(*),
    coalesce(avg(turnout), 0)
  into
    weekday_sample_count,
    weekday_avg_turnout
  from historical_events;

  with historical_events as (
    select
      e.id,
      e.starts_at,
      count(distinct d.beneficiary_id) as turnout,
      case
        when extract(hour from timezone('Asia/Manila', e.starts_at)) < 11 then 'morning'
        when extract(hour from timezone('Asia/Manila', e.starts_at)) < 17 then 'afternoon'
        else 'evening'
      end as timeslot
    from public.events e
    left join public.distributions d on d.event_id = e.id
    where e.id <> target_event_id
      and e.starts_at < target_event.starts_at
      and e.status in ('active', 'cancelled', 'archived')
    group by e.id, e.starts_at
  )
  select
    count(*),
    coalesce(avg(turnout), 0)
  into
    timeslot_sample_count,
    timeslot_avg_turnout
  from historical_events
  where timeslot = timeslot_label;

  select
    count(*),
    min(case
      when per_beneficiary_quantity > 0 then floor(allocated_quantity::numeric / per_beneficiary_quantity::numeric)::integer
      else null
    end)
  into
    allocation_item_count,
    allocation_capacity
  from public.event_items
  where event_id = target_event_id;

  -- Calculate location-based signals
  location_confidence := coalesce(target_event.location_confidence, 0);
  avg_distance := public.calculate_avg_distance_to_beneficiaries(target_event_id);
  accessibility_percentage := coalesce(public.calculate_beneficiaries_within_radius(target_event_id, 5), 0);

  -- Adjust turnout based on accessibility
  if avg_distance is not null then
    if avg_distance > 15 then
      location_adjustment := -greatest(5, round(predicted_turnout * 0.15)::integer);
    elsif avg_distance > 8 then
      location_adjustment := -greatest(2, round(predicted_turnout * 0.08)::integer);
    elsif avg_distance < 3 then
      location_adjustment := greatest(2, round(predicted_turnout * 0.05)::integer);
    end if;
  end if;

  if approved_beneficiary_pool = 0 then
    predicted_turnout := 0;
  elsif historical_event_count = 0 then
    predicted_turnout := greatest(1, round(approved_beneficiary_pool * base_rate)::integer);
  else
    predicted_turnout := round(
      greatest(
        1,
        least(
          approved_beneficiary_pool,
          (historical_avg_turnout * 0.55) +
          (coalesce(nullif(weekday_avg_turnout, 0), historical_avg_turnout) * 0.25) +
          (coalesce(nullif(timeslot_avg_turnout, 0), historical_avg_turnout) * 0.20)
        )
      )
    )::integer;
  end if;

  predicted_turnout := greatest(0, least(approved_beneficiary_pool, predicted_turnout + location_adjustment))::integer;

  recommended_buffer := greatest(5, ceil(predicted_turnout * 0.15)::integer);
  recommended_prep_target := least(approved_beneficiary_pool, predicted_turnout + recommended_buffer);

  confidence_score := confidence_score
    + least(historical_event_count, 8) * 0.05
    + case when weekday_sample_count > 0 then 0.10 else 0 end
    + case when timeslot_sample_count > 0 then 0.10 else 0 end
    + case when allocation_item_count > 0 then 0.05 else 0 end
    + (location_confidence * 0.08);

  confidence_score := least(confidence_score, 0.92);

  confidence_label := case
    when confidence_score >= 0.75 then 'high'
    when confidence_score >= 0.50 then 'medium'
    else 'low'
  end;

  explanation_factors := explanation_factors || jsonb_build_object(
    'label', 'Approved beneficiary pool',
    'value', approved_beneficiary_pool,
    'detail', format('%s approved beneficiary records are currently eligible in QRelief.', approved_beneficiary_pool)
  );

  if historical_event_count = 0 then
    explanation_factors := explanation_factors || jsonb_build_object(
      'label', 'Limited history fallback',
      'value', round(base_rate * 100)::integer,
      'detail', 'No past events were available, so the forecast used a conservative baseline attendance rate.'
    );
  else
    explanation_factors := explanation_factors || jsonb_build_object(
      'label', 'Historical turnout average',
      'value', round(historical_avg_turnout)::integer,
      'detail', format('Based on %s completed historical event%s in QRelief.', historical_event_count, case when historical_event_count = 1 then '' else 's' end)
    );
  end if;

  if weekday_sample_count > 0 then
    explanation_factors := explanation_factors || jsonb_build_object(
      'label', 'Matching weekday pattern',
      'value', round(weekday_avg_turnout)::integer,
      'detail', format('Events on the same weekday averaged %s attendees.', round(weekday_avg_turnout)::integer)
    );
  end if;

  if timeslot_sample_count > 0 then
    explanation_factors := explanation_factors || jsonb_build_object(
      'label', 'Matching time window',
      'value', round(timeslot_avg_turnout)::integer,
      'detail', format('Past %s events averaged %s attendees.', timeslot_label, round(timeslot_avg_turnout)::integer)
    );
  end if;

  if allocation_item_count > 0 then
    explanation_factors := explanation_factors || jsonb_build_object(
      'label', 'Allocation readiness',
      'value', coalesce(allocation_capacity, 0),
      'detail', case
        when allocation_capacity is null then 'Inventory allocations exist, but some items do not yet have a per-beneficiary quantity.'
        else format('Current event allocations can currently cover about %s beneficiaries before buffer.', allocation_capacity)
      end
    );
  else
    explanation_factors := explanation_factors || jsonb_build_object(
      'label', 'Allocation readiness',
      'value', 0,
      'detail', 'No event allocations are configured yet, so the forecast is based on demand only.'
    );
  end if;

  -- Add location factors
  if target_event.event_latitude is not null and target_event.event_longitude is not null then
    explanation_factors := explanation_factors || jsonb_build_object(
      'label', 'Event location confidence',
      'value', round(location_confidence * 100)::integer,
      'detail', case
        when location_confidence >= 0.8 then 'Event location was precisely geocoded.'
        when location_confidence >= 0.5 then 'Event location was geocoded from address text.'
        else 'Event location data is approximate or low-confidence.'
      end
    );

    if avg_distance is not null then
      explanation_factors := explanation_factors || jsonb_build_object(
        'label', 'Geographic accessibility',
        'value', round(accessibility_percentage)::integer,
        'detail', format('%s%% of approved beneficiaries are within 5km of the event location (average distance: %s km).', round(accessibility_percentage)::integer, round(avg_distance, 1))
      );
    end if;

    if location_adjustment <> 0 then
      explanation_factors := explanation_factors || jsonb_build_object(
        'label', 'Location-based adjustment',
        'value', location_adjustment,
        'detail', case
          when location_adjustment < 0 then format('Turnout forecast was reduced by %s due to geographic distance or dispersion.', abs(location_adjustment))
          else format('Turnout forecast was increased by %s due to proximity of beneficiary cluster.', location_adjustment)
        end
      );
    end if;
  else
    explanation_factors := explanation_factors || jsonb_build_object(
      'label', 'Location data',
      'value', 'unavailable',
      'detail', 'Event location coordinates are not yet available. Location signals will be added once coordinates are geocoded.'
    );
  end if;

  return jsonb_build_object(
    'event_id', target_event_id,
    'predicted_turnout', predicted_turnout,
    'confidence_label', confidence_label,
    'confidence_score', round(confidence_score::numeric, 2),
    'recommended_buffer', recommended_buffer,
    'recommended_prep_target', recommended_prep_target,
    'approved_beneficiary_pool', approved_beneficiary_pool,
    'historical_event_count', historical_event_count,
    'historical_avg_turnout', round(historical_avg_turnout::numeric, 2),
    'weekday_sample_count', weekday_sample_count,
    'weekday_avg_turnout', round(weekday_avg_turnout::numeric, 2),
    'timeslot_label', timeslot_label,
    'timeslot_sample_count', timeslot_sample_count,
    'timeslot_avg_turnout', round(timeslot_avg_turnout::numeric, 2),
    'allocation_item_count', allocation_item_count,
    'allocation_capacity', allocation_capacity,
    'generated_at', timezone('utc', now()),
    'explanation_factors', explanation_factors
  );
end;
$$;
