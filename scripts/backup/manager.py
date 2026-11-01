"""Fixture-only encrypted backup tools. No TCP DB URL, production credentials or scheduler.
Encrypted age payload contains a PostgreSQL custom archive and a bound JSON manifest.
All plaintext is bounded in process memory; no plaintext dump file is created.
"""
import argparse, hashlib, io, json, os, re, shutil, stat, subprocess, sys, time, uuid, zipfile
from pathlib import Path

IMAGE = 'postgres@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b'
LABEL = 'clubhoquei360-3a13-fictional'
REPO = Path(__file__).resolve().parents[2]
MAX_BYTES = 128 * 1024 * 1024
class BackupError(Exception): pass

def require(ok, message):
    if not ok: raise BackupError(message)

def run(args, data=None, timeout=90, env=None):
    # Bound stdout while reading. Never spool plaintext to a filesystem.
    import selectors, threading
    proc = None
    try:
        proc = subprocess.Popen(args, stdin=subprocess.PIPE if data is not None else subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=env)
        def feed():
            try:
                if data is not None: proc.stdin.write(data); proc.stdin.close()
            except (BrokenPipeError, OSError): pass
        writer = threading.Thread(target=feed, daemon=True); writer.start()
        reader = selectors.DefaultSelector(); reader.register(proc.stdout, selectors.EVENT_READ)
        result = bytearray(); deadline = time.monotonic() + timeout
        while reader.get_map():
            require(time.monotonic() < deadline, 'operation timed out; target remains quarantined')
            for key, _ in reader.select(.2):
                block = os.read(key.fd, 65536)
                if not block: reader.unregister(key.fileobj); break
                result.extend(block); require(len(result) <= MAX_BYTES, 'memory bound exceeded')
        reader.close(); proc.stdout.close(); writer.join(timeout=2)
        require(proc.wait(timeout=max(.1,deadline-time.monotonic())) == 0,
                'tool returned failure: ' + Path(args[0]).name)
        return bytes(result)
    except (OSError, subprocess.TimeoutExpired) as e:
        raise BackupError('tool unavailable or operation interrupted') from e
    finally:
        if proc is not None and proc.poll() is None:
            proc.kill(); proc.wait(timeout=5)

def docker(args, data=None, timeout=90):
    env = {k:v for k,v in os.environ.items() if k not in ('DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH')}
    return run(['docker','--host=unix:///var/run/docker.sock'] + args, data, timeout, env)

def private_dir(path):
    p = Path(path).absolute()
    require(p.is_dir(), 'private directory absent')
    require(p == p.resolve(), 'symlink directory refused')
    s = p.stat()
    require(s.st_uid == os.getuid() and stat.S_IMODE(s.st_mode) == 0o700, 'directory must be owned and mode 0700')
    require(not p.is_relative_to(REPO), 'directory inside repository refused')
    g = subprocess.run(['git','-C',str(p),'rev-parse','--is-inside-work-tree'],capture_output=True)
    require(g.returncode != 0, 'Git working tree refused')
    return p

def private_file(path):
    p = Path(path).absolute(); private_dir(p.parent)
    require(p.exists(), 'file absent')
    s = p.lstat()
    require(stat.S_ISREG(s.st_mode) and not p.is_symlink() and s.st_nlink == 1, 'regular unlinked private file required')
    require(s.st_uid == os.getuid() and stat.S_IMODE(s.st_mode) == 0o600, 'file must be owned and mode 0600')
    return p

def publish(path, data):
    p = Path(path); private_dir(p.parent)
    require(not p.exists(), 'refusing overwrite')
    part = p.parent / ('.part-' + uuid.uuid4().hex)
    fd = os.open(part, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd,'wb') as f:
            f.write(data); f.flush(); os.fsync(f.fileno())
        os.link(part,p)  # Atomic no-replace publication, including concurrent creators.
    except FileExistsError as e: raise BackupError('refusing overwrite') from e
    finally: part.unlink(missing_ok=True)
    return p

def config(path):
    p = private_file(path); c = json.loads(p.read_text())
    require(c.get('purpose') == LABEL, 'only fictional configuration accepted')
    for key in ('backups','keys','recovery','escrow','audit'): private_dir(c[key])
    require(Path(c['age']).is_file() and Path(c['keygen']).is_file(), 'age tools absent')
    return c

