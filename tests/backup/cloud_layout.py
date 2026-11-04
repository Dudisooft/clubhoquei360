"""Cloud-layout rehearsal, only synthetic PG17 containers; existing crypto is reused."""
import hashlib,json,os,re,subprocess,sys,time,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/backup'))
import manager as m

c=m.config('/workspace/private/ch360-keys-3a13/config.json')
# Component rehearsals have a separate namespace from whole-database backups.
component_dir=Path(c['backups'])/'cloud-layout';component_dir.mkdir(mode=0o700,exist_ok=True)
c={**c,'backups':str(m.private_dir(component_dir))}
group=uuid.uuid4().hex
source='ch360_bk13_cloud_src_'+group[:8];target='ch360_bk13_cloud_dst_'+group[:8]
checks=[]
def check(name,fn):
    fn();checks.append({'name':name,'result':'PASS'});print('PASS '+name,flush=True)
def create(name):
    m.docker(['run','-d','--name',name,'--network','none','--label','ch360.backup='+m.LABEL,'--tmpfs','/var/lib/postgresql/data:rw,size=256m,mode=700','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=fixture',m.IMAGE])
    m.inspect_container(name)
    for _ in range(60):
        try:m.sql(name,'select 1');return
        except m.BackupError:time.sleep(.25)
    raise AssertionError('Local PostgreSQL not ready')
create(source);create(target)
m.sql(source,Path('tests/backup/fixture.sql').read_text())
m.sql(source,"create schema storage;create table storage.buckets(id text primary key);create table storage.objects(id int primary key,bucket_id text references storage.buckets(id));create table auth.identities(id int primary key,user_id int references auth.users(id));insert into auth.identities values(1,1),(2,2);")
before=m.snapshot(source)
env={k:v for k,v in os.environ.items()if k not in('DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH')}
keeper=subprocess.Popen(['docker','--host=unix:///var/run/docker.sock','exec','-i','--user','postgres',source,'psql','-h','/var/run/postgresql','-U','postgres','-d','fixture','-qAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,env=env)
try:
    keeper.stdin.write(b'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n');keeper.stdin.flush()
    snapshot=keeper.stdout.readline().decode().strip();assert re.fullmatch('[0-9A-Fa-f-]+',snapshot)
    m.sql(source,"begin;update auth.users set label=label||' AFTER SNAPSHOT';insert into stats_events(match_id,club_id,player_id,operator_id,action)values(1,1,1,1,'goal');commit;")
    plans={'managed-schema':['--schema-only','--schema=auth','--schema=storage'],'managed-data':['--data-only','--schema=auth','--schema=storage'],'application':['--schema=public','--schema=app_private','--schema=supabase_migrations']}
    archives={}
    for component,flags in plans.items():
        dump=m.dbtool(source,'pg_dump',['--format=custom','--no-password','--lock-wait-timeout=3s','--snapshot='+snapshot]+flags)
        meta={'format':1,'purpose':m.LABEL,'dumpSha256':hashlib.sha256(dump).hexdigest(),'pgMajor':17,'snapshot':before,'component':component,'group':group}
        path=m.publish(Path(c['backups'])/('bk-'+uuid.uuid4().hex+'.age'),m.encrypt(c,m.pack(meta,dump)))
        recovered_meta,recovered_dump=m.unpack(m.decrypt(c,path))
        assert recovered_meta['group']==group and recovered_meta['component']==component
        assert recovered_dump==dump;archives[component]=recovered_dump
    check('three encrypted components authenticate before restore and share one snapshot/group',lambda:None)
finally:
    keeper.stdin.write(b'ROLLBACK;\n');keeper.stdin.close();keeper.wait(timeout=10)
m.prepare_target(c,target,{'pgMajor':17,'snapshot':before})
for component in ['managed-schema','managed-data','application']:
    m.inspect_container(target)
    opts=[]
    if component=='application':
        toc=m.docker(['exec','-i','--user','postgres',target,'pg_restore','--list'],archives[component]).decode()
        lines=toc.splitlines();skip=[line for line in lines if re.match(r'^\d+; \d+ \d+ SCHEMA - public ',line)]
        assert len(skip)==1
        selected=('\n'.join(line for line in lines if line not in skip)+'\n').encode()
        m.docker(['exec','-i','--user','postgres',target,'sh','-c','umask 077; cat > /tmp/cloud-app.toc'],selected)
        opts=['--use-list=/tmp/cloud-app.toc']
    restored=subprocess.run(['docker','--host=unix:///var/run/docker.sock','exec','-i','--user','postgres',target,'pg_restore','-h','/var/run/postgresql','-U','postgres','-d','fixture','--exit-on-error','--single-transaction']+opts,input=archives[component],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env)
    if restored.returncode:raise AssertionError(component+': '+restored.stderr.decode())
after=m.snapshot(target)
def exact():
    # Sequence high-water marks are not MVCC snapshots. Preserve them, do not rewind.
    assert {k:v for k,v in before.items()if k!='sequences'}=={k:v for k,v in after.items()if k!='sequences'}
check('application, private schema, migration ledger, Auth rows, owners, ACLs and RLS match the pre-writer snapshot',exact)
check('concurrent synthetic changes are absent from both restored component sets',lambda: (
    m.require(m.sql(target,'select count(*)from public.stats_events')=='2','wrong statistics snapshot'),
    m.require(m.sql(target,"select count(*)from auth.users where label like '%AFTER SNAPSHOT%'")=='0','wrong Auth snapshot')))
check('sequence high-water mark remains safe despite concurrent source insert',lambda:m.require(int(m.sql(target,"select last_value from public.stats_events_id_seq"))>=int(m.sql(target,'select max(id)from public.stats_events')),'sequence rewind'))
check('Storage metadata is covered and physically empty objects remain distinguishable',lambda:m.require(m.sql(target,'select count(*)from storage.objects')=='0','Storage mismatch'))
check('RLS still separates the two fictitious clubs after the split restore',lambda: (
    m.require(m.sql(target,'set role ch360_bk13_app;select count(*)from public.stats_events')=='SET\n1','club A access'),
    m.require(m.sql(target,'set role ch360_bk13_club_b;select count(*)from public.stats_events')=='SET\n1','club B access')))
# All containers remain quarantined; no scheduler, webhook, public port or outbound route.
for name in [source,target]:m.inspect_container(name)
check('source and restore have network none, no host mount and no published port',lambda:None)
Path('docs/evidence/cloud-backup-20261103-layout.json').write_text(json.dumps({'result':'PASS','date':'2026-11-03','checks':checks,'postgresMajor':17,'productionConnections':0,'productionExports':0,'sourceData':'synthetic reduced Auth/Storage schemas, not Supabase Cloud schema','coverageLimit':'No claim of real Cloud Auth baseline compatibility or real backup restoration','sequenceSnapshotLimit':'Sequence state is a non-MVCC high-water mark, not an exact timestamp value'},indent=2)+'\n')
print('COMPLETE '+str(len(checks))+' Cloud-layout rehearsal checks')
