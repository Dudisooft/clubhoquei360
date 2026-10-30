import test from 'node:test';import assert from 'node:assert/strict';import {assertLocalStaging,LOCAL_PROJECT,LOCAL_API,LOCAL_DB} from '../scripts/remediation-safety.mjs';
const good={projectId:LOCAL_PROJECT,apiUrl:LOCAL_API,dbUrl:LOCAL_DB};
test('3A.8 fixed local endpoints accepted',()=>assert.equal(assertLocalStaging(good),true));
test('production reference and remote API fail before connecting',()=>assert.throws(()=>assertLocalStaging({...good,apiUrl:'https://oevprbchlhyglhvopnvy.supabase.co'})));
test('a matching-looking name cannot authorize another project',()=>assert.throws(()=>assertLocalStaging({...good,projectId:'clubhoquei360-staging'})));
test('different loopback ports cannot target another profile',()=>{for(const key of ['apiUrl','dbUrl'])assert.throws(()=>assertLocalStaging({...good,[key]:good[key].replace('5643','5633')}));});
test('another database is rejected despite loopback host',()=>assert.throws(()=>assertLocalStaging({...good,dbUrl:LOCAL_DB.replace('/postgres','/other')})));
test('userinfo, query or hostname aliases cannot change the connection',()=>{for(const dbUrl of [LOCAL_DB+'?host=production',LOCAL_DB.replace('127.0.0.1','localhost'),LOCAL_DB.replace('127.0.0.1','postgres:secret@127.0.0.1')])assert.throws(()=>assertLocalStaging({...good,dbUrl}));});
