create table if not exists public.access_monitor_admins (
  email text primary key check (email = lower(trim(email))),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.access_monitor_admins enable row level security;

create or replace function public.is_access_monitor_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.access_monitor_admins where email = lower(coalesce(auth.jwt() ->> 'email', '')) and active); $$;

create or replace view public.access_daily_summary as
select
  (created_at at time zone 'America/Sao_Paulo')::date as day,
  count(*)::bigint as total_accesses,
  count(distinct browser_id)::bigint as unique_browsers,
  count(distinct session_id)::bigint as total_sessions,
  round((count(*)::numeric / nullif(count(distinct browser_id), 0)), 2) as avg_accesses_per_browser
from public.access_visits
group by 1;

create or replace view public.access_daily_device_summary as
select
  (created_at at time zone 'America/Sao_Paulo')::date as day,
  browser_id,
  count(*)::bigint as access_count
from public.access_visits
group by 1, 2;

revoke all on public.access_daily_summary, public.access_daily_device_summary from public, anon, authenticated;
grant select on public.access_daily_summary, public.access_daily_device_summary to authenticated;
