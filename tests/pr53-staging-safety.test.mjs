import test from 'node:test';import assert from 'node:assert/strict';
import {assertLocalStaging,assertLocalConfig,LOCAL_PROJECT,LOCAL_API,LOCAL_DB} from '../ops/pr53-staging/safety.mjs';
const valid={projectId:LOCAL_PROJECT,apiUrl:LOCAL_API,dbUrl:LOCAL_DB};
test('PR53 staging guard accepts only the fixed isolated loopback database and API',()=>{
 assert.equal(assertLocalStaging(valid),true);
 for(const bad of [
  {...valid,projectId:'production'},
  {...valid,apiUrl:'https://oevprbchlhyglhvopnvy.supabase.co'},
  {...valid,apiUrl:'http://localhost:57321'},
  {...valid,apiUrl:'http://127.0.0.1:57322'},
  {...valid,apiUrl:'http://user:credential@127.0.0.1:57321'},
  {...valid,apiUrl:'http://127.0.0.1:57321/unexpected'},
  {...valid,dbUrl:'postgresql://127.0.0.1:5432/postgres'},
  {...valid,dbUrl:'postgresql://127.0.0.1:57322/other'},
  {...valid,dbUrl:'postgresql://user:credential@127.0.0.1:57322/postgres'}
 ])assert.throws(()=>assertLocalStaging(bad));
});
test('PR53 local configuration rejects linked Supabase hosts and wrong project markers',()=>{
 assert.equal(assertLocalConfig('project_id = "'+LOCAL_PROJECT+'"'),true);
 assert.throws(()=>assertLocalConfig('project_id = "production"'));
 assert.throws(()=>assertLocalConfig('project_id = "'+LOCAL_PROJECT+'"\nurl = "https://another.supabase.co"'));
});
