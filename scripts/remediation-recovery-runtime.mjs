// Immutable local recovery-copy target, never an arbitrary connection option.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {root,work as mainWork,secrets as base,docker,network,dbName,assertIsolation} from './remediation-runtime.mjs';
import {sqlCopy} from './remediation-state.mjs';
export {root,docker,network,dbName};
const checkpoint=JSON.parse(fs.readFileSync(path.join(mainWork,'core-checkpoint-private.json')));export const database=checkpoint.recoveryDatabase;assert.match(database,/^ch360_3a8_restore_[0-9]+$/);
export const work=path.join(mainWork,'recovery'),secrets={...base,apiUrl:'http://127.0.0.1:56441',dbUrl:'postgresql://127.0.0.1:56432/'+database};
export function assertLocalStaging(c){assert.equal(c.projectId,'clubhoquei360-3a8-local');assert.equal(c.apiUrl,secrets.apiUrl);assert.equal(c.dbUrl,secrets.dbUrl);assertIsolation({database});return true;}
assertLocalStaging(secrets);fs.mkdirSync(work,{recursive:true,mode:0o700});for(const f of ['accounts-private.json','fixture-public.json']){const d=JSON.parse(fs.readFileSync(path.join(mainWork,f)));if(f==='fixture-public.json')d.apiUrl=secrets.apiUrl;fs.writeFileSync(path.join(work,f),JSON.stringify(d),{mode:0o600});}
export const sql=q=>sqlCopy(q,database);
export function startRecoveryServices(){
 const specs=[['ch360_3a8_recovery_auth','ghcr.io/supabase/gotrue:v2.197.0',{GOTRUE_API_HOST:'0.0.0.0',GOTRUE_API_PORT:9999,API_EXTERNAL_URL:secrets.apiUrl+'/auth/v1',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgresql://supabase_auth_admin:${secrets.authPassword}@${dbName}:5432/${database}`,GOTRUE_SITE_URL:'http://127.0.0.1:56490',GOTRUE_JWT_SECRET:secrets.jwtSecret,GOTRUE_JWT_EXP:3600,GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_AUD:'authenticated',GOTRUE_EXTERNAL_EMAIL_ENABLED:true,GOTRUE_MAILER_AUTOCONFIRM:true,GOTRUE_SMTP_HOST:'ch360_3a8_mail',GOTRUE_SMTP_PORT:1025,GOTRUE_SMTP_ADMIN_EMAIL:'noreply@ch360.invalid'}],['ch360_3a8_recovery_rest','ghcr.io/supabase/postgrest:v16.4',{PGRST_DB_URI:`postgresql://authenticator:${secrets.restPassword}@${dbName}:5432/${database}`,PGRST_DB_SCHEMAS:'public',PGRST_DB_EXTRA_SEARCH_PATH:'public,extensions',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secrets.jwtSecret,PGRST_SERVER_PORT:3000}]];
 for(const [name,image,env] of specs){assertLocalStaging(secrets);const found=docker(['inspect',name],{allowFailure:true});if(!found.status){const i=JSON.parse(found.stdout)[0];assert.equal(i.Config.Labels['ch360.staging'],secrets.projectId);assert.equal(i.Config.Labels['ch360.recovery-db'],database);docker(['start',name]);continue;}
  const file=path.join(work,name+'.env');fs.writeFileSync(file,Object.entries(env).map(([k,v])=>k+'='+v).join('\n'),{mode:0o600});docker(['run','-d','--name',name,'--label','ch360.staging='+secrets.projectId,'--label','ch360.recovery-db='+database,'--network',network,'--env-file',file,image]);
 }
}
