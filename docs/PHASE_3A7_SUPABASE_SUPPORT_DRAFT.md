# Consulta tècnica preparada · NO ENVIADA

Projecte: ClubHoquei360 (identificador i qualsevol dada de client omesos). PostgreSQL Cloud 17.11. No s’adjunten credencials, tokens, dades esportives o personals. Aquesta és una plantilla per a revisió humana; no s’ha contactat Supabase Support.

## Observació

Una inspecció READ ONLY confirma 49 ACL TRUNCATE explícites a anon/authenticated sobre 27 taules aplicatives public propietat de postgres, amb RLS. Cap rol client té LOGIN, CREATE public o pertinença a postgres/supabase_admin/service_role. El compte de projecte postgres no és superusuari ni membre de supabase_admin. La Data API exposa public i graphql_public; app_private és rebutjat. No hem identificat cap RPC de SQL arbitrari/TRUNCATE ni cap clau de servei al client públic. No hem fet proves destructives a Cloud.

pg_default_acl mostra defaults public per a futurs objectes creats per postgres i, separadament, supabase_admin: TRUNCATE a anon/authenticated. Totes les 27 taules investigades són de postgres; no atribuïm les seves ACL al propietari supabase_admin. No es pot provar amb aquests catàlegs si cada concessió històrica va sorgir d’un default o un GRANT explícit.

El hardening versionat de les taules i defaults aplicatius de postgres ha estat verificat en un PostgreSQL aïllat. En aquesta fase diagnòstica no s’ha executat GRANT/REVOKE/ALTER DEFAULT PRIVILEGES/TRUNCATE en cap entorn: s’han comparat les restauracions anteriors amb 49/0 concessions. A Cloud tot resta sense canvis.

## Referències

- Documentació oficial: [Securing your API](https://supabase.com/docs/guides/api/securing-your-api), [Managed roles](https://supabase.com/docs/guides/database/postgres/roles), [Unsupported superuser operations](https://supabase.com/docs/guides/database/postgres/roles-superuser).
- Anunci de maintainer del 28/04/2026: [opt-in d’exposició](https://github.com/orgs/supabase/discussions/45329). Comentaris comunitaris sobre TRUNCATE/supabase_admin no es tracten com a resolució oficial.
- PostgreSQL diferencia default ACL per creador, permisos efectius i propietat; RLS no cobreix TRUNCATE. PostgREST documenta operacions de taula i RPC sobre funcions accessibles, no un endpoint de SQL arbitrari.

## Preguntes concretes

1. És una configuració gestionada/admesa que els defaults de supabase_admin per a public incloguin TRUNCATE als clients en projectes existents? Quin mecanisme suportat hi ha per revisar-los sense alterar propietat o rols gestionats?
2. És recomanable limitar l’hardening del propietari del projecte a les taules aplicatives existents i als defaults de postgres, amb una porta que rebutgi qualsevol concessió TRUNCATE a clients sobre noves taules aplicatives independentment del creador?
3. Hi ha algun camí estàndard de Data API/GraphQL que invoqui TRUNCATE sense una RPC implementada pel projecte? No n’hem identificat cap en documentació, codi o proves locals; demanem confirmar el perímetre suportat, no atribuir un exploit.
4. Com es garanteix que una operació futura de plataforma que creï objectes en public no introdueixi una concessió client imprevista? Cal intervenció de Support o és suficient una política de DDL i auditoria postcreació amb aturada?

## Consultes sanejades reproduïbles

```sql
begin read only;
select n.nspname,c.relname,o.rolname owner,g.rolname beneficiary,
       a.privilege_type,a.is_grantable,
       has_table_privilege(g.oid,c.oid,'TRUNCATE') effective_truncate
from pg_class c join pg_namespace n on n.oid=c.relnamespace
join pg_roles o on o.oid=c.relowner
cross join lateral aclexplode(c.relacl) a
join pg_roles g on g.oid=a.grantee
where n.nspname='public' and a.privilege_type='TRUNCATE'
and g.rolname in('anon','authenticated');

select r.rolname creator,n.nspname,coalesce(g.rolname,'PUBLIC') beneficiary,
       a.privilege_type
from pg_default_acl d join pg_roles r on r.oid=d.defaclrole
left join pg_namespace n on n.oid=d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) a
left join pg_roles g on g.oid=a.grantee
where d.defaclobjtype='r' and a.privilege_type='TRUNCATE'
and (d.defaclnamespace=0 or n.nspname='public');

select current_setting('server_version'),current_user,
       pg_has_role(current_user,'supabase_admin','MEMBER');
rollback;
```

## Impacte acotat

Les concessions SQL dels clients són innecessàries per a l’aplicació i mereixen hardening. No hem demostrat que una sessió de navegador pugui aprofitar-les. La propietat administrativa no és per si mateixa una filtració de permisos. Necessitem una delimitació suportada dels defaults de plataforma; no demanem permisos superiors ni cap canvi indiscriminat de rols.
