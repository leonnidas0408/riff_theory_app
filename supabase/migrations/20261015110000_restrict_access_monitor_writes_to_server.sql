revoke execute on function public.register_anonymous_access(text, text, text) from anon, authenticated;
grant execute on function public.register_anonymous_access(text, text, text) to service_role;

create policy access_visits_admin_read on public.access_visits
  for select to authenticated using (public.is_access_monitor_admin());
alter view public.access_daily_summary set (security_invoker = true);
alter view public.access_daily_device_summary set (security_invoker = true);
