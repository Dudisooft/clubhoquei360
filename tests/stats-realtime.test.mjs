import test from 'node:test';
import assert from 'node:assert/strict';
import {StatsLiveSync} from '../stats-realtime.js';
// Deterministic subscription double: these tests do not prove production delivery.
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(refresh=async()=>true){
 const channels=[],removed=[],errors=[];let time=1000;
 const db={channel(name){const handlers=[];const channel={name,handlers,on(type,filter,callback){handlers.push({type,filter,callback});return this;},subscribe(callback){this.status=callback;return this;},notify(table='stats_events'){return handlers.find(h=>h.filter.table===table).callback();}};channels.push(channel);return channel;},async removeChannel(channel){removed.push(channel);}};
 const sync=new StatsLiveSync(db,{refresh,onError:e=>errors.push(e.message),now:()=>time});
 return {sync,db,channels,removed,errors,setTime:t=>time=t};
}
test('only an applied change notification marks a live update; connection and initial HTTP refresh do not',async()=>{
 let calls=0;const gate=deferred(),f=fixture(async()=>{if(++calls===2)await gate.promise;return true;});
 await f.sync.start({match:'match-A',uid:'user-A'});const channel=f.channels[0];
 assert.deepEqual(f.sync.snapshot(),{status:'connecting',lastUpdateAt:null});
 assert.deepEqual(channel.handlers.map(h=>[h.filter.table,h.filter.filter]),['stats_events','stats_assignments','stats_coverage'].map(t=>[t,'match_id=eq.match-A']));
 await channel.status('SUBSCRIBED');assert.deepEqual(f.sync.snapshot(),{status:'connected',lastUpdateAt:null});
 const update=channel.notify();await Promise.resolve();assert.equal(f.sync.snapshot().lastUpdateAt,null);
 gate.resolve();await update;assert.equal(f.sync.snapshot().lastUpdateAt,1000);await f.sync.stop();
});
test('reconnection refreshes missed data without claiming a delivered change and retains the last successful update',async()=>{
 let reads=0;const f=fixture(async()=>{reads++;return true;});await f.sync.start({match:'A',uid:'U'});const channel=f.channels[0];
 await channel.status('SUBSCRIBED');await channel.notify('stats_coverage');f.setTime(2000);
 for(const status of ['TIMED_OUT','CHANNEL_ERROR','CLOSED']){channel.status(status);assert.equal(f.sync.snapshot().status,'reconnecting');assert.equal(f.sync.snapshot().lastUpdateAt,1000);}
 await channel.status('SUBSCRIBED');assert.equal(reads,3);assert.deepEqual(f.sync.snapshot(),{status:'connected',lastUpdateAt:1000});await f.sync.stop();
});
test('a change arriving during the initial read queues another read and is not lost',async()=>{
 const initial=deferred(),changed=deferred();let reads=0;
 const f=fixture(async()=>{await (++reads===1?initial.promise:changed.promise);return true;});await f.sync.start({match:'A',uid:'U'});const channel=f.channels[0];
 const task=channel.status('SUBSCRIBED');await Promise.resolve();channel.notify('stats_assignments');initial.resolve();
 await new Promise(r=>setImmediate(r));assert.equal(reads,2);assert.equal(f.sync.snapshot().lastUpdateAt,null);
 changed.resolve();await task;assert.equal(f.sync.snapshot().lastUpdateAt,1000);await f.sync.stop();
});
test('old match callbacks and an in-flight read cannot alter the newly selected match status',async()=>{
 const gate=deferred();let reads=0;const f=fixture(async()=>{reads++;await gate.promise;return true;});
 await f.sync.start({match:'A',uid:'U'});const old=f.channels[0],pending=old.notify();await Promise.resolve();
 await f.sync.start({match:'B',uid:'U'});gate.resolve();await pending;
 old.status('SUBSCRIBED');old.status('CHANNEL_ERROR');await old.notify();
 assert.equal(reads,1);assert.deepEqual(f.sync.snapshot(),{status:'connecting',lastUpdateAt:null});assert.deepEqual(f.removed,[old]);await f.sync.stop();
});
test('access loss closes the subscription and later notifications cannot reload protected data',async()=>{
 let reads=0;const f=fixture(async()=>{reads++;return false;});await f.sync.start({match:'A',uid:'U'});const channel=f.channels[0];
 await channel.notify();assert.deepEqual(f.sync.snapshot(),{status:'idle',lastUpdateAt:null});assert.deepEqual(f.removed,[channel]);
 await channel.notify();channel.status('SUBSCRIBED');assert.equal(reads,1);
});
test('failed change refresh is reported without a false update timestamp and a later notification can recover',async()=>{
 let fail=true;const f=fixture(async()=>{if(fail)throw Error('HTTP unavailable');return true;});await f.sync.start({match:'A',uid:'U'});const channel=f.channels[0];
 await channel.notify();assert.deepEqual(f.errors,['HTTP unavailable']);assert.equal(f.sync.snapshot().lastUpdateAt,null);
 fail=false;await channel.notify();assert.equal(f.sync.snapshot().lastUpdateAt,1000);await f.sync.stop();
});
test('stop during transport cleanup cannot resurrect a pending subscription',async()=>{
 const f=fixture(),cleanup=deferred();await f.sync.start({match:'A',uid:'U'});const old=f.channels[0];
 f.db.removeChannel=async()=>cleanup.promise;
 const starting=f.sync.start({match:'B',uid:'U'});await f.sync.stop();cleanup.resolve();await starting;
 old.status('SUBSCRIBED');await old.notify();assert.equal(f.channels.length,1);assert.deepEqual(f.sync.snapshot(),{status:'idle',lastUpdateAt:null});
});
