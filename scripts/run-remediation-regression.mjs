// Reuses reviewed test scenarios without changing application files or old evidence.
// Only endpoint/runtime imports and evidence locations are adapted in ignored work/.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
const root=path.resolve(new URL('..',import.meta.url).pathname),kind=process.argv[2],names={api:'verify-integration-api','recovery-api':'verify-integration-api',auth:'verify-integration-auth',federation:'verify-integration-federation',selector:'verify-integration-selector'};
if(!names[kind])throw Error('Choose api, auth, federation or selector');
const recovery=kind==='recovery-api';
const original=path.join(root,'scripts',names[kind]+'.mjs'),source=fs.readFileSync(original,'utf8');let adapted=source.replaceAll('integration-runtime.mjs','remediation-runtime.mjs').replaceAll('integration-safety.mjs','remediation-safety.mjs').replaceAll('work/3a6','work/3a8').replaceAll('staging-3a6','staging-3a8').replaceAll('56390','56490').replaceAll('ch360_3a6','ch360_3a8').replaceAll('docs/evidence/integration-3a6-federation','docs/evidence/remediation-3a8-federation').replaceAll('docs/evidence/integration-3a6-selector','docs/evidence/remediation-3a8-selector');
if(recovery)adapted=adapted.replaceAll('remediation-runtime.mjs','remediation-recovery-runtime.mjs').replaceAll('remediation-safety.mjs','remediation-recovery-runtime.mjs').replaceAll('ch360_3a8_auth','ch360_3a8_recovery_auth').replaceAll('ch360_3a8_rest','ch360_3a8_recovery_rest');
adapted=adapted.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_,quote,file)=>'from '+quote+pathToFileURL(path.resolve(path.dirname(original),file)).href+quote);
const dir=path.join(root,'work/3a8/runners');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,kind+'.mjs');fs.writeFileSync(file,adapted);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');fs.writeFileSync(path.join(dir,kind+'-source.json'),JSON.stringify({original:path.relative(root,original),originalSha256:hash(source),adaptedSha256:hash(adapted),adaptation:'Local runtime/ports and evidence locations only; application logic unchanged'}));
const r=spawnSync(process.execPath,[file,root],{cwd:root,stdio:'inherit'});process.exitCode=r.status??1;
