import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {schema} from './helpers/ihc-schema.mjs';
const predecessor=fs.readFileSync(new URL('./helpers/official-report-predecessor.sql',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20261028191801_preserve_partial_federation_rosters.sql',import.meta.url),'utf8');
const match='20000000-0000-4000-8000-000000000021',lineup='30000000-0000-4000-8000-000000000021';
const report=extra=>({external_match_id:'999999',players:[{external_id:'100',side:'home',name:'PORTER FICTICI',position:'goalkeeper',dorsal:'1',captain:true,goals:null,assists:null}],staff:[],incidents:[],official_status:null,reported_home_score:null,event_timeline_status:'not_retrieved',fetched_at:'2026-11-04T00:00:00Z',source_url:'https://hockeypatines.fep.es/league/3575',...extra});
async function fixture(){
 const db=new PGlite();await db.exec(schema+predecessor+fs.readFileSync(new URL('./helpers/official-report-fixture.sql',import.meta.url),'utf8'));return db;
}
async function commit(db,payload){await db.exec('set role service_role');try{return await db.query('select federation_commit_official_report($1,$2::jsonb)',[match,JSON.stringify(payload)]);}finally{await db.exec('reset role');}}
const one=async(db,query)=>(await db.query(query)).rows[0];
test('verified predecessor reproduces stale goalkeeper; correction reconciles the same lineup and nullable player identity',async()=>{
 const db=await fixture();try{await commit(db,report());assert.equal((await one(db,`select is_goalkeeper from federation_match_lineups where id='${lineup}'`)).is_goalkeeper,false,'predecessor defect reproduced');await db.exec(migration);await commit(db,report());const p=await one(db,`select * from federation_match_lineups where id='${lineup}'`);assert.equal(p.is_goalkeeper,true);assert.equal(p.is_captain,true);assert.equal(p.player_id,'30000000-0000-4000-8000-000000000022');assert.equal(p.shirt_number,'1');assert.equal(p.reported_goals,2);assert.equal(p.reported_assists,1);assert.equal((await one(db,'select count(*)::int n from federation_match_lineups')).n,2);}finally{await db.close();}
});
test('partial participant-only report preserves official status, timeline, scores, staff and other-side participants',async()=>{
 const db=await fixture();try{await db.exec(migration);await commit(db,report());const m=await one(db,`select * from federation_matches where id='${match}'`);assert.equal(m.home_score,1);assert.equal(m.away_score,1);assert.equal(m.raw_data.report_data.official_status,'FINALIZAT');assert.equal(m.raw_data.report_data.reported_home_score,1);assert.deepEqual(m.raw_data.report_data.incidents,[{text:'INCIDENCIA FICTICIA'}]);assert.equal(m.raw_data.report_data.event_timeline_status,'retrieved');for(const t of ['federation_match_staff','federation_match_events'])assert.equal((await one(db,`select count(*)::int n from ${t}`)).n,1);}finally{await db.close();}
});
test('missing backend event permission fails atomically; reviewed migration repairs only backend access and remains idempotent',async()=>{
 const db=await fixture();const payload=report({incidents:[{order:1,event_type:'FICTICI',text:'FICTICI NO PERSONAL'}],event_timeline_status:'retrieved'});try{await assert.rejects(commit(db,payload),/permission denied for table federation_match_events/);assert.equal((await one(db,`select is_goalkeeper from federation_match_lineups where id='${lineup}'`)).is_goalkeeper,false);await db.exec(migration);await commit(db,payload);await commit(db,payload);assert.equal((await one(db,'select count(*)::int n from federation_match_events')).n,2);await db.exec(migration);await commit(db,payload);assert.equal((await one(db,'select count(*)::int n from federation_match_events')).n,2);for(const role of ['anon','authenticated'])assert.equal((await db.query("select has_function_privilege($1,'federation_commit_official_report(uuid,jsonb)','EXECUTE') ok",[role])).rows[0].ok,false);}finally{await db.close();}
});
test('missing participant identity or side rejects the complete statement without changing saved lineups',async()=>{
 const db=await fixture();try{await db.exec(migration);const before=(await db.query('select * from federation_match_lineups order by id')).rows;for(const bad of [{name:'FICTICI',side:'home'},{external_id:'100',name:'FICTICI'}])await assert.rejects(commit(db,report({players:[bad]})),/Invalid participant identity/);assert.deepEqual((await db.query('select * from federation_match_lineups order by id')).rows,before);}finally{await db.close();}
});
test('unreviewed predecessor code aborts the pending migration without changing sporting rows',async()=>{
 const db=await fixture();try{const before=(await db.query('select * from federation_match_lineups order by id')).rows;await db.exec(predecessor.replace('declare m public.federation_matches;', 'declare unexpected_predecessor int; m public.federation_matches;'));await assert.rejects(db.exec(migration),/Unreviewed canonical report function/);await db.exec('rollback');assert.deepEqual((await db.query('select * from federation_match_lineups order by id')).rows,before);}finally{await db.close();}
});
