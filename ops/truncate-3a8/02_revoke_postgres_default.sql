-- SEPARATE CORRECTION OF FUTURE DEFAULTS, postgres/public only.
do $defaults$
declare n int;bad int;before_other text;after_other text;
begin
if current_setting('clubhoquei360.truncate_review',true) is distinct from 'reviewed-49:bb586396e870d7b792763f9a2240c42e816b41976eeaea6d19d110d0f460a29b' then raise exception 'STOP: explicit reviewed-scope acknowledgement required';end if;
 if current_user<>'postgres' or (select rolsuper from pg_roles where rolname=current_user) then raise exception 'STOP: execute as non-superuser postgres owner only';end if;
 perform set_config('lock_timeout','5s',true);
 if exists(select 1 from pg_roles r where r.rolname in('anon','authenticated') and (r.rolcanlogin or has_schema_privilege(r.oid,'public','CREATE'))) then raise exception 'STOP: unexpected client role capability';end if;
 if exists(select 1 from pg_roles r cross join pg_roles elevated where r.rolname in('anon','authenticated') and elevated.rolname in('postgres','service_role','supabase_admin') and pg_has_role(r.oid,elevated.oid,'MEMBER')) then raise exception 'STOP: client inherited elevated role';end if;

with expected(beneficiary,privilege,grantable) as(values
 ('anon','MAINTAIN',false),
 ('anon','REFERENCES',false),
 ('anon','TRIGGER',false),
 ('anon','TRUNCATE',false),
 ('authenticated','MAINTAIN',false),
 ('authenticated','REFERENCES',false),
 ('authenticated','TRIGGER',false),
 ('authenticated','TRUNCATE',false),
 ('postgres','DELETE',false),
 ('postgres','INSERT',false),
 ('postgres','MAINTAIN',false),
 ('postgres','REFERENCES',false),
 ('postgres','SELECT',false),
 ('postgres','TRIGGER',false),
 ('postgres','TRUNCATE',false),
 ('postgres','UPDATE',false),
 ('service_role','MAINTAIN',false),
 ('service_role','REFERENCES',false),
 ('service_role','TRIGGER',false),
 ('service_role','TRUNCATE',false)), actual as(select coalesce(g.rolname,'PUBLIC') beneficiary,a.privilege_type privilege,a.is_grantable grantable from pg_default_acl d join pg_namespace ns on ns.oid=d.defaclnamespace join pg_roles o on o.oid=d.defaclrole cross join lateral aclexplode(d.defaclacl) a left join pg_roles g on g.oid=a.grantee where ns.nspname='public' and o.rolname='postgres' and d.defaclobjtype='r') select count(*) into bad from((select * from actual except select * from expected) union all (select * from expected where not(privilege='TRUNCATE' and beneficiary in('anon','authenticated')) except select * from actual)) d;
 if bad<>0 then raise exception 'STOP: unexpected default ACL state';end if;
with expected(beneficiary,privilege,grantable) as(values
 ('anon','MAINTAIN',false),
 ('anon','REFERENCES',false),
 ('anon','TRIGGER',false),
 ('anon','TRUNCATE',false),
 ('authenticated','MAINTAIN',false),
 ('authenticated','REFERENCES',false),
 ('authenticated','TRIGGER',false),
 ('authenticated','TRUNCATE',false),
 ('postgres','DELETE',false),
 ('postgres','INSERT',false),
 ('postgres','MAINTAIN',false),
 ('postgres','REFERENCES',false),
 ('postgres','SELECT',false),
 ('postgres','TRIGGER',false),
 ('postgres','TRUNCATE',false),
 ('postgres','UPDATE',false),
 ('service_role','MAINTAIN',false),
 ('service_role','REFERENCES',false),
 ('service_role','TRIGGER',false),
 ('service_role','TRUNCATE',false)), actual as(select coalesce(g.rolname,'PUBLIC') beneficiary,a.privilege_type privilege,a.is_grantable grantable from pg_default_acl d join pg_namespace ns on ns.oid=d.defaclnamespace join pg_roles o on o.oid=d.defaclrole cross join lateral aclexplode(d.defaclacl) a left join pg_roles g on g.oid=a.grantee where ns.nspname='public' and o.rolname='postgres' and d.defaclobjtype='r') select count(*) into n from actual where privilege='TRUNCATE' and beneficiary in('anon','authenticated');
 if n not in(0,2) then raise exception 'STOP: partial default correction';end if;
 if exists(select 1 from pg_default_acl d join pg_roles o on o.oid=d.defaclrole cross join lateral aclexplode(d.defaclacl) a join pg_roles g on g.oid=a.grantee where d.defaclobjtype='r' and d.defaclnamespace=0 and o.rolname='postgres' and a.privilege_type='TRUNCATE' and g.rolname in('anon','authenticated')) then raise exception 'STOP: unexpected global default grants';end if;
 if n=0 then raise notice 'Default already corrected: zero changes';return;end if;
select md5(coalesce(string_agg(jsonb_build_object('creator',d.defaclrole,'schema',d.defaclnamespace,'kind',d.defaclobjtype,'grantee',a.grantee,'grantor',a.grantor,'privilege',a.privilege_type,'grantable',a.is_grantable)::text,'|' order by d.defaclrole,d.defaclnamespace,d.defaclobjtype,a.grantee,a.grantor,a.privilege_type),'')) into before_other from pg_default_acl d left join pg_namespace ns on ns.oid=d.defaclnamespace join pg_roles o on o.oid=d.defaclrole cross join lateral aclexplode(d.defaclacl) a left join pg_roles g on g.oid=a.grantee where not(o.rolname='postgres' and ns.nspname='public' and d.defaclobjtype='r' and a.privilege_type='TRUNCATE' and coalesce(g.rolname,'PUBLIC') in('anon','authenticated'));
 alter default privileges for role postgres in schema public revoke truncate on tables from anon,authenticated;
select md5(coalesce(string_agg(jsonb_build_object('creator',d.defaclrole,'schema',d.defaclnamespace,'kind',d.defaclobjtype,'grantee',a.grantee,'grantor',a.grantor,'privilege',a.privilege_type,'grantable',a.is_grantable)::text,'|' order by d.defaclrole,d.defaclnamespace,d.defaclobjtype,a.grantee,a.grantor,a.privilege_type),'')) into after_other from pg_default_acl d left join pg_namespace ns on ns.oid=d.defaclnamespace join pg_roles o on o.oid=d.defaclrole cross join lateral aclexplode(d.defaclacl) a left join pg_roles g on g.oid=a.grantee where not(o.rolname='postgres' and ns.nspname='public' and d.defaclobjtype='r' and a.privilege_type='TRUNCATE' and coalesce(g.rolname,'PUBLIC') in('anon','authenticated'));
 if before_other is distinct from after_other then raise exception 'STOP: unrelated defaults changed';end if;
end $defaults$;
