/* One requested opponent, one verified competition. No match call-ups or
 * inferred shirt numbers/goalkeepers. Real source files stay in ignored work/. */
import {createHash} from 'node:crypto';
import {parseHTML} from 'linkedom';
import fs from 'node:fs';
export const VIC=Object.freeze({federation:'RFEP',competition:'3575',season:'41',team:'3727',match:'18fa0a6e-e5c6-487e-8315-5bc371e22cb1',calendar:'51894d05-c323-f3e1-8534-fa79e062c448',fingerprint:'RFEP:41:3575:3575:JORNADA 5:3697:3727',source_url:'https://hockeypatines.fep.es/league/3575',endpoint:'https://www.server2.sidgad.es/rfep/rfep_stats_1_3575.php'});
const clean=e=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
export function parseVicRoster(html,{fetched_at,endpoint=VIC.endpoint}={}){
 if(endpoint!==VIC.endpoint||!fetched_at||!Number.isFinite(Date.parse(fetched_at)))throw Error('Verified endpoint and observation time required');
 if(typeof html!=='string'||!html.trim()||Buffer.byteLength(html)>6000000)throw Error('Empty or oversized official roster');
 const {document}=parseHTML(html),people=new Map();
 for(const row of document.querySelectorAll('tr.teamid_'+VIC.team)){
  const link=row.querySelector('[id_player]');if(!link)continue; // Exclude staff.
  const id=link.getAttribute('id_player'),name=clean(link),team=link.getAttribute('team_id');
  if(team!==VIC.team||!id||!/^[1-9][0-9]*$/.test(id)||!name||name.length>120||row.children.length<5)throw Error('Unverified Vic player identity');
  const next={external_id:id,name,dorsal:null,position:null};
  if(people.has(id)&&people.get(id).name!==name)throw Error('Conflicting federation player identity');
  people.set(id,next);
 }
 if(!people.size||people.size>40)throw Error('Vic roster missing or unexpectedly large');
 return {...VIC,fetched_at:new Date(fetched_at).toISOString(),source_sha256:createHash('sha256').update(html).digest('hex'),players:[...people.values()].sort((a,b)=>a.external_id.localeCompare(b.external_id))};
}
export function buildVicImportSQL(data){
 if(data.team!==VIC.team||data.competition!==VIC.competition||data.season!==VIC.season||data.endpoint!==VIC.endpoint||data.source_url!==VIC.source_url||!data.players?.length)throw Error('Vic import scope mismatch');
 let template=fs.readFileSync(new URL('./vic-roster-template.sql',import.meta.url),'utf8');
 const payload=JSON.stringify(data).replaceAll("'","''");
 if(payload.includes('$CH360_VIC$'))throw Error('Unsupported SQL delimiter in source');
 return template.replace('/*VERIFIED_PAYLOAD*/',"'"+payload+"'::jsonb");
}
