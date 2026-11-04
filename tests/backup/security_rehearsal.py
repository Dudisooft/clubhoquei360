"""PostgreSQL 17 fixture-only rehearsal of the immutable 49+2 correction.

No network, published ports, mounts, remote URLs, credentials or production runner.
The unsafe ACL is reconstructed and recovered only inside a new tagged fixture.
"""
import hashlib
import json
import sys
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/backup'))
import manager as m

package = ROOT / 'ops/truncate-3a8'
inventory = json.loads((package / 'inventory.json').read_text())
manifest = json.loads((package / 'MANIFEST.json').read_text())
for item in manifest['files']:
    assert hashlib.sha256((package / item['path']).read_bytes()).hexdigest() == item['sha256']
name = 'ch360_bk13_security_' + uuid.uuid4().hex[:10]
m.docker(['run', '-d', '--name', name, '--network', 'none', '--label', 'ch360.backup=' + m.LABEL,
          '--tmpfs', '/var/lib/postgresql/data:rw,size=256m,mode=700',
          '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_USER=fixture_cluster_admin', '-e', 'POSTGRES_DB=fixture', m.IMAGE])
for attempt in range(60):
    try:
        m.docker(['exec','--user','postgres',name,'psql','-At','-U','fixture_cluster_admin','-d','fixture','-c','select 1'])
        break
    except m.BackupError:
        time.sleep(.2)
else:
    raise RuntimeError('isolated fixture unavailable')
m.inspect_container(name)
m.docker(['exec','--user','postgres',name,'psql','-v','ON_ERROR_STOP=1','-U','fixture_cluster_admin','-d','fixture','-c','create role postgres login nosuperuser bypassrls;create role anon;create role authenticated;create role service_role bypassrls;create role fixture_authenticator login noinherit;grant anon,authenticated,service_role to fixture_authenticator;alter database fixture owner to postgres;'])
assert m.compatible(name) == 17
expected = inventory['expected']
tables = sorted({row['table_name'] for row in expected})
assert len(expected) == 49 and len(tables) == 27
bootstrap = ''
for table in tables:
    assert table.replace('_', '').isalnum()
    bootstrap += f'create table public."{table}"(id int primary key,club_id int,payload jsonb);'
    bootstrap += f'insert into public."{table}" values(1,1,\'{{"fixture":true}}\');'
    bootstrap += f'alter table public."{table}" enable row level security;'
    bootstrap += f'grant select,insert,update,delete on public."{table}" to anon,authenticated,service_role;'
for row in expected:
    bootstrap += f'grant truncate on public."{row["table_name"]}" to {row["beneficiary"]};'
for row in inventory['defaults']:
    assert row['schema'] == 'public' and row['owner'] == 'postgres' and not row['grantable']
    bootstrap += f'alter default privileges for role postgres in schema public grant {row["privilege"]} on tables to {row["beneficiary"]};'
# postgres is an ordinary owner, never the bootstrap superuser.
m.sql(name, bootstrap)
assert m.sql(name, "select rolsuper from pg_roles where rolname=current_user") == 'f'

def rows():
    return {t: m.sql(name, f'select row_to_json(r) from public."{t}" r order by id') for t in tables}

def acl():
    return m.sql(name, "select coalesce(jsonb_agg(jsonb_build_array(c.relname,g.rolname,a.privilege_type,a.is_grantable) order by c.relname,g.rolname,a.privilege_type),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl) a join pg_roles g on g.oid=a.grantee where n.nspname='public' and c.relkind='r'")

def defaults():
    return m.sql(name, "select coalesce(jsonb_agg(jsonb_build_array(g.rolname,a.privilege_type,a.is_grantable) order by g.rolname,a.privilege_type),'[]') from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace cross join lateral aclexplode(d.defaclacl) a join pg_roles g on g.oid=a.grantee where n.nspname='public'")

def correction():
    m.sql(name, "begin;select set_config('clubhoquei360.truncate_review','" + inventory['acknowledgement'] + "',true);" +
          (package / '01_revoke_current.sql').read_text() + (package / '02_revoke_postgres_default.sql').read_text() + 'commit;')

before_rows, before_acl, before_defaults = rows(), acl(), defaults()
assert sum(x[2] == 'TRUNCATE' and x[1] in ('anon', 'authenticated') for x in json.loads(before_acl)) == 49
assert len(json.loads(before_defaults)) == 20
try:
    m.sql(name, (package / '01_revoke_current.sql').read_text())
    raise AssertionError('scope acknowledgement was not enforced')
except m.BackupError:
    pass
correction()
corrected_acl, corrected_defaults = acl(), defaults()
assert not any(x[2] == 'TRUNCATE' and x[1] in ('anon', 'authenticated') for x in json.loads(corrected_acl))
assert len(json.loads(corrected_defaults)) == 18
assert [x for x in json.loads(before_acl) if not (x[2] == 'TRUNCATE' and x[1] in ('anon','authenticated'))] == json.loads(corrected_acl)
assert rows() == before_rows
assert m.sql(name, "select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r' and relrowsecurity") == '27'
for role in ['anon', 'authenticated']:
    actor=m.docker(['exec','--user','postgres',name,'psql','-Atq','-v','ON_ERROR_STOP=1','-U','fixture_authenticator','-d','fixture','-c',f'set role {role};select current_user']).decode().strip()
    assert actor==role
    assert m.sql(name, f"select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r' and has_table_privilege('{role}',oid,'TRUNCATE')") == '0'
    try:
        m.docker(['exec','--user','postgres',name,'psql','-v','ON_ERROR_STOP=1','-U','fixture_authenticator','-d','fixture','-c',f'begin;set local role {role};truncate public.clubs;rollback;'])
        raise AssertionError('client TRUNCATE allowed')
    except m.BackupError:
        pass
