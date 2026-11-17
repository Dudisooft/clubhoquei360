"""Fictional local Auth/PG restore proof. Reuses the existing encrypted backup engine.
No Cloud credentials, personal data, TCP database URLs or production export options.
"""
import importlib.util,json,os,re,hashlib,uuid,time,stat,http.client,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('backup_engine',ROOT/'scripts/backup/manager.py');engine=importlib.util.module_from_spec(spec);spec.loader.exec_module(engine)
PROJECT='clubhoquei360-pr53-local';NETWORK='ch360_pr53_isolated';SOURCE='ch360_pr53_db';TARGET='ch360_pr53_restore_'+uuid.uuid4().hex[:8]
work=(ROOT/'work/pr53-staging').resolve();secret=json.loads((work/'runtime-private.json').read_text());assert secret['projectId']==PROJECT and secret['apiUrl']=='http://127.0.0.1:57321'

def inspect(name):
 assert re.fullmatch('ch360_pr53_[a-z0-9_]+',name)
 d=json.loads(engine.docker(['inspect',name]))[0]
 assert d['Config']['Labels'].get('ch360.staging')==PROJECT and d['Config']['Image']==engine.IMAGE
 net=json.loads(engine.docker(['network','inspect',NETWORK]))[0];assert net['Internal']
 assert set(d['NetworkSettings']['Networks'])=={NETWORK} and not d['HostConfig'].get('Binds') and all(m['Type']!='bind' for m in d['Mounts'])
 return d

def tool(name,command,args=(),data=None):
 inspect(name)
 return engine.docker(['exec','-i','--user','postgres',name,command,'-h','/var/run/postgresql','-U','postgres','-d','postgres']+list(args),data)

def sql(name,query):return tool(name,'psql',['-At','-v','ON_ERROR_STOP=1'],query.encode()).decode().strip()

def snapshot(name):
 info=json.loads(sql(name,engine.SNAPSHOT_SQL));info['rows']=[]
 for t in info['tables'] or []:
  schema,table=t['schema'],t['name'];assert re.fullmatch('[a-z_][a-z0-9_]*',schema) and re.fullmatch('[a-z_][a-z0-9_]*',table)
  info['rows'].append(json.loads(sql(name,f"select jsonb_build_object('schema','{schema}','table','{table}','count',count(*),'hash',md5(coalesce(string_agg(md5(to_jsonb(x)::text),'' order by md5(to_jsonb(x)::text)),''))) from {schema}.{table} x")))
 info['views']=json.loads(sql(name,"select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'name',viewname,'owner',viewowner,'definition',definition) order by schemaname,viewname),'[]') from pg_views where schemaname in('public','app_private','auth')"))
 info['extensions']=json.loads(sql(name,"select jsonb_agg(jsonb_build_object('name',extname,'version',extversion) order by extname) from pg_extension"))
 return info

assert sql(SOURCE,"select project_id from app_private.pr53_identity")==PROJECT
assert sql(SOURCE,"select count(*) from auth.users where email is null or email not like '%@pr53.invalid'")=='0'
assert sql(SOURCE,"select count(*) from clubs where name not like '%FICTICI%'")=='0'
pointer=work/'restore-attempt.json'
if pointer.exists():
 attempt=json.loads(pointer.read_text());TARGET=attempt['target'];backup_root=Path(attempt['backup_root']);file=Path(attempt['backup_path'])
 c={'keys':str(backup_root/'keys'),'backups':str(backup_root/'backups'),'audit':str(backup_root/'audit'),'age':'/workspace/private/ch360-tools/age','keygen':'/workspace/private/ch360-tools/age-keygen'}
 meta,authenticated_dump=engine.unpack(engine.decrypt(c,file));assert meta['sourceProject']==PROJECT
 before=snapshot(SOURCE);assert before==meta['snapshot'],'Frozen source changed; previous comparison is no longer valid'
 encrypted=file.read_bytes()
