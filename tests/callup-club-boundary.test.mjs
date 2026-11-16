import test from 'node:test';
import assert from 'node:assert/strict';
import {createDatabase,asOwner,asUser,ID} from './helpers/stats-db.mjs';
import {seedCallups,callupIds} from './helpers/callup-db.mjs';

test('server keeps own-club rosters for FEM15, Infantil D and FEM11, rejecting rival IDs even with an eligibility row',async t=>{
 const db=await createDatabase();
 t.after(()=>db.close());
 await seedCallups(db);
 const rivalClub=crypto.randomUUID(),rivalSeason=crypto.randomUUID(),rivalTeam=crypto.randomUUID(),rivalPlayer=crypto.randomUUID();
 await asOwner(db,'insert into clubs(id,name) values($1,$2)',[rivalClub,'Club rival fictici']);
 await asOwner(db,'insert into seasons(id,club_id,label) values($1,$2,$3)',[rivalSeason,rivalClub,'2026/27']);
 await asOwner(db,'insert into teams(id,club_id,season_id,name) values($1,$2,$3,$4)',[rivalTeam,rivalClub,rivalSeason,'Rival fictici']);
 await asOwner(db,"insert into app_private.callup_roster(id,team_id,full_name,position) values($1,$2,$3,'field')",[rivalPlayer,rivalTeam,'Jugador rival fictici']);
 for(const category of ['FEM15','INFANTIL D','FEM11']){
  const team=crypto.randomUUID(),match=crypto.randomUUID(),player=crypto.randomUUID();
  await asOwner(db,'insert into teams(id,club_id,season_id,name,category) values($1,$2,$3,$4,$5)',[team,ID.club,ID.season,'Equip fictici '+category,category]);
  await asOwner(db,"insert into pilot_matches(id,title,home_team,away_team,starts_at,status) values($1,'Fictici','Rival fictici','Equip fictici',now()+interval '1 day','scheduled')",[match]);
  await asOwner(db,'insert into stats_matches(match_id,club_id,season_id,away_team_id) values($1,$2,$3,$4)',[match,ID.club,ID.season,team]);
  await asOwner(db,"insert into app_private.callup_roster(id,team_id,full_name,position) values($1,$2,'Porteria fictícia','goalkeeper')",[player,team]);
  await asOwner(db,'insert into app_private.callup_eligibility values($1,$2)',[team,rivalPlayer]);
  const read=async()=> (await asUser(db,'secondary','select public.read_club_callups($1,$2) data',[match,team])).rows[0].data;
  assert.deepEqual((await read()).candidates.map(p=>p.id),[player]);
  assert.equal((await read()).fixture.side,'away');
  for(const id of [rivalPlayer,callupIds.starter]){
   await assert.rejects(asUser(db,'secondary',"select public.save_club_callup($1,$2,0,$3,false)",[match,team,[id]]),{code:'22023'});
   await assert.rejects(asUser(db,'secondary',"select public.save_club_callup_with_staff($1,$2,0,$3,false,'{}','{}')",[match,team,[id]]),{code:'22023'});
  }
  await asUser(db,'secondary',"select public.save_club_callup($1,$2,0,$3,false)",[match,team,[player]]);
  assert.deepEqual((await read()).callup.players.map(p=>p.id),[player]);
  await assert.rejects(asUser(db,'coach','select public.read_club_callups($1,$2)',[match,team]),{code:'42501'});
 }
 const before=(await asOwner(db,'select count(*)::int n from app_private.club_callups')).rows[0].n;
 assert.equal(before,3);
 assert.equal((await asUser(db,'coach','select public.club_setup_access() data')).rows[0].data.teams.filter(t=>t.operational).length,1);
});
