drop policy if exists "beneficiaries read event allocations" on public.event_items;
create policy "beneficiaries read event allocations"
  on public.event_items
  for select
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_items.event_id and e.status = 'active'
    )
  );

drop policy if exists "beneficiaries read inventory items for active events" on public.inventory_items;
create policy "beneficiaries read inventory items for active events"
  on public.inventory_items
  for select
  using (
    exists (
      select 1
      from public.event_items ei
      join public.events e on e.id = ei.event_id
      where ei.inventory_item_id = inventory_items.id
        and e.status = 'active'
    )
  );

drop policy if exists "beneficiaries read own distributions" on public.distributions;
create policy "beneficiaries read own distributions"
  on public.distributions
  for select
  using (beneficiary_id = auth.uid());

create or replace function public.update_beneficiary_profile(
  full_name text,
  contact_number text,
  address text,
  household_size integer,
  government_id text
)
returns public.beneficiaries
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.beneficiaries;
begin
  update public.profiles
  set full_name = update_beneficiary_profile.full_name
  where id = auth.uid();

  update public.beneficiaries
  set
    full_name = update_beneficiary_profile.full_name,
    contact_number = update_beneficiary_profile.contact_number,
    address = update_beneficiary_profile.address,
    household_size = greatest(1, update_beneficiary_profile.household_size),
    government_id = update_beneficiary_profile.government_id
  where id = auth.uid()
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Beneficiary profile not found';
  end if;

  return updated_row;
end;
$$;