else:
 # Freeze only this synthetic runtime's writers; keep the database and all old resources intact.
 for name in ['ch360_pr53_auth','ch360_pr53_rest']:
  d=json.loads(engine.docker(['inspect',name]))[0];assert d['Config']['Labels'].get('ch360.staging')==PROJECT
  engine.docker(['stop',name])
 backup_root=Path('/dev/shm')/('c53-backup-'+uuid.uuid4().hex);backup_root.mkdir(mode=0o700)
 for name in ['keys','backups','audit']:(backup_root/name).mkdir(mode=0o700)
 c={'keys':str(backup_root/'keys'),'backups':str(backup_root/'backups'),'audit':str(backup_root/'audit'),'age':'/workspace/private/ch360-tools/age','keygen':'/workspace/private/ch360-tools/age-keygen'}
 engine.key_init(c)
 before=snapshot(SOURCE)
 dump=tool(SOURCE,'pg_dump',['--format=custom','--no-password','--lock-wait-timeout=3s'])
 assert dump.startswith(b'PGDMP') and snapshot(SOURCE)==before
 meta={'format':1,'purpose':engine.LABEL,'sourceProject':PROJECT,'backupId':uuid.uuid4().hex,'createdAt':time.time(),'dumpSha256':hashlib.sha256(dump).hexdigest(),'snapshot':before}
 encrypted=engine.encrypt(c,engine.pack(meta,dump));file=engine.publish(backup_root/'backups'/('bk-'+meta['backupId']+'.age'),encrypted)
 restored_meta,authenticated_dump=engine.unpack(engine.decrypt(c,file));assert restored_meta==meta
 engine.docker(['run','-d','--name',TARGET,'--label','ch360.staging='+PROJECT,'--network',NETWORK,'--tmpfs','/var/lib/postgresql/data:size=512m,mode=0700','--env-file',str(work/'ch360_pr53_db.env'),engine.IMAGE])
 for i in range(60):
  if subprocess.run(['docker','--host=unix:///var/run/docker.sock','exec',TARGET,'pg_isready','-U','postgres'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:break
  time.sleep(.2)
 # Roles are local test infrastructure, separately recreated. No managed Cloud role is imported.
 quote=lambda s:"'"+s.replace("'","''")+"'"
 sql(TARGET,"create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create role authenticator login noinherit password "+quote(secret['restPassword'])+";grant anon,authenticated to authenticator;create role supabase_auth_admin login noinherit createrole password "+quote(secret['authPassword'])+";alter role supabase_auth_admin set search_path=auth,public;")
 listing=engine.docker(['exec','-i',TARGET,'pg_restore','--list'],authenticated_dump)
 lines=listing.decode().splitlines();filtered=[line for line in lines if not re.search(r'\bSCHEMA - public\b',line)]
 # TOC metadata only in tmpfs; the plaintext archive stays bounded in process memory.
 engine.docker(['exec','-i','--user','postgres',TARGET,'sh','-c','umask 077; cat > /dev/shm/pr53.list'],('\n'.join(filtered)+'\n').encode())
 pointer.write_text(json.dumps({'target':TARGET,'backup_path':str(file),'backup_root':str(backup_root)}));pointer.chmod(0o600)
 tool(TARGET,'pg_restore',['--exit-on-error','--single-transaction','--no-password','--use-list=/dev/shm/pr53.list'],authenticated_dump)
after=snapshot(TARGET)
# A logical dump compacts dropped-column slots and can omit explicit owner ACLs.
# Prove those are the ONLY metadata differences; never discard client grants or schema facts.
source_columns={(x['table_schema'],x['table_name'],x['column_name']):x for x in before['columns']}
target_columns={(x['table_schema'],x['table_name'],x['column_name']):x for x in after['columns']}
assert source_columns.keys()==target_columns.keys()
column_slot_differences=0
for key,item in source_columns.items():
 other=target_columns[key]
 assert {k:v for k,v in item.items() if k not in ('ordinal_position','dtd_identifier')}=={k:v for k,v in other.items() if k not in ('ordinal_position','dtd_identifier')}
 column_slot_differences+=int(item!=other)
for table in {(x[0],x[1]) for x in source_columns}:
 def order(columns):return [x['column_name'] for x in sorted(columns.values(),key=lambda x:x['ordinal_position']) if (x['table_schema'],x['table_name'])==table]
 assert order(source_columns)==order(target_columns)
owners={(x['schema'],x['name']):x['owner'] for x in before['tables']}
owners.update({(x['schema'],x['name']):x['owner'] for x in before['views']})
acl_key=lambda x:json.dumps(x,sort_keys=True)
source_acls={acl_key(x):x for x in before['acls']};target_acls={acl_key(x):x for x in after['acls']}
assert not (target_acls.keys()-source_acls.keys()),'Restore added ACL entries'
removed_owner_acls=[source_acls[k] for k in source_acls.keys()-target_acls.keys()]
assert all(x['role']==owners.get((x['schema'],x['table'])) for x in removed_owner_acls),'Client grant disappeared'
EFFECTIVE_SQL="""select jsonb_agg(jsonb_build_object('schema',n.nspname,'object',c.relname,'role',r.rolname,'privilege',p.name,'allowed',has_table_privilege(r.oid,c.oid,p.name))order by n.nspname,c.relname,r.rolname,p.name)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join pg_roles r cross join(values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN'))p(name)
 where n.nspname in('public','app_private','auth') and c.relkind in('r','p','v','m') and r.rolname in('postgres','anon','authenticated','service_role','authenticator','supabase_auth_admin')"""
assert json.loads(sql(SOURCE,EFFECTIVE_SQL))==json.loads(sql(TARGET,EFFECTIVE_SQL)),'Effective role privileges changed'
for key in before:
 if key not in ('columns','acls'):assert before[key]==after[key],key+' changed in restore'
receipt={'production':False,'source':'real local Auth + synthetic sports','restored':True,'tables':len(before['rows']),'rows':sum(r['count'] for r in before['rows']),'logical_schema_data_rls_effective_acls_functions_views_equal':True,'column_slot_changes':column_slot_differences,'owner_acl_entries_omitted':len(removed_owner_acls),'cipher_sha256':hashlib.sha256(encrypted).hexdigest(),'postgres':sql(TARGET,'show server_version'),'target':TARGET,'backup_path':str(file),'key_custody':'private ephemeral RAM; not production custody'}
engine.publish(backup_root/'audit'/('restore-'+uuid.uuid4().hex+'.json'),json.dumps(receipt).encode())
(work/'restore-results.json').write_text(json.dumps(receipt,indent=2));os.chmod(work/'restore-results.json',0o600)
print('PASS: authenticated encrypted synthetic full database restore; logical schema, rows, Auth tables, RLS, effective ACLs, functions and views equivalent. Tables:',receipt['tables'])
