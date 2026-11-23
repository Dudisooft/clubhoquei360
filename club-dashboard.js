import {db} from './app-client.js';
import {safeCrest} from './basic-roster.js';
import {configureSetup,openSetup} from './club-setup.js';
import {groupWeek,mondayOf,offsetDay,weekRange} from './callup-week.js';
import {mountCallupWorkflow} from './callup-workflow.js';
import {scopeCallupFixtures} from './callup-scope.js';
import {compareCallup} from './callup-review.js';
import './auth-ui.js';

const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const callupPage=params.get('vista')==='convocatories';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>value?new Date(value).toLocaleString('ca-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}):'Horari pendent';
const title=f=>f.home_team+' – '+f.away_team;
const status=f=>f.published?(f.modified?'Publicada · modificada':'Publicada'):f.revision?'Esborrany':f.can_edit?'Pendent de preparar':'Pendent de publicació';
const description=p=>[p.dorsal==null?'Sense dorsal':'#'+p.dorsal,p.full_name,p.position==='goalkeeper'?'Porteria':'Jugador/a de pista',p.reinforcement?p.origin_team:null].filter(Boolean).join(' · ');
let fixtures=[],detail=null,selection=new Set(),sessionVersion=0,working=false,acknowledged=[];
let access=null;
let teams=new Map();
const previewRole=()=>$('previewRole').value;
const canPreviewEdit=()=>!previewRole()||previewRole()==='coordinator';
const previewKey='ch360-role-preview';
const initialWeek=params.get('setmana');
let weekly=callupPage&&params.has('setmana');
let weekRequest=0;
let monday=/^\d{4}-\d{2}-\d{2}$/.test(initialWeek||'')&&
 Number.isFinite(Date.parse(initialWeek+'T12:00:00Z'))?mondayOf(initialWeek+'T12:00:00Z'):mondayOf(new Date());

function link(f){
 const query=new URLSearchParams({vista:'convocatories',partit:f.fixture_id,equip:f.team_id});
 if(weekly)query.set('setmana',monday);
 return './dashboard.html?'+query;
}
function baseLink(f){
 if(f.base_match_id)return './base.html?'+new URLSearchParams({match:f.base_match_id});
 if(f.kind!=='catalogue')return './base.html?'+new URLSearchParams({match:f.fixture_id});
 return f.federation==='FECAPA'?'./base.html?'+new URLSearchParams({catalogue:f.fixture_id}):null;
}
function crest(src){
 const url=safeCrest(src);
 return url?'<img src="'+esc(url)+'" alt="" loading="lazy">':'';
}
function setNavigation(collapsed){
 $('layout').classList.toggle('collapsed',collapsed);
 $('toggleNavigation').setAttribute('aria-expanded',String(!collapsed));
 $('toggleNavigation').setAttribute('aria-label',collapsed?'Desplega el menú':'Plega el menú');
}
setNavigation(matchMedia('(max-width: 640px)').matches);
$('toggleNavigation').onclick=()=>setNavigation(!$('layout').classList.contains('collapsed'));
$(callupPage?'callupLink':'homeLink').setAttribute('aria-current','page');

function showGuide(){
 const enabled=$('toggleGuide').getAttribute('aria-pressed')==='true';
 $('guide').hidden=!enabled;
 if(!enabled)return;
 $('guide').textContent=$('teamControl').hidden?'Tria un club amb equips disponibles o revisa’n la configuració.'
  :!detail?(weekly?'Tria una setmana i obre la convocatòria del partit.':'Tria un equip a la capçalera i obre la convocatòria del partit.')
  :!detail.can_edit?'Consulta els convocats. Per preparar el registre del partit, obre el Mode Base quan estigui disponible.'
  :!selection.size?'Pas 2. Marca els jugadors de la plantilla i els reforços que vols convocar.'
  :'Pas 3. Revisa el resum i confirma la publicació. També pots desar un esborrany abans de publicar.';
}
$('toggleGuide').setAttribute('aria-pressed',String(sessionStorage.getItem('ch360-callup-guide')==='true'));
$('toggleGuide').onclick=()=>{
 const enabled=String($('toggleGuide').getAttribute('aria-pressed')!=='true');
 $('toggleGuide').setAttribute('aria-pressed',enabled);
 sessionStorage.setItem('ch360-callup-guide',enabled);
 showGuide();
};

function brand(f){
 const club=f?.club_name||'';
 const known={
  'igualada hoquei club':['#194b9b','#112f64','https://sidgad.cloud/fecapa/images/logos_clubes/252_1.png'],
  'club patí manresa':['#ad283a','#6d1928',null]
 }[club.toLocaleLowerCase('ca')];
 document.documentElement.style.setProperty('--brand',f?.primary_color||known?.[0]||'#194b9b');
 document.documentElement.style.setProperty('--club-header',f?.header_color||known?.[1]||'#112f64');
 $('clubName').textContent=club;
 const clubCrest=f?.club_crest?.startsWith('https://')?f.club_crest:safeCrest(known?.[2]||f?.[f.side+'_crest']);
 $('clubCrest').hidden=!clubCrest;
 if(clubCrest)$('clubCrest').src=clubCrest;
 else $('clubCrest').removeAttribute('src');
}
function visibleFixture(f){
 return canPreviewEdit()?f:{...f,can_edit:false,revision:f.published?f.revision:null};
}
function fixtureCard(f,showTeam=false){
 const team=teams.get(f.team_id);
 const teamName=[f.team_name,team?.category&&!f.team_name.toLocaleLowerCase('ca').includes(team.category.toLocaleLowerCase('ca'))?team.category:''].filter(Boolean).join(' · ');
 return `
 <article>
  ${showTeam?'<h3>'+esc(teamName)+'</h3>':''}
  <div class="club-side">${crest(f.home_crest)}<strong>${esc(f.home_team)}</strong></div>
  <div class="club-side">${crest(f.away_crest)}<strong>${esc(f.away_team)}</strong></div>
  ${f.competition_name||team?.category?'<p>'+esc(f.competition_name||team.category)+'</p>':''}
  <p class="match-date">${esc(date(f.starts_at))}${f.provisional?' · Provisional':''}</p>${f.round?'<p>Jornada '+esc(String(f.round).replace(/^JORNADA\s*/i,''))+'</p>':''}
  <p><span class="badge">${status(f)}</span></p>${f.receipt_state?'<p>'+(f.receipt_state==='read'?'Llegida pel delegat':'Pendent de lectura')+'</p>':''}
  ${showTeam&&f.published_players?.length?'<details><summary>Convocats ('+f.published_players.length+')</summary>'+
   playerList(f.published_players)+staffList(f.published_staff)+'</details>':''}
  <a class="action primary" href="${esc(link(f))}">☷ ${f.can_edit?'Preparar':'Consultar'} convocatòria</a>
 </article>`;
}

function renderWeek(matches){
 const days=groupWeek(matches,monday);
 const pendingTime=matches.filter(f=>!f.starts_at);
 $('fixtures').innerHTML=(days.length?days.map(day=>`<section><h2>${esc(day.label)}</h2>
  <div class="cards">${day.matches.map(f=>fixtureCard(f,true)).join('')}</div></section>`).join('')
  :'<p>Cap partit disponible en aquesta setmana.</p>')+
  (pendingTime.length?`<details class="panel"><summary>Horaris pendents (${pendingTime.length})</summary>
   <div class="cards">${pendingTime.map(f=>fixtureCard(f,true)).join('')}</div></details>`:'');
}

async function loadWeek(scoped,club){
 const request=++weekRequest;
 const pickedWeek=monday;
 let response=await db.rpc('read_callup_week_workflow',{p_monday:pickedWeek,p_club:club||null},{get:true});
 if(response.error?.code==='PGRST202')response=await db.rpc('read_club_callup_week',{p_monday:pickedWeek,p_club:club||null},{get:true});
 const {data,error}=response;
 if(request!==weekRequest||!weekly||detail||previewRole())return;
 if(error||!Array.isArray(data)){
  $('workspaceStatus').textContent=error?.code==='PGRST202'
   ?'La vista setmanal completa necessita l’actualització del servidor. Mostrem els partits disponibles.'
   :'No s’ha pogut actualitzar la setmana. Mostrem els partits disponibles.';
  return;
 }
 renderWeek(scopeCallupFixtures([...data,...scoped.filter(f=>!f.starts_at)],teams,club,$('teamPicker').value));
}

let syncTeam='';
async function showFederationSync(){
 const team=$('teamPicker').value;
 const button=$('requestFederationSync'),status=$('federationSyncStatus');
 const active=callupPage&&team&&!previewRole();
 button.hidden=!active;status.hidden=!active;
 if(!active){syncTeam='';return;}
 if(team===syncTeam)return;
 syncTeam=team;status.textContent='';
 try{
  const {data,error}=await db.rpc('federation_team_sync_status',{p_team:team},{get:true});
  if(syncTeam!==team)return;
  status.textContent=error?'Estat de sincronització no disponible.':data?.length?data.map(item=>{
   const label={success:'Actualitzat',partial:'Dades pendents',failed:'Error de la font',unchanged:'Sense canvis'}[item.status]||'Pendent';
   const next=item.next_due?' · Propera: '+new Date(item.next_due).toLocaleString('ca-ES'):'';
   return item.federation+' · '+label+next;
  }).join(' / '):'Connexió federativa pendent de configurar.';
 }catch{if(syncTeam===team)status.textContent='Estat de sincronització no disponible.';}
}
$('requestFederationSync').onclick=async()=>{
 const team=syncTeam;
 if(!team)return;
 const button=$('requestFederationSync'),status=$('federationSyncStatus');
 button.disabled=true;
 try{
  const {data,error}=await db.rpc('federation_request_team_sync',{p_team:team});
  if(error)throw error;
  if(syncTeam===team)status.textContent=data.queued?'Actualització sol·licitada.':data.configured?'Actualització ja planificada o en espera de la font.':'Connexió federativa pendent de configurar.';
 }catch{if(syncTeam===team)status.textContent='No s’ha pogut sol·licitar l’actualització.';}
 finally{button.disabled=false;}
};

function renderList(){
 void showFederationSync();
 weekRequest++;
 const club=$('clubPicker').value;
 const selected=scopeCallupFixtures(fixtures,teams,club,$('teamPicker').value).map(visibleFixture);
 const visible=selected.filter(f=>!f.past||callupPage&&$('showPast').checked);
 brand(selected[0]||teams.get($('teamPicker').value)||[...teams.values()].find(t=>!club||t.club_id===club));
 $('pageTitle').textContent=callupPage?'Convocatòries':'Pròxims partits';
 $('tasksPanel').hidden=callupPage;
 $('callupViews').hidden=!callupPage||!!previewRole();
 $('weeklyView').setAttribute('aria-pressed',String(weekly));
 $('teamView').setAttribute('aria-pressed',String(!weekly));
 $('weekControls').hidden=!weekly;
 $('pastControl').hidden=weekly||!callupPage||!selected.some(f=>f.past);
 const pending=selected.filter(f=>!f.past&&(f.can_edit?!f.published:f.published));
 $('tasks').innerHTML=pending.length?pending.map(f=>'<li><a href="'+esc(link(f))+'">'+
  (f.can_edit?(f.revision?'Revisa l’esborrany':'Prepara la convocatòria'):'Consulta la convocatòria')+
  ' · '+esc(title(f))+'</a></li>').join(''):'<li>Cap tasca de convocatòries per a aquest equip.</li>';
 if(weekly){
  const scoped=selected;
  $('weekRange').textContent=weekRange(monday);
  $('fixtures').classList.remove('cards');
  renderWeek(scoped);
  loadWeek(scoped,club).catch(()=>{});
 }else{
  $('fixtures').classList.add('cards');
  $('fixtures').innerHTML=visible.length?visible.map(f=>fixtureCard(f,!$('teamPicker').value)).join(''):'<p>Aquest equip encara no té partits visibles amb el filtre actual.</p>';
 }
 showGuide();
}
function changeWeek(enabled,day=monday){
 weekly=enabled;
 monday=day;
 const url=new URL(location.href);
 if(weekly)url.searchParams.set('setmana',monday);
 else url.searchParams.delete('setmana');
 history.replaceState(null,'',url);
 renderList();
}
$('weeklyView').onclick=()=>changeWeek(true);
$('teamView').onclick=()=>changeWeek(false);
$('previousWeek').onclick=()=>changeWeek(true,offsetDay(monday,-7));
$('nextWeek').onclick=()=>changeWeek(true,offsetDay(monday,7));
$('currentWeek').onclick=()=>changeWeek(true,mondayOf(new Date()));
$('showPast').onchange=renderList;
$('teamPicker').onchange=()=>{
 const url=new URL(location.href);
 if($('teamPicker').value)url.searchParams.set('equip',$('teamPicker').value);
 else url.searchParams.delete('equip');
 if(params.has('partit')){
  url.searchParams.delete('partit');
  location.href=url.href;
  return;
 }
 history.replaceState(null,'',url);
 renderList();
};

function updateSelection(){
 const conflicts=detail.overlaps.filter(id=>selection.has(id));
 $('selectedCount').textContent=selection.size+' seleccionats';
 $('overlapWarning').hidden=!conflicts.length;
 $('overlapWarning').textContent=conflicts.length?'Coincidència d’horari amb una altra convocatòria publicada · '+detail.candidates.filter(p=>conflicts.includes(p.id)).map(p=>p.full_name).join(', '):'';
 $('reviewPublication').disabled=!selection.size||working||!!previewRole();
 const selected=detail.candidates.filter(p=>selection.has(p.id));
 const available=detail.candidates.filter(p=>!selection.has(p.id));
 $('selectionSummary').innerHTML=selected.map(p=>'<li>'+esc(description(p))+
  ' <button type="button" data-remove="'+esc(p.id)+'" aria-label="'+esc('Retira '+p.full_name)+'">Retira</button></li>').join('');
 $('replacePlayer').hidden=!selected.length||!available.length;
 for(const [id,players] of [['outgoingPlayer',selected],['incomingPlayer',available]]){
  $(id).replaceChildren(...players.map(p=>new Option(description(p),p.id)));
 }
 if($('officialDifferences'))$('officialDifferences').textContent=officialDifferences(selected);
 showGuide();
}
function officialDifferences(players){
 const {uncertain,onlyOfficial,onlyInternal,differentShirts}=compareCallup(detail.official_lineup,players);
 const messages=[];
 if(uncertain)messages.push('Comparació parcial. Hi ha registres sense una correspondència federativa inequívoca.');
 else{
  if(onlyOfficial.length)messages.push('Només a l’acta: '+onlyOfficial.map(p=>p.name).join(', ')+'.');
  if(onlyInternal.length)messages.push('Només a la convocatòria: '+onlyInternal.map(p=>p.full_name).join(', ')+'.');
 }
 if(differentShirts.length)messages.push('Dorsal diferent: '+differentShirts.map(p=>p.full_name).join(', ')+'.');
 return messages.join(' ')||'La selecció coincideix amb l’acta en les identitats i dorsals comparables.';
}
function playerList(players){
 return players.length?'<ul>'+players.map(p=>'<li>'+esc(description(p))+'</li>').join('')+'</ul>':'<p>Cap jugador seleccionat.</p>';
}
function staffList(staff){
 const lines=[['Entrenadors',staff?.coaches],['Delegats',staff?.delegates]]
  .filter(([,names])=>names?.length);
 return lines.map(([label,names])=>'<p><strong>'+label+'</strong> · '+esc(names.join(', '))+'</p>').join('');
}
function staffInputs(staff){
 return '<fieldset><legend>Responsables del partit</legend><p>Escriu un nom per línia.</p>'+
  [['staffCoaches','Entrenadors assignats',staff?.coaches],['staffDelegates','Delegats assignats',staff?.delegates]]
   .map(([id,label,names])=>'<label>'+label+'<textarea id="'+id+'" rows="2" maxlength="1000">'+
    esc((names||[]).join('\n'))+'</textarea></label>').join('')+'</fieldset>';
}
function selectedStaff(){
 if(!detail.staff_supported)return null;
 const names=id=>$(id).value.split(/\r?\n/).map(name=>name.trim()).filter(Boolean);
 return {coaches:names('staffCoaches'),delegates:names('staffDelegates')};
}
function group(label,players){
 return '<fieldset><legend>'+esc(label)+'</legend>'+players.map(p=>`
 <label class="roster-option"><input type="checkbox" value="${esc(p.id)}" ${selection.has(p.id)?'checked':''}>
 <span><strong>${esc(p.dorsal==null?'—':'#'+p.dorsal)} · ${esc(p.full_name)}</strong>
 <small>${p.position==='goalkeeper'?'Porteria':'Jugador/a de pista'}</small></span></label>`).join('')+'</fieldset>';
}
function renderDetail(){
 const {fixture:f,candidates,history:versions}=detail;
 const callup=canPreviewEdit()||detail.callup?.published?detail.callup:null;
 const canEdit=detail.can_edit&&canPreviewEdit();
 $('overview').hidden=true;
 $('detail').hidden=false;
 $('pageTitle').textContent='Convocatòria';
 const groups=new Map();
 for(const player of candidates.filter(p=>p.reinforcement)){
  if(!groups.has(player.origin_team_id))groups.set(player.origin_team_id,[]);
  groups.get(player.origin_team_id).push(player);
 }
 const missing=callup?.players.filter(p=>!candidates.some(c=>c.id===p.id))||[];
 const original=group(f.team_name,candidates.filter(p=>!p.reinforcement));
 $('detail').innerHTML=`
 <p><a href="${esc('./dashboard.html?'+new URLSearchParams({vista:'convocatories',equip:f.team_id,...(weekly?{setmana:monday}:{})}))}">← Torna a les convocatòries</a></p>
 <article><h2>${esc(title(f))}</h2><p>${esc(f.team_name)} · ${esc(date(f.starts_at))}</p>
 <span class="badge">${status({...callup,can_edit:canEdit,modified:versions.length>1})}</span>
 ${previewRole()?'':baseLink(f)?'<p><a class="action" href="'+esc(baseLink(f))+'">🏑 Obre el Mode Base</a></p>':'<p>El Mode Base necessita un context operatiu per a aquest partit.</p>'}
 ${callup?.published?'<h3>Convocatòria publicada</h3>'+playerList(callup.players)+staffList(callup.staff):''}</article>
 ${canEdit?`<article id="editor">
  <h2>${callup?.published?'Modifica la convocatòria':'Prepara la convocatòria'}</h2>
  <div class="actions"><button type="button" id="selectAll">✓ Selecciona tots</button><button type="button" id="clearSelection">↺ Neteja la selecció</button><output id="selectedCount" tabindex="-1" aria-live="polite"></output></div>
  <ul id="selectionSummary" aria-label="Jugadors seleccionats"></ul>
  <fieldset id="replacePlayer" hidden>
   <legend>Substitueix un jugador</legend>
   <label for="outgoingPlayer">Surt</label><select id="outgoingPlayer"></select>
   <label for="incomingPlayer">Entra</label><select id="incomingPlayer"></select>
   <button type="button" id="applyReplacement">Substitueix</button>
  </fieldset>
  <p id="overlapWarning" class="warning" role="status" hidden></p>
  ${missing.length?'<p class="warning">Jugadors de l’última versió que han deixat de ser elegibles: '+esc(missing.map(p=>p.full_name).join(', '))+'.</p>':''}
  <h3>Plantilla</h3>${original}
  <h3>Reforços elegibles</h3>${groups.size?[...groups.values()].map(players=>group(players[0].origin_team,players)).join(''):'<p>Cap reforç elegible.</p>'}
  ${Array.isArray(detail.official_lineup)?'<details><summary>Acta federativa de l’equip</summary><ul>'+
   detail.official_lineup.map(p=>'<li>'+esc([p.dorsal,p.name].filter(Boolean).join(' · '))+'</li>').join('')+
   '</ul></details><p id="officialDifferences" class="warning" role="status"></p>':
   detail.official_lineup===null?'<p>Sense una acta federativa verificada comparable per a aquest equip.</p>':''}
  ${detail.staff_supported?staffInputs(callup?.staff):''}
  ${candidates.length?'':'<p>Encara no hi ha jugadors disponibles per convocar</p>'}
  ${!previewRole()&&access?.teams.some(t=>t.id===f.team_id&&t.roster_import)?'<button type="button" id="importRoster">Importa la plantilla CSV</button>':''}
  <div class="actions">${callup?.published?'':'<button type="button" id="saveDraft">▣ Desa l’esborrany</button>'}
  <button type="button" class="primary" id="reviewPublication">→ Revisa i publica</button></div>
 </article>`:''}
 ${canEdit&&detail.draft_history?.length?`<article><h2>Historial d’esborranys</h2>
 ${detail.draft_history.map(v=>`<details><summary>Revisió ${esc(v.revision)} · ${esc(date(v.saved_at))}</summary>${playerList(v.players)}${staffList(v.staff)}</details>`).join('')}</article>`:''}
 ${versions.length?`<article><h2>Historial de publicacions</h2>
 ${versions.map((v,i)=>`<details><summary>${esc(date(v.published_at))} · ${i===0?'Versió actual':'Versió anterior'}</summary>${playerList(v.players)}${staffList(v.staff)}</details>`).join('')}</article>`:''}`;
 const workflowVersion=sessionVersion;
 const workflow=document.createElement('section');workflow.id='callupWorkflow';$('detail').append(workflow);
 mountCallupWorkflow({root:workflow,db,detail,canEdit,canImport:!!access?.teams.some(t=>t.id===f.team_id&&t.roster_import),disabled:!!previewRole(),
  onReload:()=>workflowVersion===sessionVersion?loadDetail(f.fixture_id,f.team_id,workflowVersion):Promise.resolve()});
 showGuide();
 if(!canEdit)return;
 if($('importRoster'))$('importRoster').onclick=()=>openSetup(f.team_id);
 $('editor').onchange=event=>{
  const input=event.target;
  if(!input.matches('input[type="checkbox"]'))return;
  if(input.checked)selection.add(input.value);
  else selection.delete(input.value);
  updateSelection();
 };
 $('selectAll').onclick=()=>setSelection(candidates.map(p=>p.id));
 $('clearSelection').onclick=()=>setSelection([]);
 $('selectionSummary').onclick=event=>{
  const button=event.target.closest('[data-remove]');
  if(!button)return;
  setSelection([...selection].filter(id=>id!==button.dataset.remove));
  $('selectedCount').focus();
 };
 $('applyReplacement').onclick=()=>{
  const outgoing=$('outgoingPlayer').value;
  const incoming=$('incomingPlayer').value;
  if(selection.has(outgoing)&&detail.candidates.some(p=>p.id===incoming)&&!selection.has(incoming)){
   setSelection([...selection].filter(id=>id!==outgoing).concat(incoming));
  }
 };
 if($('saveDraft')){
  $('saveDraft').disabled=!!previewRole();
  $('saveDraft').onclick=()=>save(false);
 }
 $('reviewPublication').onclick=()=>review(detail.overlaps.filter(id=>selection.has(id)));
 updateSelection();
}
function setSelection(ids){
 selection=new Set(ids);
 $('editor').querySelectorAll('input[type="checkbox"]').forEach(input=>input.checked=selection.has(input.value));
 updateSelection();
}
function review(conflicts){
 acknowledged=conflicts;
 $('publicationMatch').textContent=title(detail.fixture)+' · '+selection.size+' seleccionats';
 const players=detail.candidates.filter(p=>selection.has(p.id));
 $('publicationPlayers').innerHTML=players.map(p=>'<li>'+esc(description(p))+'</li>').join('');
 $('publicationStaff').innerHTML=staffList(selectedStaff());
 $('publicationStaff').hidden=!$('publicationStaff').hasChildNodes();
 $('publicationOfficial').textContent=Array.isArray(detail.official_lineup)?officialDifferences(players):'';
 $('publicationOfficial').hidden=!$('publicationOfficial').textContent;
 $('publicationConflicts').hidden=!conflicts.length;
 $('publicationConflicts').textContent='Hi ha un solapament amb una altra convocatòria publicada · '+players.filter(p=>conflicts.includes(p.id)).map(p=>p.full_name).join(', ');
 $('publication').returnValue='cancel';
 $('publication').showModal();
}
$('publication').onclose=()=>{
 if($('publication').returnValue==='publish'&&detail?.can_edit)save(true);
};
async function rpc(name,args){
  const response=await db.rpc(name,args,{get:name==='read_club_callups'});
 if(response.error)throw response.error;
 return response.data;
}
async function loadDetail(fixtureId,teamId,version){
 const args={p_fixture:fixtureId,p_team:teamId};
 let response=await db.rpc('read_callup_workflow',args,{get:true});
 if(!response.error&&!response.data?.workflow_supported)response={error:{code:'PGRST202'}};
 if(response.error?.code==='PGRST202')response=await db.rpc('read_club_callup_detail',args,{get:true});
 if(response.error&&response.error.code!=='PGRST202')throw response.error;
 const incoming=response.data||await rpc('read_club_callups',args);
 if(version!==sessionVersion)return;
 detail=incoming;
 selection=new Set((detail.callup?.players||[]).filter(p=>detail.candidates.some(c=>c.id===p.id)).map(p=>p.id));
 const selected=fixtures.find(f=>f.team_id===teamId);
 brand(selected);
 renderDetail();
}
async function save(publish){
 if(working||previewRole())return;
 working=true;
 const version=sessionVersion;
 const f=detail.fixture;
 $('editor').inert=true;
 $('workspaceStatus').textContent='Desant…';
 try{
  const staff=selectedStaff();
  const saved=await rpc(staff?'save_club_callup_with_staff':'save_club_callup',{
   p_fixture:f.fixture_id,p_team:f.team_id,p_revision:detail.callup?.revision||0,
   p_players:[...selection],p_publish:publish,p_acknowledged:publish?acknowledged:[],
   ...(staff?{p_staff:staff}:{})
  });
  if(version!==sessionVersion)return;
  if(saved.requires_confirmation){
   detail.overlaps=[...new Set([...detail.overlaps,...saved.overlaps])];
   $('workspaceStatus').textContent='Revisa el solapament abans de publicar.';
   review(saved.overlaps);
   return;
  }
  await loadDetail(f.fixture_id,f.team_id,version);
  if(version===sessionVersion)$('workspaceStatus').textContent=publish?'Convocatòria publicada.':'Esborrany desat.';
 }catch(error){
  if(version===sessionVersion)$('workspaceStatus').textContent=error.message||'No s’ha pogut desar la convocatòria.';
 }finally{
  working=false;
  if(version===sessionVersion&&$('editor')){
   $('editor').inert=false;
   updateSelection();
  }
 }
}

function renderTeamPicker(preferred){
 const visible=[...teams.values()].filter(t=>!$('clubPicker').value||t.club_id===$('clubPicker').value);
 $('teamPicker').replaceChildren(...(visible.length?[new Option('Tots els equips del club','')]:[]),...visible.map(t=>{
  const category=t.category&&!t.team_name.toLocaleLowerCase('ca').includes(t.category.toLocaleLowerCase('ca'))?t.category:'';
  return new Option([$('clubControl').hidden?t.club_name:'',t.team_name,category,t.season_name].filter(Boolean).join(' · '),t.id);
 }));
 if(visible.some(t=>t.id===preferred))$('teamPicker').value=preferred;
 else if(preferred!==''&&visible.length===1)$('teamPicker').value=visible[0].id;
 $('teamControl').hidden=!visible.length;
 $('accessPanel').hidden=!!visible.length;
 $('overview').hidden=!visible.length||!!detail;
 if(visible.length&&!detail)renderList();
 else showGuide();
}

function renderAccess(incoming){
 access=incoming;
 if(access?.global_admin){
  $('previewRole').value=sessionStorage.getItem(previewKey)||'';
 }else $('previewRole').value='';
 if(previewRole())weekly=false;
 configureSetup(previewRole()?null:access);
 const scoped=access?.teams.filter(team=>team.operational)||[];
 teams=new Map(scoped.map(team=>[team.id,team]));
 for(const f of fixtures){
  if(!teams.has(f.team_id))teams.set(f.team_id,{...f,id:f.team_id});
 }
 const previous=$('teamPicker').options.length?$('teamPicker').value:params.get('equip');
 const clubs=access?.global_admin&&access.clubs?.length?access.clubs:
  [...new Map([...teams.values()].filter(t=>t.club_id).map(t=>[t.club_id,{id:t.club_id,name:t.club_name}])).values()];
 const club=teams.get(previous)?.club_id||$('clubPicker').value||params.get('club');
 $('clubPicker').replaceChildren(...clubs.map(c=>new Option(c.name,c.id)));
 if(clubs.some(c=>c.id===club))$('clubPicker').value=club;
 $('clubControl').hidden=clubs.length<2&&!access?.global_admin;
 $('rolePanel').hidden=!access?.global_admin;
 $('previewStatus').hidden=!previewRole();
 $('accessSetup').hidden=$('clubSetup').hidden;
 $('accessMessage').textContent=access?.global_admin
  ?'Si el club seleccionat encara no té equips, pots configurar-ne la temporada i importar-los.'
  :!$('clubSetup').hidden?'Pots importar dades dins del teu àmbit. Per operar en convocatòries cal un rol operatiu assignat.'
  :'El teu compte encara no té cap equip amb accés operatiu. Demana a l’administració del club que comprovi la teva afiliació i el rol assignat.';
 renderTeamPicker(previous);
}

$('clubPicker').onchange=()=>{
 const url=new URL(location.href);
 detail=null;
 $('detail').hidden=true;
 $('detail').replaceChildren();
 renderTeamPicker();
 url.searchParams.delete('partit');
 url.searchParams.set('club',$('clubPicker').value);
 if($('teamPicker').value)url.searchParams.set('equip',$('teamPicker').value);
 else url.searchParams.delete('equip');
 history.replaceState(null,'',url);
 if(!params.has('partit'))return;
 location.href=url;
};
$('previewRole').onchange=()=>{
 if(!access?.global_admin)return;
 if(previewRole())sessionStorage.setItem(previewKey,previewRole());
 else sessionStorage.removeItem(previewKey);
 if(previewRole()&&weekly)changeWeek(false);
 if($('publication').open)$('publication').close('cancel');
 renderAccess(access);
 if(detail){
  selection=new Set((detail.callup?.players||[]).filter(p=>detail.candidates.some(c=>c.id===p.id)).map(p=>p.id));
  renderDetail();
 }
};

$('setupNav').onclick=$('accessSetup').onclick=()=>{
 $('clubSetup').open=true;
 $('clubSetup').scrollIntoView();
};
document.addEventListener('club-setup-updated',async event=>{
 renderAccess(event.detail);
 if(detail){
  try{await loadDetail(detail.fixture.fixture_id,detail.fixture.team_id,sessionVersion);}
  catch{$('workspaceStatus').textContent='Plantilla importada. Torna a obrir la convocatòria per actualitzar-la.';}
 }
});

document.addEventListener('club-auth-changed',async event=>{
 const version=++sessionVersion;
 weekRequest++;
 const user=event.detail;
 detail=null;
 $('previewRole').value='';
 $('rolePanel').hidden=true;
 $('clubControl').hidden=true;
 fixtures=[];
 teams.clear();
 access=null;
 configureSetup(null);
 if($('publication').open)$('publication').close('cancel');
 $('teamControl').hidden=true;
 $('workspace').hidden=!user;
 $('detail').hidden=true;
 $('detail').replaceChildren();
 $('overview').hidden=true;
 $('accessPanel').hidden=true;
 $('fixtures').replaceChildren();
 $('tasks').replaceChildren();
 brand(null);
 if(!user)return;
 $('workspaceStatus').textContent='Carregant els equips i partits…';
 try{
  const [list,setup]=await Promise.all([
   rpc('read_club_callups',{}),
   db.rpc('club_setup_access',{})
  ]);
  if(version!==sessionVersion)return;
  fixtures=list;
  if(setup.error&&setup.error.code!=='PGRST202')throw setup.error;
  let accessData=setup.data;
  if(setup.error?.code==='PGRST202'){
   const platform=await db.rpc('is_platform_superadmin',{});
   if(version!==sessionVersion)return;
   accessData={global_admin:platform.data===true,teams:[]};
  }
  renderAccess(accessData);
  if(params.has('partit')&&params.has('equip'))await loadDetail(params.get('partit'),params.get('equip'),version);
  if(version===sessionVersion)$('workspaceStatus').textContent=setup.error&&access?.global_admin
   ?'La importació CSV s’activarà quan s’apliqui l’actualització de la base de dades.':'';
 }catch(error){
  if(version===sessionVersion)$('workspaceStatus').textContent='No s’han pogut carregar les convocatòries. '+(error.message||'');
 }
});
