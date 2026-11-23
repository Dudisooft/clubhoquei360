import {db} from './app-client.js';
import {readModeAccess} from './match-mode-access.js';
async function allRows(db,table){const rows=[];for(let start=0;;start+=500){const key=table==='federation_match_sources'?'match_id':table==='federation_match_teams'?'match_id':'id';let q=db.from(table).select('*').order(key);if(table==='federation_match_teams')q=q.order('entry_id');const r=await q.range(start,start+499);if(r.error)throw r.error;rows.push(...r.data);if(r.data.length<500)return rows;}}
import {navigationRows,navigationTeams,filteredRows,matchHref,officialReportHref} from './match-navigation.js?v=20261114';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data,rows=[],modeAccess=null,modeRequest=0;const ids=['season','competition','team','fixture'];
const set=(id,list)=>{$(id).innerHTML='<option value="">Selecciona…</option>'+list.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');$(id).disabled=!list.length;};
const choice=()=>({season:$('season').value,competition:$('competition').value,team:$('team').value});
const label=r=>`${r.federation_start_at?new Date(r.federation_start_at).toLocaleString('ca-ES',{timeZone:'Europe/Madrid'}):'Data pendent'} · ${r.home_team} – ${r.away_team} · ${r.external_match_id?'Acta '+r.external_match_id+' · ':''}${r.operational?'Context operatiu disponible':'Només calendari federatiu'}`;
function teamFixtures(){
 const list=filteredRows(rows,choice());
 const played=list.filter(r=>r.home_score!=null&&r.away_score!=null);
 const recent=played.filter(r=>r.federation_start_at).reverse();
 return [...recent,...played.filter(r=>!r.federation_start_at),...list.filter(r=>r.home_score==null||r.away_score==null)];
}
function officialCalendarLink(row){const href=officialReportHref(row);return href?' · <a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">Consulta la fitxa federativa</a>':'';}
function draw(){const list=teamFixtures(),row=list.find(r=>r.id===$('fixture').value),mode=$('navigationMode'),video=mode.querySelector('[value=video]');
 mode.querySelector('[value=base]').disabled=!modeAccess?.base;
 mode.querySelector('[value=advanced]').disabled=!modeAccess?.advanced;
 video.disabled=!modeAccess?.advanced||!modeAccess?.operational_read;
 if(mode.selectedOptions[0]?.disabled)mode.value='';
 const href=row&&matchHref(row,mode.value,modeAccess),reportHref=officialReportHref(row),report=$('officialReport');
 report.hidden=!reportHref;
 if(reportHref)report.href=reportHref;else report.removeAttribute('href');
 $('calendar').innerHTML=list.length?list.map(r=>`<div>${esc(label(r))} · ${r.home_score!=null&&r.away_score!=null?'Resultat publicat '+esc(r.home_score)+'–'+esc(r.away_score):r.federation_start_at&&Date.parse(r.federation_start_at)>Date.now()?'Futur':'Sense resultat publicat / estat en curs no acreditat'}${officialCalendarLink(r)}</div>`).join(''):(choice().team?'No hi ha partits accessibles per a aquest equip.':choice().competition&&$('team').disabled?'Aquesta competició no té equips accessibles.':choice().season&&$('competition').disabled?'Aquesta temporada no té competicions accessibles.':'Selecciona temporada, competició i equip.');$('openMatch').setAttribute('aria-disabled',String(!href));if(href)$('openMatch').href=href;else $('openMatch').removeAttribute('href');$('selectionStatus').textContent=row?(href?(row.operational?'S’obrirà exactament el context autoritzat seleccionat.':'Només calendari: el Mode Base manté la seva activació existent i els permisos del servidor.'):'Només calendari federatiu. Aquest mode no té context operatiu disponible; aquesta pantalla no activa partits ni concedeix permisos.'):'Cap partit seleccionat.';}
async function checkMode(){
 const request=++modeRequest,id=$('fixture').value;modeAccess=null;draw();
 if(!id)return;
 try{const access=await readModeAccess(db,{catalogue:id});if(request===modeRequest){modeAccess=access;draw();}}
 catch(error){if(request===modeRequest)$('selectionStatus').textContent=error.message;}
}
function changed(index){$('navigationMode').value='';for(const id of ids.slice(index+1))set(id,[]);const s=choice();if(index===0)set('competition',data.competitions.filter(c=>c.season_id===s.season).map(c=>[c.id,`${c.federation} · ${c.name||c.category||c.external_competition_id}`]));if(index===1)set('team',navigationTeams(data,s).map(t=>[t.id,t.name]));if(index===2)set('fixture',teamFixtures().map(r=>[r.id,label(r)]));void checkMode();}
$('reportSearch').onsubmit=event=>{
 event.preventDefault();
 const code=$('reportCode').value.trim();
 const candidates=[];
 for(const row of rows){
  if(String(row.external_match_id)!==code)continue;
  const teams=navigationTeams(data,row).filter(team=>row.teams.includes(team.id));
  if(teams.length)candidates.push({row,team:teams.find(team=>team.id===$('team').value)||teams[0]});
 }
 if(candidates.length!==1){
  $('selectionStatus').textContent=candidates.length?'Aquest codi correspon a més d’un partit accessible. Selecciona la competició i l’equip.':'Cap partit accessible amb aquest número d’acta.';
  return;
 }
 const [{row,team}]=candidates;
 for(const [index,value] of [row.season,row.competition,team.id,row.id].entries()){
  $(ids[index]).value=value;
  changed(index);
 }
};
ids.forEach((id,i)=>$(id).onchange=()=>changed(i));$('navigationMode').onchange=draw;const mode=new URLSearchParams(location.search).get('mode');if(mode==='base')$('navigationMode').value='base';ids.forEach(id=>set(id,[]));
(async()=>{const auth=await db.auth.getUser();if(auth.error&&auth.error.name!=='AuthSessionMissingError')throw auth.error;if(!auth.data.user){$('selectionStatus').textContent='Inicia sessió al Dashboard per consultar el catàleg del club.';return;}void showTemporaryMatches().catch(()=>{});const tables={seasons:'seasons',competitions:'federation_competitions',teams:'teams',groups:'federation_groups',entries:'federation_team_entries',fixtures:'federation_matches',links:'federation_match_teams',matches:'pilot_matches',sources:'federation_match_sources',contexts:'basic_match_contexts'};const results=await Promise.all(Object.entries(tables).map(async([key,table])=>[key,await allRows(db,table)]));data=Object.fromEntries(results);rows=navigationRows(data);set('season',data.seasons.map(s=>[s.id,s.label]));draw();if(!data.seasons.length){$('selectionStatus').textContent='La sessió és activa. El catàleg no retorna cap temporada accessible per a aquest compte.';$('calendar').textContent='Cap temporada accessible.';return;}$('reportCode').disabled=false;$('findReport').disabled=false;})().catch(e=>$('selectionStatus').textContent='No s’ha carregat el selector: '+e.message);


async function showTemporaryMatches(){
 const result=await db.rpc('match_temporary_list',{p_match:null});
 if(result.error||!Array.isArray(result.data)||result.data.length===0)return;
 const section=document.createElement('section');
 section.className='panel';section.id='temporaryMatches';
 const title=document.createElement('h2');
 title.textContent='Partits amb accés temporal';section.append(title);
 for(const grant of result.data){
  const row=document.createElement('p');
  row.textContent=grant.match_title+' · '+grant.status+' · caduca '+new Date(grant.expires_at).toLocaleString('ca-ES',{timeZone:'Europe/Madrid'});
  if(grant.status==='active'){
   const link=document.createElement('a');
   link.href='./avancat.html?match='+encodeURIComponent(grant.match_id)+'&view=stats';
   link.textContent=' Obre el Mode Avançat';row.append(link);
  }
  section.append(row);
 }
 document.querySelector('main').prepend(section);
}
