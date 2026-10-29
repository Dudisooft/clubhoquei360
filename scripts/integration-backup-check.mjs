// Destructive operations are confined to a newly created, labelled local restore DB.
// No production connection, no production rows or secrets are used.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {docker,dbName,sql,secrets,work,root,start} from './integration-runtime.mjs';import {assertLocalStaging} from './integration-safety.mjs';
assertLocalStaging(secrets);sql('select 1'); // Verifies the container label before any command.
const target='ch360_3a6_restore_'+Date.now();assert.match(target,/^ch360_3a6_restore_[0-9]+$/);
assert.equal(sql(`select count(*) from pg_database where datname='${target}'`),'0');
const query=`select coalesce(jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'data',query_to_xml(format('select count(*) n,md5(coalesce(string_agg(md5(to_jsonb(t)::text), %L order by md5(to_jsonb(t)::text)),%L)) fingerprint from %I.%I t','','',n.nspname,c.relname),false,true,'')::text) order by n.nspname,c.relname),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in('public','app_private','auth')`;
// Pause local writers and Auth maintenance for a consistent complete rowset comparison.
for(const name of ['ch360_3a6_rest','ch360_3a6_auth']){const info=JSON.parse(docker(['inspect',name]).stdout)[0];assert.equal(info.Config.Labels['ch360.staging'],secrets.projectId);docker(['stop',name]);}
try {
const before=sql(query),dump=docker(['exec','-e','PGPASSWORD',dbName,'pg_dump','-h','127.0.0.1','-U','postgres','-d','postgres'],{extraEnv:{PGPASSWORD:secrets.dbPassword}}).stdout;
const backup=path.join(work,'isolated-backup-private.sql');fs.writeFileSync(backup,dump,{mode:0o600});
assert.equal(sql(query),before,'Source changed while dumping; retry in a quiescent window');
sql(`create database ${target} template template0`);
const restoreSql=q=>docker(['exec','-i','-e','PGPASSWORD',dbName,'psql','-h','127.0.0.1','-U','postgres','-d',target,'-v','ON_ERROR_STOP=1','-At'],{input:q,extraEnv:{PGPASSWORD:secrets.dbPassword}}).stdout.trim();
// pg_dump 17 treats the initial public schema as built-in. Retain it in the new DB.
restoreSql(dump);
assert.equal(restoreSql(query),before,'Restored rowsets differ');assert.equal(sql(query),before,'Source changed during recovery');
const evidence={result:'PASS',environment:'labelled local staging only',tablesCompared:JSON.parse(before).length,dumpSha256:crypto.createHash('sha256').update(dump).digest('hex'),rowsetSha256:crypto.createHash('sha256').update(before).digest('hex'),sourceUnchanged:true,restoreIntoNewDatabase:true,restoredRowsMatch:true,productionBackupTested:false,limits:['Does not establish production PITR, vault, cron, provider configuration or disaster recovery readiness.','Local fictional account hashes remain only in ignored private dump.']};
fs.writeFileSync(path.join(root,'docs/evidence/integration-3a6-backup.json'),JSON.stringify(evidence,null,2));console.log('PASS local backup and independent restore: '+evidence.tablesCompared+' complete table fingerprints match.');

} finally {await start();}
