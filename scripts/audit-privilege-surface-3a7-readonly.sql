-- Metadata only. Keep raw function definitions private; publish reviewed summaries.
begin read only;
select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'owner',r.rolname,'definer',p.prosecdef,'config',p.proconfig,'definition',pg_get_functiondef(p.oid),'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE'),'anon_schema',has_schema_privilege('anon',n.oid,'USAGE'),'authenticated_schema',has_schema_privilege('authenticated',n.oid,'USAGE')) order by n.nspname,p.proname,p.oid) functions
from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner
where n.nspname in('public','app_private','graphql_public') and p.prokind in('f','p')
and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e');
select jsonb_agg(jsonb_build_object('role',r.rolname,'public_usage',has_schema_privilege(r.oid,'public','USAGE'),'public_create',has_schema_privilege(r.oid,'public','CREATE'),'database_connect',has_database_privilege(r.oid,current_database(),'CONNECT'),'postgres_member',pg_has_role(r.oid,'postgres','MEMBER'),'supabase_admin_member',pg_has_role(r.oid,'supabase_admin','MEMBER'),'service_member',pg_has_role(r.oid,'service_role','MEMBER'))) capabilities
from pg_roles r where rolname in('anon','authenticated','service_role','postgres','supabase_admin','authenticator');
select e.evtname,r.rolname owner,e.evtevent,e.evtenabled,e.evttags,e.evtfoid::regproc::text function
from pg_event_trigger e join pg_roles r on r.oid=e.evtowner;
select extname,extversion from pg_extension;
rollback;
