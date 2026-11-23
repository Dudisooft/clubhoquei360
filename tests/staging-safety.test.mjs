import test from 'node:test';import assert from 'node:assert/strict';import {assertLocalStaging,LOCAL_PROJECT,LOCAL_API,LOCAL_DB,assertLocalConfig} from '../scripts/staging-safety.mjs';
const safe={projectId:LOCAL_PROJECT,apiUrl:LOCAL_API,dbUrl:LOCAL_DB};
test('staging permits only the exact loopback project and ports',()=>assert.equal(assertLocalStaging(safe),true));
test('production, remote, ambiguous or mismatched staging destinations fail before SQL/network',()=>{
 for(const change of [{projectId:'oevprbchlhyglhvopnvy'},{apiUrl:'https://oevprbchlhyglhvopnvy.supabase.co'},{dbUrl:'postgresql://db.oevprbchlhyglhvopnvy.supabase.co/postgres'},{apiUrl:'http://127.0.0.1:56321/oevprbchlhyglhvopnvy'},{apiUrl:'http://localhost:56321'},{apiUrl:'http://127.0.0.1:54321'},{dbUrl:'postgresql://192.168.1.2:56322/postgres'},{apiUrl:'http://127.0.0.1:56321?target=production'}])assert.throws(()=>assertLocalStaging({...safe,...change}));
});

test('linked remote configuration cannot be silently rewritten as a local project',()=>{
 assert.equal(assertLocalConfig(`project_id = "${LOCAL_PROJECT}"`),true);
 for(const text of ['project_id = "oevprbchlhyglhvopnvy"',`project_id = "${LOCAL_PROJECT}"\nurl="https://other.supabase.co"`,'project_id = "another"'])assert.throws(()=>assertLocalConfig(text));
});
