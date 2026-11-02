// Read-only adapter for the requests made by the public federation portals.
// No Supabase connection, roster replication, user credentials or token logging.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {parseHTML} from 'linkedom';
const require=createRequire(import.meta.url);
const parser=fs.readFileSync(new URL('../../supabase/functions/federation-sync/parser.ts',import.meta.url),'utf8')
 .replace('npm:linkedom@0.18.12',pathToFileURL(require.resolve('linkedom')).href);
const legacy=await import('data:text/javascript;base64,'+Buffer.from(ts.transpile(parser,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022})).toString('base64'));
export const PORTALS={RFEP:'https://www.hockeypatines.fep.es',FECAPA:'https://www.hoqueipatins.fecapa.cat'};
const id=x=>/^[1-9]\d{0,9}$/.test(String(x));
const clean=x=>String(x??'').replace(/\s+/g,' ').trim();
export function normalizeCalendar(federation,competition,season,rows){
 let round='',phase='';const seen=new Map();
 for(const row of rows){
  if(federation==='RFEP'&&['FASE','JORNADA','ANOTACION','MODEL_COPA'].includes(row.dia_partido)){
   if(row.dia_partido==='JORNADA')round=clean(row.home_name);if(row.dia_partido==='FASE')phase=clean(row.home_name);continue;
  }
  const r=federation==='RFEP'?{match_id:row.idp,round,group:phase,date:row.dia_partido,time:row.hora_partido,venue:row.pista,home_name:row.home_name,away_name:row.away_name,home_team_id:row.home_id,away_team_id:row.away_id,result:row.result}:row;
  if(!id(r.home_team_id)||!id(r.away_team_id)||r.home_team_id===r.away_team_id||!clean(r.home_name)||!clean(r.away_name))throw Error('Identitat de calendari incompleta');
  const matchId=id(r.match_id)?String(r.match_id):null;
  const key=[federation,season,competition,clean(r.group),clean(r.round),r.home_team_id,r.away_team_id].join(':');
  const result=clean(r.result).match(/^(\d+)\s*[:-]\s*(\d+)$/);
  if(!clean(r.round))throw Error('Jornada no identificada');
  const item={id:key,federation,season:String(season),competition_id:String(competition),official_match_id:matchId,round_label:clean(r.round),group:clean(r.group),date:clean(r.date),time:clean(r.time),venue:clean(r.venue),home_team:clean(r.home_name),away_team:clean(r.away_name),home_id:String(r.home_team_id),away_id:String(r.away_team_id),score:result?result.slice(1).map(Number):null,lineup_status:'not_checked',source_url:federation==='RFEP'?`${PORTALS.RFEP}/league/${competition}`:PORTALS.FECAPA+'/'};
  if(seen.has(item.id)&&JSON.stringify(seen.get(item.id))!==JSON.stringify(item))throw Error('Duplicat federatiu contradictori');
  seen.set(item.id,item);
 }
 if(!seen.size)throw Error('Calendari buit o no reconegut; es conserva la còpia anterior');
 return [...seen.values()];
}
function legacyRows(html){
 const {document}=parseHTML(html),groups=[...document.querySelectorAll('select.filter_fase_select option')].filter(o=>id(o.getAttribute('value')));
 const group=groups.length===1?clean(groups[0].textContent):'';
 return legacy.parseCalendar(html).map(r=>({...r,group}));
}
export function importLegacyCalendar(html,competition,season='41'){
 if(!id(competition)||!id(season))throw Error('Àmbit federatiu invàlid');
 return normalizeCalendar('FECAPA',competition,season,legacyRows(html));
}
export function normalizeReport(data,fixture){
 const g=data?.game_data;
 if(!g||String(g.game_id)!==fixture.official_match_id||String(g.season_id)!==fixture.season||String(g.home_team_id)!==fixture.home_id||String(g.away_team_id)!==fixture.away_id)throw Error('Acta no correspon al partit/temporada');
 const sides={};for(const side of ['home','away']){
  const rows=g[side+'_roster'];if(!Array.isArray(rows))throw Error('Acta incompleta');
  const players=rows.map(p=>{if(!id(p.player_id)||!/^\d{1,3}$/.test(String(p.player_number)))throw Error('Identitat de jugador incompleta');return {id:String(p.player_id),number:String(p.player_number),position:p.player_role==='P'?'goalkeeper':'field',starter:p['5i']==='true'||p['5i']===true||p['5i']==='5'};});
  if(new Set(players.map(p=>p.id)).size!==players.length)throw Error('Jugadors duplicats a l’acta');
  sides[side]=players;
 }
 const published=Object.values(sides).every(rows=>rows.length>0&&rows.some(p=>p.position==='goalkeeper'));
 return {match_id:fixture.id,official_match_id:fixture.official_match_id,status:published?'published':'incomplete',sides,events_count:Array.isArray(g.events)?g.events.length:0,source_url:fixture.source_url,verifiedAt:new Date().toISOString()};
}
export class PublicFederation {
 constructor({fetcher=fetch,now=Date.now,ttl=600000,onSnapshot=()=>{},snapshots=[]}={}){this.fetcher=fetcher;this.now=now;this.ttl=ttl;this.onSnapshot=onSnapshot;this.cache=new Map(snapshots.map(x=>[x.key,x]));this.pending=new Map();this.config=null;}
 async request(url,options={}){
  const response=await this.fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(response.status===304)return {response,text:null};
  if(!response.ok){const e=Error(`Font no disponible (HTTP ${response.status})`);e.status=response.status;const wait=Number(response.headers.get('retry-after'));e.retryMs=Number.isFinite(wait)&&wait>0?wait*1000:600000;throw e;}
  const reader=response.body?.getReader();let size=0;const chunks=[];
  if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6000000)throw Error('Resposta massa gran');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}}
  else{const b=Buffer.from(await response.text());if(b.length>6000000)throw Error('Resposta massa gran');chunks.push(b);}
  return {response,text:Buffer.concat(chunks).toString('utf8')};
 }
 async rfepConfig(){
  if(this.config&&this.config.until>this.now())return this.config.value;
  const {text}=await this.request(PORTALS.RFEP+'/');
  const raw=text.match(/const\s+SIDGAD_API_CONFIG\s*=\s*(\{[^;]+\});/)?.[1];
  let c;try{c=JSON.parse(raw);}catch{throw Error('Configuració pública RFEP no disponible');}
  if(c.url!=='https://api.sidgad.com'||c.cliente!=='rfep'||c.version!=='v1'||c.idm!=='hp'||typeof c.token!=='string'||c.token.length>500)throw Error('Origen públic RFEP no reconegut');
  this.config={value:c,until:this.now()+3600000};return c;
 }
 async rfep(resource,params={},headers={}){
  if(!['leagues','calendar','report'].includes(resource))throw Error('Recurs no permès');
  const c=await this.rfepConfig();const u=new URL(`${c.url}/${c.cliente}/${c.version}/${c.idm}/${resource}/`);
  u.search=new URLSearchParams({...params,jwt:c.token}).toString();
  // The ephemeral public portal token never appears in errors or snapshots.
  let r;try{r=await this.request(u,{headers});}catch(e){if(e.status)throw e;throw Error('No s’ha pogut consultar la font RFEP');}
  if(r.text===null)return {...r,data:null};let data;try{data=JSON.parse(r.text);}catch{throw Error('Resposta RFEP no reconeguda');}
  if(typeof data?.status==='string')throw Error('La font RFEP no ha publicat aquest recurs');return {...r,data};
 }
 async report(fixture){
  if(fixture.federation!=='RFEP'||!id(fixture.official_match_id))throw Error('Acta no consultable amb aquest adaptador');
  return normalizeReport((await this.rfep('report',{id:fixture.official_match_id})).data,fixture);
 }
 async calendar(federation,competition,season='41'){
  if(!PORTALS[federation]||!id(competition)||!id(season))throw Error('Àmbit federatiu invàlid');
  const key=[federation,season,competition].join(':');const old=this.cache.get(key);
  if(old&&old.expiresAt>this.now())return {...old,cached:true,stale:!!old.error};
  if(this.pending.has(key))return this.pending.get(key);
  const task=(async()=>{
   try{
    let rows,competitionName='',response;
    if(federation==='RFEP'){
     // Resolve season/competition together; never guess names or team identities.
     const catalogue=await this.rfep('leagues');
     const comp=catalogue.data.idcs?.find(x=>String(x.idc)===String(competition)&&String(x.id_temp)===String(season));
     if(!comp)throw Error('Competició/temporada no identificada');competitionName=clean(comp.nombre_idc);
     const headers={};if(old?.etag)headers['if-none-match']=old.etag;if(old?.modified)headers['if-modified-since']=old.modified;
     const result=await this.rfep('calendar',{id:competition},headers);response=result.response;
     if(result.data===null){if(!old)throw Error('304 sense còpia local');const next={...old,verifiedAt:new Date(this.now()).toISOString(),expiresAt:this.now()+this.ttl,error:null};this.cache.set(key,next);await this.onSnapshot(next);return {...next,cached:true,stale:false};}
     rows=result.data.games;if(!Array.isArray(rows))throw Error('Calendari RFEP incomplet');
    }else{
     const url=`https://www.server2.sidgad.es/fecapa/fecapa_cal_idc_${competition}_1.php`;
     const r=await this.request(url,{method:'POST',headers:{Origin:PORTALS.FECAPA,Referer:PORTALS.FECAPA+'/','X-Requested-With':'XMLHttpRequest','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idc:String(competition),id_temp:String(season)}).toString()});
     response=r.response;rows=legacyRows(r.text);
    }
    const fixtures=normalizeCalendar(federation,competition,season,rows);
    const snapshot={key,federation,competition_id:String(competition),season:String(season),competition:competitionName,verifiedAt:new Date(this.now()).toISOString(),expiresAt:this.now()+this.ttl,etag:response.headers.get('etag'),modified:response.headers.get('last-modified'),fixtures,error:null};
    // Only publish a complete validated snapshot; a failed refresh never erases it.
    await this.onSnapshot(snapshot);this.cache.set(key,snapshot);return {...snapshot,cached:false,stale:false};
   }catch(e){
    if(!old)throw e;
    const stale={...old,error:'La font no s’ha pogut verificar; dades anteriors conservades',expiresAt:this.now()+(e.retryMs||60000)};
    this.cache.set(key,stale);return {...stale,cached:true,stale:true};
   }finally{this.pending.delete(key);}
  })();this.pending.set(key,task);return task;
 }
}
