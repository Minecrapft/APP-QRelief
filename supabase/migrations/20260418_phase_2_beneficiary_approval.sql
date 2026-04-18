alter table public.beneficiaries
  add column if not exists internal_notes text,
  add column if not exists priority_flag boolean not null default false;

create extension if not exists pgcrypto;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

create or replace function public.handle_beneficiary_approval()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' and new.qr_token is null then
    new.qr_token = gen_random_uuid();
    new.rejection_reason = null;
  end if;

  return new;
end;
$$;

drop trigger if exists beneficiaries_generate_qr_on_approval on public.beneficiaries;
create trigger beneficiaries_generate_qr_on_approval
  before update on public.beneficiaries
  for each row
  execute procedure public.handle_beneficiary_approval();

create or replace function public.review_beneficiary(
  beneficiary_id uuid,
  next_status public.beneficiary_status,
  next_rejection_reason text default null,
  next_internal_notes text default null,
  next_priority_flag boolean default false
)
returns public.beneficiaries
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.beneficiaries;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can review beneficiaries';
  end if;

  if next_status not in ('approved', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  update public.beneficiaries
  set
    status = next_status,
    rejection_reason = case when next_status = 'rejected' then nullif(trim(next_rejection_reason), '') else null end,
    internal_notes = nullif(trim(next_internal_notes), ''),
    priority_flag = coalesce(next_priority_flag, false)
  where id = beneficiary_id
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Beneficiary not found';
  end if;

  return updated_row;
end;
$$;

drop policy if exists "admins read all beneficiaries" on public.beneficiaries;
create policy "admins read all beneficiaries"
  on public.beneficiaries
  for select
  using (public.is_admin(auth.uid()));

drop policy if exists "admins update beneficiaries" on public.beneficiaries;
create policy "admins update beneficiaries"
  on public.beneficiaries
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
