// Inspect a supplied HTTP capture without network or database access.
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {normalizeReport} from './public-federation.mjs';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export function lineupDigests(report){
 return Object.fromEntries(['home','away'].map(side=>[side,sha256(JSON.stringify(report.sides[side].map(p=>[p.id,p.number,p.position,p.starter]).sort((a,b)=>a[0].localeCompare(b[0],'en'))))]));
}
export function referenceSummary(report){return {lineup_sha256:lineupDigests(report),counts:Object.fromEntries(['home','away'].map(side=>[side,{players:report.sides[side].length,goalkeepers:report.sides[side].filter(p=>p.position==='goalkeeper').length,starters:report.sides[side].filter(p=>p.starter===true).length}]))};}
export function normalizeCapturedReport(har,reference){
 if(!Array.isArray(har?.log?.entries))throw Error('Cal una captura HAR de la resposta, no una transcripció de l’acta');
 const captures=[];
 for(const entry of har.log.entries){
  let url;try{url=new URL(entry.request?.url);}catch{continue;}
  if(url.origin!=='https://api.sidgad.com'||!['/rfep/v1/hp/report/','/rfep/v1/hp/report'].includes(url.pathname)||url.searchParams.get('id')!==reference.fixture.official_match_id||url.username||url.password||url.searchParams.getAll('id').length!==1||entry.request.method!=='GET')continue;
  if(entry.response?.status!==200)continue;
  const content=entry.response.content;
  if(typeof content?.text!=='string'||content.text.length>9000000||!Number.isFinite(Date.parse(entry.startedDateTime)))throw Error('Captura incompleta o massa gran');
  if(content.encoding&&content.encoding!=='base64')throw Error('Codificació de captura no admesa');
  const bytes=Buffer.from(content.text,content.encoding==='base64'?'base64':'utf8');
  if(bytes.length>6000000)throw Error('Resposta capturada massa gran');
  let data;try{data=JSON.parse(bytes.toString('utf8'));}catch{throw Error('La resposta capturada no és JSON vàlid');}
  captures.push({data,payload_sha256:sha256(bytes),observed_at:entry.startedDateTime,request_path:url.pathname});
 }
 if(!captures.length)throw Error('No hi ha una resposta report del partit i origen esperats');
 if(new Set(captures.map(x=>x.payload_sha256)).size!==1)throw Error('La captura conté versions contradictòries; cal seleccionar una resposta concreta');
 const capture=captures[0],report=normalizeReport(capture.data,reference.fixture,capture.observed_at),summary=referenceSummary(report);
 if(report.status!=='published'||!isDeepStrictEqual(summary,reference.expected))throw Error('Els convocats, porters, cincs o IDs no coincideixen amb la referència visual');
 if([...report.sides.home,...report.sides.away].some(p=>!p.name))throw Error('La captura no conté tots els noms dels convocats');
 return {report,proof:{capture_type:'supplied_HAR',network_replayed:false,payload_sha256:capture.payload_sha256,observed_at:capture.observed_at,request_url:'https://api.sidgad.com'+capture.request_path+'?id='+reference.fixture.official_match_id,connector_path_matches:capture.request_path==='/rfep/v1/hp/report/',source_url:report.source_url,calendar_source_url:report.calendar_source_url,...summary,event_timeline_status:'not_retrieved',event_sections_present:Object.keys(capture.data.game_data).filter(k=>/event|incident/i.test(k)),reference_source:reference.source}};
}
