import fs from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {reconcileCalendarIdentity} from './federation-catalogue-reconciliation.mjs';

const [adapter,inputFile,outputFile,federation,season,club]=process.argv.slice(2);
if(!adapter||!inputFile||!outputFile||!['FECAPA','RFEP'].includes(federation)||![season,club].every(x=>/^[1-9]\d{0,9}$/.test(x))) {
 throw Error('Usage: node scripts/audit-federation-catalogue.mjs ADAPTER INPUT_JSON OUTPUT_JSON FEDERATION SEASON CLUB');
}
const {PublicFederation}=await import(pathToFileURL(resolve(adapter)).href);
const api=new PublicFederation();
const input=JSON.parse(await fs.readFile(inputFile,'utf8'));
const baselineFound=[];
const competitions=[];
const failures=[];
for (const scope of input) {
 try {
  const result=await api.discoverClubCompetition(federation,scope.competition,season,club);
  const matches=scope.matches.map(([code,round,home,away,groupId,group])=>({code,round,home,away,groupId,group}));
  const published=new Set(matches.map(m=>m.code).filter(Boolean));
  const pending=result.fixtures.filter(f=>f.score&&f.official_match_id&&!published.has(f.official_match_id));
  competitions.push({competition:scope.competition, fixtures:result.fixtures.length, pending:pending.length, teams:result.teams.length});
  for(const fixture of pending)baselineFound.push({fixture,reconciliation:reconcileCalendarIdentity(fixture,matches)});
 } catch(error) {
  failures.push({competition:scope.competition,status:error.sourceState||'inaccessible',http:error.status||null});
 }
}
console.log(JSON.stringify({competitions,failures,total:baselineFound.length}));
const pending=[...baselineFound];
const rows=[];
async function worker() {
 for(let item;(item=pending.shift());) {
  const {fixture:f,reconciliation}=item;
  let reportStatus='recoverable';
  try { const report=await api.report(f); if(report.stale||report.status!=='published')reportStatus='incomplete_or_unpublished'; }
  catch(error) {
   if(error.status===429||['http_access_denied','proxy_reported','portal_origin_rejected'].includes(error.sourceState))pending.length=0;
   reportStatus=error.sourceState==='report_pending'?'incomplete_or_unpublished':'inaccessible'; }
  rows.push({competition:f.competition_id,report:f.official_match_id,date:f.date,round:f.round_label,home:f.home_id,away:f.away_id,score:f.score,reconciliation:reconciliation.status,reportStatus});
 }
}
await Promise.all([worker(),worker()]);
rows.sort((a,b)=>a.competition.localeCompare(b.competition)||a.report.localeCompare(b.report));
await fs.writeFile(outputFile,JSON.stringify({competitions,failures,rows},null,2)+'\n',{flag:'wx'});
