revoke all on public.access_monitor_admins from public, anon, authenticated;
revoke all on function public.is_access_monitor_admin() from public, anon;
grant execute on function public.is_access_monitor_admin() to authenticated;

create policy access_monitor_admins_self_read on public.access_monitor_admins
  for select to authenticated using (public.is_access_monitor_admin());
