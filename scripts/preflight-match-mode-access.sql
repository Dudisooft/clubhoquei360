-- Read-only. Run before review/install and again after both migrations.
-- READY_SCHEMA does not certify Auth, classification evidence or deployment approval.
begin read only;
with prerequisites(name,ok) as (
 select x,to_regclass(x) is not null from unnest(array['public.teams','public.club_memberships','public.pilot_matches','public.pilot_members','public.pilot_events','public.pilot_operator_state','public.stats_matches','public.stats_events','public.stats_assignments','public.stats_sessions','public.federation_matches','public.federation_groups','public.federation_competitions','public.federation_team_entries','public.federation_match_teams','public.federation_match_sources','public.basic_match_contexts','auth.users']) x
 union all select x,to_regprocedure(x) is not null from unnest(array['auth.uid()','app_private.is_platform_superadmin()','app_private.stats_can_read(uuid)','app_private.stats_can_record(uuid,text,text,uuid)','app_private.stats_can_manage(uuid)','app_private.stats_club_manager(uuid)','app_private.pilot_can_prepare(uuid)','app_private.stats_grant(jsonb)','app_private.stats_write_event(jsonb,integer)','app_private.stats_save_session(uuid,jsonb,integer)']) x
 union all select 'pilot_events_direct_club_fixture',exists(select 1 from pg_policies where schemaname='public' and tablename='pilot_events' and policyname='pilot_events_direct_club_fixture')
), markers as (
 select exists(select 1 from information_schema.columns where table_schema='public' and table_name='teams' and column_name='age_group') age_column,
 exists(select 1 from information_schema.columns where table_schema='public' and table_name='teams' and column_name='age_group_source') age_source,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in('stats_club_manager_before_modes','stats_can_manage_before_modes','stats_can_read_before_modes','stats_can_record_before_modes','pilot_can_prepare_before_modes','stats_write_event_before_temporary','stats_grant_before_temporary','match_mode_access_before_temporary')) aliases,
 to_regprocedure('public.match_mode_access(uuid,uuid)') is not null modes,
 to_regprocedure('public.match_activate_catalogue(uuid,text,boolean)') is not null activation,
 to_regclass('public.match_temporary_operators') is not null temporary_table,
 to_regclass('public.match_temporary_operator_audit') is not null temporary_audit,
 (select count(*) from unnest(array['public.match_temporary_grant(jsonb)','public.match_temporary_revoke(uuid)','public.match_temporary_list(uuid)']) f where to_regprocedure(f) is not null) temporary_rpcs,
 to_regprocedure('app_private.mode_official_operator(uuid)') is not null official_helper,
 exists(select 1 from pg_policies where schemaname='public' and tablename='pilot_events' and policyname='pilot_event_semantic_operator') semantic_gate
), integrity as (
 select count(*) filter(where t.id is null or t.club_id<>sm.club_id or t.season_id<>sm.season_id) mismatched_team_contexts
 from public.stats_matches sm cross join lateral unnest(array[sm.home_team_id,sm.away_team_id]) tid left join public.teams t on t.id=tid where tid is not null
)
select jsonb_build_object('stage',case
 when exists(select 1 from prerequisites where not ok) then 'STOP_MISSING_DEPENDENCY'
 when mismatched_team_contexts>0 then 'STOP_CONTEXT_INTEGRITY'
 when not age_column and not age_source and aliases=0 and not modes and not activation and not temporary_table and not temporary_audit and temporary_rpcs=0 and not official_helper and not semantic_gate then 'READY_SCHEMA'
 when age_column and age_source and aliases=8 and modes and activation and temporary_table and temporary_audit and temporary_rpcs=3 and official_helper and semantic_gate then 'INSTALLED_CHECK_RLS_AND_AUTH'
 else 'STOP_PARTIAL_OR_DIFFERENT_VERSION' end,
 'missing',(select coalesce(jsonb_agg(name),'[]') from prerequisites where not ok),
 'markers',to_jsonb(markers),'mismatched_team_contexts',mismatched_team_contexts,
 'temporary_rls',(select jsonb_agg(jsonb_build_object('table',c.relname,'rls',c.relrowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in('match_temporary_operators','match_temporary_operator_audit')),
 'public_rpc_security',(select jsonb_agg(jsonb_build_object('name',p.proname,'definer',p.prosecdef,'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'search_path',p.proconfig)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('match_mode_access','match_activate_catalogue','match_temporary_grant','match_temporary_revoke','match_temporary_list'))
) preflight from markers cross join integrity;
rollback;
