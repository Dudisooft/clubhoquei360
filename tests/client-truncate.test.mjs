import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
test('client TRUNCATE is revoked without changing rows, normal grants, backend grants or RLS; repeat is safe',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table public.official_lineups(id int primary key);insert into public.official_lineups values(1);
 alter table public.official_lineups enable row level security;
 grant select,truncate on public.official_lineups to anon,authenticated,service_role;
 alter default privileges for role postgres in schema public grant truncate on tables to anon,authenticated;`);
 await db.exec(`begin;set local role authenticated;truncate public.official_lineups;rollback;`);
 const migration=fs.readFileSync(new URL('../supabase/migrations/20261029040738_revoke_client_truncate.sql',import.meta.url),'utf8');
 await db.exec(migration);await db.exec(migration);
 for(const role of ['anon','authenticated']){
  const r=await db.query(`select has_table_privilege('${role}','public.official_lineups','TRUNCATE') blocked,has_table_privilege('${role}','public.official_lineups','SELECT') readable`);assert.equal(r.rows[0].blocked,false);assert.equal(r.rows[0].readable,true);
  await db.exec('set role '+role);await assert.rejects(db.exec('truncate public.official_lineups'),e=>e.code==='42501');await db.exec('reset role');
 }
 assert.equal((await db.query('select count(*)::int n from public.official_lineups')).rows[0].n,1);
 assert.equal((await db.query("select has_table_privilege('service_role','public.official_lineups','TRUNCATE') allowed")).rows[0].allowed,true);
 await db.exec('create table public.future_table(id int)');assert.equal((await db.query("select has_table_privilege('authenticated','public.future_table','TRUNCATE') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.official_lineups'::regclass")).rows[0].relrowsecurity,true);
 }finally{await db.close();}
});
