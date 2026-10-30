-- REVIEWED SQL, NO CONNECTION OR AUTOMATIC PRODUCTION RUNNER.
-- Single DO is atomic; caller should use an explicit transaction and the scope
-- acknowledgement described in RUNBOOK.md. No owner/admin authority is revoked.
do $remediation$
declare n int;bad int;effective_n int;before_other text;after_other text;
begin
if current_setting('clubhoquei360.truncate_review',true) is distinct from 'reviewed-49:bb586396e870d7b792763f9a2240c42e816b41976eeaea6d19d110d0f460a29b' then raise exception 'STOP: explicit reviewed-scope acknowledgement required';end if;
 if current_user<>'postgres' or (select rolsuper from pg_roles where rolname=current_user) then raise exception 'STOP: execute as non-superuser postgres owner only';end if;
 perform set_config('lock_timeout','5s',true);
 if exists(select 1 from pg_roles r where r.rolname in('anon','authenticated') and (r.rolcanlogin or has_schema_privilege(r.oid,'public','CREATE'))) then raise exception 'STOP: unexpected client role capability';end if;
 if exists(select 1 from pg_roles r cross join pg_roles elevated where r.rolname in('anon','authenticated') and elevated.rolname in('postgres','service_role','supabase_admin') and pg_has_role(r.oid,elevated.oid,'MEMBER')) then raise exception 'STOP: client inherited elevated role';end if;

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
 ('public','teams','authenticated','postgres','postgres')),
actual as(select n.nspname schema_name,c.relname table_name,g.rolname beneficiary,o.rolname owner_name,gr.rolname grantor_name
from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles o on o.oid=c.relowner
cross join lateral aclexplode(c.relacl) a join pg_roles g on g.oid=a.grantee join pg_roles gr on gr.oid=a.grantor
where n.nspname='public' and c.relkind in('r','p') and a.privilege_type='TRUNCATE' and g.rolname in('anon','authenticated')) select count(*) into n from actual;
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
 ('public','teams','authenticated','postgres','postgres')),
actual as(select n.nspname schema_name,c.relname table_name,g.rolname beneficiary,o.rolname owner_name,gr.rolname grantor_name
from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles o on o.oid=c.relowner
cross join lateral aclexplode(c.relacl) a join pg_roles g on g.oid=a.grantee join pg_roles gr on gr.oid=a.grantor
where n.nspname='public' and c.relkind in('r','p') and a.privilege_type='TRUNCATE' and g.rolname in('anon','authenticated')) select count(*) into bad from(select * from actual except select * from expected) d;
 if n not in(0,49) or bad<>0 then raise exception 'STOP: partial/unexpected inventory, count=%, unexpected=%',n,bad;end if;
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
 ('public','teams','authenticated','postgres','postgres')) select count(*) into bad from(select distinct schema_name,table_name,owner_name from expected) e left join pg_namespace ns on ns.nspname=e.schema_name left join pg_class c on c.relnamespace=ns.oid and c.relname=e.table_name left join pg_roles o on o.oid=c.relowner where c.oid is null or c.relkind not in('r','p') or o.rolname<>e.owner_name;
 if bad<>0 then raise exception 'STOP: object identity/owner changed';end if;
 select count(*) into effective_n from pg_class c cross join pg_roles r where c.relnamespace='public'::regnamespace and c.relkind in('r','p') and r.rolname in('anon','authenticated') and has_table_privilege(r.oid,c.oid,'TRUNCATE');
 if effective_n<>n then raise exception 'STOP: effective privileges differ (inheritance/PUBLIC/extra grants)';end if;
 if n=0 then raise notice 'Already corrected: zero changes';return;end if;
