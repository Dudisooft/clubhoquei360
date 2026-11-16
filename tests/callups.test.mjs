import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ID,asOwner,asUser,createDatabase} from './helpers/stats-db.mjs';
import {callupIds as ids,seedCallups} from './helpers/callup-db.mjs';

test('club call-ups: team permissions, publication history, conflict windows and Base read model',async t=>{
 const db=await createDatabase();
 t.after(()=>db.close());
 await seedCallups(db);
 const read=async(user,fixture=null,team=null)=>(await asUser(db,user,'select public.read_club_callups($1,$2) data',[fixture,team])).rows[0].data;
 const save=async(user,fixture,team,revision,players,publish,acknowledged=[])=>
  (await asUser(db,user,'select public.save_club_callup($1,$2,$3,$4,$5,$6) data',[fixture,team,revision,players,publish,acknowledged])).rows[0].data;

 await t.test('only coordinators edit within scope and private tables are inaccessible',async()=>{
  const own=await read('external',ID.match,ID.team);
  assert.equal(own.can_edit,true);
  assert.deepEqual(new Set(own.candidates.map(p=>p.id)),new Set([ids.starter,ids.reserve,ids.reinforcement]));
  assert.equal(own.candidates.find(p=>p.id===ids.reinforcement).origin_team_id,ID.otherTeam);
  assert.equal(own.candidates.find(p=>p.id===ids.reserve).position,'goalkeeper');
  for(const user of ['coach','delegate','manager','alien']){
   await assert.rejects(save(user,ID.match,ID.team,0,[ids.starter],false),{code:'42501'});
  }
  await assert.rejects(save('external',ID.otherMatch,ID.otherTeam,0,[ids.reinforcement],true),{code:'42501'});
  await assert.rejects(save('secondary',ID.match,ID.team,0,[ids.ineligible],false),{code:'22023'});
  await assert.rejects(save('secondary',ID.match,ID.team,0,[ids.starter,ids.starter],false),{code:'22023'});
  await assert.rejects(asUser(db,'secondary','select * from app_private.club_callups'),{code:'42501'});
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query('select public.read_club_callups()'),{code:'42501'});
 });

 await t.test('draft is private and publication snapshots survive later edits',async()=>{
  assert.equal((await save('external',ID.match,ID.team,0,[ids.starter],false)).revision,1);
  assert.equal((await read('external',ID.match,ID.team)).callup.published,false);
  for(const user of ['coach','delegate']){
   const visible=await read(user,ID.match,ID.team);
   assert.equal(visible.callup,null);
   assert.equal(visible.history.length,0);
   assert.deepEqual(new Set(visible.candidates.map(p=>p.id)),new Set([ids.reserve,ids.starter]));
   assert.equal((await read(user)).find(f=>f.fixture_id===ID.match).revision,null);
  }
  assert.equal((await save('external',ID.match,ID.team,1,[ids.starter,ids.reinforcement],true)).revision,2);
  await assert.rejects(save('external',ID.match,ID.team,1,[ids.reserve],true),{code:'40001'});
  await assert.rejects(save('external',ID.match,ID.team,2,[ids.reserve],false),{code:'22023'});
  assert.equal((await save('external',ID.match,ID.team,2,[ids.reinforcement,ids.starter],true)).revision,2);
  assert.equal((await save('external',ID.match,ID.team,2,[ids.reserve,ids.reinforcement],true)).revision,3);
  const {history,callup}=await read('delegate',ID.match,ID.team);
  assert.deepEqual(history.map(v=>v.revision),[3,2]);
  assert.equal('published_by' in history[0],false);
  assert.ok(history[1].players.some(p=>p.id===ids.starter));
  assert.ok(callup.players.some(p=>p.id===ids.reserve));
  assert.equal((await read('coach')).find(f=>f.fixture_id===ID.match).modified,true);
  assert.deepEqual(await read('alien'),[]);
  await assert.rejects(read('coach',ID.otherMatch,ID.otherTeam),{code:'42501'});
 });

 await t.test('only overlapping scheduled slots warn, and new warnings require confirmation',async()=>{
  const warning=await save('secondary',ID.otherMatch,ID.otherTeam,0,[ids.reinforcement],true);
  assert.deepEqual(warning,{requires_confirmation:true,overlaps:[ids.reinforcement]});
  assert.equal((await read('secondary',ID.otherMatch,ID.otherTeam)).callup,null);
  assert.equal((await save('secondary',ID.otherMatch,ID.otherTeam,0,[ids.reinforcement],true,warning.overlaps)).revision,1);
  assert.equal((await save('secondary',ids.lateMatch,ID.team,0,[ids.reserve],true)).revision,1);
  assert.equal((await save('secondary',ids.unknownMatch,ID.team,0,[ids.reserve],true)).revision,1);
  await asOwner(db,'update pilot_matches set starts_at=(select starts_at from pilot_matches where id=$1) where id=$2',[ID.match,ids.unknownMatch]);
  assert.deepEqual(new Set((await read('secondary',ids.unknownMatch,ID.team)).overlaps),new Set([ids.reserve,ids.reinforcement]));
 });

 await t.test('catalogue works without any external request and an acta preserves the published reference',async()=>{
  assert.equal((await save('external',ids.catalogueMatch,ID.team,0,[ids.reserve],true)).revision,1);
  const [base]=await read('delegate',ids.catalogueMatch);
  assert.equal(base.fixture.side,'away');
  assert.equal(base.fixture.has_report,false);
  assert.equal(base.callup.players[0].id,ids.reserve);
  assert.equal(base.candidates.length,2);
  await asOwner(db,"update federation_matches set raw_data=jsonb_build_object('report_status','verified') where id=$1",[ids.catalogueMatch]);
  assert.equal((await read('delegate',ids.catalogueMatch))[0].fixture.has_report,false);
  await asOwner(db,"insert into federation_match_lineups(match_id,side) values ($1,'away')",[ids.catalogueMatch]);
  const [official]=await read('delegate',ids.catalogueMatch);
  assert.equal(official.fixture.has_report,true);
  assert.equal(official.candidates.length,0);
  assert.equal(official.callup.players[0].id,ids.reserve);
  assert.deepEqual(await read('alien',ids.catalogueMatch),[]);
 });

 await t.test('a late federation link keeps an existing operational call-up and its history',async()=>{
  const linked='71000000-0000-4000-8000-000000000011';
  await asOwner(db,"insert into federation_matches(id,group_id,external_match_id,home_team,away_team,federation_start_at,match_fingerprint,raw_data) select $1,group_id,'LINKED','Equip fictici','Rival fictici',(select starts_at from pilot_matches where id=$2),'FECAPA:41:fictici:LINKED','{}' from federation_matches where id=$3",[linked,ids.lateMatch,ids.catalogueMatch]);
  await asOwner(db,"insert into federation_match_teams select $1,entry_id,'home' from federation_match_teams where match_id=$2",[linked,ids.catalogueMatch]);
  await asOwner(db,"insert into federation_match_sources(match_id,federation,competition_id,season_id,federation_match_id,official_data,import_status) values($1,'FECAPA','fictici','41','LINKED',jsonb_build_object('players','[]'::jsonb),'verified')",[ids.lateMatch]);
  const [bundle]=await read('delegate',ids.lateMatch);
  assert.equal(bundle.fixture.fixture_id,linked);
  assert.equal(bundle.fixture.has_report,false);
  assert.equal(bundle.callup.revision,1);
  assert.equal((await read('secondary')).some(f=>f.fixture_id===ids.lateMatch),false);
  const warning=await save('secondary',linked,ID.team,1,[ids.starter],true);
  assert.equal(warning.revision,2);
  assert.deepEqual((await read('delegate',linked,ID.team)).history.map(h=>h.revision),[2,1]);
  await asOwner(db,"update federation_matches set federation_start_at=now()-interval '2 days' where id=$1",[linked]);
  const past=(await read('delegate')).find(f=>f.fixture_id===linked);
  assert.equal(past.past,true);
  assert.equal(past.modified,true);
 });
});
