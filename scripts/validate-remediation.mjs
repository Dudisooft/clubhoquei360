// Local-only mutation driver. Has no URL/CLI option for a remote target.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {root,work,sql,assertIsolation} from './remediation-runtime.mjs';
import {capture,digest,backup,restore,sqlCopy,pauseWriters,resumeWriters} from './remediation-state.mjs';
const packageRoot=path.join(root,'ops/truncate-3a8'),inventory=JSON.parse(fs.readFileSync(path.join(packageRoot,'inventory.json'))),ack=inventory.acknowledgement;
const aclSql=fs.readFileSync(path.join(packageRoot,'01_revoke_current.sql'),'utf8'),defaultSql=fs.readFileSync(path.join(packageRoot,'02_revoke_postgres_default.sql'),'utf8');
const cpFile=path.join(work,'core-checkpoint-private.json'),cp=fs.existsSync(cpFile)?JSON.parse(fs.readFileSync(cpFile)):{};
const evidenceFile=path.join(root,'docs/evidence/remediation-3a8-core.json');let evidence=fs.existsSync(evidenceFile)?JSON.parse(fs.readFileSync(evidenceFile)):{environment:assertIsolation(),steps:[],productionMutations:0};
const save=()=>{fs.writeFileSync(cpFile,JSON.stringify(cp),{mode:0o600});fs.writeFileSync(evidenceFile,JSON.stringify(evidence,null,2));};
const apply=(body,database='postgres')=>(database==='postgres'?sql:q=>sqlCopy(q,database))(`begin;select set_config('clubhoquei360.truncate_review','${ack}',true);${body}commit;`);
const isClientAcl=x=>x.schema==='public'&&x.privilege==='TRUNCATE'&&['anon','authenticated'].includes(x.role);
const isTargetDefault=x=>x.owner==='postgres'&&x.schema==='public'&&x.kind==='r'&&x.privilege==='TRUNCATE'&&['anon','authenticated'].includes(x.role);
const sameExcept=(a,b,except=[])=>{for(const key of Object.keys(a))if(!except.includes(key))assert.deepEqual(b[key],a[key],'Unexpected '+key+' modification');};
async function step(name,fn){if(cp[name]){console.log('REUSE '+name);return;}await fn();cp[name]=true;evidence.steps.push({name,result:'PASS'});save();console.log('PASS '+name);}
function negative(database='postgres'){
 let count=0;const run=database==='postgres'?sql:q=>sqlCopy(q,database);
 for(const item of inventory.expected){assert.throws(()=>run(`begin;set local role "${item.beneficiary}";truncate table "${item.schema}"."${item.table_name}";rollback;`),/permission denied/);count++;}
 assert.equal(count,49);return count;
}
pauseWriters();try{
 await step('inventory_snapshot_backup_restore',async()=>{
  const before=capture(),cases=before.acls.filter(isClientAcl);assert.equal(cases.length,49);assert.equal(new Set(cases.map(x=>x.table)).size,27);
  assert.deepEqual(cases.map(x=>[x.schema,x.table,x.role,x.grantor]).sort(),inventory.expected.map(x=>[x.schema,x.table_name,x.beneficiary,x.grantor]).sort());
  const b=backup('before'),copy=restore(b.file);assert.deepEqual(capture(copy),b.snapshot,'Initial backup not faithfully recoverable');
  cp.beforeFile=b.file;cp.beforeSnapshot=path.join(work,'before-snapshot-private.json');cp.restoreBefore=copy;
  evidence.before={grants:49,tables:27,privileges:b.snapshot.acls.length,defaults:b.snapshot.defaults.length,rowsets:b.snapshot.rowsets.length,version:sql('show server_version'),migrations:JSON.parse(sql('select jsonb_agg(t order by file) from app_private.integration_applied t')),dumpSha256:b.hash,fullSnapshotSha256:digest(b.snapshot),restoredFullSnapshotSha256:digest(capture(copy))};
 });
 await step('acknowledgement_and_drift_fail_closed',async()=>{
  const before=capture();assert.throws(()=>sql(aclSql),/explicit reviewed-scope acknowledgement required/);assert.deepEqual(capture(),before);
  const copy=cp.restoreBefore,copyBefore=capture(copy),first=inventory.expected[0];
  assert.throws(()=>sqlCopy(`begin;revoke truncate on table "${first.schema}"."${first.table_name}" from "${first.beneficiary}";select set_config('clubhoquei360.truncate_review','${ack}',true);${aclSql}commit;`,copy),/partial\/unexpected inventory/);assert.deepEqual(capture(copy),copyBefore);
  assert.throws(()=>sqlCopy(`begin;create table public.ch360_3a8_outside_inventory(id int);select set_config('clubhoquei360.truncate_review','${ack}',true);${aclSql}commit;`,copy),/partial\/unexpected inventory/);assert.deepEqual(capture(copy),copyBefore);
  evidence.guards={missingAcknowledgementRejected:true,partial48RejectedAtomically:true,outsideInventory51RejectedAtomically:true,allFailureTransactionsRolledBack:true};
 });
 await step('apply_exact49_preserve_everything_else',async()=>{
  const before=capture();assert.equal(before.acls.filter(isClientAcl).length,49);apply(aclSql);const after=capture();sameExcept(before,after,['acls']);
  assert.deepEqual(after.acls,before.acls.filter(x=>!isClientAcl(x)));assert.equal(after.acls.filter(isClientAcl).length,0);
  const removed=before.acls.filter(x=>!after.acls.some(y=>JSON.stringify(x)===JSON.stringify(y)));assert.equal(removed.length,49);
  fs.writeFileSync(path.join(root,'docs/evidence/remediation-3a8-acl-diff.json'),JSON.stringify({removed,added:[],otherPrivilegesUnchanged:true,allRowsFunctionsPoliciesOwnersRolesUnchanged:true},null,2));evidence.afterCurrent={removed:49,added:0,defaultsStillContainClientTruncate:after.defaults.filter(isTargetDefault).length};
 });
 await step('prove_future_default_then_correct_separately',async()=>{
  const before=capture();assert.equal(before.defaults.filter(isTargetDefault).length,2);
  const probe=sql("begin;create table public.ch360_3a8_future_probe(id int);alter table public.ch360_3a8_future_probe enable row level security;select jsonb_build_object('anon',has_table_privilege('anon','public.ch360_3a8_future_probe','TRUNCATE'),'authenticated',has_table_privilege('authenticated','public.ch360_3a8_future_probe','TRUNCATE'));rollback;");assert.ok(probe.includes('"anon": true')&&probe.includes('"authenticated": true'));assert.deepEqual(capture(),before);
  apply(defaultSql);const after=capture();sameExcept(before,after,['defaults']);assert.deepEqual(after.defaults,before.defaults.filter(x=>!isTargetDefault(x)));
  const safe=sql("begin;create table public.ch360_3a8_future_probe(id int);alter table public.ch360_3a8_future_probe enable row level security;select jsonb_build_object('anon',has_table_privilege('anon','public.ch360_3a8_future_probe','TRUNCATE'),'authenticated',has_table_privilege('authenticated','public.ch360_3a8_future_probe','TRUNCATE'),'owner',has_table_privilege('postgres','public.ch360_3a8_future_probe','TRUNCATE'),'backend',has_table_privilege('service_role','public.ch360_3a8_future_probe','TRUNCATE'));rollback;");assert.ok(safe.includes('"anon": false')&&safe.includes('"authenticated": false')&&safe.includes('"owner": true')&&safe.includes('"backend": true'));assert.deepEqual(capture(),after);
  evidence.defaults={before:before.defaults.length,after:after.defaults.length,removedOnlyTwoPostgresPublicClientTruncate:true,futureTableBeforeClientTruncate:true,futureTableAfterClientTruncate:false,ownerAndBackendStillAuthorized:true,noManagedOwnerModified:true};
 });
 await step('49_direct_denials_and_idempotence',async()=>{
  const before=capture();evidence.directRoleDenials=negative();assert.deepEqual(capture(),before);apply(aclSql);apply(defaultSql);assert.deepEqual(capture(),before);assert.equal(negative(),49);assert.deepEqual(capture(),before);
  evidence.secondApplication={unexpectedErrors:0,aclChanges:0,defaultChanges:0,rowsFunctionsRlsRolesChanged:false,negativeTestsRepeated:49};
 });
 await step('corrected_backup_legacy_restore_reapply_recover',async()=>{
  const corrected=backup('corrected'),copyCorrected=restore(corrected.file);assert.deepEqual(capture(copyCorrected),corrected.snapshot);
  const copyLegacy=restore(cp.beforeFile),original=JSON.parse(fs.readFileSync(cp.beforeSnapshot));assert.deepEqual(capture(copyLegacy),original);
  apply(aclSql,copyLegacy);apply(defaultSql,copyLegacy);assert.deepEqual(capture(copyLegacy),corrected.snapshot);const denials=negative(copyLegacy);assert.deepEqual(capture(copyLegacy),corrected.snapshot);assert.deepEqual(capture(),corrected.snapshot);
  cp.recoveryDatabase=copyLegacy;cp.correctedRestoreDatabase=copyCorrected;
  evidence.recovery={beforeDumpRecoveredExactly:true,correctedDumpRecoveredExactly:true,reappliedOnIndependentLegacyCopy:true,fullSnapshotMatchesCorrected:true,criticalDirectRoleDenials:denials,sourceUnchanged:true,rowsetsCompared:corrected.snapshot.rowsets.length,correctedDumpSha256:corrected.hash,correctedSnapshotSha256:digest(corrected.snapshot),productionRecoveryClaimed:false};
 });
 evidence.result='PASS';save();console.log('All local correction/backup/denial/idempotence/recovery blocks PASS.');
}finally{resumeWriters();}
