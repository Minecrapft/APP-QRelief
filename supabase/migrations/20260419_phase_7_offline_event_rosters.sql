create or replace function public.preload_beneficiary_roster_for_event(
  target_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_event public.events;
  allocation_items jsonb;
begin
  if not exists (
    select 1
    from public.staff_assignments
    where event_id = target_event_id and staff_id = auth.uid()
  ) and not public.is_admin(auth.uid()) then
    raise exception 'You are not assigned to this event';
  end if;

  select *
  into matched_event
  from public.events
  where id = target_event_id;

  if matched_event.id is null then
    raise exception 'Event not found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ei.id,
        'event_id', ei.event_id,
        'inventory_item_id', ei.inventory_item_id,
        'allocated_quantity', ei.allocated_quantity,
        'per_beneficiary_quantity', ei.per_beneficiary_quantity,
        'created_at', ei.created_at,
        'inventory_item', jsonb_build_object(
          'id', ii.id,
          'name', ii.name,
          'category', ii.category,
          'unit', ii.unit,
          'current_stock', ii.current_stock,
          'low_stock_threshold', ii.low_stock_threshold,
          'created_at', ii.created_at,
          'updated_at', ii.updated_at
        )
      )
    ),
    '[]'::jsonb
  )
  into allocation_items
  from public.event_items ei
  join public.inventory_items ii on ii.id = ei.inventory_item_id
  where ei.event_id = target_event_id;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'beneficiary', row_to_json(b),
          'eligible_event', row_to_json(matched_event),
          'allocation_items', allocation_items,
          'already_claimed', d.id is not null,
          'existing_distribution', case when d.id is null then null else row_to_json(d) end
        )
      )
      from public.beneficiaries b
      left join public.distributions d
        on d.beneficiary_id = b.id
       and d.event_id = target_event_id
      where b.status = 'approved'
    ),
    '[]'::jsonb
  );
end;
$$;
