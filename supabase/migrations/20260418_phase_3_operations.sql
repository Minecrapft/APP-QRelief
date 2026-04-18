create type public.event_status as enum ('draft', 'active', 'cancelled', 'archived');
create type public.inventory_movement_type as enum ('stock_in', 'stock_out', 'allocation', 'distribution', 'correction');

create table if not exists public.staff (
  id uuid primary key references public.profiles (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.event_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  unit text not null,
  current_stock integer not null default 0,
  low_stock_threshold integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  allocated_quantity integer not null check (allocated_quantity >= 0),
  per_beneficiary_quantity integer not null check (per_beneficiary_quantity >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_id, inventory_item_id)
);

create table if not exists public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_id, staff_id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  movement_type public.inventory_movement_type not null,
  quantity_delta integer not null,
  reason text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.ensure_staff_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'staff' then
    insert into public.staff (id)
    values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_ensure_staff_record on public.profiles;
create trigger profiles_ensure_staff_record
  after insert or update on public.profiles
  for each row execute procedure public.ensure_staff_record();

create or replace function public.adjust_inventory_stock(
  item_id uuid,
  delta integer,
  movement_reason text,
  movement_type public.inventory_movement_type,
  related_event_id uuid default null
)
returns public.inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_item public.inventory_items;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can adjust inventory';
  end if;

  update public.inventory_items
  set current_stock = greatest(0, current_stock + delta)
  where id = item_id
  returning * into updated_item;

  if updated_item.id is null then
    raise exception 'Inventory item not found';
  end if;

  insert into public.inventory_movements (
    inventory_item_id,
    movement_type,
    quantity_delta,
    reason,
    actor_id,
    event_id
  )
  values (
    item_id,
    movement_type,
    delta,
    movement_reason,
    auth.uid(),
    related_event_id
  );

  return updated_item;
end;
$$;

drop trigger if exists staff_set_updated_at on public.staff;
create trigger staff_set_updated_at
  before update on public.staff
  for each row execute procedure public.handle_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute procedure public.handle_updated_at();

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute procedure public.handle_updated_at();

alter table public.staff enable row level security;
alter table public.events enable row level security;
alter table public.inventory_items enable row level security;
alter table public.event_items enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists "admins manage staff" on public.staff;
create policy "admins manage staff"
  on public.staff
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "staff read own staff record" on public.staff;
create policy "staff read own staff record"
  on public.staff
  for select
  using (auth.uid() = id);

drop policy if exists "admins manage events" on public.events;
create policy "admins manage events"
  on public.events
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "staff read assigned events" on public.events;
create policy "staff read assigned events"
  on public.events
  for select
  using (
    exists (
      select 1
      from public.staff_assignments sa
      where sa.event_id = events.id and sa.staff_id = auth.uid()
    )
  );

drop policy if exists "beneficiaries read active events" on public.events;
create policy "beneficiaries read active events"
  on public.events
  for select
  using (status = 'active');

drop policy if exists "admins manage inventory items" on public.inventory_items;
create policy "admins manage inventory items"
  on public.inventory_items
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "staff read inventory items" on public.inventory_items;
create policy "staff read inventory items"
  on public.inventory_items
  for select
  using (exists (select 1 from public.staff where id = auth.uid() and is_active = true));

drop policy if exists "admins manage event items" on public.event_items;
create policy "admins manage event items"
  on public.event_items
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "staff read assigned event items" on public.event_items;
create policy "staff read assigned event items"
  on public.event_items
  for select
  using (
    exists (
      select 1 from public.staff_assignments sa
      where sa.event_id = event_items.event_id and sa.staff_id = auth.uid()
    )
  );

drop policy if exists "admins manage staff assignments" on public.staff_assignments;
create policy "admins manage staff assignments"
  on public.staff_assignments
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "staff read own assignments" on public.staff_assignments;
create policy "staff read own assignments"
  on public.staff_assignments
  for select
  using (staff_id = auth.uid());

drop policy if exists "admins read inventory movements" on public.inventory_movements;
create policy "admins read inventory movements"
  on public.inventory_movements
  for select
  using (public.is_admin(auth.uid()));

drop policy if exists "admins insert inventory movements" on public.inventory_movements;
create policy "admins insert inventory movements"
  on public.inventory_movements
  for insert
  with check (public.is_admin(auth.uid()));
