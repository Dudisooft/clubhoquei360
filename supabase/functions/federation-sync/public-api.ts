// Recovered public portal adapter, shared by federation-sync and local tests.
import {parseHTML} from 'npm:linkedom@0.18.12';
import {parseCalendar,parseMatch} from './parser.ts';
import {fetchOfficialHtml} from './transport.ts';
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
  if(!id(r.home_team_id)||!id(r.away_team_id)||String(r.home_team_id)===String(r.away_team_id)||!clean(r.home_name)||!clean(r.away_name))throw Error('Identitat de calendari incompleta');
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
 return parseCalendar(html).map(r=>({...r,group}));
}
export function importLegacyCalendar(html,competition,season='41'){
 if(!id(competition)||!id(season))throw Error('Àmbit federatiu invàlid');
 return normalizeCalendar('FECAPA',competition,season,legacyRows(html));
}
export function normalizeReport(data,fixture,verifiedAt=new Date().toISOString()){
 const g=data?.game_data;
 if(!g||String(g.game_id)!==fixture.official_match_id||String(g.season_id)!==fixture.season||String(g.home_team_id)!==fixture.home_id||String(g.away_team_id)!==fixture.away_id)throw Error('Acta no correspon al partit/temporada');
 const sides={};for(const side of ['home','away']){
  const rows=g[side+'_roster'];if(!Array.isArray(rows))throw Error('Acta incompleta');
  const players=rows.map(p=>{if(!id(p.player_id)||!/^\d{1,3}$/.test(String(p.player_number)))throw Error('Identitat de jugador incompleta');return {id:String(p.player_id),name:clean(p.player_name)||null,number:String(p.player_number),position:clean(p.player_role).toUpperCase()==='P'?'goalkeeper':'field',starter:p['5i']==='true'||p['5i']===true||p['5i']==='5',goals:/^\d+$/.test(String(p.goals))?Number(p.goals):null,yellow:/^\d+$/.test(String(p.yellow_card))?Number(p.yellow_card):null,blue:/^\d+$/.test(String(p.blue_card))?Number(p.blue_card):null,red:/^\d+$/.test(String(p.red_card))?Number(p.red_card):null};});
  if(new Set(players.map(p=>p.id)).size!==players.length)throw Error('Jugadors duplicats a l’acta');
  sides[side]=players;
 }
 const published=Object.values(sides).every(rows=>rows.length>0&&rows.some(p=>p.position==='goalkeeper'));
 return {scope:[fixture.federation,fixture.season,fixture.competition_id,fixture.official_match_id,fixture.home_id,fixture.away_id].join(':'),match_id:fixture.id,official_match_id:fixture.official_match_id,status:published?'published':'incomplete',sides,events_count:Array.isArray(g.events)?g.events.length:null,source_url:fixture.source_url,verifiedAt};
}
export class PublicFederation {
 constructor({fetcher=fetch,now=Date.now,ttl=600000,reportTtl=30000,maxStale=86400000,maxEntries=100,onSnapshot=()=>{},snapshots=[],reportSnapshots=[],onReportSnapshot=()=>{}}={}){
  this.fetcher=fetcher;this.now=now;this.ttl=ttl;this.reportTtl=Math.max(1,Math.min(reportTtl,600000));this.maxStale=Math.max(0,Math.min(maxStale,86400000));this.maxEntries=Math.max(1,Math.min(maxEntries,200));this.onSnapshot=onSnapshot;
  this.cache=new Map(snapshots.slice(-this.maxEntries).map(x=>[x.key,x]));this.reports=new Map(reportSnapshots.slice(-this.maxEntries).map(x=>[x.match_id,x]));this.onReportSnapshot=onReportSnapshot;this.pending=new Map();this.reportPending=new Map();this.reportFailures=new Map();this.config=null;this.configPending=null;
 }
 remember(map,key,value){map.delete(key);map.set(key,value);while(map.size>this.maxEntries)map.delete(map.keys().next().value);}
 prune(){
  for(const map of [this.cache,this.reports])for(const [key,value] of map)if(this.now()-Date.parse(value.verifiedAt)>this.maxStale)map.delete(key);
  for(const [key,value] of this.reportFailures)if(value.until<=this.now())this.reportFailures.delete(key);
 }
 async request(url,options={}){
  const response=await this.fetcher(url,{...options,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(response.status===304)return {response,text:null};
  if(!response.ok){const e=Error(`Font no disponible (HTTP ${response.status})`);e.status=response.status;const wait=Number(response.headers.get('retry-after'));e.retryMs=Number.isFinite(wait)&&wait>0?wait*1000:600000;throw e;}
  const reader=response.body?.getReader();let size=0;const chunks=[];
  if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6000000)throw Error('Resposta massa gran');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}}
  else{const b=new TextEncoder().encode(await response.text());if(b.length>6000000)throw Error('Resposta massa gran');chunks.push(b);}
  const body=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}return {response,text:new TextDecoder().decode(body)};
 }
 async rfepConfig(){
  if(this.config&&this.config.until>this.now())return this.config.value;
  if(this.configPending)return this.configPending;
  this.configPending=(async()=>{
   const {text}=await this.request(PORTALS.RFEP+'/');
   const raw=text.match(/const\s+SIDGAD_API_CONFIG\s*=\s*(\{[^;]+\});/)?.[1];
   let c;try{c=JSON.parse(raw);}catch{throw Error('Configuració pública RFEP no disponible');}
   if(c.url!=='https://api.sidgad.com'||c.cliente!=='rfep'||c.version!=='v1'||c.idm!=='hp'||typeof c.token!=='string'||c.token.length>500)throw Error('Origen públic RFEP no reconegut');
   this.config={value:c,until:this.now()+3600000};return c;
  })();try{return await this.configPending;}finally{this.configPending=null;}
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
  this.prune();
  if(!PORTALS[fixture.federation]||![fixture.official_match_id,fixture.season,fixture.competition_id,fixture.home_id,fixture.away_id].every(id)||fixture.home_id===fixture.away_id)throw Error('Identitat de l’acta incompleta');
  const scope=[fixture.federation,fixture.season,fixture.competition_id,fixture.official_match_id,fixture.home_id,fixture.away_id].join(':');
  const candidate=this.reports.get(fixture.id),old=candidate?.scope===scope?candidate:null;
  const usable=()=>old?.status==='published'&&this.now()-Date.parse(old.verifiedAt)<=this.maxStale;
  if(old?.expiresAt>this.now()&&!old.stale)return {...old,cached:true};
  const blocked=this.reportFailures.get(scope);
  if(blocked?.until>this.now()){
   if(usable())return {...old,cached:true,stale:true,error:blocked.message,retryAt:blocked.until};
   const error=Error(blocked.message);error.retryMs=blocked.until-this.now();throw error;
  }
  if(this.reportPending.has(scope))return this.reportPending.get(scope);
  if(this.reportPending.size>=this.maxEntries)throw Error('Límit de consultes simultànies; torna-ho a provar més tard');
  const task=(async()=>{
   try{
    let data;
    if(fixture.federation==='RFEP')data=(await this.rfep('report',{id:fixture.official_match_id})).data;
    else{
     const html=await fetchOfficialHtml('FECAPA',`fecapa_gr_${fixture.official_match_id}_1.php`,{idm:'1',idc:fixture.competition_id,idp:fixture.official_match_id,tab:'tab_ficha_resumen'},this.fetcher);
     const parsed=parseMatch(html,{federation:'FECAPA',federation_match_id:fixture.official_match_id,competition_id:fixture.competition_id,season_id:fixture.season,federation_url:fixture.source_url});
     if(parsed.home_name!==fixture.home_team||parsed.away_name!==fixture.away_team)throw Error('Acta FECAPA d’un altre equip');
     data={game_data:{game_id:fixture.official_match_id,season_id:fixture.season,home_team_id:fixture.home_id,away_team_id:fixture.away_id}};
     for(const side of ['home','away'])data.game_data[side+'_roster']=parsed.players.filter(p=>p.team===side).map(p=>({player_id:p.external_id,player_name:p.name,player_number:p.dorsal,player_role:p.position==='goalkeeper'?'P':'J','5i':p.starter,goals:p.goals,yellow_card:p.yellow,blue_card:p.blue,red_card:p.red}));
    }
    const next=normalizeReport(data,fixture,new Date(this.now()).toISOString());
    if(next.status!=='published')throw Error('Acta encara no publicada o incompleta');
    next.expiresAt=this.now()+this.reportTtl;next.cached=false;next.stale=false;next.provenance='official_report';
    await this.onReportSnapshot(next);this.remember(this.reports,fixture.id,next);this.reportFailures.delete(scope);return next;
   }catch(e){
    const message='Font no disponible o acta incompleta; dades desades conservades';
    const until=this.now()+Math.min(3600000,Math.max(this.reportTtl,e.retryMs||60000));this.remember(this.reportFailures,scope,{until,message});
    if(usable())return {...old,cached:true,stale:true,error:message,retryAt:until};
    const error=Error(message);error.retryMs=until-this.now();throw error;
   }finally{this.reportPending.delete(scope);}
  })();this.reportPending.set(scope,task);return task;
 }
 async calendar(federation,competition,season='41'){
  this.prune();
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
     if(result.data===null){if(!old)throw Error('304 sense còpia local');const next={...old,verifiedAt:new Date(this.now()).toISOString(),expiresAt:this.now()+this.ttl,error:null};this.remember(this.cache,key,next);await this.onSnapshot(next);return {...next,cached:true,stale:false};}
     rows=result.data.games;if(!Array.isArray(rows))throw Error('Calendari RFEP incomplet');
    }else{
     const url=`https://www.server2.sidgad.es/fecapa/fecapa_cal_idc_${competition}_1.php`;
     const r=await this.request(url,{method:'POST',headers:{Origin:PORTALS.FECAPA,Referer:PORTALS.FECAPA+'/','X-Requested-With':'XMLHttpRequest','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idc:String(competition),id_temp:String(season)}).toString()});
     response=r.response;rows=legacyRows(r.text);
    }
    const fixtures=normalizeCalendar(federation,competition,season,rows);
    const snapshot={key,federation,competition_id:String(competition),season:String(season),competition:competitionName,verifiedAt:new Date(this.now()).toISOString(),expiresAt:this.now()+this.ttl,etag:response.headers.get('etag'),modified:response.headers.get('last-modified'),fixtures,error:null};
    // Only publish a complete validated snapshot; a failed refresh never erases it.
    await this.onSnapshot(snapshot);this.remember(this.cache,key,snapshot);return {...snapshot,cached:false,stale:false};
   }catch(e){
    if(!old)throw e;
    const stale={...old,error:'La font no s’ha pogut verificar; dades anteriors conservades',expiresAt:this.now()+(e.retryMs||60000)};
    this.remember(this.cache,key,stale);return {...stale,cached:true,stale:true};
   }finally{this.pending.delete(key);}
  })();this.pending.set(key,task);return task;
 }
}


