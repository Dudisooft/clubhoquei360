import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const procedure = name => readFile(new URL('../ops/federation-event-grants/'+name+'.sql',import.meta.url),'utf8');
const counts = async db => (await db.query('select count(*)::int n from public.federation_match_events')).rows[0].n;

test('guarded grant enables idempotent service inserts, preserves fixtures and revokes cleanly', async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create role service_role;
   create role authenticated;
   create role anon;
   create table public.federation_match_events(id uuid primary key);
   create function public.federation_commit_official_report(uuid,jsonb)
   returns void language sql security invoker set search_path='' as
   $$ insert into public.federation_match_events values($1) on conflict(id) do nothing $$;
   revoke execute on function public.federation_commit_official_report(uuid,jsonb) from public;
   grant execute on function public.federation_commit_official_report(uuid,jsonb) to service_role;
  `);
  const fixture='10000000-0000-4000-8000-000000000001';
  const commit=()=>db.query('select public.federation_commit_official_report($1,$2)',[fixture,{}]);
  await db.exec('set role service_role');
  await assert.rejects(commit(),/permission denied/);
  await db.exec('reset role');
  assert.equal(await counts(db),0);
  await db.exec(await procedure('apply'));
  await db.exec('set role service_role');
  await commit();
  await commit();
  await db.exec('set role authenticated');
  await assert.rejects(commit(),/permission denied/);
  await db.exec('reset role');
  assert.equal(await counts(db),1);
  await assert.rejects(db.exec(await procedure('apply')),/privileges differ/);
  await db.exec('rollback');
  await db.exec(await procedure('revert'));
  await db.exec('set role service_role');
  await assert.rejects(commit(),/permission denied/);
  await db.exec('reset role');
  assert.equal(await counts(db),1);
 } finally {
  await db.close();
 }
});
