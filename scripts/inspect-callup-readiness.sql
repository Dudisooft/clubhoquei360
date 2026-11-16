-- Read-only readiness inventory. No user identities or player names are exported.
begin read only;
select jsonb_build_object(
 'teams',(select count(*) from public.teams),
 'internal_active',(select count(*) from app_private.callup_roster where active),
 'callups',(select count(*) from app_private.club_callups),
 'target_catalogue',(select jsonb_agg(to_jsonb(x)) from (
  select t.name,t.category,count(distinct e.id) entries,
   count(distinct r.id) federation_roster_rows,
   (select count(*) from app_private.callup_roster cr where cr.team_id=t.id and cr.active) internal_active
  from public.teams t
  left join public.federation_team_entries e on e.club_team_id=t.id
  left join public.federation_team_roster r on r.entry_id=e.id
  where t.category in ('FEM15','FEM 11') or (t.name='IGUALADA HC D' and t.category='INFANTIL')
  group by t.id) x),
 'edit_includes_platform',position('is_platform_superadmin' in
  pg_get_functiondef('app_private.callup_can_edit(uuid,uuid)'::regprocedure))>0,
 'weekly_rpc',to_regprocedure('public.read_club_callup_week(date,uuid)') is not null
) evidence;
rollback;