select md5(coalesce(string_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'grantee',a.grantee,'grantor',a.grantor,'privilege',a.privilege_type,'grantable',a.is_grantable)::text,'|' order by n.nspname,c.relname,a.grantee,a.grantor,a.privilege_type,a.is_grantable),'')) into before_other from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl) a left join pg_roles g on g.oid=a.grantee where n.nspname='public' and c.relkind in('r','p') and not(a.privilege_type='TRUNCATE' and coalesce(g.rolname,'PUBLIC') in('anon','authenticated'));
 revoke truncate on table "public"."club_match_schedule_history" from "anon";
 revoke truncate on table "public"."club_match_schedule_history" from "authenticated";
 revoke truncate on table "public"."club_match_schedules" from "anon";
 revoke truncate on table "public"."club_match_schedules" from "authenticated";
 revoke truncate on table "public"."club_memberships" from "authenticated";
 revoke truncate on table "public"."clubs" from "authenticated";
 revoke truncate on table "public"."discipline_reviews" from "anon";
 revoke truncate on table "public"."discipline_reviews" from "authenticated";
 revoke truncate on table "public"."discipline_rule_sets" from "anon";
 revoke truncate on table "public"."discipline_rule_sets" from "authenticated";
 revoke truncate on table "public"."federation_calendar_cache" from "anon";
 revoke truncate on table "public"."federation_calendar_cache" from "authenticated";
 revoke truncate on table "public"."federation_competitions" from "anon";
 revoke truncate on table "public"."federation_competitions" from "authenticated";
 revoke truncate on table "public"."federation_groups" from "anon";
 revoke truncate on table "public"."federation_groups" from "authenticated";
 revoke truncate on table "public"."federation_import_runs" from "anon";
 revoke truncate on table "public"."federation_import_runs" from "authenticated";
 revoke truncate on table "public"."federation_match_events" from "anon";
 revoke truncate on table "public"."federation_match_events" from "authenticated";
 revoke truncate on table "public"."federation_match_lineups" from "anon";
 revoke truncate on table "public"."federation_match_lineups" from "authenticated";
 revoke truncate on table "public"."federation_match_sources" from "anon";
 revoke truncate on table "public"."federation_match_sources" from "authenticated";
 revoke truncate on table "public"."federation_matches" from "anon";
 revoke truncate on table "public"."federation_matches" from "authenticated";
 revoke truncate on table "public"."federation_player_competition_stats" from "anon";
 revoke truncate on table "public"."federation_player_competition_stats" from "authenticated";
 revoke truncate on table "public"."federation_players" from "anon";
 revoke truncate on table "public"."federation_players" from "authenticated";
 revoke truncate on table "public"."federation_sync_runs" from "anon";
 revoke truncate on table "public"."federation_sync_runs" from "authenticated";
 revoke truncate on table "public"."federation_team_entries" from "anon";
 revoke truncate on table "public"."federation_team_entries" from "authenticated";
 revoke truncate on table "public"."federation_team_roster" from "anon";
 revoke truncate on table "public"."federation_team_roster" from "authenticated";
 revoke truncate on table "public"."pilot_events" from "anon";
 revoke truncate on table "public"."pilot_events" from "authenticated";
 revoke truncate on table "public"."pilot_matches" from "anon";
 revoke truncate on table "public"."pilot_matches" from "authenticated";
 revoke truncate on table "public"."pilot_members" from "anon";
 revoke truncate on table "public"."pilot_members" from "authenticated";
 revoke truncate on table "public"."pilot_operator_state" from "anon";
 revoke truncate on table "public"."pilot_operator_state" from "authenticated";
 revoke truncate on table "public"."pilot_players" from "anon";
 revoke truncate on table "public"."pilot_players" from "authenticated";
 revoke truncate on table "public"."profiles" from "authenticated";
 revoke truncate on table "public"."seasons" from "authenticated";
 revoke truncate on table "public"."teams" from "authenticated";
select md5(coalesce(string_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'grantee',a.grantee,'grantor',a.grantor,'privilege',a.privilege_type,'grantable',a.is_grantable)::text,'|' order by n.nspname,c.relname,a.grantee,a.grantor,a.privilege_type,a.is_grantable),'')) into after_other from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl) a left join pg_roles g on g.oid=a.grantee where n.nspname='public' and c.relkind in('r','p') and not(a.privilege_type='TRUNCATE' and coalesce(g.rolname,'PUBLIC') in('anon','authenticated'));
 if before_other is distinct from after_other then raise exception 'STOP: unrelated table privileges changed';end if;
 select count(*) into effective_n from pg_class c cross join pg_roles r where c.relnamespace='public'::regnamespace and c.relkind in('r','p') and r.rolname in('anon','authenticated') and has_table_privilege(r.oid,c.oid,'TRUNCATE');
 if effective_n<>0 then raise exception 'STOP: client TRUNCATE remains';end if;
 raise notice 'Corrected exactly 49 reviewed client grants';
end $remediation$;