correction()
assert acl() == corrected_acl and defaults() == corrected_defaults and rows() == before_rows
# Exact ACL recovery is demonstrated ONLY in this explicitly fictional cluster.
for row in expected:
    m.sql(name, f'grant truncate on public."{row["table_name"]}" to {row["beneficiary"]}')
for role in ['anon', 'authenticated']:
    m.sql(name, f'alter default privileges for role postgres in schema public grant truncate on tables to {role}')
assert acl() == before_acl and defaults() == before_defaults and rows() == before_rows
correction()
assert acl() == corrected_acl and defaults() == corrected_defaults and rows() == before_rows
m.sql(name, 'create table public.future_fixture(id int)')
assert m.sql(name, "select has_table_privilege('anon','public.future_fixture','TRUNCATE') or has_table_privilege('authenticated','public.future_fixture','TRUNCATE')") == 'f'
# Exercise the canonical function on native PostgreSQL using the same public
# synthetic predecessor/seed as the Node regression, in a separate empty DB.
m.docker(['exec','--user','postgres',name,'psql','-v','ON_ERROR_STOP=1','-U','fixture_cluster_admin','-d','fixture','-c','create database canonical_fixture owner postgres'])
def canonical(sql,client=False):
    m.inspect_container(name)
    return m.docker(['exec','-i','--user','postgres',name,'psql','-Atq','-v','ON_ERROR_STOP=1','-U','fixture_authenticator' if client else 'postgres','-d','canonical_fixture'],sql.encode()).decode().strip()
schema=(ROOT/'tests/helpers/ihc-schema.sql').read_text()
assert schema.count('create role anon;create role authenticated;create role service_role;')==1
schema=schema.replace('create role anon;create role authenticated;create role service_role;','')
canonical(schema+(ROOT/'tests/helpers/official-report-predecessor.sql').read_text()+(ROOT/'tests/helpers/official-report-fixture.sql').read_text())
fixture_match='20000000-0000-4000-8000-000000000021'
fixture_lineup='30000000-0000-4000-8000-000000000021'
report={'external_match_id':'999999','players':[{'external_id':'100','side':'home','name':'PORTER FICTICI','position':'goalkeeper','dorsal':'1'}],'staff':[],'incidents':[],'official_status':None,'event_timeline_status':'not_retrieved'}
def official(payload):
    encoded=json.dumps(payload).replace("'", "''")
    return canonical("set role service_role;select federation_commit_official_report('"+fixture_match+"','"+encoded+"'::jsonb);reset role;",client=True)
official(report)
assert canonical("select is_goalkeeper from federation_match_lineups where id='"+fixture_lineup+"'")=='f'
incident={**report,'incidents':[{'order':1,'event_type':'FICTICI','text':'INCIDENT FICTICI'}],'event_timeline_status':'retrieved'}
try:
    official(incident)
    raise AssertionError('missing event ACL did not reject predecessor')
except m.BackupError:
    pass
canonical("update federation_matches set raw_data='"+json.dumps({'report_data':{'official_status':'FINALIZAT','incidents':[{'text':'ANTERIOR FICTICI'}],'event_timeline_status':'retrieved'}}).replace("'","''")+"'::jsonb where id='"+fixture_match+"'")
canonical((ROOT/'supabase/migrations/20261028191801_preserve_partial_federation_rosters.sql').read_text())
official(report)
assert canonical("select is_goalkeeper from federation_match_lineups where id='"+fixture_lineup+"'")=='t'
assert canonical("select raw_data->'report_data'->>'official_status' from federation_matches where id='"+fixture_match+"'")=='FINALIZAT'
assert canonical('select count(*) from federation_match_lineups')=='2'
official(incident);official(incident)
assert canonical('select count(*) from federation_match_events')=='2'
for role in ['anon','authenticated']:
    assert canonical("select has_function_privilege('"+role+"','federation_commit_official_report(uuid,jsonb)','EXECUTE')")=='f'
canonical((ROOT/'supabase/migrations/20261028191801_preserve_partial_federation_rosters.sql').read_text())
assert canonical('select count(*) from federation_match_events')=='2'
result = {'result':'PASS','fixture_only':True,'postgres':m.sql(name,'show server_version'),
          'explicit_grants':49,'tables':27,'defaults_before':20,'defaults_after':18,
          'nosuperuser_owner':True,'legitimate_grants_rows_rls_preserved':True,
          'idempotence':True,'exact_local_acl_recovery_and_reapplication':True,
          'ordinary_truncate_denied':True,'future_client_truncate_denied':True,
          'native_official_report':{'goalkeeper_reconciled':True,'same_lineup_identity':True,'partial_metadata_preserved':True,'missing_backend_event_acl_reproduced_and_repaired':True,'clients_denied':True},'production_operations':0,'network':'none','ports':0,'mounts':0}
(ROOT/'docs/evidence/final-consolidation-native-security-20261104.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
m.docker(['stop',name])
