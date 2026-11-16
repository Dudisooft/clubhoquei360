begin;
do $preflight$
begin
 if not exists (
  select 1 from pg_catalog.pg_proc
  where oid = 'public.federation_commit_official_report(uuid,jsonb)'::regprocedure
    and not prosecdef
 ) or not pg_catalog.has_function_privilege('service_role', 'public.federation_commit_official_report(uuid,jsonb)', 'EXECUTE')
   or pg_catalog.has_function_privilege('authenticated', 'public.federation_commit_official_report(uuid,jsonb)', 'EXECUTE')
   or pg_catalog.has_function_privilege('anon', 'public.federation_commit_official_report(uuid,jsonb)', 'EXECUTE') then
  raise exception 'Official report RPC permissions differ from the audited configuration';
 end if;
 if pg_catalog.has_table_privilege('service_role','public.federation_match_events','SELECT')
   or pg_catalog.has_table_privilege('service_role','public.federation_match_events','INSERT')
   or pg_catalog.has_table_privilege('authenticated','public.federation_match_events','INSERT')
   or pg_catalog.has_table_privilege('anon','public.federation_match_events','INSERT') then
  raise exception 'Official incident privileges differ from the audited configuration';
 end if;
end
$preflight$;

grant select, insert on public.federation_match_events to service_role;
commit;
