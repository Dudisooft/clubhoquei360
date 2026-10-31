-- Diagnostic only. No migration, grant, invocation of mutating RPC or sporting write.
-- Execute reviewed ops/truncate-3a8/00_preflight.sql separately for exact 49-tuple comparison.
begin read only;
select current_user as actor,current_setting('server_version') as postgres_version,
 (select rolsuper from pg_roles where rolname=current_user) as actor_superuser;
select count(*) as public_tables,count(*) filter(where pg_get_userbyid(relowner)<>'postgres') as non_postgres_owners
 from pg_class where relnamespace='public'::regnamespace and relkind in('r','p');
select o.rolname as owner,n.nspname as schema_name,g.rolname as beneficiary,a.privilege_type,a.is_grantable
 from pg_default_acl d join pg_roles o on o.oid=d.defaclrole join pg_namespace n on n.oid=d.defaclnamespace
 cross join lateral aclexplode(d.defaclacl)a join pg_roles g on g.oid=a.grantee
 where o.rolname='postgres' and n.nspname='public' and d.defaclobjtype='r'
 order by owner,schema_name,beneficiary,privilege_type;
select has_table_privilege('service_role','public.federation_match_events','INSERT') as backend_events_insert,
 has_table_privilege('postgres','auth.users','REFERENCES') as postgres_auth_references,
 has_schema_privilege('postgres','auth','USAGE') as postgres_auth_usage;
-- The target ID is the verified canonical 35559 match, not the unlinked historical pilot.
select f.id,f.external_match_id,f.home_score,f.away_score,f.raw_data->>'report_status' as summary_status,
 (select count(*) from federation_match_lineups l where l.match_id=f.id and l.side='home') as saved_home,
 (select count(*) from federation_match_lineups l where l.match_id=f.id and l.side='away') as saved_away
 from federation_matches f where f.id='51894d05-c323-f3e1-8534-fa79e062c448' and f.external_match_id='35559';
select started_at,status,external_resource_id,
 details->'official_reports'->'processed' as report_attempts,
 jsonb_array_length(coalesce(details->'official_reports'->'errors','[]'::jsonb)) as report_errors,
 details->'report_failures' as legacy_fetch_failure_count
 from federation_import_runs where external_resource_id='RFEP:3575' order by started_at desc limit 1;
-- Do not change this ledger. Recorded SQL was compared privately, byte-for-byte.
select version,name,md5(array_to_string(statements,E'\n')) as recorded_sql_md5
 from supabase_migrations.schema_migrations where version in
 ('20261017130942','20261017133038','20261024062538','20261024113012') order by version;
rollback;
