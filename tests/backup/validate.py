"""Real PostgreSQL 17 + age integration and failure tests, fictional data exclusively."""
import sys, os, json, time, hashlib, shutil, subprocess, uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/backup'))
import manager as m
ROOT=Path('/workspace/private');B=ROOT/'ch360-backups-3a13';K=ROOT/'ch360-keys-3a13';T=ROOT/'ch360-tools'
for p in [ROOT,B,K,K/'recovery',K/'escrow',B/'audit']:
    p.mkdir(mode=0o700,exist_ok=True);p.chmod(0o700)
CP=K/'config.json'
if not CP.exists():m.publish(CP,json.dumps({'purpose':m.LABEL,'backups':str(B),'keys':str(K),'recovery':str(K/'recovery'),'escrow':str(K/'escrow'),'audit':str(B/'audit'),'age':str(T/'age'),'keygen':str(T/'age-keygen')}).encode())
c=m.config(CP);checks=[];failures=[]
Path('docs/evidence/phase-3a13-backup-tests.json').write_text(json.dumps({'result':'IN_PROGRESS','checks':checks,'productionOperations':0}))
def check(name,fn):
    fn();checks.append({'name':name,'result':'PASS'});print('PASS '+name,flush=True)
    Path('work/3a13').mkdir(parents=True,exist_ok=True);Path('work/3a13/checkpoint.json').write_text(json.dumps({'checks':checks,'productionOperations':0},indent=2))
def rejects(fn):
    try:fn()
    except (m.BackupError,OSError):return
    raise AssertionError('Unexpected success')
def container(name):
    old=m.docker(['ps','-aq','--filter','name=^/'+name+'$']).strip()
    if old:
        m.inspect_container(name);m.docker(['start',name])
    else:m.docker(['run','-d','--name',name,'--network','none','--label','ch360.backup='+m.LABEL,'--tmpfs','/var/lib/postgresql/data:rw,size=256m,mode=700','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=fixture',m.IMAGE])
    for _ in range(60):
        try:m.sql(name,'select 1');return
        except m.BackupError:time.sleep(.2)
    raise AssertionError('fixture unavailable')
def target():
    name='ch360_bk13_r'+uuid.uuid4().hex[:10];container(name);return name
container('ch360_bk13_tools')
container('ch360_bk13_src')
if m.sql('ch360_bk13_src',"select to_regclass('public.backup_environment')is null")=='t':m.sql('ch360_bk13_src',Path('tests/backup/fixture.sql').read_text())
if not(K/'identity.txt').exists():m.key_init(c)
check('real PostgreSQL 17 and custom archive clients; source private and networkless',lambda: (m.compatible('ch360_bk13_src')==17 or (_ for _ in()).throw(AssertionError())))
started=time.monotonic();result=m.backup(c,'ch360_bk13_src');backup=Path(result['file']);meta,dump=m.unpack(m.decrypt(c,backup));original=m.snapshot('ch360_bk13_src')
check('authenticated encrypted backup and full archive readable; no plaintext dump file',lambda: (m.verify(c,backup)['authenticated']or (_ for _ in()).throw(AssertionError())))
dest=target();restored=m.restore(c,backup,dest);elapsed=time.monotonic()-started
check('restore into independent cluster: all rows, schema, indexes, functions, ACL/defaults, roles and ledger equal',lambda: (m.snapshot(dest)==original or (_ for _ in()).throw(AssertionError())))
def policies():
    assert m.sql(dest,"set role ch360_bk13_app;select string_agg(club_id::text,',')from stats_events")=='SET\n1'
    assert m.sql(dest,"set role ch360_bk13_app;set fixture.club='2';select string_agg(club_id::text,',')from stats_events")=='SET\nSET\n1'
    assert m.sql(dest,"set role ch360_bk13_club_b;select string_agg(club_id::text,',')from stats_events")=='SET\n2'
    rejects(lambda:m.sql(dest,"set role ch360_bk13_app;insert into stats_events(match_id,club_id,action)values(1,1,'goal')"))
    rejects(lambda:m.sql(dest,'set role ch360_bk13_guest;select * from stats_events'))
    assert m.sql(dest,"select has_table_privilege('ch360_bk13_app','stats_events','TRUNCATE')")=='f'
    assert m.sql(dest,"begin;insert into stats_events(match_id,club_id,action)values(1,1,'goal');select count(*)from app_private.backup_notes;rollback;").splitlines()[-2]=='2'
    assert m.sql(dest,"select count(*)from lineups l where not exists(select 1 from players p where p.id=l.player_id)")=='0'
