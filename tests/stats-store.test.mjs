import test from 'node:test';import assert from 'node:assert/strict';import {StatsStore} from '../stats-store.js';
import {createDatabase,ID,asUser,event} from './helpers/stats-db.mjs';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
let db;test.before(async()=>db=await createDatabase());test.after(async()=>await db.close());
const response=async args=>{try{return {data:(await asUser(db,'principal','select * from stats_write_event($1::jsonb,$2)',[JSON.stringify(args.p_event),args.p_expected])).rows[0],error:null};}catch(e){return {data:null,error:{code:e.code,message:e.message}};}};
function store(client,local=storage()){const s=new StatsStore(client,{storage:local});s.uid=ID.principal;s.match=ID.match;return s;}
test('lost acknowledgement retries the exact durable mutation and counts one real PostgreSQL event',async()=>{
 let calls=0;const local=storage();const s=store({rpc:async(name,args)=>{calls++;const saved=await response(args);if(calls===1)throw Error('Network lost after commit');return saved;}},local);
 const e=event();await s.enqueue(e);assert.equal(s.pending.length,1);assert.ok(local.getItem(s.key()).includes(s.pending[0].event.mutation_id));await s.flush();assert.equal(s.pending.length,0);assert.equal(s.events.length,1);assert.equal(calls,2);
});
test('concurrent enqueue calls share one flush and preserve every action',async()=>{
 const s=store({rpc:async(name,args)=>response(args)});await Promise.all([s.enqueue(event()),s.enqueue(event({action:'shot_target'})),s.enqueue(event({action:'recovery'}))]);assert.equal(s.pending.length,0);assert.equal(s.events.length,3);
});
test('scope rejection remains recoverable and never masquerades as a saved event',async()=>{
 const local=storage(),s=store({rpc:async()=>({error:{code:'42501',message:'Scope denied'},data:null})},local);await s.enqueue(event());assert.equal(s.pending.length,1);assert.equal(s.pending[0].blocked,true);assert.equal(s.events.length,0);assert.equal(s.optimistic().length,0);
 const next=store({},local);next.pending=JSON.parse(local.getItem(s.key()));assert.equal(next.pending[0].event.mutation_id,s.pending[0].event.mutation_id);assert.equal(next.pending[0].error,'Scope denied');
});
test('full local storage stops registration before sending an unsafe nonrecoverable write',async()=>{
 let calls=0;const s=store({rpc:async()=>{calls++;}},{getItem:()=>null,setItem:()=>{throw Error('QuotaExceeded');}});assert.throws(()=>s.enqueue(event()),/conservar la cua/);assert.equal(calls,0);assert.equal(s.pending.length,0);
});
test('a second user and match have isolated recovery keys',()=>{const local=storage(),s=store({},local);s.pending=[{event:event(),expected:0}];s.remember();const key=s.key();s.uid=ID.external;assert.notEqual(s.key(),key);assert.equal(local.getItem(s.key()),null);s.uid=ID.principal;s.match=ID.otherMatch;assert.equal(local.getItem(s.key()),null);});
