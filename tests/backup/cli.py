import sys,json,uuid,time,subprocess
from pathlib import Path
sys.path.insert(0,'scripts/backup');import manager as m
cfg='/workspace/private/ch360-keys-3a13/config.json';cmd=['python','scripts/backup/manager.py','--config',cfg];checks=[]
def invoke(args):
 p=subprocess.run(cmd+args,capture_output=True,text=True);assert p.returncode==0,p.stderr;checks.append({'command':args[0],'result':'PASS'});return json.loads(p.stdout)
b=invoke(['backup']);f=b['file'];assert invoke(['verify',f])['authenticated']
name='ch360_bk13_r'+uuid.uuid4().hex[:10]
m.docker(['run','-d','--name',name,'--network','none','--label','ch360.backup='+m.LABEL,'--tmpfs','/var/lib/postgresql/data:rw,size=256m,mode=700','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=fixture',m.IMAGE])
for _ in range(60):
 try:m.sql(name,'select 1');break
 except m.BackupError:time.sleep(.2)
assert invoke(['restore',f,'--target',name])['restoredMetadataAndRows'];assert invoke(['audit',f])['restored']
assert not invoke(['cleanup'])['apply']
escrow=invoke(['escrow-key'])['encryptedKeyEscrow'];key='/workspace/private/ch360-keys-3a13/cli-recovered-'+uuid.uuid4().hex+'.txt';invoke(['recover-key',escrow,'--output',key]);assert invoke(['verify',f,'--identity',key])['authenticated']
p=subprocess.run(cmd+['verify','/workspace/private/ch360-backups-3a13/absent.age'],capture_output=True,text=True);assert p.returncode!=0;checks.append({'command':'verify absent','result':'EXPECTED FAILURE'})
Path('docs/evidence/phase-3a13-cli-tests.json').write_text(json.dumps({'result':'PASS','checks':checks,'fixtureOnly':True,'productionExports':0,'productionMutations':0},indent=2));print('PASS 8 CLI success paths and one expected failure; independent real PG restore')
