create type public.app_role as enum ('beneficiary', 'staff', 'admin');
create type public.beneficiary_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'beneficiary',
  full_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.beneficiaries (
  id uuid primary key references public.profiles (id) on delete cascade,
  full_name text not null,
  contact_number text not null,
  address text not null,
  household_size integer not null check (household_size > 0),
  government_id text not null,
  status public.beneficiary_status not null default 'pending',
  qr_token uuid unique,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'beneficiary'),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists beneficiaries_set_updated_at on public.beneficiaries;
create trigger beneficiaries_set_updated_at
  before update on public.beneficiaries
  for each row execute procedure public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.beneficiaries enable row level security;

create policy "users read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "users update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "beneficiaries read own record"
  on public.beneficiaries
  for select
  using (auth.uid() = id);

create policy "beneficiaries insert own record"
  on public.beneficiaries
  for insert
  with check (auth.uid() = id);

create policy "beneficiaries update own record while pending"
  on public.beneficiaries
  for update
  using (auth.uid() = id and status = 'pending')
  with check (auth.uid() = id and status = 'pending');
