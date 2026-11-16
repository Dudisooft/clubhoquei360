import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('a partial official response cannot replace previously verified sporting metadata',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create role anon;
   create role authenticated;
   create role service_role;
   create table federation_matches(id uuid primary key,group_id uuid,external_match_id text,venue text, raw_data jsonb);
   create table federation_match_teams(match_id uuid);
   create table federation_groups(id uuid,competition_id uuid);
   create table federation_competitions(id uuid,federation text);
   create table federation_players(id uuid,federation text,external_player_id text);
   create table federation_match_lineups(id uuid primary key,match_id uuid,player_id uuid,side text,display_name text,shirt_number text,is_goalkeeper bool,is_captain bool,reported_goals int,reported_assists int,raw_data jsonb);
   create table federation_match_staff(id uuid primary key,match_id uuid,side text,display_name text,role text,yellow_cards int,blue_cards int,red_cards int,raw_data jsonb);
   create table federation_match_events(id uuid primary key,match_id uuid,event_order int,event_type text,period_label text,clock_label text,side text,player_id uuid,player_name text,attribution text,raw_data jsonb);
  `);
  const source=await readFile(new URL('../supabase/official-reports.sql',import.meta.url),'utf8');
  await db.exec(source.slice(source.indexOf('create or replace function public.federation_commit_official_report')));
  const fixture='10000000-0000-4000-8000-000000000001';
  await db.query("insert into federation_matches values($1,$1,'100',null,'{}')",[fixture]);
  await db.query("insert into federation_match_teams values($1);",[fixture]);
  await db.query("insert into federation_groups values($1,$1);",[fixture]);
  await db.query("insert into federation_competitions values($1,'FECAPA');",[fixture]);
  const full={external_match_id:'100',players:[{external_id:'20',side:'home',name:'Local fictici'},{external_id:'30',side:'away',name:'Visitant fictici'}],
   staff:[],incidents:[{order:1,text:'Gol fictici',event_type:'goal',side:'away'}],report_score_available:true,
   reported_home_score:2,reported_away_score:8,event_timeline_status:'published_structured',official_status:'FINAL'};
  const commit=report=>db.query('select public.federation_commit_official_report($1,$2)',[fixture,report]);
  const snapshot=async()=>(await db.query("select raw_data->'report_data' as report from federation_matches")).rows[0].report;
  await commit(full);
  const verified=await snapshot();
  await assert.rejects(commit({...full,players:[full.players[0]],incidents:[]}),/Incomplete official lineups/);
  assert.deepEqual(await snapshot(),verified);
  await assert.rejects(commit({...full,players:[...full.players,full.players[0]]}),/Duplicate official participant/);
  await commit({external_match_id:'100',players:full.players,staff:[],incidents:[],report_score_available:false,
   reported_home_score:null,reported_away_score:null,event_timeline_status:'not_retrieved',official_status:null});
  assert.deepEqual(await snapshot(),verified);
  await commit(full);
  assert.deepEqual(await snapshot(),verified);
  assert.equal((await db.query('select count(*)::int n from federation_match_events')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from federation_match_lineups')).rows[0].n,2);
  await db.exec('set role authenticated');
  await assert.rejects(commit(full),/permission denied/);
 }finally{
  await db.close();
 }
});