def inspect_container(name):
    require(re.fullmatch(r'ch360_bk13_[a-z0-9_]+',name) is not None, 'container name refused')
    d = json.loads(docker(['inspect',name]))[0]
    require(d['Config']['Labels'].get('ch360.backup') == LABEL, 'container label refused')
    require(d['Config']['Image'] == IMAGE, 'container image refused')
    require(d['HostConfig']['NetworkMode'] == 'none', 'networked container refused')
    require(not d['HostConfig'].get('PortBindings') and not d['HostConfig'].get('Binds'), 'ports or binds refused')
    require(not any(m['Type']=='bind' for m in d['Mounts']), 'host mount refused')
    return d

def dbtool(name,tool,args=(),data=None,app=None):
    inspect_container(name)
    opts = ['exec','-i','--user','postgres']
    if app: opts += ['-e','PGAPPNAME='+app]
    return docker(opts+[name,tool,'-h','/var/run/postgresql','-U','postgres','-d','fixture']+list(args),data)

def sql(name,query):
    return dbtool(name,'psql',['-At','-v','ON_ERROR_STOP=1'],query.encode()).decode().strip()

def compatible(name):
    major=int(sql(name,"select current_setting('server_version_num')::int/10000"))
    require(major == 17, 'PostgreSQL major incompatible')
    version=docker(['exec','--user','postgres',name,'pg_dump','--version']).decode()
    require(' 17.' in version, 'pg_dump major incompatible')
    return major

SNAPSHOT_SQL = """select jsonb_build_object(
 'tables',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','auth','supabase_migrations') and c.relkind='r'),
 'sequences',(select jsonb_agg(to_jsonb(s)order by schemaname,sequencename)from pg_sequences s where schemaname in('public','auth','supabase_migrations')),
 'columns',(select jsonb_agg(to_jsonb(c)-'table_catalog'-'udt_catalog' order by table_schema,table_name,ordinal_position)from information_schema.columns c where table_schema in('public','auth','supabase_migrations')),
 'constraints',(select jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,'def',pg_get_constraintdef(oid))order by conrelid::regclass::text,conname)from pg_constraint where connamespace in('public'::regnamespace,'auth'::regnamespace,'supabase_migrations'::regnamespace)),
 'indexes',(select jsonb_agg(to_jsonb(i)order by schemaname,tablename,indexname)from pg_indexes i where schemaname in('public','auth','supabase_migrations')),
 'policies',(select jsonb_agg(to_jsonb(p)order by schemaname,tablename,policyname)from pg_policies p where schemaname='public'),
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'def',pg_get_functiondef(p.oid),'acl',p.proacl::text)order by p.proname)from pg_proc p where p.pronamespace='public'::regnamespace),
 'acls',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'role',coalesce(g.rolname,'PUBLIC'),'privilege',a.privilege_type,'grantable',a.is_grantable)order by n.nspname,c.relname,g.rolname,a.privilege_type)from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl)a left join pg_roles g on g.oid=a.grantee where n.nspname in('public','auth','supabase_migrations')),
 'defaults',(select jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',n.nspname,'acl',d.defaclacl::text)order by n.nspname)from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace where n.nspname in('public','auth','supabase_migrations')),
 'schema_acls',(select jsonb_agg(jsonb_build_object('schema',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl::text)order by nspname)from pg_namespace where nspname in('public','auth','supabase_migrations')),
 'roles',(select jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'superuser',rolsuper,'inherit',rolinherit,'bypassrls',rolbypassrls)order by rolname)from pg_roles where rolname like 'ch360_bk13_%')
)"""

def snapshot(name):
    d=json.loads(sql(name,SNAPSHOT_SQL)); d['rows']=[]
    for t in d['tables'] or []:
        # Identifiers are fixture schema metadata, never command-line SQL fragments from a user.
        s,tb=t['schema'],t['name']; require(re.fullmatch('[a-z_]+',s+tb) is not None,'identifier refused')
        r=json.loads(sql(name,f"select jsonb_build_object('schema','{s}','table','{tb}','count',count(*),'hash',md5(coalesce(string_agg(md5(to_jsonb(x)::text),'' order by md5(to_jsonb(x)::text)),'')))from {s}.{tb} x"));d['rows'].append(r)
    return d

def key_init(c):
    key=Path(c['keys'])/'identity.txt'; pub=Path(c['keys'])/'recipient.txt'
    require(not key.exists() and not pub.exists(),'key already exists')
    publish(key,run([c['keygen']]))
    publish(pub,run([c['keygen'],'-y',str(key)]))
    return {'result':'PASS','keyCreated':True,'secretPrinted':False}

