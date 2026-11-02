import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {digest} from './lib/pilot-access.mjs';
const root=path.resolve('work','authenticated-'+crypto.randomUUID());
fs.mkdirSync(root,{recursive:true,mode:0o700});
if(process.platform==='win32'){
 const owner=execFileSync('whoami',[],{encoding:'utf8'}).trim();
 execFileSync('icacls',[root,'/inheritance:r','/grant:r',owner+':(OI)(CI)F'],{stdio:'pipe'});
}
const snapshots=JSON.parse(fs.readFileSync('demo/public-calendar-snapshot.json','utf8'));
const fixtures=snapshots.flatMap(s=>s.fixtures||[]);
const fem=fixtures.find(f=>f.federation==='FECAPA'&&f.date==='07/11/2026'&&[f.home_id,f.away_id].includes('12419'));
const simar=fixtures.find(f=>f.official_match_id==='35574');
if(!fem||!simar)throw Error('Missing verified pilot fixtures');
const entries=[{user:'operator-fem15',role:'external',f:fem,team:'12419',label:'Pilot FEM15 (Oriol)'},{user:'coach-simar',role:'coach',f:simar,team:'3697',label:'Validació convocatòria (Ramón)'}];
const records=[],instructions=['PILOT LOCAL · dades i jugadors ficticis · no és un compte productiu.','Accés: http://127.0.0.1:4184/','Codis locals: no compartir ni versionar. Caducitat: 24 hores.'];
for(const e of entries){const secret=crypto.randomBytes(32).toString('base64url');records.push({digest:digest(secret),user:e.user,role:e.role,match:e.f.id,team:e.team,federation:e.f.federation,expiresAt:Date.now()+86400000});instructions.push(`\n${e.label}\n${e.f.home_team} — ${e.f.away_team} · ${e.f.date} ${e.f.time}\nCodi: ${secret}`);}
fs.writeFileSync(path.join(root,'access.json'),JSON.stringify(records),{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(root,'INVITACIONS.locals.txt'),instructions.join('\n'),{flag:'wx',mode:0o600});
console.log(root);
