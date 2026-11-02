import fs from 'node:fs';import crypto from 'node:crypto';
import {PublicFederation,normalizeReport} from './lib/public-federation.mjs';
import {officialPlayers,historicalCandidates} from '../official-lineups.js';
const folder='work/replay-source';fs.mkdirSync(folder,{recursive:true});
const existing=fs.existsSync(folder+'/bundle.json')?JSON.parse(fs.readFileSync(folder+'/bundle.json','utf8')):null;
const seed=JSON.parse(fs.readFileSync('demo/public-calendar-snapshot.json','utf8'));
const p=new PublicFederation({snapshots:existing?[existing.calendar]:seed,reportSnapshots:[existing?.report,existing?.priorReport].filter(Boolean)});
const calendar=await p.calendar('RFEP','3575','41');
const vic=calendar.fixtures.find(f=>f.official_match_id==='35559'),noia=calendar.fixtures.find(f=>f.official_match_id==='35574');
if(!vic||!noia)throw Error('No s’han identificat els partits oficials');
// Reuse the already downloaded official document. It is never an operator table.
if(!fs.existsSync(folder+'/rfep-35559.json')){const raw=(await p.rfep('report',{id:vic.official_match_id})).data;officialPlayers(vic,normalizeReport(raw,vic));fs.writeFileSync(folder+'/rfep-35559.json',JSON.stringify(raw),{flag:'wx'});}
const report=normalizeReport(JSON.parse(fs.readFileSync(folder+'/rfep-35559.json','utf8')),vic);
report.verifiedAt=existing?.report?.verifiedAt||fs.statSync(folder+'/rfep-35559.json').mtime.toISOString();
const players=officialPlayers(vic,report);
const day=f=>{const [d,m,y]=f.date.split('/');return Date.parse(`${y}-${m}-${d}`);};
const previous=calendar.fixtures.filter(f=>[f.home_id,f.away_id].includes(noia.away_id)&&f.score&&day(f)<day(noia)).sort((a,b)=>day(b)-day(a))[0];
const priorReport=previous?await p.report(previous):null;
const reports=new Map([[vic.id,report],...(priorReport?[[previous.id,priorReport]]:[])]);
const candidates={home:historicalCandidates(noia.home_id,[vic],reports),away:previous?historicalCandidates(noia.away_id,[previous],reports):[]};
const bundle={calendar,vic,noia,report,players,candidates,previous,priorReport,officialHash:crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex')};
fs.writeFileSync(folder+'/bundle.json',JSON.stringify(bundle,null,2));
console.log(JSON.stringify({vic:players.reduce((a,p)=>(a[p.team]++,a),{home:0,away:0}),noia:{date:noia.date,time:noia.time,venue:noia.venue,candidates:{home:candidates.home.length,away:candidates.away.length}},reportHash:bundle.officialHash}));
