create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  invite_code text not null unique,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists staff_invitations_active_email_idx
  on public.staff_invitations (lower(email))
  where accepted_at is null and revoked_at is null;

alter table public.staff_invitations enable row level security;

drop policy if exists "admins manage staff invitations" on public.staff_invitations;
create policy "admins manage staff invitations"
  on public.staff_invitations
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create or replace function public.generate_staff_invite_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.create_staff_invitation(
  invite_email text,
  invite_full_name text,
  invite_expires_at timestamptz default null
)
returns public.staff_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  created_invitation public.staff_invitations;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can invite staff';
  end if;

  update public.staff_invitations
  set revoked_at = timezone('utc', now())
  where lower(email) = lower(trim(invite_email))
    and accepted_at is null
    and revoked_at is null;

  insert into public.staff_invitations (
    email,
    full_name,
    invite_code,
    invited_by,
    expires_at
  )
  values (
    lower(trim(invite_email)),
    trim(invite_full_name),
    public.generate_staff_invite_code(),
    auth.uid(),
    coalesce(invite_expires_at, timezone('utc', now()) + interval '7 days')
  )
  returning * into created_invitation;

  return created_invitation;
end;
$$;

create or replace function public.revoke_staff_invitation(invitation_id uuid)
returns public.staff_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  revoked_invitation public.staff_invitations;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can revoke staff invitations';
  end if;

  update public.staff_invitations
  set revoked_at = timezone('utc', now())
  where id = invitation_id
    and accepted_at is null
    and revoked_at is null
  returning * into revoked_invitation;

  if revoked_invitation.id is null then
    raise exception 'Invitation not found';
  end if;

  return revoked_invitation;
end;
$$;

create or replace function public.validate_staff_invitation(
  invite_email text,
  provided_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_invitation public.staff_invitations;
begin
  select *
  into matched_invitation
  from public.staff_invitations
  where lower(email) = lower(trim(invite_email))
    and invite_code = upper(trim(provided_code))
    and accepted_at is null
    and revoked_at is null
    and expires_at > timezone('utc', now())
  order by created_at desc
  limit 1;

  if matched_invitation.id is null then
    raise exception 'Invalid or expired staff invitation';
  end if;

  return jsonb_build_object(
    'email', matched_invitation.email,
    'full_name', matched_invitation.full_name,
    'invite_code', matched_invitation.invite_code,
    'expires_at', matched_invitation.expires_at
  );
end;
$$;

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role;
  provided_invite_code text;
  matched_invitation public.staff_invitations;
  resolved_role public.app_role := 'beneficiary';
  resolved_full_name text;
begin
  requested_role := coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'beneficiary');
  provided_invite_code := nullif(upper(trim(new.raw_user_meta_data ->> 'invite_code')), '');
  resolved_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), '');

  if requested_role = 'staff' and provided_invite_code is not null then
    select *
    into matched_invitation
    from public.staff_invitations
    where lower(email) = lower(new.email)
      and invite_code = provided_invite_code
      and accepted_at is null
      and revoked_at is null
      and expires_at > timezone('utc', now())
    order by created_at desc
    limit 1;

    if matched_invitation.id is not null then
      resolved_role := 'staff';
      resolved_full_name := matched_invitation.full_name;

      update public.staff_invitations
      set
        accepted_at = timezone('utc', now()),
        accepted_user_id = new.id
      where id = matched_invitation.id;
    end if;
  end if;

  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    resolved_role,
    coalesce(nullif(resolved_full_name, ''), 'QRelief User')
  );

  return new;
end;
$$;
