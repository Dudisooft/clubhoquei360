import test from 'node:test';
import assert from 'node:assert/strict';
import {createDatabase,asOwner,asUser,ID} from './helpers/stats-db.mjs';
import {seedCallups} from './helpers/callup-db.mjs';
import {predictRoster} from '../roster-prediction.js';

test('FEM15, Infantil D and FEM11 receive only exact-team historic suggestions while their internal rosters are empty',async t=>{
 const db=await createDatabase();t.after(()=>db.close());await seedCallups(db);
 const cases=[];
 for(const category of ['FEM15','Infantil D','FEM11']){
  const team=crypto.randomUUID(),comp=crypto.randomUUID(),group=crypto.randomUUID(),entry=crypto.randomUUID(),future=crypto.randomUUID(),past=crypto.randomUUID(),person=crypto.randomUUID();
  await asOwner(db,'insert into teams(id,club_id,season_id,name,category) values($1,$2,$3,$4,$4)',[team,ID.club,ID.season,category+' FICTICI']);
  await asOwner(db,"insert into federation_competitions values($1,$2,$3,'FECAPA',$4)",[comp,ID.club,ID.season,category]);
  await asOwner(db,'insert into federation_groups values($1,$2)',[group,comp]);
  await asOwner(db,"insert into federation_team_entries(id,club_team_id,competition_id,external_team_id) values($1,$2,$3,$4)",[entry,team,comp,category]);
  for(const [match,delay,verified] of [[future,5,false],[past,-5,true]]){
   await asOwner(db,"insert into federation_matches(id,group_id,home_team,away_team,federation_start_at,raw_data) values($1,$2,'Equip fictici','Rival fictici',now()+$3*interval '1 day',$4)",[match,group,delay,JSON.stringify({home_team_id:category,report_status:verified?'verified':'pending'})]);
   await asOwner(db,"insert into federation_match_teams values($1,$2,'home')",[match,entry]);
  }
  await asOwner(db,"insert into federation_players values($1,'FECAPA',$2,$3)",[person,'FICTICI-'+category,'Persona fictícia '+category]);
  await asOwner(db,"insert into federation_match_lineups(match_id,side,player_id,display_name) values($1,'home',$2,$3)",[past,person,'Persona fictícia '+category]);
  cases.push({team,future,person});
 }
 for(const c of cases){
  const data=(await asUser(db,'secondary','select public.read_callup_workflow($1,$2) data',[c.future,c.team])).rows[0].data;
  assert.deepEqual(data.candidates,[]);
  assert.deepEqual(predictRoster(data.evidence).map(p=>p.player_id),[c.person]);
  const other=cases.find(x=>x.team!==c.team);
  await assert.rejects(asUser(db,'secondary','select public.accept_callup_proposal($1,$2,$3,true,$4)',[c.future,c.team,other.person,'field']),{code:'22023'});
  await assert.rejects(asUser(db,'coach','select public.read_callup_workflow($1,$2)',[c.future,c.team]),{code:'42501'});
 }
});
