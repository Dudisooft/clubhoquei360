-- Read-only inventory; no table contents, passwords, keys or job commands.
BEGIN READ ONLY;
SELECT jsonb_build_object(
 'postgres',current_setting('server_version'),
 'executor',jsonb_build_object('role',current_user,'superuser',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),'bypass_rls',(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user)),
 'database_bytes',pg_database_size(current_database()),
 'schemas',(SELECT jsonb_agg(x ORDER BY x.schema) FROM (
   SELECT n.nspname AS schema,count(*) AS tables,
    count(*) FILTER(WHERE NOT has_table_privilege(current_user,c.oid,'SELECT')) AS unreadable_tables
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
   GROUP BY n.nspname) x),
 'storage',jsonb_build_object('buckets',(SELECT count(*) FROM storage.buckets),'objects',(SELECT count(*) FROM storage.objects)),
 'auth',jsonb_build_object('users',(SELECT count(*) FROM auth.users),'identities',(SELECT count(*) FROM auth.identities),'sessions',(SELECT count(*) FROM auth.sessions)),
 'migrations',(SELECT jsonb_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations),
 'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion) ORDER BY extname) FROM pg_extension)
);
ROLLBACK;
