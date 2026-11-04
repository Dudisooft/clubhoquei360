"""Apply pending migrations to the previously verified, PRIVATE synthetic predecessor.

The fixture is not distributed in Git. Its pinned hash prevents substituting a
production dump. All writes use a new networkless PostgreSQL 17 container.
"""
import argparse
import hashlib
import json
import re
import sys
import time
import uuid
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/backup'))
import manager as m
p=argparse.ArgumentParser()
p.add_argument('--predecessor',required=True)
args=p.parse_args()
source=Path(args.predecessor).resolve()
assert not source.is_relative_to(ROOT), 'private fixture must stay outside the release repository'
(ROOT/'docs/evidence/final-consolidation-native-migrations-20261104.json').write_text(json.dumps({'result':'IN_PROGRESS','production_operations':0})+'\n')
data=source.read_bytes()
assert hashlib.sha256(data).hexdigest()=='00b45a56f9a9f524da007263fd8cbb5ef5d9690a03bfec27a9fab7ac0878f9a7', 'unverified predecessor refused'
name='ch360_bk13_migrations_'+uuid.uuid4().hex[:10]
m.docker(['run','-d','--name',name,'--network','none','--label','ch360.backup='+m.LABEL,
          '--tmpfs','/var/lib/postgresql/data:rw,size=512m,mode=700',
          '-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_USER=fixture_cluster_admin',
          '-e','POSTGRES_DB=fixture',m.IMAGE])

def query(sql,*,admin=False,database='fixture'):
    m.inspect_container(name)
    return m.docker(['exec','-i','--user','postgres',name,'psql','-Atq','-v','ON_ERROR_STOP=1',
                     '-U','fixture_cluster_admin' if admin else 'postgres','-d',database],sql.encode(),timeout=180).decode().strip()

for attempt in range(60):
    try:
        query('select 1',admin=True)
        break
    except m.BackupError:
        time.sleep(.2)
else:
    raise RuntimeError('new isolated fixture unavailable')
query('create role postgres login nosuperuser bypassrls;create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;create role authenticator noinherit;create role stage_cluster_admin superuser;alter database fixture owner to postgres;',admin=True)
# Restore only the known local synthetic fixture. No remote dump is performed.
# Read-only Cloud metadata confirms these existing postgres Auth capabilities.
# The old synthetic capture omitted them before switching to its ordinary owner.
payload,count=re.subn(r'(?i)\bset role postgres;', 'grant usage on schema auth to postgres;grant select,references on auth.users to postgres;set role postgres;', data.decode())
assert count==1
query(payload,admin=True)
# The private SQL capture omitted owners for application objects. Reproduce the
# verified postgres ownership; managed Auth remains owned by its fixture role.
query("""do $$declare r record;begin
 for r in select c.oid,c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','app_private') and c.relkind in('r','p','S','v') loop
  execute format('alter %s %s owner to postgres',case when r.relkind='S' then 'sequence' when r.relkind='v' then 'view' else 'table' end,r.oid::regclass);
 end loop;
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','app_private') and p.prokind='f' loop execute format('alter function %s owner to postgres',r.oid::regprocedure);end loop;
end$$;alter schema app_private owner to postgres;grant usage on schema auth to postgres;grant select,references on auth.users to postgres;""",admin=True)
assert query("select rolsuper from pg_roles where rolname=current_user")=='f'
assert query("select current_setting('server_version_num')::int/10000")=='17'
# Fixture provisioning only; migrations below still execute as ordinary postgres.
query((ROOT/'tests/helpers/migration-sporting-fixture.sql').read_text(),admin=True)
columns=json.loads(query("select jsonb_object_agg(t.table_name,t.cols) from(select table_name,jsonb_agg(column_name order by ordinal_position) cols from information_schema.columns where table_schema='public' group by table_name)t"))

def quote(name):
    return '"'+name.replace('"','""')+'"'

def snapshot(database='fixture'):
    result={}
    for table,cols in sorted(columns.items()):
        projection=','.join(quote(c) for c in cols)
        result[table]=query(f"select count(*)::text||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from(select {projection} from public.{quote(table)})r",database=database)
    return result

