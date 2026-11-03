-- Read-only aggregate fingerprints. No personal records returned.
begin read only;
with rowsets as (select n.nspname||'.'||c.relname relation,c.relrowsecurity rls,
 query_to_xml(format('select count(*)::bigint n,md5(coalesce(string_agg(md5(to_jsonb(t)::text), %L order by md5(to_jsonb(t)::text)),%L)) fingerprint from %I.%I t','','',n.nspname,c.relname),false,true,'')::text aggregate
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and ((n.nspname='public' and c.relname in('teams','players','club_memberships','platform_admins','pilot_matches','pilot_members','pilot_players','pilot_events','pilot_operator_state','pilot_match_preparations','pilot_roster_audit','stats_matches','stats_events','stats_sessions','stats_assignments','stats_event_audit','stats_coverage','basic_match_contexts','federation_matches','federation_match_sources','federation_team_entries','federation_match_teams','federation_players','federation_team_roster','match_temporary_operators','match_temporary_operator_audit','temporary_club_access')) or (n.nspname='auth' and c.relname='users')) ), permissions as (select 'permissions' relation,md5(coalesce(string_agg(v,'|' order by v),'')) fingerprint from (
 select to_jsonb(p)::text v from pg_policies p where schemaname in('public','app_private')
 union all select jsonb_build_object('schema',n.nspname,'oid',p.oid,'name',p.proname,'args',p.proargtypes::text,'acl',p.proacl,'source',p.prosrc,'config',p.proconfig,'definer',p.prosecdef)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','app_private')
 union all select to_jsonb(g)::text from information_schema.role_table_grants g where table_schema in('public','app_private')
) d) select jsonb_agg(to_jsonb(r) order by relation) snapshots from (select relation,rls,aggregate from rowsets union all select relation,null,fingerprint from permissions) r;
rollback;