// Translate the recovered read-only source to the existing v6 commit contract.
// Staff and the incident timeline are not inferred from player totals.
export async function readRfepSnapshot(source,api=new PublicFederation()){
 if(source.federation!=='RFEP'||!id(source.competition_id)||!id(source.season_id)||!id(source.federation_match_id))throw Error('Unverified RFEP source identity');
 const cache=await api.calendar('RFEP',source.competition_id,source.season_id);
 const fixture=cache.fixtures.find(f=>f.official_match_id===String(source.federation_match_id));if(!fixture)throw Error('Match absent from verified RFEP calendar');
 const report=await api.report(fixture);if(cache.stale||report.stale)throw Error('Stale official source; existing saved data preserved');if(report.status!=='published')throw Error('Incomplete RFEP lineup');
 const seen=new Set(),players=[];
 for(const team of ['home','away'])for(const p of report.sides[team]){
  if(!p.name||seen.has(p.id))throw Error('Incomplete or duplicate official participant');seen.add(p.id);
  players.push({external_id:p.id,team,dorsal:p.number,name:p.name,position:p.position,starter:p.starter,goals:p.goals,yellow:p.yellow,blue:p.blue,red:p.red,matchVerified:true});
 }
 const calendar=cache.fixtures.map(f=>({match_id:f.official_match_id,round:f.round_label,date:f.date,time:f.time,venue:f.venue,home_name:f.home_team,away_name:f.away_team,home_team_id:f.home_id,away_team_id:f.away_id,result:f.score?f.score.join(' - '):null}));
 const prior=source.official_data||{};
 return {calendar,calendar_fetched_at:cache.verifiedAt,snapshot:{...prior,federation:'RFEP',match_id:fixture.official_match_id,competition_id:fixture.competition_id,season_id:fixture.season,home_name:fixture.home_team,away_name:fixture.away_team,home_team_id:fixture.home_id,away_team_id:fixture.away_id,home_score:fixture.score?.[0]??null,away_score:fixture.score?.[1]??null,players,staff:prior.staff||[],incidents:prior.incidents||[],report_verified:true,lineup_status:'published',date:fixture.date,time:fixture.time,round:fixture.round_label,venue:fixture.venue,fetched_at:report.verifiedAt,source_url:fixture.source_url,sections:{players:'official_report',staff:'not_refreshed',incidents:'not_refreshed'},roster_stale:!!report.stale,calendar_stale:!!cache.stale}};
}

export function canonicalRfepReport(snapshot){
 return {players:snapshot.players.map(p=>({...p,side:p.team})),staff:[],incidents:[],home_fouls:null,away_fouls:null,venue:snapshot.venue||null,reported_home_score:null,reported_away_score:null,score_discrepancy:false,report_score_available:false,score_source:'calendar',official_status:null,event_timeline_status:'not_retrieved',fetched_at:snapshot.fetched_at,source_url:snapshot.source_url,report_endpoint:'https://api.sidgad.com/rfep/v1/hp/report/',external_match_id:snapshot.match_id};
}
