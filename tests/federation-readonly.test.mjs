// Provider, identities and players below are synthetic. No federation or Cloud writes.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';
import {PublicFederation,normalizeCalendar,normalizeReport} from '../scripts/lib/public-federation.mjs';
const fixture={id:'RFEP:41:3575:FICTICI',federation:'RFEP',official_match_id:'35559',competition_id:'3575',season:'41',home_id:'3697',away_id:'3727',home_team:'LOCAL FICTICI',away_team:'RIVAL FICTICI',source_url:'https://www.hockeypatines.fep.es/league/3575'};
const players=(base,n=10)=>Array.from({length:n},(_,i)=>({player_id:String(base+i),player_name:'PERSONA FICTÍCIA '+(base+i),player_number:String(i+1),player_role:i?'J':'P'}));
const raw=()=>({game_data:{game_id:fixture.official_match_id,season_id:'41',home_team_id:fixture.home_id,away_team_id:fixture.away_id,home_roster:players(100),away_roster:players(200)}});
const readCode=ts.transpile(fs.readFileSync('supabase/functions/federation-sync/read-only.ts','utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {readOfficialMatch}=await import('data:text/javascript;base64,'+Buffer.from(readCode).toString('base64'));
const match='20000000-0000-4000-8000-000000000001';
function database(source={match_id:match,federation:'RFEP',competition_id:'3575',season_id:'41',federation_match_id:'35559'}){let reads=0;return {get reads(){return reads},from(table){assert.equal(table,'federation_match_sources');reads++;return {select(fields){assert.ok(!fields.includes('*'));return {eq(field,value){assert.equal(field,'match_id');assert.equal(value,match);return {maybeSingle:async()=>({data:source})};}};}};}};}
test('35559 read-only consultation returns two official-source fixture sides and keepers with zero write surface',async()=>{
 const db=database(),api={calendar:async()=>({fixtures:[fixture],verifiedAt:'2026-11-04T00:00:00Z'}),report:async f=>normalizeReport(raw(),f)};
 const out=await readOfficialMatch(db,match,api);assert.equal(out.status,200);assert.equal(out.body.mode,'read_only');assert.equal(out.body.persistence,'none');assert.equal(out.body.report.events_count,null);assert.equal(out.body.report.sides.home.length,10);assert.equal(out.body.report.sides.away.length,10);assert.equal(out.body.report.sides.away[0].position,'goalkeeper');assert.equal(db.reads,1);
});
test('malformed, inaccessible and cross-club match identifiers fail before public source requests',async()=>{
 const api={calendar(){throw Error('Must not reach source')}};const db=database(null);
 assert.equal((await readOfficialMatch(db,'35559',api)).status,400);assert.equal(db.reads,0);
 assert.equal((await readOfficialMatch(db,match,api)).status,403);assert.equal(db.reads,1);
});
test('unavailable source is not converted into a successful empty official lineup',async()=>{
 const out=await readOfficialMatch(database(),match,{calendar(){throw Error('403')}});
 assert.equal(out.body.state,'unavailable');assert.equal(out.body.report,undefined);assert.match(out.body.message,/conserven/);
});
test('report refresh is coalesced, cached briefly and updates after TTL without inferred events',async()=>{
 let now=10000,count=0,goals='0';const api=new PublicFederation({now:()=>now,reportTtl:100});api.rfep=async()=>{count++;const data=raw();data.game_data.away_roster[1].goals=goals;return {data}};
 const [a,b]=await Promise.all([api.report(fixture),api.report(fixture)]);assert.deepEqual(a,b);assert.equal(count,1);await api.report(fixture);assert.equal(count,1);
 goals='2';now+=101;const update=await api.report(fixture);assert.equal(count,2);assert.equal(update.sides.away[1].goals,2);assert.equal(update.sides.away[1].id,a.sides.away[1].id);assert.notEqual(update.verifiedAt,a.verifiedAt);assert.equal(update.events,undefined);
});
test('403 and timeout preserve prior roster, verification time and back off instead of hammering the portal',async()=>{
 let now=10000,count=0;const api=new PublicFederation({now:()=>now,reportTtl:100});api.rfep=async()=>{count++;return {data:raw()}};const old=await api.report(fixture);now+=101;
 api.rfep=async()=>{count++;const error=Error('URL with secret must never escape');error.status=403;throw error};
 const stale=await api.report(fixture);assert.equal(stale.stale,true);assert.equal(stale.verifiedAt,old.verifiedAt);assert.deepEqual(stale.sides,old.sides);assert.ok(!JSON.stringify(stale).includes('secret'));await api.report(fixture);assert.equal(count,2);
 now+=60001;api.rfep=async()=>{throw new DOMException('timeout','TimeoutError')};assert.equal((await api.report(fixture)).stale,true);
});
test('empty first response backs off; empty later response cannot erase a verified side',async()=>{
 let now=10000,count=0;const api=new PublicFederation({now:()=>now,reportTtl:100});api.rfep=async()=>{count++;return {data:{game_data:{...raw().game_data,away_roster:[]}}}};
 await assert.rejects(api.report(fixture));await assert.rejects(api.report(fixture));assert.equal(count,1);
 now+=60001;api.rfep=async()=>({data:raw()});const old=await api.report(fixture);now+=101;api.rfep=async()=>({data:{game_data:{...raw().game_data,home_roster:[]}}});assert.deepEqual((await api.report(fixture)).sides,old.sides);
});
test('cache has a bounded capacity and an old copy is never advertised beyond maximum staleness',async()=>{
 let now=10000;const api=new PublicFederation({now:()=>now,reportTtl:1,maxStale:100,maxEntries:2});api.rfep=async(_,{id})=>({data:{game_data:{...raw().game_data,game_id:id}}});
 for(let i=1;i<=3;i++)await api.report({...fixture,id:'fixture'+i,official_match_id:String(i)});assert.equal(api.reports.size,2);
 now+=101;api.rfep=async()=>{throw Error('Unavailable')};await assert.rejects(api.report({...fixture,id:'fixture3',official_match_id:'3'}));
});
test('return to competitions / season / team changes never reuse another scope report',async()=>{
 const api=new PublicFederation();api.rfep=async()=>({data:raw()});await api.report(fixture);
 for(const changed of [{season:'42'},{competition_id:'4774',federation:'FECAPA'},{away_id:'999'}]){api.fetcher=async()=>{throw Error('No source')};await assert.rejects(api.report({...fixture,...changed}));}
});
function htmlRoster(f){return '<div class="nombre1">'+f.home_team+'</div><div class="nombre2">'+f.away_team+'</div>'+['home','away'].map((side,j)=>'<table class="competiciones_tabla_basic"><tr><th class="nombre_equipo_thickbox_stats">'+f[side+'_team']+'</th></tr>'+Array.from({length:8},(_,i)=>'<tr>'+Array.from({length:15},(_,c)=>'<td>'+(c===0?i+1:c===1?(i?'J':'P'):c===3?'<div id="'+(100+j*100+i)+'">FICTICI '+i+'</div>':'0')+'</td>').join('')+'</tr>').join('')+'</table>').join('');}
for(const [label,code,competition] of [['Infantil D–Alpicat','152043','4786'],['FEM11–Barberà','199999','4999']])test(label+' FECAPA synthetic HTML reuses existing parser and keeps both teams separate',async()=>{
 const f={...fixture,id:label,federation:'FECAPA',official_match_id:code,competition_id:competition};let calls=0;
 const api=new PublicFederation({fetcher:async(url,options)=>{calls++;assert.match(url,new RegExp('fecapa_gr_'+code+'_1.php$'));assert.equal(options.credentials,'omit');return new Response(htmlRoster(f))}});
 const r=await api.report(f);assert.equal(r.sides.home.length,8);assert.equal(r.sides.away.length,8);assert.equal(r.sides.away[0].position,'goalkeeper');await api.report(f);assert.equal(calls,1);
 // Code 199999/competition4999 are deliberately fictitious, not a discovered Barberà identity.
});
test('FECAPA wrong-team HTML fails closed rather than mixing opponents',async()=>{
 const f={...fixture,federation:'FECAPA'};const api=new PublicFederation({fetcher:async()=>new Response(htmlRoster({...f,away_team:'OTHER FICTICI'}))});await assert.rejects(api.report(f));assert.equal(api.reports.size,0);
});
function edge({valid=true,source=true}={}){
 let serve;const keys=[],operations=[];const scoped=database(source?undefined:null);
 scoped.auth={getUser:async()=>({data:{user:valid?{id:'AUTH-FICTICI'}:null}})};
 class Api{async calendar(){return {fixtures:[fixture]}}async report(f){return normalizeReport(raw(),f)}}
 const code=ts.transpile(fs.readFileSync('supabase/functions/federation-sync/index.ts','utf8').replace(/^import .*$/gm,''),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
 vm.runInNewContext(code,{Deno:{serve(fn){serve=fn},env:{get:key=>key}},createClient(url,key,options){keys.push(key);operations.push(options);assert.equal(key,'SUPABASE_ANON_KEY');return scoped},PublicFederation:Api,readOfficialMatch,Response,URL,Request});
 return {keys,operations,invoke:(authorization='Bearer FICTICI')=>serve(new Request('http://fixture.invalid?match_id='+match,{method:'GET',headers:authorization?{authorization}:{}}))};
}
test('GET uses the caller JWT and anon key, never constructs a service-role client or invokes a mutation',async()=>{
 const h=edge(),r=await h.invoke();assert.equal(r.status,200);assert.equal((await r.json()).mode,'read_only');assert.deepEqual(h.keys,['SUPABASE_ANON_KEY']);assert.equal(h.operations[0].global.headers.Authorization,'Bearer FICTICI');assert.match(r.headers.get('cache-control'),/no-store/);
});
test('GET rejects missing/invalid Auth and RLS-invisible sources',async()=>{
 const a=edge();assert.equal((await a.invoke('')).status,401);assert.equal(a.keys.length,0);
 assert.equal((await edge({valid:false}).invoke()).status,401);assert.equal((await edge({source:false}).invoke()).status,403);
});
test('calendar-only 35559 can be consulted without creating a pilot source or context',async()=>{
 const catalogue='60000000-0000-4000-8000-000000000001';const commands=[];
 const db={async rpc(name,args){commands.push(name);assert.equal(name,'match_mode_access');assert.equal(args.p_catalogue,catalogue);return {data:{read:true,catalogue_id:catalogue,federation:'RFEP',competition_id:'3575'}}},from(table){assert.equal(table,'federation_matches');return {select(){return {eq(){return {maybeSingle:async()=>({data:{id:catalogue,external_match_id:'35559',match_fingerprint:'RFEP:41:3575:FICTICI',raw_data:{home_team_id:'3697',away_team_id:'3727'}}})}}}}}}};
 const api={calendar:async()=>({fixtures:[fixture]}),report:async f=>normalizeReport(raw(),f)};
 const out=await readOfficialMatch(db,'',api,{catalogue});assert.equal(out.body.state,'available');assert.equal(out.body.report.sides.away.length,10);assert.deepEqual(commands,['match_mode_access']);
 db.rpc=async()=>({data:{read:false}});assert.equal((await readOfficialMatch(db,'',api,{catalogue})).status,403);
 assert.equal((await readOfficialMatch(db,match,api,{catalogue})).status,400);
});
test('expired cached calendar is removed and cannot be advertised after its retention limit',async()=>{
 let now=10000;const key='RFEP:41:3575';const api=new PublicFederation({now:()=>now,maxStale:100,snapshots:[{key,verifiedAt:new Date(now).toISOString(),expiresAt:10001,fixtures:[fixture]}]});now+=101;api.rfep=async()=>{throw Error('Unavailable')};await assert.rejects(api.calendar('RFEP','3575','41'));assert.equal(api.cache.size,0);
});
test('read consultation obeys PostgreSQL RLS for assigned and unrelated fictitious identities',async()=>{
 const {createDatabase,ID,asOwner,asUser}=await import('./helpers/stats-db.mjs');const database=await createDatabase();
 try{
  await asOwner(database,"update federation_match_sources set federation='RFEP',competition_id='3575',season_id='41',federation_match_id='35559' where match_id=$1",[ID.match]);
  const before=(await asOwner(database,'select count(*) as count from pilot_matches')).rows;
  const client=user=>({from(table){
   assert.equal(table,'federation_match_sources');let id;
   const query={select(){return query},eq(_field,value){id=value;return query},async maybeSingle(){
    try{const r=await asUser(database,user,'select match_id,federation,federation_match_id,competition_id,season_id from federation_match_sources where match_id=$1',[id]);return {data:r.rows[0]||null}}catch(e){return {error:e}}
   }};return query;
  }});
  let requests=0;const api={calendar:async()=>{requests++;return {fixtures:[fixture]}},report:async f=>normalizeReport(raw(),f)};
  assert.equal((await readOfficialMatch(client('principal'),ID.match,api)).body.state,'available');
  assert.equal((await readOfficialMatch(client('alien'),ID.match,api)).status,403);assert.equal(requests,1);
  assert.deepEqual((await asOwner(database,'select count(*) as count from pilot_matches')).rows,before);
 }finally{await database.close();}
});

test('conflicting official code reused across different fixtures is rejected before choosing the first match',()=>{
 const rows=[{dia_partido:'JORNADA',home_name:'JORNADA FICTÍCIA'},{idp:'35559',home_id:'3697',away_id:'3727',home_name:'LOCAL FICTICI',away_name:'RIVAL FICTICI'}, {idp:'35559',home_id:'3697',away_id:'9999',home_name:'LOCAL FICTICI',away_name:'ALTRE FICTICI'}];assert.throws(()=>normalizeCalendar('RFEP','3575','41',rows),/Codi oficial repetit/);
});
test('a single provider player ID cannot certify both sides of an official report',()=>{
 const data=raw();data.game_data.away_roster[0].player_id=data.game_data.home_roster[0].player_id;assert.throws(()=>normalizeReport(data,fixture),/dos equips/);
});
