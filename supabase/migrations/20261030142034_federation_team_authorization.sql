-- Team authorization used by the scoped federation jobs.
begin;
create function app_private.callup_team_allowed(p_team uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.teams t where t.id=p_team and (
 app_private.is_platform_superadmin() or exists(select 1 from public.club_memberships m where m.user_id=auth.uid() and m.club_id=t.club_id
 and ((m.team_id=t.id and m.role in('admin','general_coordinator','section_coordinator','coach','delegate')) or (m.team_id is null and m.role in('admin','general_coordinator'))))))
$$;
revoke all on function app_private.callup_team_allowed(uuid) from public,anon;
grant execute on function app_private.callup_team_allowed(uuid) to authenticated;
commit;
