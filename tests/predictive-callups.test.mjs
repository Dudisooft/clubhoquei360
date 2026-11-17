import test from 'node:test';
import assert from 'node:assert/strict';
import {predictRoster} from '../roster-prediction.js';
import {callupMessage,meetingTime,verifiedMaps,whatsappHref} from '../callup-message.js';
import {createDatabase,asOwner,asUser,ID} from './helpers/stats-db.mjs';
import {seedCallups,callupIds} from './helpers/callup-db.mjs';
const scope={entry_id:'entry',season_id:'season',competition_id:'comp',match_id:'future',cutoff:'2030-01-10T10:00Z'};
const row={...scope,match_id:'past',player_id:'person',full_name:'Fictici',at:'2030-01-01T10:00Z',verified:true};
test('prediction is deterministic, scoped, distinct by acta, not eligibility; current official overrides history',()=>{
 const rows=[row,row,{...row,match_id:'p2',at:'2030-01-02T10:00Z'},{...row,match_id:'p3',at:'2030-01-03T10:00Z'},
  {...row,player_id:'foreign',entry_id:'other'}, {...row,player_id:'future',at:'2031-01-01'}, {...row,player_id:'oldseason',season_id:'old'}];
 const [p]=predictRoster({scope,appearances:rows});assert.equal(p.appearances,3);assert.equal(p.eligible,false);assert.equal(p.classification,'regular');
 assert.deepEqual(predictRoster({scope,appearances:rows}),predictRoster({scope,appearances:rows.reverse()}));
 assert.deepEqual(predictRoster({scope,appearances:rows,official:[],official_verified:true}),[]);
 assert.equal(predictRoster({scope,appearances:rows,official:[{...row,match_id:'future',at:scope.cutoff}],official_verified:true})[0].official,true);
});
test('exact WhatsApp format, configurable meeting, verified Maps priority and no player names',()=>{
 const f={team_name:'INFANTIL D',round:'8',competition_name:'INF. OR',day:'Diumenge 15/11',hour:'10:00',home_team:'CP Malgrat',away_team:'IHC',venue:'Pavelló Municipal Malgrat',maps_url:'https://maps.app.goo.gl/2SaSu8drf8Z2sRAV9?g_st=ac',maps_verified:true,meeting:'9:00',kit:'Arlequinada',street:'Polo carrer i pantaló curt/ xandall',players:[{full_name:'PRIVATE NAME'}]};
 assert.equal(callupMessage(f).text,`‼️ CONVOCATÒRIA INFANTIL D
JORNADA 8 INF. OR

📅 Diumenge 15/11
⏰ Hora Partit: 10:00h
🏑  CP Malgrat - IHC

📍Pista: Pavelló Municipal Malgrat https://maps.app.goo.gl/2SaSu8drf8Z2sRAV9?g_st=ac

⏰ *Convocats: 9:00h

👕Samarreta: Arlequinada (sempre portar les dos equipacions)

👕 Polo carrer i pantaló curt/ xandall

EQUIP I FORÇA!!🔴🔵💪🤟`);
 assert.equal(callupMessage(f).warnings.length,0);
 assert.equal(meetingTime('2030-01-10T09:00Z',60),'09:00');assert.equal(meetingTime('2030-01-10T09:00Z',undefined),'');
 assert.equal(verifiedMaps({...f,address:'Other',address_verified:true}),f.maps_url);
 assert.equal(verifiedMaps({maps_url:'https://evil.test/maps',maps_verified:true}),null);
 assert.ok(verifiedMaps({address:'Carrer confirmat 1',address_verified:true}).includes('query=Carrer'));
 assert.ok(callupMessage({...f,provisional:true}).text.includes('PROVISIONAL'));
 assert.ok(whatsappHref('a\nb').includes('a%0Ab'));
});

