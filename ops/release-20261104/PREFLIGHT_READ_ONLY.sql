-- STRICTLY READ ONLY. No connection settings, credentials, GRANT or deployment runner.
-- Full tuple review is still required using ../truncate-3a8/00_preflight.sql.
begin read only;
with client_acl as (
 select c.relname,a.privilege_type,coalesce(r.rolname,'PUBLIC') beneficiary
 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl) a
 left join pg_roles r on r.oid=a.grantee
 where n.nspname='public' and c.relkind in('r','p') and a.privilege_type='TRUNCATE' and coalesce(r.rolname,'PUBLIC') in('anon','authenticated','PUBLIC')
), client_defaults as (
 select d.defaclnamespace from pg_default_acl d join pg_roles o on o.oid=d.defaclrole cross join lateral aclexplode(d.defaclacl) a left join pg_roles r on r.oid=a.grantee
 where o.rolname='postgres' and d.defaclobjtype='r' and d.defaclnamespace in(0,'public'::regnamespace) and a.privilege_type='TRUNCATE' and coalesce(r.rolname,'PUBLIC') in('anon','authenticated','PUBLIC')
), canonical as (
 select p.prosrc,p.prosecdef,p.proconfig,p.proowner from pg_proc p where p.oid=to_regprocedure('public.federation_commit_official_report(uuid,jsonb)')
)
select jsonb_build_object(
 'actor',current_user,'database',current_database(),'server_address',inet_server_addr(),'server_port',inet_server_port(),'postgres',current_setting('server_version'),
 'actor_superuser',(select rolsuper from pg_roles where rolname=current_user),
 'project_confirmation','Operator must confirm the approved Cloud project in the Dashboard; database name alone is insufficient',
 'security_state',case when (select count(*) from client_acl)=49 and (select count(*) from client_defaults)=2 then 'PENDING_49_PLUS_2' when (select count(*) from client_acl)=0 and (select count(*) from client_defaults)=0 then 'CORRECTED_REVIEW_REQUIRED' else 'STOP_ACL_DRIFT' end,
 'client_truncate_acl',(select count(*) from client_acl),
 'effective_client_truncate',(select count(*) from pg_class c cross join pg_roles r where c.relnamespace='public'::regnamespace and c.relkind in('r','p') and r.rolname in('anon','authenticated') and has_table_privilege(r.oid,c.oid,'TRUNCATE')),
 'client_truncate_defaults',(select count(*) from client_defaults),
 'other_schema_client_defaults',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'creator',o.rolname,'beneficiary',r.rolname,'privilege',a.privilege_type)) from pg_default_acl d join pg_roles o on o.oid=d.defaclrole join pg_namespace n on n.oid=d.defaclnamespace cross join lateral aclexplode(d.defaclacl) a join pg_roles r on r.oid=a.grantee where o.rolname='postgres' and n.nspname<>'public' and d.defaclobjtype='r' and a.privilege_type='TRUNCATE' and r.rolname in('anon','authenticated')),
 'storage_scope_note','Managed schema; observed postgres/storage future defaults are reported separately and are NOT in the public 49+2 package',
 'other_public_owners',(select count(*) from pg_class c join pg_roles o on o.oid=c.relowner where c.relnamespace='public'::regnamespace and c.relkind in('r','p') and o.rolname<>'postgres'),
 'canonical_owner',(select pg_get_userbyid(proowner) from canonical),
 'canonical_body_md5',(select md5(prosrc) from canonical),
 'canonical_predecessor_reviewed',coalesce((select md5(prosrc) in('a233a99c0b0e60db6cf5f42beef9f76e','df66e4d470de1fa8119f140386a3ac35') and not prosecdef from canonical),false),
 'backend_event_select',has_table_privilege('service_role','public.federation_match_events','SELECT'),
 'backend_event_insert',has_table_privilege('service_role','public.federation_match_events','INSERT'),
 'client_canonical_execute',jsonb_build_object('anon',has_function_privilege('anon',to_regprocedure('public.federation_commit_official_report(uuid,jsonb)'),'EXECUTE'),'authenticated',has_function_privilege('authenticated',to_regprocedure('public.federation_commit_official_report(uuid,jsonb)'),'EXECUTE')),
 'postgres_auth_usage',has_schema_privilege('postgres','auth','USAGE'),
 'postgres_auth_references',has_table_privilege('postgres','auth.users','REFERENCES'),
 'missing_current_objects',(select jsonb_agg(t) from unnest(array['clubs','seasons','teams','pilot_matches','pilot_events','stats_events','stats_sessions','federation_matches','federation_match_lineups','federation_match_events'])t where to_regclass('public.'||t) is null),
 'authorization','NONE: this file authorizes no production writes'
) as preflight;
rollback;
