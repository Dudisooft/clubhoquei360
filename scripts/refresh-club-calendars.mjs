import fs from 'node:fs';
import {PublicFederation} from './lib/public-federation.mjs';
const folder='work/club-calendars';fs.mkdirSync(folder,{recursive:true});
const inventory=JSON.parse(fs.readFileSync('docs/evidence/senior-catalogue-3a4-20261028.json')).catalogue;
const seeds=JSON.parse(fs.readFileSync('demo/public-calendar-snapshot.json'));
const disk=fs.readdirSync(folder).filter(f=>f.endsWith('.json')&&f!=='status.json').map(f=>JSON.parse(fs.readFileSync(folder+'/'+f)));
const cache=new Map(seeds.map(s=>[s.key,s]));for(const s of disk)cache.set(s.key,s);
const provider=new PublicFederation({snapshots:[...cache.values()],onSnapshot:s=>fs.writeFileSync(folder+'/'+s.key.replaceAll(':','-')+'.json',JSON.stringify(s))});
const queue=[...new Map(inventory.entries.map(e=>[e.federation+':'+e.competition_id,e])).values()],status=[];
async function worker(){while(queue.length){const e=queue.shift();try{const s=await provider.calendar(e.federation,e.competition_id,'41');status.push({federation:e.federation,competition:e.competition_id,fixtures:s.fixtures.length,stale:!!s.stale,verifiedAt:s.verifiedAt});}catch{status.push({federation:e.federation,competition:e.competition_id,fixtures:0,error:'Font no disponible; inventari conservat'});}console.log(JSON.stringify(status.at(-1)));}}
await Promise.all([worker(),worker(),worker()]);
fs.writeFileSync(folder+'/status.json',JSON.stringify({checkedAt:new Date().toISOString(),competitions:status},null,2));
