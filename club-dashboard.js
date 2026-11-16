import {db} from './app-client.js';
import {safeCrest} from './basic-roster.js';
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

function link(f){
 return './dashboard.html?'+new URLSearchParams({vista:'convocatories',partit:f.fixture_id,equip:f.team_id});
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
 $('guide').textContent=!detail?'Pas 1. Tria un equip a la capçalera i obre la convocatòria del partit.'
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
function renderList(){
 const selected=fixtures.filter(f=>f.team_id===$('teamPicker').value);
 const visible=selected.filter(f=>!f.past||callupPage&&$('showPast').checked);
 brand(selected[0]);
 $('pageTitle').textContent=callupPage?'Convocatòries':'Pròxims partits';
 $('tasksPanel').hidden=callupPage;
 $('pastControl').hidden=!callupPage||!selected.some(f=>f.past);
 const pending=selected.filter(f=>!f.past&&(f.can_edit?!f.published:f.published));
 $('tasks').innerHTML=pending.length?pending.map(f=>'<li><a href="'+esc(link(f))+'">'+
  (f.can_edit?(f.revision?'Revisa l’esborrany':'Prepara la convocatòria'):'Consulta la convocatòria')+
  ' · '+esc(title(f))+'</a></li>').join(''):'<li>Cap tasca de convocatòries per a aquest equip.</li>';
 $('fixtures').innerHTML=visible.length?visible.map(f=>`
 <article>
  <div class="club-side">${crest(f.home_crest)}<strong>${esc(f.home_team)}</strong></div>
  <div class="club-side">${crest(f.away_crest)}<strong>${esc(f.away_team)}</strong></div>
  <p class="match-date">${esc(date(f.starts_at))}</p>
  <p><span class="badge">${status(f)}</span></p>
  <a class="action primary" href="${esc(link(f))}">☷ ${f.can_edit?'Gestiona':'Consulta'} la convocatòria</a>
 </article>`).join(''):'<p>Cap partit pròxim en els equips als quals tens accés.</p>';
 showGuide();
}
$('showPast').onchange=renderList;
$('teamPicker').onchange=()=>{
 const url=new URL(location.href);
 url.searchParams.set('equip',$('teamPicker').value);
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
 $('reviewPublication').disabled=!selection.size||working;
 showGuide();
}
function playerList(players){
 return players.length?'<ul>'+players.map(p=>'<li>'+esc(description(p))+'</li>').join('')+'</ul>':'<p>Cap jugador seleccionat.</p>';
}
function group(label,players){
 return '<fieldset><legend>'+esc(label)+'</legend>'+players.map(p=>`
 <label class="roster-option"><input type="checkbox" value="${esc(p.id)}" ${selection.has(p.id)?'checked':''}>
 <span><strong>${esc(p.dorsal==null?'—':'#'+p.dorsal)} · ${esc(p.full_name)}</strong>
 <small>${p.position==='goalkeeper'?'Porteria':'Jugador/a de pista'}</small></span></label>`).join('')+'</fieldset>';
}
function renderDetail(){
 const {fixture:f,callup,candidates,history:versions,can_edit:canEdit}=detail;
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
 <p><a href="./dashboard.html?vista=convocatories&amp;equip=${esc(f.team_id)}">← Torna a les convocatòries</a></p>
 <article><h2>${esc(title(f))}</h2><p>${esc(f.team_name)} · ${esc(date(f.starts_at))}</p>
 <span class="badge">${status({...callup,can_edit:canEdit,modified:versions.length>1})}</span>
 ${baseLink(f)?'<p><a class="action" href="'+esc(baseLink(f))+'">🏑 Obre el Mode Base</a></p>':'<p>El Mode Base necessita un context operatiu per a aquest partit.</p>'}
 ${callup?.published?'<h3>Convocatòria publicada</h3>'+playerList(callup.players):''}</article>
 ${canEdit?`<article id="editor">
  <h2>${callup?.published?'Modifica la convocatòria':'Prepara la convocatòria'}</h2>
  <div class="actions"><button type="button" id="selectAll">✓ Selecciona tots</button><button type="button" id="clearSelection">↺ Neteja la selecció</button><output id="selectedCount" aria-live="polite"></output></div>
  <p id="overlapWarning" class="warning" role="status" hidden></p>
  ${missing.length?'<p class="warning">Jugadors de l’última versió que han deixat de ser elegibles: '+esc(missing.map(p=>p.full_name).join(', '))+'.</p>':''}
  <h3>Plantilla</h3>${original}
  <h3>Reforços elegibles</h3>${groups.size?[...groups.values()].map(players=>group(players[0].origin_team,players)).join(''):'<p>Cap reforç elegible.</p>'}
  ${candidates.length?'':'<p>No hi ha cap jugador a la plantilla interna d’aquest equip.</p>'}
  <div class="actions">${callup?.published?'':'<button type="button" id="saveDraft">▣ Desa l’esborrany</button>'}
  <button type="button" class="primary" id="reviewPublication">→ Revisa i publica</button></div>
 </article>`:''}
 ${versions.length?`<article><h2>Historial de publicacions</h2>
 ${versions.map((v,i)=>`<details><summary>${esc(date(v.published_at))} · ${i===0?'Versió actual':'Versió anterior'}</summary>${playerList(v.players)}</details>`).join('')}</article>`:''}`;
 showGuide();
 if(!canEdit)return;
 $('editor').onchange=event=>{
  const input=event.target;
  if(!input.matches('input[type="checkbox"]'))return;
  if(input.checked)selection.add(input.value);
  else selection.delete(input.value);
  updateSelection();
 };
 $('selectAll').onclick=()=>setSelection(candidates.map(p=>p.id));
 $('clearSelection').onclick=()=>setSelection([]);
 if($('saveDraft'))$('saveDraft').onclick=()=>save(false);
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
 const incoming=await rpc('read_club_callups',{p_fixture:fixtureId,p_team:teamId});
 if(version!==sessionVersion)return;
 detail=incoming;
 selection=new Set((detail.callup?.players||[]).filter(p=>detail.candidates.some(c=>c.id===p.id)).map(p=>p.id));
 const selected=fixtures.find(f=>f.team_id===teamId);
 brand(selected);
 renderDetail();
}
async function save(publish){
 if(working)return;
 working=true;
 const version=sessionVersion;
 const f=detail.fixture;
 $('editor').inert=true;
 $('workspaceStatus').textContent='Desant…';
 try{
  const saved=await rpc('save_club_callup',{
   p_fixture:f.fixture_id,p_team:f.team_id,p_revision:detail.callup?.revision||0,
   p_players:[...selection],p_publish:publish,p_acknowledged:publish?acknowledged:[]
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

document.addEventListener('club-auth-changed',async event=>{
 const version=++sessionVersion;
 const user=event.detail;
 detail=null;
 if($('publication').open)$('publication').close('cancel');
 $('teamControl').hidden=true;
 $('workspace').hidden=!user;
 $('detail').hidden=true;
 $('detail').replaceChildren();
 $('overview').hidden=false;
 $('fixtures').replaceChildren();
 $('tasks').replaceChildren();
 brand(null);
 if(!user)return;
 $('workspaceStatus').textContent='Carregant els partits…';
 try{
  const list=await rpc('read_club_callups',{});
  if(version!==sessionVersion)return;
  fixtures=list;
  const teams=new Map(fixtures.map(f=>[f.team_id,f]));
  $('teamPicker').replaceChildren(...[...teams.values()].map(f=>new Option(f.club_name+' · '+f.team_name,f.team_id)));
  if(teams.has(params.get('equip')))$('teamPicker').value=params.get('equip');
  $('teamControl').hidden=!teams.size;
  renderList();
  if(params.has('partit')&&params.has('equip'))await loadDetail(params.get('partit'),params.get('equip'),version);
  if(version===sessionVersion)$('workspaceStatus').textContent='';
 }catch(error){
  if(version===sessionVersion)$('workspaceStatus').textContent='No s’han pogut carregar les convocatòries. '+(error.message||'');
 }
});