def encrypt(c,data,recipient=None):
    require(len(data)<=MAX_BYTES,'memory bound exceeded')
    pub=private_file(recipient or Path(c['keys'])/'recipient.txt')
    return run([c['age'],'--encrypt','-R',str(pub)],data)

def decrypt(c,path,identity=None):
    p=private_file(path); key=private_file(identity or Path(c['keys'])/'identity.txt')
    require(p.stat().st_size<=MAX_BYTES,'encrypted size bound exceeded')
    # Do not feed pg_restore until age authenticates its final chunk successfully.
    data=run([c['age'],'--decrypt','-i',str(key),str(p)])
    require(len(data)<=MAX_BYTES,'decrypted memory bound exceeded')
    return data

def pack(meta,dump):
    b=io.BytesIO()
    with zipfile.ZipFile(b,'w',compression=zipfile.ZIP_STORED)as z:
        z.writestr('manifest.json',json.dumps(meta,sort_keys=True));z.writestr('database.dump',dump)
    return b.getvalue()

def unpack(data):
    try:
        with zipfile.ZipFile(io.BytesIO(data))as z:
            require(z.namelist()==['manifest.json','database.dump'],'unexpected package members')
            require(sum(x.file_size for x in z.infolist())<=MAX_BYTES,'package bound exceeded')
            meta=json.loads(z.read('manifest.json'));dump=z.read('database.dump')
    except (ValueError,KeyError,zipfile.BadZipFile)as e: raise BackupError('invalid package')from e
    require(meta.get('format')==1 and meta.get('purpose')==LABEL,'format or purpose incompatible')
    require(hashlib.sha256(dump).hexdigest()==meta['dumpSha256'],'archive integrity mismatch')
    return meta,dump

def backup(c,source,min_free=256*1024*1024,role=None):
    root=private_dir(c['backups']);require(shutil.disk_usage(root).free>=min_free,'insufficient free space')
    major=compatible(source)
    require(sql(source,'select purpose from public.backup_environment')==LABEL,'source is not a fictional fixture')
    before=snapshot(source)
    args=['--format=custom','--no-password','--lock-wait-timeout=3s']
    if role:
        require(role=='ch360_bk13_guest','unsupported test role');args+=['--role='+role]
    dump=dbtool(source,'pg_dump',args)
    require(dump.startswith(b'PGDMP')and len(dump)<=MAX_BYTES,'invalid or oversized dump')
    require(snapshot(source)==before,'source changed while backing up')
    meta={'format':1,'purpose':LABEL,'backupId':uuid.uuid4().hex,'createdAt':time.time(),'pgMajor':major,'dumpSha256':hashlib.sha256(dump).hexdigest(),'snapshot':before,'globals':'only the two explicit fictional NOLOGIN roles are supported; no credentials'}
    payload=pack(meta,dump);encrypted=encrypt(c,payload)
    require(shutil.disk_usage(root).free>=len(encrypted)+min_free,'insufficient publication space')
    p=publish(root/('bk-'+meta['backupId']+'.age'),encrypted)
    return {'result':'PASS','file':str(p),'cipherSha256':hashlib.sha256(encrypted).hexdigest(),'bytes':len(encrypted),'tables':len(before['rows'])}

def verify(c,path,identity=None):
    m,d=unpack(decrypt(c,path,identity))
    # The pg_restore client may be an empty independent tool container, never the source DB.
    client=c.get('client_container','ch360_bk13_tools'); inspect_container(client)
    listing=docker(['exec','-i','--user','postgres',client,'pg_restore','--list'],d)
    require(b'TABLE DATA' in listing,'archive data missing')
    return {'result':'PASS','backupId':m['backupId'],'authenticated':True,'archiveReadable':True,'restored':False}

def prepare_target(c,target,meta):
    require(target!='ch360_bk13_src','source cannot be restore destination')
    require(compatible(target)==meta['pgMajor'],'archive PostgreSQL version incompatible')
    require(sql(target,"select count(*)from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r'and n.nspname not like 'pg_%'and n.nspname<>'information_schema'")=='0','restore target is not empty')
    # Global objects are not in pg_dump. Only these fixed synthetic roles are permitted.
    require([r['name']for r in meta['snapshot']['roles']]==['ch360_bk13_app','ch360_bk13_guest'],'role manifest refused')
    sql(target,'create role ch360_bk13_app nologin;create role ch360_bk13_guest nologin;')

