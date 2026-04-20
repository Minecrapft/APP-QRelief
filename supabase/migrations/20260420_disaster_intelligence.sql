-- Disaster Intelligence Reports Table
create table if not exists public.disaster_reports (
  id uuid primary key default gen_random_uuid(),
  hazard_data jsonb not null default '[]'::jsonb,
  priorities jsonb not null default '[]'::jsonb,
  critical_hub text,
  build_plan text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Enable RLS
alter table public.disaster_reports enable row level security;

-- Policies for disaster_reports
drop policy if exists "admins manage disaster reports" on public.disaster_reports;
create policy "admins manage disaster reports"
  on public.disaster_reports
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "staff read disaster reports" on public.disaster_reports;
create policy "staff read disaster reports"
  on public.disaster_reports
  for select
  using (exists (select 1 from public.staff where id = auth.uid() and is_active = true));

-- Handle updated_at (though not strictly needed if immutable)
-- create trigger disaster_reports_set_updated_at ...
