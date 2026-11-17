import test from 'node:test';
import assert from 'node:assert/strict';
import {createDatabase,ID,asOwner,asUser} from './helpers/stats-db.mjs';
import {PREP,seedPreparation} from './helpers/preparation-db.mjs';
import {predictRoster} from '../roster-prediction.js';

test('advanced uses the existing preparation RPC for verified historic rival proposals; official report retires them',async t=>{
 const db=await createDatabase();t.after(()=>db.close());await seedPreparation(db);
 const entry=crypto.randomUUID(),person=crypto.randomUUID(),past=crypto.randomUUID();
 await asOwner(db,'alter table federation_match_lineups add column is_goalkeeper boolean');
 await asOwner(db,"insert into federation_team_entries(id,competition_id,external_team_id) values($1,$2,'3727')",[entry,PREP.competition]);
 await asOwner(db,"insert into federation_match_teams values($1,$2,'home'),($1,$3,'away')",[PREP.calendar,PREP.entry,entry]);
 await asOwner(db,"insert into federation_players values($1,'RFEP','33333','Porter rival FICTICI')",[person]);
 await asOwner(db,"insert into federation_matches(id,group_id,external_match_id,federation_start_at,raw_data) values($1,$2,'PAST-FIXTURE','2026-10-01T10:00Z','{\"report_status\":\"verified\",\"away_team_id\":\"3727\"}')",[past,PREP.group]);
 await asOwner(db,"insert into federation_match_teams values($1,$2,'away')",[past,entry]);
 await asOwner(db,"insert into federation_match_lineups(match_id,side,player_id,display_name,shirt_number,is_goalkeeper) values($1,'away',$2,'Porter rival FICTICI','1',true)",[past,person]);
 const catalogue=async()=>(await asUser(db,'manager','select public.pilot_roster_catalogue($1) data',[PREP.match])).rows[0].data.candidates;
 const candidate=(await catalogue()).find(p=>p.team==='away');assert.ok(candidate?.prediction);assert.equal(candidate.position,'goalkeeper');
 assert.equal(predictRoster(candidate.evidence)[0].confidence,'low');
 const request=[{team:'away',roster_id:candidate.roster_id,dorsal:'1',position:'goalkeeper'}],mutation=crypto.randomUUID();
 const prepare=async()=>(await asUser(db,'manager','select public.pilot_prepare_players($1,$2,$3) data',[PREP.match,mutation,JSON.stringify(request)])).rows[0].data;
 const saved=await prepare();assert.deepEqual(await prepare(),saved);assert.equal(saved[0].federation_player_id,'33333');
 assert.ok(saved[0].official_source.includes('provisional-history'));assert.equal(saved[0].position,'goalkeeper');
 assert.equal((await asOwner(db,'select count(*)::int n from app_private.callup_roster')).rows[0].n,0);
 assert.equal((await asOwner(db,'select count(*)::int n from pilot_events where match_id=$1',[PREP.match])).rows[0].n,0);
 await asOwner(db,"update federation_matches set raw_data=raw_data||'{\"report_status\":\"verified\"}' where id=$1",[PREP.calendar]);
 assert.equal((await catalogue()).filter(p=>p.prediction).length,0);
 assert.equal((await asOwner(db,'select count(*)::int n from pilot_players where match_id=$1',[PREP.match])).rows[0].n,1);
});

test('Base uses the same predictor for a rival and preserves old incidents when current report replaces suggestions',async()=>{
 const {ownRosterFixture}=await import('./helpers/own-roster-fixture.mjs');
 const {catalogueRoster}=await import('../basic-roster.js');
 const f=ownRosterFixture();
 f.data.federation_team_entries.push({id:'rival-entry',competition_id:'c',external_team_id:'rival'});
 f.data.federation_match_teams.push({match_id:'current',entry_id:'rival-entry',side:'away'});
 const scope={entry_id:'rival-entry',competition_id:'c',season_id:'s',match_id:'current',cutoff:f.game.federation_start_at};
 let official=false;
 f.db.rpc=async(name,args)=>{
  assert.equal(name,'read_roster_evidence');assert.equal(args.p_side,'away');
  return {data:{scope,official_verified:official,official:[],appearances:[{...scope,player_id:'rival-player',external_player_id:'44',match_id:'prior',at:'2026-10-01T12:00Z',full_name:'Porter rival FICTICI',position:'goalkeeper',verified:true}]}};
 };
 const before=JSON.stringify(f.data);
 const first=await catalogueRoster(f.db,{players:[],fixture:f.game});
 const proposal=first.players.find(p=>p.team==='away');assert.ok(proposal?.selectable);assert.equal(proposal.matchVerified,false);assert.equal(proposal.position,'goalkeeper');
 official=true;
 const second=await catalogueRoster(f.db,{players:[proposal],fixture:f.game});
 assert.equal(second.players.find(p=>p.id===proposal.id).selectable,false);
 assert.equal(JSON.stringify(f.data),before);
});
