import fs from 'node:fs';import path from 'node:path';import {spawnSync,spawn} from 'node:child_process';
import {assertLocalStaging,LOCAL_PROJECT,LOCAL_API,LOCAL_DB,assertLocalConfig} from './staging-safety.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname),work=path.join(root,'work/staging-3a3'),config=path.join(work,'supabase/config.toml'),cli=path.join(root,'node_modules/.bin/supabase');
assertLocalStaging({projectId:LOCAL_PROJECT,apiUrl:LOCAL_API,dbUrl:LOCAL_DB});fs.mkdirSync(work,{recursive:true,mode:0o700});
const env={...process.env,DOCKER_HOST:'unix:///var/run/docker.sock'};for(const k of ['DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
const log=fs.openSync(path.join(work,'lifecycle.log'),'a',0o600);
function check(){if(fs.existsSync(path.join(work,'supabase/.temp/project-ref')))throw Error('A linked remote project is forbidden.');assertLocalConfig(fs.readFileSync(config,'utf8'));}
if(!fs.existsSync(config)){const r=spawnSync(cli,['init','--workdir',work,'--yes'],{env,stdio:['ignore',log,log]});if(r.status)throw Error('Local init failed; inspect private lifecycle log.');}
let c=fs.readFileSync(config,'utf8');if(!c.includes('project_id = "staging-3a3"'))assertLocalConfig(c);c=c.replace(/^project_id = .*$/m,`project_id = "${LOCAL_PROJECT}"`).replaceAll('54321','56321').replaceAll('54322','56322').replaceAll('54320','56320').replaceAll('54323','56323').replaceAll('54324','56324').replaceAll('54329','56329').replaceAll('127.0.0.1:3000','127.0.0.1:56380');fs.writeFileSync(config,c,{mode:0o600});check();fs.writeFileSync(path.join(work,'STAGING_ONLY.json'),JSON.stringify({projectId:LOCAL_PROJECT,apiUrl:LOCAL_API,dbUrl:LOCAL_DB}),{mode:0o600});
const command=process.argv[2]||'prepare';
if(command==='prepare'){console.log('Isolated local configuration prepared.');process.exit(0);}
if(!['start','stop','status'].includes(command))throw Error('Use prepare, start, status or stop; remote CLI commands are forbidden.');
const args=[command,'--workdir',work];if(command==='start')args.push('--exclude','realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor');if(command==='status')args.push('--output','json');
if(command==='status'){
 const r=spawnSync(cli,args,{env,encoding:'utf8'});if(r.status)throw Error('Local status unavailable.');const d=JSON.parse(r.stdout);
 const api=d.API_URL||d.API_EXTERNAL_URL;assertLocalStaging({projectId:LOCAL_PROJECT,apiUrl:api,dbUrl:d.DB_URL});
 fs.writeFileSync(path.join(work,'connection.json'),JSON.stringify({apiUrl:api,anonKey:d.ANON_KEY||d.PUBLISHABLE_KEY,projectId:LOCAL_PROJECT}),{mode:0o600});console.log('Verified local connection saved privately.');process.exit(0);
}
const child=spawn(cli,args,{env,stdio:['ignore',log,log]});child.on('exit',code=>{fs.closeSync(log);if(code)console.error('Local command failed; inspect private lifecycle.log (never publish credentials).');else console.log('Local '+command+' completed; connection details stay in private work directory.');process.exitCode=code||0;});
