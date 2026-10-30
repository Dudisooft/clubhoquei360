// Dedicated local cluster. Cloud postgres is reproduced as NONSUPERUSER;
// a separate fictitious supervisor is used only for bootstrap/backup/restore.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {docker as parentDocker} from './integration-runtime.mjs';
import {assertLocalStaging,LOCAL_PROJECT,LOCAL_API,LOCAL_DB} from './remediation-safety.mjs';
export const root=path.resolve(new URL('..',import.meta.url).pathname),work=path.join(root,'work/staging-3a8'),network='ch360_3a8_isolated',dbName='ch360_3a8_db',docker=parentDocker;
fs.mkdirSync(work,{recursive:true,mode:0o700});const privateFile=path.join(work,'runtime-private.json');
if(!fs.existsSync(privateFile)){const jwtSecret=crypto.randomBytes(48).toString('hex'),enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role:'anon',iss:'ch360-local-infrastructure',exp:Math.floor(Date.now()/1000)+30*86400}),random=()=>crypto.randomBytes(24).toString('hex');
 fs.writeFileSync(privateFile,JSON.stringify({projectId:LOCAL_PROJECT,apiUrl:LOCAL_API,dbUrl:LOCAL_DB,jwtSecret,anonKey:body+'.'+crypto.createHmac('sha256',jwtSecret).update(body).digest('base64url'),dbPassword:random(),adminPassword:random(),authPassword:random(),restPassword:random()}),{mode:0o600});}
export const secrets=JSON.parse(fs.readFileSync(privateFile));assertLocalStaging(secrets);
const image='postgres@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b';
function raw(query,{admin=false,database='postgres'}={}){if(database!=='postgres'&&!/^ch360_3a8_restore_[0-9]+$/.test(database))throw Error('Unexpected local DB');return docker(['exec','-i','-e','PGPASSWORD',dbName,'psql','-h','127.0.0.1','-p','5432','-U',admin?'stage_cluster_admin':'postgres','-d',database,'-v','ON_ERROR_STOP=1','-At'],{input:query,extraEnv:{PGPASSWORD:admin?secrets.adminPassword:secrets.dbPassword}}).stdout.trim();}
export function assertIsolation({admin=false,bootstrap=false,database='postgres'}={}){
 assertLocalStaging(secrets);const i=JSON.parse(docker(['inspect',dbName]).stdout)[0],net=JSON.parse(docker(['network','inspect',network]).stdout)[0];
 assert.equal(i.Config.Labels?.['ch360.staging'],LOCAL_PROJECT);assert.equal(i.Config.Image,image);assert.equal(net.Internal,true);
 assert.deepEqual(i.HostConfig.PortBindings['5432/tcp'],[{HostIp:'127.0.0.1',HostPort:'56432'}]);assert.ok(i.Mounts.some(m=>m.Name==='ch360_3a8_pgdata'&&m.Type==='volume'));
 const state=JSON.parse(raw("select jsonb_build_object('db',current_database(),'user',current_user,'host',inet_server_addr()::text,'port',inet_server_port(),'superuser',(select rolsuper from pg_roles where rolname=current_user))",{admin,database}));
 assert.equal(state.db,database);assert.equal(state.user,admin?'stage_cluster_admin':'postgres');assert.equal(state.host.split('/')[0],'127.0.0.1');assert.equal(state.port,5432);assert.equal(state.superuser,admin);
 if(!bootstrap)assert.equal(raw('select project_id from app_private.remediation_environment',{admin,database}),LOCAL_PROJECT);
 return {projectId:LOCAL_PROJECT,host:'127.0.0.1',configuredHostPort:56432,sqlTransport:'local Docker exec to 127.0.0.1:5432',hostPortPublished:!!i.NetworkSettings.Ports['5432/tcp'],database,user:state.user,superuser:state.superuser,networkInternal:true,volume:'ch360_3a8_pgdata'};
}
export function sql(query){assertIsolation();return raw(query);}
export function adminSql(query,database='postgres'){assertIsolation({admin:true,database});return raw(query,{admin:true,database});}
function run(name,containerImage,values,ports=[]){const old=docker(['inspect',name],{allowFailure:true});if(!old.status){assert.equal(JSON.parse(old.stdout)[0].Config.Labels['ch360.staging'],LOCAL_PROJECT);docker(['start',name]);return;}
 const file=path.join(work,name+'.env');fs.writeFileSync(file,Object.entries(values).map(([k,v])=>k+'='+v).join('\n'),{mode:0o600});docker(['run','-d','--name',name,'--label','ch360.staging='+LOCAL_PROJECT,'--network',network,'--env-file',file,...ports.flatMap(p=>['-p',p]),...(name===dbName?['--mount','type=volume,src=ch360_3a8_pgdata,dst=/var/lib/postgresql/data']:[]),containerImage]);}
