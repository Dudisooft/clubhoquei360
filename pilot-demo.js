import {PilotJournal} from './pilot-journal.js';import {AnalysisClock} from './stats-clock.js';import {ACTIONS,aggregate} from './stats-model.js';import {callupText,copyText} from './callup-model.js';
const $=id=>document.getElementById(id),journal=new PilotJournal();let calendar=null,match=null,grant=null,key=null,state=null,clock=new AnalysisClock(),generation=0,syncing=false;
const rosterList=document.createElement('ul');rosterList.id='official-roster';$('report').after(rosterList);
function error(e){$('error').textContent=e.message||String(e);}
async function api(url,options={}){const r=await fetch(url,{...options,headers:{'content-type':'application/json',...(grant?{authorization:'Bearer '+grant.token}:{}),...options.headers}});const d=await r.json();if(!r.ok)throw Error(d.error||'Operació no disponible');return d;}
function options(el,rows){el.replaceChildren();for(const [value,label]of rows){const o=document.createElement('option');o.value=value;o.textContent=label;el.append(o);}}
function canWrite(){return grant&&grant.expiresAt>Date.now()&&grant.role!=='coach';}
function render(){
 if(!state)return;const rows=state.events;const pending=rows.filter(e=>e.pending).length;
 $('persistence').textContent=`${rows.length} accions conservades al dispositiu · ${pending} pendents del servidor local. ${navigator.onLine?'':'Sense connexió.'}`;
 const a=aggregate(rows,{side:$('side').value});
 const individual=aggregate(rows,{side:$('side').value,playerId:$('player').value});
 $('totals').textContent=`Equip: passades ${a.passes??'—'} · xuts ${a.shots??'—'} · gols observats ${a.goals??'—'} · assistències ${a.assists??'—'}. Jugador seleccionat: passades ${individual.passes??'—'} · xuts ${individual.shots??'—'} · gols ${individual.goals??'—'}. No inclou ni modifica el marcador federatiu.`;
 $('events').replaceChildren();for(const e of [...rows].reverse().slice(0,30)){const li=document.createElement('li');li.textContent=`${Math.floor(e.match_ms/1000)}s · ${e.side==='home'?'Local':'Visitant'} · ${e.player_id} · ${ACTIONS.find(a=>a.code===e.action)?.label||e.action} · ${e.pending?'desat al dispositiu':'confirmat al servidor local'}`;$('events').append(li);}
 $('record').disabled=!canWrite();for(const id of ['play','pause','adjust'])$(id).disabled=!canWrite();
 $('scope').textContent=grant?`Perfil fictici ${grant.role} · accés limitat a aquest equip i partit · caduca ${new Date(grant.expiresAt).toLocaleTimeString('ca-ES')}.`:'Sense autorització de prova.';
}
function callup(){if(!match)return;let start=null;const parts=match.date.match(/^(\d\d)\/(\d\d)\/(\d{4})$/);
 // Formatting uses the official local labels directly; no UTC conversion guesses.
 const f={category:calendar?.competition||$('competition').selectedOptions[0].textContent,competition:calendar?.competition||$('competition').selectedOptions[0].textContent,round_label:match.round_label,group:match.group,home_team:match.home_team,away_team:match.away_team,dateLabel:parts?match.date:'',timeLabel:match.time,venue:match.venue};
 const edits=Object.fromEntries(['meeting','shirt','clothing','observations'].map(id=>[id,$(id).value]));$('callup').textContent=callupText(f,edits);
 if(key)localStorage.setItem('ch360-callup-demo:'+key,JSON.stringify(edits));
}
async function selectMatch(){
 const turn=++generation;grant=null;$('record').disabled=true;
 if(key&&clock){clock.pause();await journal.clock(key,clock.snapshot());}if(turn!==generation)return;
 match=calendar.fixtures.find(f=>f.id===$('match').value);if(!match)return;grant=null;key=null;state=null;
 rosterList.replaceChildren();
 $('fixture').textContent=`${match.home_team} — ${match.away_team} · ${match.date} ${match.time||'(hora pendent)'} · ${match.venue||'pista pendent de confirmar'}${match.score?' · resultat oficial '+match.score.join('–'):''}`;
 $('official').href=match.source_url;$('lineups').textContent='Alineacions oficials: no consultades. Els jugadors del registre són ficticis.';
 const scopeId=[match.id,$('team').value,$('role').value].join(':');
 let nextGrant=null;
 try{nextGrant=await api('/api/demo-session',{method:'POST',body:JSON.stringify({match:match.id,team:$('team').value,role:$('role').value})});if(turn!==generation)return;sessionStorage.setItem('ch360-demo-session:'+scopeId,JSON.stringify(nextGrant));}
 catch(e){if(turn!==generation)return;nextGrant=JSON.parse(sessionStorage.getItem('ch360-demo-session:'+scopeId)||'null');if(!nextGrant||nextGrant.expiresAt<Date.now())nextGrant=null;error(e);}
 if(turn!==generation)return;
 grant=nextGrant;
 const club=match.federation+':'+$('team').value,user=grant?.user||'fictional-'+$('role').value;
 key=journal.key(club,match.id,user);const recovered=await journal.read(key);if(turn!==generation)return;state=recovered;clock=new AnalysisClock(state.clock||{});$('mode').value=clock.mode;$('video').value=clock.videoUrl;$('seconds').value=Math.floor(clock.ms/1000);
 const prefs=JSON.parse(localStorage.getItem('ch360-callup-demo:'+key)||'{}');for(const id of ['meeting','shirt','clothing','observations'])$(id).value=prefs[id]||'';
 render();callup();if(grant)await sync();
}
function selectTeam(){const team=$('team').value;const rows=calendar.fixtures.filter(f=>f.home_id===team||f.away_id===team);
 rows.sort((a,b)=>{const preferred=f=>(f.official_match_id==='35574'||f.date==='07/11/2026'&&[f.home_id,f.away_id].includes('12419'))?0:1;return preferred(a)-preferred(b)||a.id.localeCompare(b.id);});
 options($('match'),rows.map(f=>[f.id,`${f.date} ${f.time} · ${f.home_team} — ${f.away_team}`]));return selectMatch();}