before=snapshot()
assert sum(int(s.split(':')[0]) for s in before.values())>=19, 'incomplete sporting fixture refused'
archive=m.docker(['exec','--user','postgres',name,'pg_dump','-U','fixture_cluster_admin','-d','fixture','-Fc'])
inv=json.loads((ROOT/'ops/truncate-3a8/inventory.json').read_text())
# Restore the reviewed legacy ACL only in this fixture before testing remediation.
for row in inv['expected']:
    query(f'grant truncate on public.{quote(row["table_name"])} to {row["beneficiary"]}')
for row in inv['defaults']:
    query(f'alter default privileges for role postgres in schema public grant {row["privilege"]} on tables to {row["beneficiary"]}')
query("begin;select set_config('clubhoquei360.truncate_review','"+inv['acknowledgement']+"',true);"+(ROOT/'ops/truncate-3a8/01_revoke_current.sql').read_text()+(ROOT/'ops/truncate-3a8/02_revoke_postgres_default.sql').read_text()+'commit;')
assert snapshot()==before
files=sorted(f for f in (ROOT/'supabase/migrations').glob('*.sql') if f.name>='20261027')
assert len(files)==7
query('create schema rehearsal;create table rehearsal.applied(version text primary key,sha256 text not null)')
applied=[]
for file in files:
    query(file.read_text())
    query("insert into rehearsal.applied values('"+file.name+"','"+hashlib.sha256(file.read_bytes()).hexdigest()+"')")
    assert snapshot()==before, 'original application rows changed: '+file.name
    applied.append({'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'original_rows_preserved':True})
# DDL migrations are not all raw-SQL idempotent. The migration ledger must
# prevent blind reruns; this local-only fixture ledger verifies version/hash.
skipped=0
for file in files:
    assert query("select sha256 from rehearsal.applied where version='"+file.name+"'")==hashlib.sha256(file.read_bytes()).hexdigest()
    skipped+=1
try:
    query(files[0].read_text())
    raise AssertionError('duplicate DDL unexpectedly succeeded')
except m.BackupError:
    pass
assert snapshot()==before
assert query("select has_function_privilege('authenticated','public.federation_commit_official_report(uuid,jsonb)','EXECUTE') or has_function_privilege('anon','public.federation_commit_official_report(uuid,jsonb)','EXECUTE')")=='f'
assert query("select count(*) from pg_class c cross join pg_roles r where c.relnamespace='public'::regnamespace and c.relkind='r' and r.rolname in('anon','authenticated') and has_table_privilege(r.oid,c.oid,'TRUNCATE')")=='0'
query('create database fixture_recovery owner postgres',admin=True)
m.docker(['exec','-i','--user','postgres',name,'pg_restore','--exit-on-error','--single-transaction','-U','fixture_cluster_admin','-d','fixture_recovery'],archive,timeout=180)
assert snapshot('fixture_recovery')==before
result={'result':'PASS','fixture_only':True,'postgres':query('show server_version'),
        'predecessor_sha256':hashlib.sha256(data).hexdigest(),'predecessor_is_production_backup':False,
        'synthetic_auth_users':int(query('select count(*) from auth.users')),'original_public_tables':len(columns),'original_rows':sum(int(s.split(':')[0]) for s in before.values()),
        'migrations':applied,'ledger_repeat_skipped':skipped,'blind_duplicate_ddl':'rejected atomically; not all SQL migrations are idempotent','original_columns_and_rows_preserved':True,
        'native_custom_archive_restore':True,'restore_destination':'independent fixture database, same isolated cluster',
        'ordinary_owner_nosuperuser':True,'client_truncate':0,'official_rpc_client_execute':False,
        'real_supabase_auth':False,'production_operations':0,'network':'none','published_ports':0,
        'limitations':['captured application predecessor, synthetic records; not a full Supabase Cloud clone',
                      'Auth is the local synthetic predecessor; no GoTrue sessions exercised here',
                      'application ownership and postgres Auth USAGE/SELECT/REFERENCES reconstructed from verified metadata; managed platform configuration excluded']}
(ROOT/'docs/evidence/final-consolidation-native-migrations-20261104.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
m.docker(['stop',name])
