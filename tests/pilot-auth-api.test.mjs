import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
import {digest} from '../scripts/lib/pilot-access.mjs';
const folder=path.resolve('work','auth-fixture-'+crypto.randomUUID());fs.mkdirSync(folder,{recursive:true});
const f={id:'FECAPA:fixture',federation:'FECAPA',home_id:'10',away_id:'12419',competition_id:'4802'};
const other={...f,id:'RFEP:fixture',federation:'RFEP',away_id:'20',competition_id:'3575'};
fs.writeFileSync(path.join(folder,'snapshot.json'),JSON.stringify({key:'FECAPA:41:4802',expiresAt:Date.now()+3600000,fixtures:[f,other]}));
const records=[{digest:digest('operator-fixture'),user:'operator-fem15',role:'external',federation:'FECAPA',team:'12419',match:f.id,expiresAt:Date.now()+3600000},{digest:digest('coach-fixture'),user:'coach-rfep',role:'coach',federation:'RFEP',team:'10',match:other.id,expiresAt:Date.now()+3600000}];
const access=path.join(folder,'access.local');fs.writeFileSync(access,JSON.stringify(records));
let child;const origin='http://127.0.0.1:4183';
test.before(async()=>{child=spawn(process.execPath,['scripts/pilot-demo-server.mjs'],{env:{...process.env,PILOT_PORT:'4183',PILOT_ACCESS_FILE:access,PILOT_DATA_DIR:path.join(folder,'db'),PILOT_SNAPSHOT_DIR:folder},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Auth fixture startup timeout')),20000);child.stdout.on('data',s=>{if(String(s).includes(':4183')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',code=>{if(code){clearTimeout(timer);reject(Error('Auth fixture exited '+code));}});});});
test.after(()=>child?.kill());
async function req(route,body,token){return fetch(origin+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function login(invitation='operator-fixture',match=f.id,team='12419'){const r=await req('/api/pilot-session',{invitation,match,team,role:'operator',user:'forged-admin'});assert.equal(r.status,200);return r.json();}
const event=g=>({id:crypto.randomUUID(),mutation_id:crypto.randomUUID(),club_id:g.club,match_id:g.match,user_id:g.user,action:'pass_complete',player_id:'fictional-1',side:'away',match_ms:1000});
test('authenticated mode disables public self-issued roles and rejects wrong invitations',async()=>{
 assert.equal((await(await req('/health')).json()).mode,'LOCAL_AUTHENTICATED_PILOT');
 assert.equal((await req('/api/demo-session',{role:'operator',match:f.id,team:'12419'})).status,403);
 for(const b of [{invitation:'bad',match:f.id,team:'12419'},{invitation:'operator-fixture',match:other.id,team:'12419'},{invitation:'operator-fixture',match:f.id,team:'10'}])assert.equal((await req('/api/pilot-session',b)).status,403);
});
test('FEM15 invitation fixes permissions, persists actions, rejects forged identities and revokes session',async()=>{
 const g=await login();assert.equal(g.role,'external');assert.equal(g.user,'operator-fem15');
 const e=event(g);assert.equal((await req('/api/events',e,g.token)).status,200);
 assert.equal((await(await req('/api/events?match='+encodeURIComponent(f.id),null,g.token)).json()).length,1);
 assert.equal((await req('/api/events',{...event(g),user_id:'forged-admin'},g.token)).status,400);
 assert.equal((await req('/api/events?match='+encodeURIComponent(other.id),null,g.token)).status,403);
 assert.equal((await req('/api/logout',{},g.token)).status,200);
 assert.equal((await req('/api/events?match='+encodeURIComponent(f.id),null,g.token)).status,403);
 const restored=await login();assert.equal((await(await req('/api/events?match='+encodeURIComponent(f.id),null,restored.token)).json())[0].id,e.id);
});
test('RFEP coach invitation cannot escalate role, write statistics or read FEM15',async()=>{
 const g=await login('coach-fixture',other.id,'10');assert.equal(g.role,'coach');
 assert.equal((await req('/api/events',event(g),g.token)).status,403);
 assert.equal((await req('/api/events?match='+encodeURIComponent(f.id),null,g.token)).status,403);
 assert.deepEqual(await(await req('/api/events?match='+encodeURIComponent(other.id),null,g.token)).json(),[]);
});
