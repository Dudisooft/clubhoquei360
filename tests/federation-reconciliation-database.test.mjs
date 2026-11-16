import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('reconciliation previews, links the original row and rejects conflicting batches atomically', async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create table federation_competitions(id uuid,club_id uuid,season_id uuid,federation text,external_competition_id text);
   create table federation_groups(id uuid,competition_id uuid,external_group_id text);
   create table federation_matches(id uuid,group_id uuid,external_match_id text,round_label text,raw_data jsonb,home_score int);
   create table federation_match_teams(match_id uuid,entry_id uuid,side text);
   create table federation_team_entries(id uuid,competition_id uuid,club_team_id uuid,external_team_id text);
   create table teams(id uuid,club_id uuid,season_id uuid);
   create table fixture_operator_state(match_id uuid,goals integer);
  `);
  const uuid=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
  const [club,season,competition,group,match,entry,team]=[1,2,3,4,5,6,7].map(uuid);
  await db.query("insert into federation_competitions values($1,$2,$3,'FECAPA','10')",[competition,club,season]);
  await db.query("insert into federation_groups values($1,$2,'11')",[group,competition]);
  await db.query("insert into teams values($1,$2,$3)",[team,club,season]);
  await db.query("insert into federation_team_entries values($1,$2,$3,'21')",[entry,competition,team]);
  await db.query("insert into federation_match_teams values($1,$2,'home')",[match,entry]);
  const raw={home_team_id:'21',away_team_id:'22',report_data:{verified:true}};
  await db.query("insert into federation_matches values($1,$2,null,'Jornada 2',$3,2)",[match,group,raw]);
  await db.query("insert into fixture_operator_state values($1,7)",[match]);
  await db.exec(await readFile(new URL('../ops/federation-reconciliation/reconcile.sql',import.meta.url),'utf8'));
  const matchReport={competition:'10',groupId:'11',home:'21',away:'22',round:'JORNADA 2',report:'200'};
  const run=(rows,apply,scope=club)=>db.query("select * from pg_temp.reconcile_federation_codes($1,$2,'FECAPA',$3,$4)",[scope,season,JSON.stringify(rows),apply]);
  assert.equal((await run([matchReport],false)).rows[0].outcome,'pending');
  await assert.rejects(run([matchReport],true,uuid(8)),/no rows/);
  await assert.rejects(run([matchReport,{...matchReport,report:'201'}],true),/Conflicting official/);
  assert.equal((await db.query('select external_match_id from federation_matches')).rows[0].external_match_id,null);
  assert.deepEqual((await run([matchReport],true)).rows,[{fixture:match,official_code:'200',outcome:'linked'}]);
  assert.equal((await run([matchReport],true)).rows[0].outcome,'already_linked');
  assert.deepEqual((await db.query('select id,raw_data,home_score from federation_matches')).rows,[{id:match,raw_data:raw,home_score:2}]);
  assert.deepEqual((await db.query('select * from fixture_operator_state')).rows,[{match_id:match,goals:7}]);
 }finally{
  await db.close();
 }
});
