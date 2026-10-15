create index if not exists access_visits_session_created_at_idx on public.access_visits (session_id, created_at desc);
create index if not exists access_visits_day_browser_idx on public.access_visits (((created_at at time zone 'America/Sao_Paulo')::date), browser_id);
