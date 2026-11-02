import fs from 'node:fs';
import {PublicFederation} from './lib/public-federation.mjs';
const p=new PublicFederation({onSnapshot:s=>{fs.mkdirSync('work/public-cache',{recursive:true});fs.writeFileSync(`work/public-cache/${s.key.replaceAll(':','-')}.json`,JSON.stringify(s,null,2));}});
const results=[];
for(const [fed,comp] of [['RFEP','3575'],['FECAPA','4802']]){
 try{const s=await p.calendar(fed,comp);const selected=s.fixtures.filter(x=>(fed==='RFEP'&&['35559','35574'].includes(x.official_match_id))||(fed==='FECAPA'&&(x.home_id==='12419'||x.away_id==='12419')&&x.date==='07/11/2026'));
 results.push({federation:fed,count:s.fixtures.length,verifiedAt:s.verifiedAt,selected});}
 catch(e){results.push({federation:fed,error:e.message});}
}
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/live-federation-result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
