import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {work,secrets,sql} from './runtime.mjs';import {assertLocalStaging} from './safety.mjs';
assertLocalStaging(secrets);
const accounts=JSON.parse(fs.readFileSync(path.join(work,'accounts-private.json'))),fixture=JSON.parse(fs.readFileSync(path.join(work,'fixture.json')));
const result={environment:'local isolated PostgreSQL + Supabase GoTrue + PostgREST',auth:'real password sessions, no user JWT fabrication',checks:[]};
const tokens={};
async function api(endpoint,{method='GET',body,user}={}){
 assertLocalStaging(secrets);
 const r=await fetch(secrets.apiUrl+endpoint,{method,headers:{apikey:secrets.anonKey,Authorization:'Bearer '+(tokens[user]||secrets.anonKey),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 let data;try{data=await r.json();}catch{data=null;}return {status:r.status,data};
}
async function rpc(name,args,user='coordinator',get=false){
 const query=new URLSearchParams();for(const [k,v] of Object.entries(args||{}))query.set(k,v===null?'null':String(v));
 return api('/rest/v1/rpc/'+name+(get?'?'+query:''),{method:get?'GET':'POST',body:get?undefined:args,user});
}
async function pass(name,fn){await fn();result.checks.push({name,status:'PASS'});console.log('PASS:',name);}
const ownerCount=()=>JSON.parse(sql("select json_build_object('official',md5(coalesce((select jsonb_agg(to_jsonb(x) order by id)::text from federation_match_lineups x),'')),'events',(select count(*) from pilot_events),'stats',(select count(*) from stats_events))"));
const team=fixture.teams[0],match=crypto.randomUUID();
sql(`insert into federation_matches select '${match}'::uuid,group_id,null,home_team,away_team,federation_start_at,home_score,away_score,raw_data||'{"test_run":true}',null,null from federation_matches where id='${team.future}';insert into federation_match_teams select '${match}'::uuid,entry_id,side from federation_match_teams where match_id='${team.future}';`);
const officialBefore=ownerCount(),rosterBefore=Number(sql('select count(*) from app_private.callup_roster'));
const args={p_fixture:match,p_team:team.id};
await pass('six actual GoTrue password sessions and authenticated /user',async()=>{
 for(const [role,a] of Object.entries(accounts)){
  const r=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:a.email,password:a.password}});assert.equal(r.status,200,role+' login');tokens[role]=r.data.access_token;
  const user=await api('/auth/v1/user',{user:role});assert.equal(user.status,200);assert.equal(user.data.id,a.id);
 }
});
await pass('coordinator three teams, coach one, superadministrator four',async()=>{
 for(const [user,n] of [['coordinator',3],['coach',1],['root',4]]){const r=await rpc('club_setup_access',{},user);assert.equal(r.status,200);assert.equal(r.data.teams.filter(t=>t.operational).length,n);}
});
let bundle;
await pass('GET RPC, three category histories and no automatic internal writes',async()=>{
 for(const t of fixture.teams.slice(0,3)){const r=await rpc('read_callup_workflow',{p_fixture:t.future,p_team:t.id},'coordinator',true);assert.equal(r.status,200);assert.ok(r.data.candidates.every(p=>p.origin_team_id===t.id));assert.equal(r.data.evidence.appearances[0].player_id,t.player);}
 assert.equal(Number(sql('select count(*) from app_private.callup_roster')),rosterBefore);bundle=(await rpc('read_callup_workflow',args,'coordinator',true)).data;
});
await pass('ordinary/foreign/anonymous denied, coach cannot access another team',async()=>{
 for(const user of ['ordinary','otherclub','anonymous']){const r=await rpc('read_callup_workflow',args,user,true);assert.ok([401,403].includes(r.status));}
 assert.equal((await rpc('read_callup_workflow',{p_fixture:fixture.teams[1].future,p_team:fixture.teams[1].id},'coach',true)).status,403);
});
let internal;
await pass('own proposal reviewed once; rival and coach incorporation denied',async()=>{
 const base={...args,p_confirmed:true,p_position:null};
 assert.equal((await rpc('accept_callup_proposal',{...base,p_player:team.rival})).status,400);
 assert.equal((await rpc('accept_callup_proposal',{...base,p_player:team.player},'coach')).status,403);
 const r=await rpc('accept_callup_proposal',{...base,p_player:team.player});assert.equal(r.status,200);internal=r.data;
 assert.equal((await rpc('accept_callup_proposal',{...base,p_player:team.player})).data,internal);
 assert.equal(Number(sql('select count(*) from app_private.callup_roster')),rosterBefore+(bundle.candidates.some(p=>p.catalogue_player_id===team.player)?0:1));
});
const save=(revision,publish,staff={})=>rpc('save_club_callup_with_staff',{...args,p_revision:revision,p_players:[internal],p_publish:publish,p_acknowledged:[],p_staff:staff});
await pass('save draft, new HTTP read/recovery, delegate cannot acknowledge draft',async()=>{
 assert.equal((await save(0,false)).status,200);
 const read=await rpc('read_callup_workflow',args,'coordinator',true);assert.equal(read.data.callup.players[0].id,internal);assert.equal(read.data.callup.revision,1);
 assert.equal((await rpc('acknowledge_callup',{...args,p_revision:1},'delegate')).status,409);
});
await pass('publish and acknowledge with real delegate; retry is idempotent',async()=>{
 assert.equal((await save(1,true)).status,200);
 assert.equal((await rpc('acknowledge_callup',{...args,p_revision:2},'coach')).status,403);
 const r=await rpc('acknowledge_callup',{...args,p_revision:2},'delegate');assert.equal(r.status,200);assert.equal(r.data.reader_id,accounts.delegate.id);
 const retry=await rpc('acknowledge_callup',{...args,p_revision:2},'delegate');assert.equal(retry.data.read_at,r.data.read_at);
 assert.equal((await rpc('read_callup_workflow',args,'coordinator',true)).data.receipts.length,1);
});
await pass('new publication resets reading; stale acknowledgment rejected; history retained',async()=>{
 assert.equal((await save(2,true,{coaches:['Tècnica FICTÍCIA']})).status,200);
 const current=await rpc('read_callup_workflow',args,'delegate',true);assert.equal(current.data.receipts.length,0);assert.equal(current.data.callup.revision,3);
 assert.equal((await rpc('acknowledge_callup',{...args,p_revision:2},'delegate')).status,409);
 assert.equal((await rpc('acknowledge_callup',{...args,p_revision:3},'delegate')).status,200);
 assert.equal(sql("select count(*) from app_private.callup_receipts where fixture_id='"+match+"'"),'2');
});
await pass('team preferences authorization, compare-and-swap and recovery',async()=>{
 const input={p_team:team.id,p_revision:bundle.preferences_revision||0,p_preferences:{kit:'FICTÍCIA',street:'Polo FICTICI',margin_minutes:60}};
 assert.equal((await rpc('save_callup_preferences',input,'delegate')).status,403);
 assert.equal((await rpc('save_callup_preferences',input)).status,200);
 assert.equal((await rpc('save_callup_preferences',input)).status,409);
 assert.equal((await rpc('read_callup_workflow',args,'delegate',true)).data.preferences.margin_minutes,60);
});
await pass('official DML/private tables unavailable; own published statistics unchanged',async()=>{
 const direct=await api('/rest/v1/pilot_events',{method:'POST',body:{id:crypto.randomUUID(),match_id:match,user_id:accounts.delegate.id,event_type:'goal'},user:'delegate'});
 assert.ok(direct.status>=400);const privateTable=await api('/rest/v1/callup_receipts',{user:'delegate'});assert.ok(privateTable.status>=400);
 assert.deepEqual(ownerCount(),officialBefore);
});
result.count=result.checks.length;result.match=match;result.team=team.id;
fs.writeFileSync(path.join(work,'auth-api-results.json'),JSON.stringify(result,null,2),{mode:0o600});
fs.writeFileSync(path.join(work,'browser-fixture.json'),JSON.stringify({match,team:team.id}),{mode:0o600});
console.log('Real Auth/API validation complete; no production requests made.');
