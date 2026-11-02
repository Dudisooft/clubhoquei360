import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {replayDatabase} from '../scripts/lib/local-replay-db.mjs';
import {ID,asOwner,asUser} from './helpers/stats-db.mjs';
const fixture={id:'RFEP:test:match',federation:'RFEP',home_id:'10',away_id:'20',home_team:'FICTITIOUS A',away_team:'FICTITIOUS B',date:'24/10/2026',time:'20:30',source_url:'https://hockeypatines.fep.es/league/3575',official_match_id:'1',score:[1,1]};
const players=['home','away'].flatMap((team,n)=>Array.from({length:10},(_,i)=>({id:'RFEP:'+String(n*100+i+1),federation_player_id:String(n*100+i+1),team,full_name:`FICTITIOUS ${team} ${i}`,dorsal:String(i+1),position:i===0?'goalkeeper':'field',matchVerified:true,selectable:true})));
const report={match_id:fixture.id,status:'published',sides:{home:[],away:[]}},bundle={vic:fixture,noia:{...fixture,id:'RFEP:test:future',official_match_id:'2',date:'14/11/2026',score:null},players,candidates:{home:players.slice(0,10),away:players.slice(10)},report,officialHash:crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex'),calendar:{verifiedAt:new Date().toISOString()}};
test('official replay uses real SQL permissions, survives database reopen and never mutates source snapshot',async()=>{
 const dir=path.resolve('work','replay-regression-'+crypto.randomUUID());fs.mkdirSync(dir,{recursive:true});
 let {db,ids}=await replayDatabase(dir,bundle);const match=ids.vic;
 try{
  assert.equal((await asUser(db,ID.manager,'select count(*) count from pilot_players where match_id=$1',[match])).rows[0].count,20);
  const sql="insert into pilot_events(id,match_id,user_id,event_type,team,delta,payload) values($1,$2,$3,'goal','home',1,$4)";
  const id=crypto.randomUUID(),payload=JSON.stringify({kind:'gol',actor:null});
  await asUser(db,ID.manager,sql,[id,match,ID.manager,payload]);
  await assert.rejects(asUser(db,ID.coach,sql,[crypto.randomUUID(),match,ID.coach,payload]),e=>e.code==='42501');
  await assert.rejects(asUser(db,ID.coach,'update federation_match_sources set import_status=\'pending\' where match_id=$1',[match]),e=>e.code==='42501');
  await asOwner(db,'select 1');await db.close();({db}=await replayDatabase(dir,bundle));
  assert.equal((await asUser(db,ID.manager,'select count(*) count from pilot_events where id=$1',[id])).rows[0].count,1);
  assert.equal((await asOwner(db,'select count(*) count from pilot_players where match_id=$1',[match])).rows[0].count,20);
  assert.deepEqual((await asOwner(db,'select document from local_official_snapshots')).rows[0].document,report);
 }finally{await db.close();}
});
