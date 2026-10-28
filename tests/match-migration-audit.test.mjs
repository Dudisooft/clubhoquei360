import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createDatabase} from './helpers/stats-db.mjs';
const root=new URL('../',import.meta.url),m1=fs.readFileSync(new URL('supabase/migrations/20261027170248_match_mode_access.sql',root),'utf8'),m2=fs.readFileSync(new URL('supabase/migrations/20261027183214_temporary_match_operators.sql',root),'utf8'),pre=fs.readFileSync(new URL('scripts/preflight-match-mode-access.sql',root),'utf8');
const stage=async db=>(await db.exec(pre))[1].rows[0].preflight.stage;
const fingerprint=async db=>(await db.query("select md5(jsonb_build_object('matches',(select jsonb_agg(t) from pilot_matches t),'events',(select jsonb_agg(t) from pilot_events t),'assignments',(select jsonb_agg(t) from stats_assignments t),'sessions',(select jsonb_agg(t) from stats_sessions t),'players',(select jsonb_agg(t) from pilot_players t))::text) value")).rows[0].value;
test('preflight detects missing dependency and partial install; ordered atomic install preserves historical sports rows',async()=>{
 const db=await createDatabase({skipModes:true});try{assert.equal(await stage(db),'READY_SCHEMA');const before=await fingerprint(db);await db.exec('begin;alter table teams add column age_group_source text');assert.equal(await stage(db),'STOP_PARTIAL_OR_DIFFERENT_VERSION');await db.exec('rollback');
 await assert.rejects(db.exec('begin;'+m2+'commit;'));await db.exec('rollback');assert.equal(await stage(db),'READY_SCHEMA');assert.equal(await fingerprint(db),before);
 await assert.rejects(db.exec('begin;'+m1+'select 1/0;commit;'));await db.exec('rollback');assert.equal(await stage(db),'READY_SCHEMA');assert.equal(await fingerprint(db),before);
 await db.exec('begin;'+m1+'commit;');assert.equal(await stage(db),'STOP_PARTIAL_OR_DIFFERENT_VERSION');assert.equal(await fingerprint(db),before);
 await db.exec('begin;'+m2+'commit;');assert.equal(await stage(db),'INSTALLED_CHECK_RLS_AND_AUTH');assert.equal(await fingerprint(db),before);
 await assert.rejects(db.exec('begin;'+m1+m2+'commit;'));await db.exec('rollback');assert.equal(await stage(db),'INSTALLED_CHECK_RLS_AND_AUTH');assert.equal(await fingerprint(db),before);
 await db.exec('alter function app_private.pilot_can_prepare(uuid) rename to absent_for_audit');assert.equal(await stage(db),'STOP_MISSING_DEPENDENCY');
 }finally{await db.close();}
});
test('all phase 3A/3A.1 privileged functions use an empty search_path and no anonymous execute; old aliases are private',async()=>{
 const db=await createDatabase();try{
 const rows=(await db.query("select n.nspname,p.proname,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') client from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and (p.proname like 'mode_%' or p.proname like 'match_%' or p.proname like 'temporary_%' or p.proname like '%_before_%')")).rows;assert.ok(rows.length>15);for(const r of rows){assert.ok(r.proconfig?.includes('search_path=""'),r.proname);assert.equal(r.anon,false,r.proname);if(r.proname.includes('_before_')||['mode_context','mode_operator_eligible'].includes(r.proname))assert.equal(r.client,false,r.proname);}
 }finally{await db.close();}
});
test('classification proposal refuses unreviewed writes, leaves five unsupported senior claims pending and always rolls back',async()=>{
 const {PGlite}=await import('@electric-sql/pglite'),db=new PGlite();try{
 const proposal=JSON.parse(fs.readFileSync(new URL('docs/match-age-group-review-20261027.json',root),'utf8')),sql=fs.readFileSync(new URL('scripts/prepare-reviewed-age-groups.sql',root),'utf8');
 await db.exec('create table teams(id uuid,club_id uuid,season_id uuid,category text,age_group text,age_group_source text)');for(const t of proposal.teams)await db.query('insert into teams(id,club_id,season_id,category) values($1,$2,$3,$4)',[t.id,t.club_id,t.season_id,t.category]);
 await assert.rejects(db.exec(sql),/Classification review required/);await db.exec('rollback');assert.equal((await db.query('select count(*)::int n from teams where age_group is not null')).rows[0].n,0);
 await db.exec("set ch360.classification_review_approved='yes'");const results=await db.exec(sql.replace('rollback;','select count(*)::int proposed from teams where age_group is not null;rollback;'));assert.equal(results.find(r=>r.rows[0]?.proposed!==undefined).rows[0].proposed,31);assert.equal((await db.query('select count(*)::int n from teams where age_group is not null')).rows[0].n,0);
 assert.equal(proposal.teams.filter(t=>t.age_evidence_status==='pending_independent_age_evidence').length,5);
 }finally{await db.close();}
});
