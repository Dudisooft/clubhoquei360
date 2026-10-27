import test from 'node:test';import assert from 'node:assert/strict';
import {readModeAccess,activateCatalogue} from '../match-mode-access.js';import {matchHref} from '../match-navigation.js';
const id='60000000-0000-4000-8000-000000000001',op='60000000-0000-4000-8000-000000000002';
test('mode links require actual boolean server capabilities, never a context or a date alone',async()=>{
 const row={id,federation:'RFEP',operational:op};assert.equal(matchHref(row,'advanced'),null);
 for(const federation of ['RFEP','FECAPA'])assert.equal(matchHref({...row,federation},'advanced',{read:true,advanced:true}),'./partit-consulta.html?catalogue='+id+'&mode=advanced');
 assert.equal(matchHref(row,'advanced',{read:true,advanced:false,operational_read:true,operational:op}),null);
 assert.equal(matchHref(row,'advanced',{read:true,advanced:true,operational_read:true,operational:op,advanced_context_ready:false}),'./partit-consulta.html?catalogue='+id+'&mode=advanced');
 assert.equal(matchHref(row,'base',{read:true,base:true,operational_read:true,operational:op}),'./base.html?match='+op);
 const a=await readModeAccess({rpc:async()=>({data:{read:true,advanced:'true',base:true,activate_advanced:true}})},{match:op});assert.equal(a.advanced,false);assert.equal(a.activate_advanced,false);
});
test('permission reads perform no activation and unavailable server contract fails closed',async()=>{
 const calls=[];const db={rpc:async(name,args)=>{calls.push({name,args});return {data:{read:true,advanced:true}};}};
 await readModeAccess(db,{catalogue:id});assert.deepEqual(calls.map(c=>c.name),['match_mode_access']);
 await assert.rejects(readModeAccess(db,{catalogue:id,match:op}),/exactament/);
 await assert.rejects(readModeAccess({rpc:async()=>({error:{message:'Missing migration'}})},{match:op}),/verificar/);
});
test('activation is explicit and verifies returned canonical identity before navigation',async()=>{
 const calls=[];let activated=false;const db={rpc:async(name,args)=>{calls.push(name);if(name==='match_activate_catalogue'){activated=true;return {data:op};}return {data:activated?{read:true,base:true,advanced:true,operational_read:true,operational:op,catalogue_id:id}:{read:true,base:true,advanced:true,activate_advanced:true}};}};
 assert.equal(await activateCatalogue(db,{catalogue:id,mode:'advanced'}),op);assert.deepEqual(calls,['match_mode_access','match_activate_catalogue','match_mode_access']);
 await assert.rejects(activateCatalogue(db,{catalogue:'wrong',mode:'advanced'}),/permís|correspon/);
});