async function load(){
 const turn=++generation;grant=null;$('record').disabled=true;$('fixture').textContent='Consultant el calendari…';const [fed,comp]=$('competition').value.split(':');let c;
 try{c=await api(`/api/calendar?federation=${fed}&competition=${comp}`);localStorage.setItem('ch360-public-calendar:'+fed+':'+comp,JSON.stringify(c));}
 catch(e){c=JSON.parse(localStorage.getItem('ch360-public-calendar:'+fed+':'+comp)||'null');if(!c)throw e;c={...c,stale:true};error(e);}
 if(turn!==generation)return;calendar=c;
 $('source').textContent=`${c.stale?'Última dada verificada conservada; font no disponible ara':'Font oficial verificada'} · ${new Date(c.verifiedAt).toLocaleString('ca-ES',{timeZone:'Europe/Madrid'})}. ${fed==='FECAPA'?'Consulta automàtica no disponible; es conserva la darrera importació oficial.':''}`;
 const teams=new Map();for(const f of c.fixtures){teams.set(f.home_id,f.home_team);teams.set(f.away_id,f.away_team);}options($('team'),[...teams].sort((a,b)=>a[1].localeCompare(b[1])));$('team').value=fed==='RFEP'?'3697':'12419';await selectTeam();
}
async function sync(){if(!grant||!key||syncing||$('local-only').checked||!navigator.onLine)return;const active=key,g=grant;syncing=true;try{
 const synced=await journal.sync(active,{send:async event=>{if(g.role==='coach')throw Error('Perfil de només lectura');await api('/api/events',{method:'POST',headers:{authorization:'Bearer '+g.token},body:JSON.stringify(event)});},list:()=>api('/api/events?match='+encodeURIComponent(g.match),{headers:{authorization:'Bearer '+g.token}})});
 if(active===key){state=synced;render();}
 }catch(e){if(active===key){state=await journal.read(active);render();error(e);}}finally{syncing=false;}}
function run(fn){return()=>{ $('error').textContent='';Promise.resolve().then(fn).catch(error);};}
options($('action'),ACTIONS.map(({code,label})=>[code,label]));
$('competition').onchange=run(load);$('team').onchange=run(selectTeam);$('match').onchange=run(selectMatch);$('role').onchange=run(selectMatch);$('refresh').onclick=run(load);$('side').onchange=render;$('player').onchange=render;
$('local-only').checked=localStorage.getItem('ch360-pilot-local-only')==='true';$('local-only').onchange=run(async()=>{localStorage.setItem('ch360-pilot-local-only',String($('local-only').checked));if(!$('local-only').checked)await sync();});
$('record').onclick=run(async()=>{if(!canWrite())throw Error('Accés de prova caducat o de només lectura');const active=key;const updated=await journal.append(active,{match_id:match.id,club_id:grant.club,user_id:grant.user,action:$('action').value,player_id:$('player').value,side:$('side').value,period:clock.period,match_ms:Math.round(clock.advance()),revision:1});if(active===key){state=updated;render();await sync();}});
$('play').onclick=()=>{if(canWrite())clock.play();};$('pause').onclick=run(async()=>{clock.pause();await journal.clock(key,clock.snapshot());render();});$('adjust').onclick=run(async()=>{clock.adjust(Number($('seconds').value)*1000);await journal.clock(key,clock.snapshot());});
$('mode').onchange=()=>{clock.mode=$('mode').value;};$('video').onchange=run(async()=>{const raw=$('video').value;if(raw&&!['https:','http:'].includes(new URL(raw).protocol))throw Error('Referència de vídeo no vàlida');clock.videoUrl=raw;await journal.clock(key,clock.snapshot());});
$('sync').onclick=run(sync);window.addEventListener('online',run(sync));
$('export').onclick=run(async()=>{const data=await journal.read(key),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({fictional:true,match:match.id,...data},null,2)],{type:'application/json'}));a.download='clubhoquei360-pilot-fictici.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
for(const id of ['meeting','shirt','clothing','observations'])$(id).oninput=callup;
$('copy').onclick=run(async()=>{await copyText($('callup').textContent);$('copy-status').textContent='Copiat. Enganxa’l a WhatsApp quan el vulguis enviar.';});
$('report').onclick=run(async()=>{const active=match.id;const r=await api('/api/report?match='+encodeURIComponent(active));if(match.id!==active)return;$('lineups').textContent=r.status==='published'?`Acta RFEP publicada i identitats verificades: ${r.sides.home.length} jugadors locals i ${r.sides.away.length} visitants. No s’han copiat noms personals ni s’ha substituït el registre propi.`:'Alineació oficial no verificada. No es fabrica cap convocatòria.';$('official-roster').replaceChildren();if(r.status==='published')for(const side of ['home','away']){const li=document.createElement('li');li.textContent=(side==='home'?match.home_team:match.away_team)+': '+r.sides[side].map(p=>'#'+p.number+(p.position==='goalkeeper'?' (P)':'')).join(' · ');$('official-roster').append(li);}});
setInterval(()=>{const ms=clock.advance();$('clock').textContent=String(Math.floor(ms/60000)).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0');if(key&&canWrite())journal.clock(key,clock.snapshot()).catch(error);},1000);
load().catch(error);