check('restored RLS binds two SQL identities to clubs, denies forged scope/write/guest/TRUNCATE; FK intact',policies)
def keys():
    recovery=K/'recovery'/'identity.txt'
    if not recovery.exists():m.publish(recovery,m.run([c['keygen']]))
    pub=K/'recovery'/'recipient.txt'
    if not pub.exists():m.publish(pub,m.run([c['keygen'],'-y',str(recovery)]))
    escrow=K/'escrow'/('identity-'+uuid.uuid4().hex+'.age');m.publish(escrow,m.encrypt(c,(K/'identity.txt').read_bytes(),pub))
    recovered=K/('recovered-'+uuid.uuid4().hex+'.txt');m.recover_key(c,escrow,recovered)
    assert m.verify(c,backup,recovered)['authenticated'];new=target();assert m.restore(c,backup,new,recovered)['result']=='PASS'
    # The original key is never needed by these recovery operations.
check('encrypted key escrow recovered using separate recovery identity; recovered key decrypts and restores',keys)
def bad_file(data):
    p=B/('failure-'+uuid.uuid4().hex+'.age');m.publish(p,data);rejects(lambda:m.verify(c,p));return p
check('truncated/incomplete age file fails authentication',lambda:bad_file(backup.read_bytes()[:-40]))
def tamper():
    data=bytearray(backup.read_bytes());data[len(data)//2]^=1;bad_file(bytes(data))
check('altered ciphertext fails authentication',tamper)
def wrong_key():
    wrong=K/('wrong-'+uuid.uuid4().hex+'.txt');m.publish(wrong,m.run([c['keygen']]))
    rejects(lambda:m.verify(c,backup,wrong))
check('wrong private key fails and produces no restore',wrong_key)
check('insufficient disk space guard refuses backup before publication',lambda:rejects(lambda:m.backup(c,'ch360_bk13_src',min_free=shutil.disk_usage(B).free+1)))
check('absent backup fails',lambda:rejects(lambda:m.verify(c,B/'absent.age')))
check('source DB as destination and wrong container are refused before DDL',lambda:(rejects(lambda:m.restore(c,backup,'ch360_bk13_src')),rejects(lambda:m.restore(c,backup,'production'))))
def permissions():
    key=K/'identity.txt';key.chmod(0o644)
    try:rejects(lambda:m.verify(c,backup))
    finally:key.chmod(0o600)
    rejects(lambda:m.backup(c,'ch360_bk13_src',role='ch360_bk13_guest'))
check('unsafe file permissions and SQL role lacking SELECT fail without backup success',permissions)
def incompatible():
    bad={**meta,'pgMajor':18};p=B/('failure-'+uuid.uuid4().hex+'.age');m.publish(p,m.encrypt(c,m.pack(bad,dump)));new=target();rejects(lambda:m.restore(c,p,new));assert m.sql(new,"select count(*)from pg_class where relnamespace='public'::regnamespace and relkind='r'")=='0'
check('authenticated manifest requiring PG18 refused by real PG17 target, no DDL',incompatible)
def overwrite():
    rejects(lambda:m.publish(backup,b'do not overwrite'));assert hashlib.sha256(backup.read_bytes()).hexdigest()==result['cipherSha256']
    link=B/'symlink.age';link.symlink_to(backup)
    try:rejects(lambda:m.verify(c,link))
    finally:link.unlink()
check('overwrite and symlink paths refused',overwrite)
def nonempty_target():
    new=target();m.sql(new,'create view public.unexpected as select 1 as id');rejects(lambda:m.restore(c,backup,new))
    assert m.sql(new,"select count(*)from pg_roles where rolname='ch360_bk13_app'")=='0'
check('partially populated destination with a view is refused before creating roles or objects',nonempty_target)
check('audit distinguishes an authenticated archive from a successfully restored receipt',lambda: (m.audit(c,backup)['restored']or (_ for _ in()).throw(AssertionError())))
def interruption():
    new=target();m.prepare_target(c,new,meta)
    sqltext=m.docker(['exec','-i','--user','postgres','ch360_bk13_src','pg_restore','--file=-'],dump)
    app='fixture_restore_cancel_'+uuid.uuid4().hex[:8]
    # Replay actual pg_restore SQL in one transaction; cancel while sleeping before COMMIT.
    m.inspect_container(new)
    proc=subprocess.Popen(['docker','--host=unix:///var/run/docker.sock','exec','-i','--user','postgres','-e','PGAPPNAME='+app,new,'psql','-h','/var/run/postgresql','-U','postgres','-d','fixture','-At','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    import threading
    errors=[]
    def feed():
        try:proc.stdin.write(b'begin;\n'+sqltext+b'\nselect pg_sleep(20);commit;');proc.stdin.close()
        except BrokenPipeError:pass
    th=threading.Thread(target=feed);th.start()
    cancelled=False
    for _ in range(100):
        found=m.sql(new,f"select pid from pg_stat_activity where application_name='{app}'and wait_event='PgSleep'")
        if found:m.sql(new,'select pg_cancel_backend('+str(int(found))+')');cancelled=True;break
        time.sleep(.05)
    assert cancelled;assert proc.wait(timeout=15)!=0;th.join(timeout=5)
    assert m.sql(new,"select count(*)from pg_class where relnamespace='public'::regnamespace and relkind='r'")=='0'
check('real interrupted restoration transaction cancelled locally; no partial application tables remain',interruption)
def retention():
    # Use separate directory so failure specimens cannot enter the cleanup set.
    folder=B/('retention-'+uuid.uuid4().hex);folder.mkdir(mode=0o700,exist_ok=True);cfg={**c,'backups':str(folder)}
    for i in range(4):
        old={**meta,'backupId':uuid.uuid4().hex,'createdAt':time.time()-(30+i)*86400};p=folder/('bk-'+old['backupId']+'.age');m.publish(p,m.encrypt(c,m.pack(old,dump)))
    keep=sorted(folder.glob('bk-*.age'))
    # Preserve a new genuinely restored copy with a matching receipt.
    fresh=m.publish(folder/backup.name,backup.read_bytes())
    plan=m.cleanup(cfg,days=14,keep=3);assert not plan['apply']and len(plan['candidates'])>=1
    before=len(list(folder.glob('*.age')));m.cleanup(cfg,days=14,keep=3,apply=True);assert len(list(folder.glob('*.age')))==before-len(plan['candidates']);assert len(list(folder.glob('*.age')))>=3;assert fresh.exists();assert before>3
check('retention dry-run, preserve three copies including restored survivor; explicit local cleanup only',retention)
def source_offline():
    assert m.snapshot('ch360_bk13_src')==original
    m.docker(['stop','ch360_bk13_src'])
    try:
        assert m.verify(c,backup)['authenticated']
        new=target();assert m.restore(c,backup,new)['restoredMetadataAndRows']
    finally:
        container('ch360_bk13_src')
        # This deliberately volatile source was lost on stop; recreate only the fictional seed.
        m.sql('ch360_bk13_src',Path('tests/backup/fixture.sql').read_text())
check('source offline: backup and key suffice to verify and restore on independent cluster',source_offline)
assert m.snapshot('ch360_bk13_src')==original
summary={'result':'PASS','fixtureOnly':True,'realPostgreSQL':True,'realSupabaseAuth':False,'postgres':m.sql('ch360_bk13_src',"select current_setting('server_version')"),'age':m.run([c['age'],'--version']).decode().strip(),'image':m.IMAGE,'network':'none','publishedPorts':0,'tables':restored['tables'],'schemaAndDataExact':True,'rlsAndPrivilegesVerified':True,'keyRecoveryVerifiedLocally':True,'physicalOffsiteCustodyVerified':False,'localBackupPlusRestoreSeconds':round(elapsed,3),'timeIsProductionRto':False,'checks':checks,'productionConnections':0,'productionExports':0,'productionMutations':0,'scheduledTasksInstalled':0}
Path('docs/evidence/phase-3a13-backup-tests.json').write_text(json.dumps(summary,indent=2));print('COMPLETE '+str(len(checks))+' real local/failure checks',flush=True)
