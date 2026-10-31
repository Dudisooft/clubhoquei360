// Local-only recovery and failed-migration atomicity. Never connects to Supabase Cloud.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {work,assertIsolation} from './remediation-runtime.mjs';
import {pauseWriters,resumeWriters,backup,restore,capture,sqlCopy,digest} from './remediation-state.mjs';
assertIsolation();
const predecessor=path.join(work,'3a11-predecessor-private.sql');
assert.ok(fs.existsSync(predecessor),'Run the captured-predecessor rehearsal first');
const db=restore(predecessor),before=capture(db),first=fs.readFileSync('supabase/migrations/20261027170248_match_mode_access.sql','utf8');
let failed=false;try{sqlCopy("begin;"+first+"\ndo $$ begin raise exception '3A11 intentional isolated failure'; end $$;commit;",db);}catch(e){assert.match(e.message,/3A11 intentional isolated failure/);failed=true;}
assert.equal(failed,true);assert.deepEqual(capture(db),before,'Outer transaction must roll back partial installation');
let b,copy;pauseWriters();try{b=backup('phase-3a11');copy=restore(b.file);assert.deepEqual(capture(copy),b.snapshot);assert.deepEqual(capture(),b.snapshot);}finally{resumeWriters();}
fs.mkdirSync('work/3a11',{recursive:true});fs.writeFileSync('work/3a11/checkpoint-private.json',JSON.stringify({backup:b.file,database:copy,dumpSha256:b.hash}),{mode:0o600});
const result={result:'PASS',environment:'guarded loopback PostgreSQL; fictional accounts/data only',failedMigrationAtomicWithOuterTransaction:true,migrationsAreNotAssumedRerunnable:true,tablesCompared:b.snapshot.rowsets.length,dumpSha256:b.hash,snapshotSha256:digest(b.snapshot),restoredMetadataAndRowsMatch:true,sourceUnchanged:true,productionRecoveryValidated:false,productionMutations:0};
fs.writeFileSync('docs/evidence/phase-3a11-recovery.json',JSON.stringify(result,null,2));console.log('PASS failed migration rolls back; local backup independently restored, '+result.tablesCompared+' rowsets/metadata preserved.');