test('server workflow: exact registration history, own adoption, delegate revisions, settings and club boundaries',async t=>{
 const db=await createDatabase();t.after(()=>db.close());await seedCallups(db);
 const fixture=callupIds.catalogueMatch;
 const entry='71000000-0000-4000-8000-000000000010',comp='71000000-0000-4000-8000-000000000008',group='71000000-0000-4000-8000-000000000009';
 const own=crypto.randomUUID(),rival=crypto.randomUUID(),rivalEntry=crypto.randomUUID();
 await asOwner(db,"update federation_team_entries set external_team_id='111' where id=$1",[entry]);
 await asOwner(db,"update federation_matches set raw_data='{"+'"away_team_id":"111","home_team_id":"222"'+"}' where id=$1",[fixture]);
 await asOwner(db,"insert into federation_team_entries(id,competition_id,external_team_id) values($1,$2,'222')",[rivalEntry,comp]);
 await asOwner(db,"insert into federation_match_teams values($1,$2,'home')",[fixture,rivalEntry]);
 await asOwner(db,"insert into federation_players values($1,'FECAPA','101','Pròpia fictícia'),($2,'FECAPA','202','Rival fictícia')",[own,rival]);
 for(let i=0;i<3;i++){
  const match=crypto.randomUUID();
  await asOwner(db,"insert into federation_matches(id,group_id,external_match_id,federation_start_at,raw_data) values($1,$2,$3,now()-interval '1 day'*($4+1),'{\"report_status\":\"verified\",\"away_team_id\":\"111\",\"home_team_id\":\"222\"}')",[match,group,'past-'+i,i]);
  await asOwner(db,"insert into federation_match_teams values($1,$2,'away'),($1,$3,'home')",[match,entry,rivalEntry]);
  await asOwner(db,"insert into federation_match_lineups(match_id,side,player_id,display_name,shirt_number) values($1,'away',$2,'Pròpia fictícia','5'),($1,'home',$3,'Rival fictícia','9')",[match,own,rival]);
 }
 const workflow=async user=>(await asUser(db,user,'select public.read_callup_workflow($1,$2) data',[fixture,ID.team])).rows[0].data;
 const initial=await workflow('secondary');const predicted=predictRoster(initial.evidence);
 assert.equal(predicted.length,1);assert.equal(predicted[0].player_id,own);assert.equal(predicted[0].appearances,3);
 await assert.rejects(asUser(db,'coach','select public.accept_callup_proposal($1,$2,$3,true)',[fixture,ID.team,own]),{code:'42501'});
 await assert.rejects(asUser(db,'secondary','select public.accept_callup_proposal($1,$2,$3,true)',[fixture,ID.team,rival]),{code:'22023'});
 const adopt=async()=>(await asUser(db,'secondary','select public.accept_callup_proposal($1,$2,$3,true,$4) id',[fixture,ID.team,own,'field'])).rows[0].id;
 await assert.rejects(asUser(db,'secondary','select public.accept_callup_proposal($1,$2,$3,false)',[fixture,ID.team,own]),{code:'42501'});
 const ownId=await adopt();assert.equal(await adopt(),ownId);
 const rivals=(await asUser(db,'secondary',"select public.read_roster_evidence($1,null,'home') data",[fixture])).rows[0].data;
 assert.equal(predictRoster(rivals)[0].player_id,rival);
 await assert.rejects(asUser(db,'alien',"select public.read_roster_evidence($1,null,'home')",[fixture]),{code:'42501'});
 const save=async(revision,players)=>asUser(db,'secondary',"select public.save_club_callup_with_staff($1,$2,$3,$4,true,'{}','{}')",[fixture,ID.team,revision,players]);
 await save(0,[ownId]);assert.equal((await workflow('delegate')).can_acknowledge,true);
 await assert.rejects(asUser(db,'coach','select public.acknowledge_callup($1,$2,1)',[fixture,ID.team]),{code:'42501'});
 await asUser(db,'delegate','select public.acknowledge_callup($1,$2,1)',[fixture,ID.team]);
 await asUser(db,'delegate','select public.acknowledge_callup($1,$2,1)',[fixture,ID.team]);
 assert.equal((await workflow('secondary')).receipts.length,1);
 const monday=(await asOwner(db,"select date_trunc('week',federation_start_at at time zone 'Europe/Madrid')::date as monday from federation_matches where id=$1",[fixture])).rows[0].monday;
 const week=(await asUser(db,'secondary','select public.read_callup_week_workflow($1,$2) data',[monday,ID.club])).rows[0].data;
 assert.equal(week.find(f=>f.fixture_id===fixture).receipt_state,'read');
 await save(1,[callupIds.reserve]);assert.equal((await workflow('secondary')).receipts.length,0);
 await assert.rejects(asUser(db,'delegate','select public.acknowledge_callup($1,$2,1)',[fixture,ID.team]),{code:'40001'});
 assert.equal((await asOwner(db,'select count(*)::int n from app_private.callup_receipts')).rows[0].n,1);
 await assert.rejects(asUser(db,'delegate',"select public.save_callup_preferences($1,0,'{\"margin_minutes\":60}')",[ID.team]),{code:'42501'});
 await asUser(db,'secondary',"select public.save_callup_preferences($1,0,'{\"margin_minutes\":60,\"kit\":\"Fictícia\"}')",[ID.team]);
 assert.equal((await workflow('delegate')).preferences.margin_minutes,60);
 await assert.rejects(asUser(db,'secondary',"select public.save_callup_preferences($1,0,'{}')",[ID.team]),{code:'40001'});
 await assert.rejects(asUser(db,'secondary',"select public.save_callup_preferences($1,1,'{\"margin_minutes\":999}')",[ID.team]),{code:'22023'});
 await assert.rejects(asUser(db,'delegate','select * from app_private.callup_receipts'),{code:'42501'});
 const exposed=(await asOwner(db,`select p.proname,p.prosecdef,p.provolatile,has_function_privilege('anon',p.oid,'execute') anonymous_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
  ('read_callup_workflow','read_roster_evidence','read_callup_week_workflow','acknowledge_callup','save_callup_preferences','accept_callup_proposal')`)).rows;
 assert.equal(exposed.length,6);assert.ok(exposed.every(p=>!p.prosecdef&&!p.anonymous_execute));
 assert.ok(exposed.filter(p=>p.proname.startsWith('read_')).every(p=>p.provolatile==='s'));
 assert.equal((await asOwner(db,"select has_table_privilege('authenticated','app_private.callup_receipts','SELECT,INSERT,UPDATE,DELETE') allowed")).rows[0].allowed,false);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select public.read_callup_workflow($1,$2)',[fixture,ID.team]),{code:'42501'});
});
