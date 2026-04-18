create table if not exists public.distributions (
  id uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references public.beneficiaries (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete restrict,
  notes text,
  items jsonb not null default '[]'::jsonb,
  sync_state text not null default 'synced',
  distributed_at timestamptz not null default timezone('utc', now()),
  unique (beneficiary_id, event_id)
);

alter table public.distributions
  drop constraint if exists distributions_sync_state_check;

alter table public.distributions
  add constraint distributions_sync_state_check
  check (sync_state in ('synced'));

alter table public.distributions enable row level security;

drop policy if exists "staff read own distributions" on public.distributions;
create policy "staff read own distributions"
  on public.distributions
  for select
  using (
    staff_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists "staff insert own distributions" on public.distributions;
create policy "staff insert own distributions"
  on public.distributions
  for insert
  with check (
    staff_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create or replace function public.lookup_beneficiary_for_event(
  target_event_id uuid,
  lookup_value text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_beneficiary public.beneficiaries;
  matched_event public.events;
  existing_distribution public.distributions;
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

  select *
  into matched_beneficiary
  from public.beneficiaries
  where
    qr_token::text = lookup_value
    or id::text = lookup_value
    or lower(full_name) like '%' || lower(lookup_value) || '%'
    or contact_number like '%' || lookup_value || '%'
  order by created_at desc
  limit 1;

  if matched_beneficiary.id is null then
    raise exception 'Beneficiary not found';
  end if;

  if matched_beneficiary.status <> 'approved' then
    raise exception 'Beneficiary is not approved for distribution';
  end if;

  select *
  into existing_distribution
  from public.distributions
  where beneficiary_id = matched_beneficiary.id
    and event_id = target_event_id;

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

  return jsonb_build_object(
    'beneficiary', row_to_json(matched_beneficiary),
    'eligible_event', row_to_json(matched_event),
    'allocation_items', allocation_items,
    'already_claimed', existing_distribution.id is not null,
    'existing_distribution', case when existing_distribution.id is null then null else row_to_json(existing_distribution) end
  );
end;
$$;

create or replace function public.distribute_beneficiary(
  target_event_id uuid,
  target_beneficiary_id uuid,
  distribution_items jsonb,
  distribution_notes text default null
)
returns public.distributions
language plpgsql
security definer
set search_path = public
as $$
declare
  new_distribution public.distributions;
  item_record jsonb;
  item_inventory_id uuid;
  item_quantity integer;
  remaining_stock integer;
begin
  if not exists (
    select 1
    from public.staff_assignments
    where event_id = target_event_id and staff_id = auth.uid()
  ) and not public.is_admin(auth.uid()) then
    raise exception 'You are not assigned to this event';
  end if;

  if exists (
    select 1
    from public.distributions
    where beneficiary_id = target_beneficiary_id
      and event_id = target_event_id
  ) then
    raise exception 'Beneficiary has already claimed for this event';
  end if;

  insert into public.distributions (
    beneficiary_id,
    event_id,
    staff_id,
    notes,
    items
  )
  values (
    target_beneficiary_id,
    target_event_id,
    auth.uid(),
    nullif(trim(distribution_notes), ''),
    distribution_items
  )
  returning * into new_distribution;

  for item_record in select * from jsonb_array_elements(distribution_items)
  loop
    item_inventory_id := (item_record ->> 'inventory_item_id')::uuid;
    item_quantity := coalesce((item_record ->> 'quantity')::integer, 0);

    if item_quantity > 0 then
      update public.inventory_items
      set current_stock = current_stock - item_quantity
      where id = item_inventory_id
      returning current_stock into remaining_stock;

      if remaining_stock < 0 then
        raise exception 'Insufficient inventory to complete distribution';
      end if;

      update public.event_items
      set allocated_quantity = greatest(0, allocated_quantity - item_quantity)
      where event_id = target_event_id
        and inventory_item_id = item_inventory_id;

      insert into public.inventory_movements (
        inventory_item_id,
        movement_type,
        quantity_delta,
        reason,
        actor_id,
        event_id
      )
      values (
        item_inventory_id,
        'distribution',
        item_quantity * -1,
        'Beneficiary distribution',
        auth.uid(),
        target_event_id
      );
    end if;
  end loop;

  return new_distribution;
end;
$$;