export async function start(){
 const n=docker(['network','inspect',network],{allowFailure:true});if(n.status)docker(['network','create','--internal','--label','ch360.staging='+LOCAL_PROJECT,network]);else assert.equal(JSON.parse(n.stdout)[0].Internal,true);
 run(dbName,image,{POSTGRES_USER:'stage_cluster_admin',POSTGRES_DB:'postgres',POSTGRES_PASSWORD:secrets.adminPassword},['127.0.0.1:56432:5432']);
 for(let i=0;i<60;i++){if(!docker(['exec',dbName,'pg_isready','-U','stage_cluster_admin','-d','postgres'],{allowFailure:true}).status)break;await new Promise(r=>setTimeout(r,500));if(i===59)throw Error('Local DB unavailable');}
 assertIsolation({admin:true,bootstrap:true});
 if(raw("select to_regclass('app_private.remediation_environment') is not null",{admin:true})!=='t'){
  assert.equal(raw("select to_regclass('public.teams') is not null",{admin:true}),'f','Do not overwrite a partial restore');
  const backupFile=path.join(root,'work/staging-3a6/isolated-backup-private.sql'),dump=fs.readFileSync(backupFile,'utf8'),backup=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/integration-3a6-backup.json')));
  assert.equal(crypto.createHash('sha256').update(dump).digest('hex'),backup.dumpSha256,'Old local snapshot digest mismatch');assert.equal(backup.restoredRowsMatch,true);assert.equal(backup.productionBackupTested,false);
  fs.writeFileSync(path.join(work,'predecessor-private.sql'),dump,{mode:0o600});const database='verified local 3A.6 dump; legacy ACL reconstructed from read-only inventory';
  raw(`create role postgres login nosuperuser createdb createrole bypassrls password '${secrets.dbPassword}';create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create role authenticator login noinherit password '${secrets.restPassword}';create role supabase_auth_admin login noinherit createrole password '${secrets.authPassword}';grant anon,authenticated,service_role to authenticator with inherit false,set true;grant anon,authenticated,service_role,pg_read_all_data,pg_monitor to postgres;alter database postgres owner to postgres;alter role supabase_auth_admin set search_path=auth,public;`,{admin:true});
  assertIsolation({admin:true,bootstrap:true});raw(dump,{admin:true});
  raw(`create table app_private.remediation_environment(project_id text primary key,source_database text,dump_sha256 text);insert into app_private.remediation_environment values('${LOCAL_PROJECT}','${database}','${crypto.createHash('sha256').update(dump).digest('hex')}');alter table app_private.remediation_environment owner to postgres;`,{admin:true});
  const fixtureCheck=JSON.parse(raw("select jsonb_build_object('users',(select count(*) from auth.users),'nonfictional',(select count(*) from auth.users where email not like '%@ch360.invalid'))",{admin:true}));assert.equal(fixtureCheck.users,8);assert.equal(fixtureCheck.nonfictional,0);
  // Exact relevant defaults captured read-only, not a synthetic GRANT ALL.
  const meta=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/remediation-3a8-production-metadata.json'))),Q=s=>'"'+s.replaceAll('"','""')+'"';
  assertIsolation();sql(meta.inventory.map(d=>`grant truncate on table ${Q(d.schema)}.${Q(d.table_name)} to ${Q(d.beneficiary)};`).join('\n'));
  sql(meta.defaults.map(d=>`alter default privileges for role postgres in schema public grant ${d.privilege} on tables to ${Q(d.beneficiary)};`).join('\n'));
  for(const file of ['accounts-private.json','fixture-public.json']){const d=JSON.parse(fs.readFileSync(path.join(root,'work/staging-3a6',file)));if(file==='fixture-public.json'){d.projectId=LOCAL_PROJECT;d.apiUrl=LOCAL_API;}fs.writeFileSync(path.join(work,file),JSON.stringify(d),{mode:0o600});}
 }
 assertIsolation();
 run('ch360_3a8_mail','ghcr.io/supabase/mailpit:v1.31.3',{});
 run('ch360_3a8_auth','ghcr.io/supabase/gotrue:v2.197.0',{GOTRUE_API_HOST:'0.0.0.0',GOTRUE_API_PORT:9999,API_EXTERNAL_URL:LOCAL_API+'/auth/v1',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgresql://supabase_auth_admin:${secrets.authPassword}@${dbName}:5432/postgres`,GOTRUE_SITE_URL:'http://127.0.0.1:56490',GOTRUE_JWT_SECRET:secrets.jwtSecret,GOTRUE_JWT_EXP:3600,GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_ADMIN_ROLES:'service_role',GOTRUE_EXTERNAL_EMAIL_ENABLED:true,GOTRUE_MAILER_AUTOCONFIRM:true,GOTRUE_SMTP_HOST:'ch360_3a8_mail',GOTRUE_SMTP_PORT:1025,GOTRUE_SMTP_ADMIN_EMAIL:'noreply@ch360.invalid'},['127.0.0.1:56435:9999']);
 run('ch360_3a8_rest','ghcr.io/supabase/postgrest:v16.4',{PGRST_DB_URI:`postgresql://authenticator:${secrets.restPassword}@${dbName}:5432/postgres`,PGRST_DB_SCHEMAS:'public',PGRST_DB_EXTRA_SEARCH_PATH:'public,extensions',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secrets.jwtSecret,PGRST_SERVER_PORT:3000},['127.0.0.1:56436:3000']);
 console.log('Dedicated 3A.8 local staging ready; operational postgres is not superuser.');
}
if(process.argv[1]===new URL(import.meta.url).pathname)await start();
