-- REVIEW / GENERATOR ONLY. This file executes no privilege change.
-- Re-capture/review the inventory before a future authorized installation.
-- Commands below are returned as TEXT, never EXECUTEd. No managed owner touched.
begin read only;
with expected(schema_name,table_name,beneficiary,owner_name,grantor_name) as(values
 ('public','club_match_schedule_history','anon','postgres','postgres'),
 ('public','club_match_schedule_history','authenticated','postgres','postgres'),
 ('public','club_match_schedules','anon','postgres','postgres'),
 ('public','club_match_schedules','authenticated','postgres','postgres'),
 ('public','club_memberships','authenticated','postgres','postgres'),
 ('public','clubs','authenticated','postgres','postgres'),
 ('public','discipline_reviews','anon','postgres','postgres'),
 ('public','discipline_reviews','authenticated','postgres','postgres'),
 ('public','discipline_rule_sets','anon','postgres','postgres'),
 ('public','discipline_rule_sets','authenticated','postgres','postgres'),
 ('public','federation_calendar_cache','anon','postgres','postgres'),
 ('public','federation_calendar_cache','authenticated','postgres','postgres'),
 ('public','federation_competitions','anon','postgres','postgres'),
 ('public','federation_competitions','authenticated','postgres','postgres'),
 ('public','federation_groups','anon','postgres','postgres'),
 ('public','federation_groups','authenticated','postgres','postgres'),
 ('public','federation_import_runs','anon','postgres','postgres'),
 ('public','federation_import_runs','authenticated','postgres','postgres'),
 ('public','federation_match_events','anon','postgres','postgres'),
 ('public','federation_match_events','authenticated','postgres','postgres'),
 ('public','federation_match_lineups','anon','postgres','postgres'),
 ('public','federation_match_lineups','authenticated','postgres','postgres'),
 ('public','federation_match_sources','anon','postgres','postgres'),
 ('public','federation_match_sources','authenticated','postgres','postgres'),
 ('public','federation_matches','anon','postgres','postgres'),
 ('public','federation_matches','authenticated','postgres','postgres'),
 ('public','federation_player_competition_stats','anon','postgres','postgres'),
 ('public','federation_player_competition_stats','authenticated','postgres','postgres'),
 ('public','federation_players','anon','postgres','postgres'),
 ('public','federation_players','authenticated','postgres','postgres'),
 ('public','federation_sync_runs','anon','postgres','postgres'),
 ('public','federation_sync_runs','authenticated','postgres','postgres'),
 ('public','federation_team_entries','anon','postgres','postgres'),
 ('public','federation_team_entries','authenticated','postgres','postgres'),
 ('public','federation_team_roster','anon','postgres','postgres'),
 ('public','federation_team_roster','authenticated','postgres','postgres'),
 ('public','pilot_events','anon','postgres','postgres'),
 ('public','pilot_events','authenticated','postgres','postgres'),
 ('public','pilot_matches','anon','postgres','postgres'),
 ('public','pilot_matches','authenticated','postgres','postgres'),
 ('public','pilot_members','anon','postgres','postgres'),
 ('public','pilot_members','authenticated','postgres','postgres'),
 ('public','pilot_operator_state','anon','postgres','postgres'),
 ('public','pilot_operator_state','authenticated','postgres','postgres'),
 ('public','pilot_players','anon','postgres','postgres'),
 ('public','pilot_players','authenticated','postgres','postgres'),
 ('public','profiles','authenticated','postgres','postgres'),
 ('public','seasons','authenticated','postgres','postgres'),
 ('public','teams','authenticated','postgres','postgres')), actual as (
 select n.nspname schema_name,c.relname table_name,g.rolname beneficiary,o.rolname owner_name,gr.rolname grantor_name
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 join pg_roles o on o.oid=c.relowner cross join lateral aclexplode(c.relacl) a
 join pg_roles g on g.oid=a.grantee join pg_roles gr on gr.oid=a.grantor
 where n.nspname='public' and c.relkind in('r','p') and a.privilege_type='TRUNCATE'
 and g.rolname in('anon','authenticated')
), differences as(
 (select * from actual except select * from expected)
 union all (select * from expected except select * from actual)
), gate as(
 select (select count(*) from expected)=49 and not exists(select 1 from differences)
 and current_user='postgres'
 and not exists(select 1 from expected where owner_name<>'postgres' or grantor_name<>'postgres')
 and not exists(select 1 from pg_class c cross join lateral aclexplode(c.relacl) a
 where c.relnamespace='public'::regnamespace and a.privilege_type='TRUNCATE' and a.grantee=0)
 ready
)
select case when ready then 'PROPOSAL_ONLY_MATCHES_49_REVIEWED_CLIENT_GRANTS' else 'STOP_DRIFT_OR_ALREADY_REMEDIATED' end status,
 (select count(*) from differences) differences,
 case when ready then (select string_agg(format('REVOKE TRUNCATE ON TABLE %I.%I FROM %I;',schema_name,table_name,beneficiary),E'\n' order by table_name,beneficiary) from expected) end proposed_current_acl_sql,
 case when ready then 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE TRUNCATE ON TABLES FROM anon, authenticated;' end proposed_application_owner_default_sql,
 case when ready then (select string_agg(format('GRANT TRUNCATE ON TABLE %I.%I TO %I;',schema_name,table_name,beneficiary),E'\n' order by table_name,beneficiary) from expected) end prior_acl_reconstruction_for_emergency_review_only
from gate;
rollback;
-- Never run the returned GRANT as an automatic rollback: it restores the
-- unnecessary SQL capability. Prefer forward correction preserving sports data.
-- supabase_admin default privileges are intentionally excluded.
