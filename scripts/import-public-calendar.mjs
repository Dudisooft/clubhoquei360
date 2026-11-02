// Import an already retrieved official HTML document. No browser tokens or people.
import fs from 'node:fs';import {importLegacyCalendar} from './lib/public-federation.mjs';
const [file,competition,season='41']=process.argv.slice(2);
if(!file||!competition)throw Error('Usage: node scripts/import-public-calendar.mjs FILE COMPETITION SEASON');
const fixtures=importLegacyCalendar(fs.readFileSync(file,'utf8'),competition,season);
const verifiedAt=fs.statSync(file).mtime.toISOString();
const snapshot={key:`FECAPA:${season}:${competition}`,federation:'FECAPA',competition_id:competition,season,competition:'',verifiedAt,expiresAt:0,fixtures,error:null,transport:'official-document-import'};
fs.mkdirSync('work/public-cache',{recursive:true});fs.writeFileSync(`work/public-cache/FECAPA-${season}-${competition}.json`,JSON.stringify(snapshot,null,2));
console.log(JSON.stringify({count:fixtures.length,pilot:fixtures.filter(x=>(x.home_id==='12419'||x.away_id==='12419')&&x.date==='07/11/2026')},null,2));
