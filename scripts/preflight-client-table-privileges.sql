-- READ ONLY. No personal rows. Required gate before and after 3A.6 hardening.
begin read only;
select table_schema,table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and grantee in('anon','authenticated','PUBLIC')
and privilege_type='TRUNCATE' order by table_name,grantee;
-- Zero rows required after installation, including defaults of other owners.
select r.rolname owner,n.nspname schema,coalesce(g.rolname,'PUBLIC') grantee,a.privilege_type
from pg_default_acl d join pg_roles r on r.oid=d.defaclrole
left join pg_namespace n on n.oid=d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) a left join pg_roles g on g.oid=a.grantee
where d.defaclobjtype='r' and (d.defaclnamespace=0 or n.nspname='public')
and a.privilege_type='TRUNCATE' and (g.rolname in('anon','authenticated') or a.grantee=0);
rollback;