def restore(c,path,target,identity=None):
    meta,dump=unpack(decrypt(c,path,identity));prepare_target(c,target,meta)
    dbtool(target,'pg_restore',['--exit-on-error','--single-transaction','--no-password'],dump)
    require(snapshot(target)==meta['snapshot'],'restored schema, roles, permissions or rows differ')
    receipt={'result':'PASS','backupId':meta['backupId'],'cipherSha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),'restoredMetadataAndRows':True,'tables':len(meta['snapshot']['rows']),'production':False}
    publish(Path(c['audit'])/('restore-'+uuid.uuid4().hex+'.json'),json.dumps(receipt).encode())
    return receipt

def cleanup(c,identity=None,days=14,keep=3,apply=False):
    require(days>=1 and keep>=1,'retention cannot remove every copy')
    root=private_dir(c['backups']);files=[]
    # Every candidate must authenticate; malformed files are quarantined, never auto-deleted.
    for p in root.glob('bk-*.age'):
        require(re.fullmatch(r'bk-[0-9a-f]{32}\.age',p.name)is not None,'unexpected backup name')
        meta,_=unpack(decrypt(c,p,identity));files.append((meta['createdAt'],p,hashlib.sha256(p.read_bytes()).hexdigest()))
    files.sort(reverse=True);cutoff=time.time()-days*86400;plan=[(p,h)for ts,p,h in files[keep:]if ts<cutoff]
    receipts=[json.loads(p.read_text())for p in private_dir(c['audit']).glob('restore-*.json')]
    require(not plan or any(r.get('restoredMetadataAndRows')and r.get('cipherSha256')in[h for _,_,h in files[:keep]]for r in receipts),'no verified restored surviving copy')
    if apply:
        for p,h in plan:
            private_file(p);require(hashlib.sha256(p.read_bytes()).hexdigest()==h,'cleanup file changed');p.unlink()
    return {'result':'PASS','apply':apply,'candidates':[p.name for p,_ in plan],'kept':len(files)-len(plan),'retentionDays':days,'minimumCopies':keep}

def escrow_key(c):
    recovery=private_file(Path(c['recovery'])/'identity.txt')
    pub=private_file(Path(c['recovery'])/'recipient.txt')
    data=private_file(Path(c['keys'])/'identity.txt').read_bytes()
    out=publish(Path(c['escrow'])/('key-'+uuid.uuid4().hex+'.age'),encrypt(c,data,pub))
    return {'result':'PASS','encryptedKeyEscrow':str(out),'offsiteCustodyVerified':False}

def recover_key(c,path,output):
    out=Path(output).absolute();require(out.parent==Path(c['keys']),'recovery output must be in private key directory')
    data=decrypt(c,path,Path(c['recovery'])/'identity.txt')
    require(data.startswith(b'#')or data.startswith(b'AGE-SECRET-KEY-'),'unexpected recovered identity')
    publish(out,data)
    run([c['keygen'],'-y',str(out)])
    return {'result':'PASS','recoveredIdentity':str(out),'secretPrinted':False}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--config',required=True);sub=p.add_subparsers(dest='command',required=True)
    sub.add_parser('init-key');sub.add_parser('escrow-key');rk=sub.add_parser('recover-key');rk.add_argument('file');rk.add_argument('--output',required=True);b=sub.add_parser('backup');b.add_argument('--source',default='ch360_bk13_src');v=sub.add_parser('verify',aliases=['audit']);v.add_argument('file');v.add_argument('--identity');r=sub.add_parser('restore');r.add_argument('file');r.add_argument('--target',required=True);r.add_argument('--identity');cl=sub.add_parser('cleanup');cl.add_argument('--apply',action='store_true');cl.add_argument('--days',type=int,default=14);cl.add_argument('--keep',type=int,default=3)
    a=p.parse_args();c=config(a.config)
    if a.command=='init-key':out=key_init(c)
    elif a.command=='escrow-key':out=escrow_key(c)
    elif a.command=='recover-key':out=recover_key(c,a.file,a.output)
    elif a.command=='backup':out=backup(c,a.source)
    elif a.command in ('verify','audit'):out=verify(c,a.file,a.identity)
    elif a.command=='restore':out=restore(c,a.file,a.target,a.identity)
    else:out=cleanup(c,days=a.days,keep=a.keep,apply=a.apply)
    print(json.dumps(out))
if __name__=='__main__':
    try:main()
    except (BackupError,OSError,ValueError)as e:
        print(json.dumps({'result':'FAIL','reason':str(e)if isinstance(e,BackupError)else type(e).__name__}),file=sys.stderr);sys.exit(1)
