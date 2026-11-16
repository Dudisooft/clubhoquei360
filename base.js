import {db} from './app-client.js';
import {basicState,makeRow,cards,comparison,playerTotals,benchTotals,provisionalRoster,rivalPlayer} from './basic-model.js?v=manual-rival1';
import {officialReportHref, federationPortalHref} from './match-navigation.js?v=manual-rival1';
import {score,fromRow} from './federation-model.js?v=manual-rival1';
import {BasicStore,syncFederation,federationSyncMessage} from './basic-store.js?v=federation-refresh2';
import {PracticeStore,readCatalogueFixture} from './basic-practice.js?v=4';
import {allRows,catalogueRoster,mergeRoster,materializePlayers,safeCrest,kitFor,sideLabel} from './basic-roster.js?v=manual-rival1';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const requestedPractice=new URLSearchParams(location.search).get('practice');
let practiceId=requestedPractice,catalogueId=requestedPractice||new URLSearchParams(location.search).get('catalogue'),activationNeeded=false,legacyRows=[];
let restrictedSides=[],rivalSides=[],reportRow=null,rivalEdit=null;
let uid,match,store,source,fixture,players=[],role=null,busy=false,advancedFinished=false;
let activeSide='home',preparing=true,draft=new Set(),sheet=null,flash='',rosterNotice='';
const expandedReinforcements=new Set();
const isReinforcement=p=>!!p.reinforcement||p.selection_basis==='unverified_reinforcement'||String(p.origin||'').startsWith('Possible reforç');
const selectionCount=count=>count?' · '+count+(count===1?' seleccionat':' seleccionats'):'';
const state=()=>basicState(store?.all()||[]);
const teamName=side=>source?.[side+'_name']||sideLabel(side);
const editable=()=>!!store&&role==='operator'&&!state().finished&&!advancedFinished;
const needsRosterReview=()=>state().playerRecords.some(p=>restrictedSides.includes(p.team)&&(!players.some(x=>x.id===p.id)||players.find(x=>x.id===p.id)?.selectable===false));
const manualPlayers=()=>provisionalRoster(store?.all()||[]);
const rosterPlayers=()=>[...players,...manualPlayers()];
const recordFor=id=>rosterPlayers().find(p=>p.id===id)||state().playerRecords.find(p=>p.id===id);
const eventName=row=>row.payload?.details?.player_snapshot?.full_name||recordFor(row.payload?.actor)?.full_name||row.player_label||'Jugador no disponible';
const jersey=(p,side)=>{const kit=kitFor(side,source?.official_data?.[side+'_team_id']||teamName(side),p.position==='goalkeeper'?'goalie':'player');return `<span class="jersey" style="--kit-background:${kit.background};--kit-ink:${kit.ink}" aria-label="${p.dorsal?'Dorsal '+esc(p.dorsal):'Dorsal desconegut'}">${esc(p.dorsal??'—')}</span>`;};
const countsText=totals=>[totals.goals?`${totals.goals} gol${totals.goals===1?'':'s'}`:'',...Object.entries(cards).filter(([k])=>totals[k]).map(([k,label])=>`${totals[k]} ${label.toLowerCase()}`)].filter(Boolean).join(' · ');
const snapshot=p=>({id:p.id,team:p.team,full_name:p.full_name,dorsal:p.dorsal??null,federation_player_id:p.federation_player_id||null,catalog_player_id:p.catalog_player_id||null,catalog_lineup_id:p.catalog_lineup_id||null,origin:p.origin||null,eligibility:p.eligibility||null,selection_basis:p.selection_basis||null,origin_reference:p.origin_reference||null,callup_reference:p.callup_reference||null,reinforcement:isReinforcement(p)||state().playerRecords.some(saved=>saved.id===p.id&&isReinforcement(saved))});

function renderPreparation(){
 $('rosterNotice').textContent=rosterNotice+(needsRosterReview()?' Convocatòria desada preservada: hi ha participants sense evidència actual suficient; revisa’ls sense perdre les incidències.':'');
 const selected=state().playerRecords;
 const candidates=rosterPlayers().map(p=>({...p,reinforcement:isReinforcement(p)||selected.some(saved=>saved.id===p.id&&isReinforcement(saved))}));
 for(const p of selected)if(!candidates.some(x=>x.id===p.id))candidates.push({...p,reinforcement:isReinforcement(p),selectable:false,origin:'Convocat desat anteriorment',eligibility:'No consta a la plantilla actual: revisa’l'});
 const option=p=>`<label class="roster-option"><input type="checkbox" data-player="${esc(p.id)}" ${draft.has(p.id)?'checked':''} ${busy||role!=='operator'||(!p.selectable&&!state().participants.includes(p.id))||advancedFinished||state().finished?'disabled':''}><span><strong>${esc(p.dorsal?'#'+p.dorsal+' · ':'')}${esc(p.full_name)}</strong><span class="player-details">${isReinforcement(p)?'Reforç · ':''}${esc(p.origin||'Plantilla del partit')} · ${esc(p.eligibility||'Elegibilitat no acreditada')}${p.otherTeams?.length?'<br>També consta a: '+esc(p.otherTeams.join(', ')):''}</span></span></label>`;
 $('rosterGrid').innerHTML=['home','away'].map(side=>{
  const list=candidates.filter(p=>p.team===side),reinforcements=list.filter(isReinforcement),regular=list.filter(p=>!isReinforcement(p));
  const expanded=expandedReinforcements.has(side),count=reinforcements.filter(p=>draft.has(p.id)).length;
  const manual=rivalSides.includes(side)&&editable()?'<button type="button" data-rival-side="'+side+'" '+(busy?'disabled':'')+'>Afegeix un jugador rival</button>':'';
  const edits=list.filter(p=>p.selection_basis==='manual_rival').map(p=>editable()&&rivalSides.includes(side)?'<button type="button" data-rival-edit="'+esc(p.id)+'" '+(busy?'disabled':'')+'>Edita dorsal '+esc(p.dorsal)+'</button>':'').join('');
  return `<div><h3>${esc(sideLabel(side))} · ${esc(teamName(side))}</h3><h4>Jugadors de l’equip</h4>${manual}${regular.length?regular.map(option).join(''):'<p class="notice">No hi ha jugadors disponibles a les fonts accessibles. Pots continuar sense un nombre fix de convocats.</p>'}${edits}<button type="button" class="reinforcement-toggle wide" data-reinforcements="${side}" aria-expanded="${expanded}" aria-controls="reinforcements-${side}"><span>Possibles reforços (${reinforcements.length})</span><span class="muted" data-reinforcement-count="${side}" aria-live="polite">${selectionCount(count)}</span><span aria-hidden="true"> ${expanded?'▴':'▾'}</span></button><div id="reinforcements-${side}" ${expanded?'':'hidden'}>${reinforcements.length?reinforcements.map(option).join(''):'<p class="muted">Cap candidat amb evidència suficient.</p>'}</div></div>`;
 }).join('');
 $('cancelPreparation').hidden=!state().confirmed;
 $('cancelPreparation').disabled=busy;
}
function renderPlayers(){
 const s=state(),events=s.events;
 const selected=s.participants.map(id=>recordFor(id)).filter(p=>p?.team===activeSide);
 $('teamList').innerHTML=selected.map(p=>{
  const text=countsText(playerTotals(events,p.id));
  return `<button class="player-row" data-person="${esc(p.id)}" ${busy||!editable()?'disabled':''}>${jersey(p,activeSide)}<span class="player-info"><strong>${esc(p.full_name)}</strong>${p.selection_basis==='manual_rival'?'<span class="muted">Provisional</span>':''}${text?`<span class="incidents">${esc(text)}</span>`:''}</span><span aria-hidden="true">＋</span></button>`;
 }).join('')||'<p class="notice">Cap jugador convocat en aquest equip. Pots modificar la convocatòria o registrar un gol sense identificar el jugador.</p>';
 $('bench').textContent='Banqueta '+(activeSide==='home'?'local':'visitant')+(countsText(benchTotals(events,activeSide))?' · '+countsText(benchTotals(events,activeSide)):'');
 $('kitNotice').textContent=kitFor(activeSide).label+'.';
}
function renderHistory(){
 const pending=new Set(store?.pending?.flat().map(r=>r.id)||[]);
 const rows=state().active.filter(r=>!r.payload?.kind?.startsWith('basic_'));
 $('events').innerHTML=rows.slice().reverse().map(r=>{
  const kind=r.payload?.kind||r.event_type;
  const actor=r.payload?.details?.bench?'Banqueta':r.payload?.actor?eventName(r):'Sense jugador identificat';
  const canEdit=['gol','groga','blava','vermella'].includes(kind);
  return `<div class="event"><strong>${esc(kind==='gol'?'Gol':cards[kind]||kind)}</strong> · ${esc(teamName(r.team))}<br>${esc(actor)}${pending.has(r.id)?'<div class="pending">Pendent de sincronitzar</div>':''}${editable()&&canEdit?`<div class="event-actions"><button data-edit="${esc(r.id)}" ${busy?'disabled':''}>Corregeix</button><button data-cancel="${esc(r.id)}" ${busy?'disabled':''}>Anul·la</button></div>`:''}</div>`;
 }).join('')||'<p class="muted">Encara no hi ha incidències.</p>';
}
function renderSummary(){
 const s=state(),ids=[...new Set([...s.participants,...s.events.map(e=>e.actor).filter(Boolean)])];
 const records=ids.map(id=>recordFor(id)||s.active.find(r=>r.payload?.actor===id)?.payload?.details?.player_snapshot||{id,full_name:'Jugador no disponible',team:s.active.find(r=>r.payload?.actor===id)?.team});
 $('playerSummary').innerHTML=['home','away'].map(side=>`<h3>${esc(teamName(side))}</h3>${records.filter(p=>p.team===side).map(p=>`<div class="summary-player"><span>${esc(p.dorsal?'#'+p.dorsal+' · ':'')}${esc(p.full_name)}</span><strong>${esc(countsText(playerTotals(s.events,p.id))||'Sense gols ni targetes')}</strong></div>`).join('')||'<p class="muted">Sense jugadors convocats o identificats.</p>'}`).join('');
 $('benchSummary').innerHTML=['home','away'].map(side=>`<p><strong>Banqueta ${side==='home'?'local':'visitant'}:</strong> ${esc(countsText(benchTotals(s.events,side))||'Sense targetes locals')}</p>`).join('');
 $('comparison').innerHTML=['home','away'].map(side=>`<h3>${esc(sideLabel(side))} · ${esc(teamName(side))}</h3><table><thead><tr><th>Concepte</th><th>Registre local</th><th>Dades federatives</th><th>Estat</th></tr></thead><tbody>${comparison(store?.all()||[],source,side).map(r=>`<tr>${[r.label,r.local,r.official,r.status].map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('');
}
function render(){
 const s=state(),setup=!s.finished&&(preparing||!s.confirmed);
 $('homeName').textContent=teamName('home');$('awayName').textContent=teamName('away');
 for(const side of ['home','away']){const image=$(side+'Crest'),url=safeCrest(source?.[side+'_crest_url']);image.hidden=!url;if(url)image.src=url;else image.removeAttribute('src');}
 $('score').textContent=`${score(s.events,'home')} – ${score(s.events,'away')}`;
 $('modeLabel').textContent=practiceId?'PROVA COMPARTIDA · històric preservat':'Registre compartit';
 $('preparation').hidden=!setup;$('recording').hidden=setup;$('teamTabs').hidden=setup;$('finalSummary').hidden=!s.finished;
 document.querySelectorAll('[data-write]').forEach(b=>b.disabled=busy||!editable());
 $('match').disabled=busy||!!requestedPractice;
 $('activateContext').hidden=!activationNeeded;$('activateContext').disabled=busy;
 $('activateContext').textContent=practiceId?'Activa la prova compartida a Supabase':'Activa el registre d’aquest partit';
 $('exportLegacy').hidden=!legacyRows.length;$('exportLegacy').disabled=busy;
 const federated=source?.federation;
 $('sync').textContent=catalogueId?'Recarrega el catàleg':federated?'Actualitza amb '+federated:'Actualitza dades federatives';
 $('sync').disabled=busy||!federated||(!catalogueId&&(role!=='operator'||!source?.federation_match_id||!officialReportHref(reportRow)||source.official_data?.source_kind==='verified_calendar'));
 $('readLineups').disabled=busy||!federated;
 const officialUrl=officialReportHref(reportRow),portalUrl=federationPortalHref(reportRow);
 const link=$('officialLink');
 link.hidden=!portalUrl;
 if(portalUrl){link.href=officialUrl||portalUrl;link.textContent=officialUrl?'Obre la fitxa federativa':'Obre el portal '+federated;}
 else link.removeAttribute('href');
 $('portalHelp').textContent=portalUrl?(officialUrl?'Si el portal mostra un error de xarxa o HTTP 403, consulta les dades disponibles a «Canvia de partit».':'El catàleg encara no té els codis per obrir la fitxa directa. Pots cercar el partit al portal o al selector de l’app.'):'No hi ha una font federativa identificada per a aquest partit.';
 $('editRosters').disabled=busy||!editable();$('retry').disabled=busy||!store;
 $('reopen').hidden=!s.finished;$('reopen').disabled=busy||role!=='operator'||advancedFinished;
 for(const side of ['home','away']){const tab=$(side==='home'?'tabHome':'tabAway');tab.setAttribute('aria-selected',String(activeSide===side));tab.tabIndex=activeSide===side?0:-1;tab.disabled=false;}
 $('teamList').setAttribute('aria-labelledby',activeSide==='home'?'tabHome':'tabAway');
 if(s.finished)$('federationDetails').open=true;
 renderPreparation();renderPlayers();renderHistory();renderSummary();
 const saved=store?.pending.length?`${store.pending.flat().length} anotacions pendents de sincronitzar${store.error?' · '+store.error:''}`:'Dades confirmades al servidor';
 $('status').textContent=!store?(flash||(activationNeeded?'Partit del catàleg · cal activar el desament compartit':'Selecciona un partit i inicia sessió si cal.')):`${flash?flash+' · ':''}${practiceId?'PROVA COMPARTIDA':role==='operator'?'Operador':'Només consulta'} · ${s.finished?'Registre local finalitzat':advancedFinished?'Finalitzat al Mode Avançat':setup?'Preparant convocatòries':'Registre obert'} · ${saved}${needsRosterReview()?' · Avís: convocatòria desada preservada; evidència actual incompleta.':''}`;
}
function federationText(prefix=''){
 const official=source?.official_data;
 const date=official?.fetched_at&&Number.isFinite(Date.parse(official.fetched_at))?official.fetched_at:null;
 $('federation').textContent=[prefix,date?(catalogueId&&fixture?.raw_data?.report_status!=='verified'?'Darrera lectura de calendari registrada: ':'Darrera consulta correcta de la font: ')+new Date(date).toLocaleString('ca-ES',{timeZone:'Europe/Madrid'}):'Sense consulta correcta acreditada.',official?.official_status?'Estat publicat: «'+official.official_status+'». El tancament formal no és verificable.':'Estat de l’acta desconegut o no disponible.',catalogueId?'Consulta de la importació federativa; no fa una extracció nova al portal.':source?.official_data?.source_kind==='verified_calendar'?'La font vinculada només conté calendari. Consulta les plantilles disponibles o obre el portal.':'La integració existent pot retornar memòria cau de fins a sis hores.', 'Les dades oficials absents es mostren com a «No verificable».'].filter(Boolean).join(' ');
}
async function metadata(){
 let nextSource,nextPlayers,nextFixture,nextFinished;
 if(catalogueId){
  const data=await readCatalogueFixture(db,catalogueId,!!practiceId);nextSource=data.source;nextFixture=data.fixture;nextFinished=false;
  let linked=[];
  if(!activationNeeded){const [r,clock]=await Promise.all([db.from('pilot_players').select('*').eq('match_id',match).order('dorsal'),db.from('pilot_operator_state').select('state').eq('match_id',match).maybeSingle()]);if(r.error||clock.error)throw r.error||clock.error;linked=(r.data||[]).map(p=>({...p,catalog_lineup_id:p.official_source?.split('#lineup=')[1]||null}));nextFinished=!!clock.data?.state?.finished;}
  nextPlayers=mergeRoster(linked,data.players.map(p=>({...p,needsImport:true})));
 }
 else {
  const results=await Promise.all([db.from('federation_match_sources').select('*').eq('match_id',match).maybeSingle(),db.from('pilot_players').select('*').eq('match_id',match).order('dorsal'),db.from('pilot_operator_state').select('state').eq('match_id',match).maybeSingle()]);
  for(const r of results)if(r.error)throw r.error;
  nextSource=results[0].data;
  if(!nextSource){
   const {data,error}=await db.from('pilot_matches').select('home_team,away_team').eq('id',match).maybeSingle();
   if(error)throw error;
   if(data?.home_team&&data?.away_team)nextSource={home_name:data.home_team,away_name:data.away_team};
  }
  nextPlayers=results[1].data||[];nextFinished=!!results[2].data?.state?.finished;
 }
 let enriched;
 try{enriched=await catalogueRoster(db,{players:nextPlayers,source:nextSource,fixture:nextFixture});}
 catch(e){enriched={players:mergeRoster(nextPlayers),notice:'Catàleg addicional no disponible: '+e.message+'. Es conserva la plantilla del partit; elegibilitat de reforços no verificable.'};}
 restrictedSides=enriched.restrictedSides||[];
 const names=['home','away'].filter(side=>/\bigualada\b/i.test(nextSource?.[side+'_name']||''));
 rivalSides=enriched.rivalSides??(names.length===1?['home','away'].filter(side=>side!==names[0]&&!restrictedSides.includes(side)):[]);
 nextFixture||=enriched.fixture;
 reportRow={federation:nextSource?.federation,externalCompetition:nextSource?.competition_id||enriched.competitionCode,external_match_id:nextSource?.federation_match_id||nextFixture?.external_match_id};
 source=nextSource;players=enriched.players;fixture=nextFixture;advancedFinished=nextFinished;rosterNotice=enriched.notice;federationText();
}
async function open(id){
 if(store?.pending.length)throw Error('Desa les anotacions pendents abans de canviar de partit.');
 match=id;role=null;store=null;source=null;players=[];catalogueId=null;practiceId=null;activationNeeded=false;legacyRows=[];render();
 const context=await db.from('basic_match_contexts').select('*').eq('pilot_match_id',id).maybeSingle();if(context.data){catalogueId=context.data.catalogue_match_id;practiceId=context.data.practice?catalogueId:null;}
 const member=await db.from('pilot_members').select('role').eq('match_id',match).eq('user_id',uid).maybeSingle();if(member.error)throw member.error;role=member.data?.role||null;
 await metadata();const next=new BasicStore(db,localStorage,render);await next.open(match,uid);store=next;
 draft=new Set(state().participants);preparing=!state().confirmed;activeSide='home';expandedReinforcements.clear();
 history.replaceState(null,'','?match='+encodeURIComponent(id));render();
}
async function openCatalogue(id,training){
 if(store?.pending.length)throw Error('Desa les anotacions pendents abans de canviar de partit.');
 catalogueId=id;practiceId=training?id:null;store=null;role=null;match=id;activationNeeded=true;players=[];source=null;legacyRows=[];
 let q=db.from('basic_match_contexts').select('*').eq('catalogue_match_id',id).eq('practice',training);if(training)q=q.eq('owner_id',uid);
 const context=await q.maybeSingle();
 if(context.data){match=context.data.pilot_match_id;const member=await db.from('pilot_members').select('role').eq('match_id',match).eq('user_id',uid).maybeSingle();if(member.error)throw member.error;role=member.data?.role||null;activationNeeded=role!=='operator';}
 await metadata();
 if(!training&&fixture?.raw_data?.report_status==='verified'&&fixture.raw_data?.report_data?.official_status==='FINALIZAT'){await openCatalogue(id,true);return;}
 if(context.data){const next=new BasicStore(db,localStorage,render);await next.open(match,uid);store=next;}
 if(training){const legacy=new PracticeStore(localStorage);await legacy.open(id,uid);legacyRows=legacy.all();}
 draft=new Set(state().participants);preparing=!state().confirmed;activeSide='home';expandedReinforcements.clear();
 if(!window.basicAvailableMatches?.has(id))$('match').innerHTML=`<option value="${esc(id)}">${esc(teamName('home'))} – ${esc(teamName('away'))}</option>`;
 $('fixtureNotice').textContent=(training?'PROVA COMPARTIDA · Incidències separades de l’històric. ':'Partit real del catàleg. ')+(context.error?'La persistència de catàleg necessita instal·lar la migració del Mode Base.':'Activa el registre si encara no té context operatiu.');
 history.replaceState(null,'','?'+(training?'practice':'catalogue')+'='+encodeURIComponent(id));
}
async function activateContext(){
 const members=await allRows(db,'pilot_members',q=>q.eq('user_id',uid).eq('role','operator'));
 let reference=null;
 if(members.length){const r=await db.from('federation_match_sources').select('*').in('match_id',members.map(m=>m.match_id));if(r.error)throw r.error;let comp;try{comp=new URL(fixture.raw_data.source_url).pathname.split('/').at(-1);}catch{}reference=r.data?.find(s=>s.federation==='FECAPA'&&s.competition_id===comp)?.match_id||null;}
 const r=await db.rpc('basic_open_catalogue_match',{p_catalogue:catalogueId,p_reference:reference,p_practice:!!practiceId});
 if(r.error)throw Error('No s’ha activat el registre compartit: '+r.error.message+'. Comprova la migració i els permisos.');
 if(typeof r.data!=='string')throw Error('El servidor no ha confirmat el context de partit.');
 await openCatalogue(catalogueId,!!practiceId);if(!store||activationNeeded)throw Error('No hi ha una assignació operativa confirmada.');flash='Registre compartit activat';
}
async function action(fn){if(busy)return;busy=true;flash='';render();let error;try{await fn();}catch(e){error=e;}finally{busy=false;render();}if(error){flash='No s’ha completat: '+error.message;render();}}
async function addBatch(batch){if(!editable())throw Error('No tens permís per modificar aquest registre o el partit està finalitzat.');await store.enqueue(batch);}
function actionRow(kind,team,actor=null,details={}){
 const player=actor?recordFor(actor):null;
 return makeRow({match,uid,kind,side:team,actor,details:{...details,...(player?{player_snapshot:snapshot(player)}:{})}});
}
async function confirmRosters(){
 if(!editable())throw Error('No tens permís per confirmar les convocatòries.');
 if(state().confirmed&&draft.size===state().participants.length&&state().participants.every(id=>draft.has(id))){preparing=false;flash='Convocatòria desada conservada sense canvis';return;}
 const current=rosterPlayers();
 const pool=[...current,...state().playerRecords.filter(p=>!current.some(x=>x.id===p.id))];
 const selected=pool.filter(p=>draft.has(p.id));
 const identities=selected.map(p=>p.catalog_player_id||p.federation_player_id||p.id);
 if(new Set(identities).size!==identities.length)throw Error('Un mateix jugador no pot estar convocat als dos equips.');
 const prior=new Set(state().participants);
 if(selected.some(p=>!current.some(candidate=>candidate.id===p.id)&&!prior.has(p.id)))throw Error('Desmarca els convocats anteriors que ja no consten a la plantilla filtrada. Les seves incidències es conserven.');
 const duplicates=selected.some(p=>p.selection_basis==='manual_rival'&&selected.some(other=>
  other.id!==p.id&&other.team===p.team&&Number(other.dorsal)===Number(p.dorsal)&&(!prior.has(p.id)||!prior.has(other.id))));
 if(duplicates)throw Error('Revisa la convocatòria del rival. Hi ha dos jugadors seleccionats amb el mateix dorsal.');
 if(selected.some(p=>p.selectable===false&&!prior.has(p.id)))throw Error('Hi ha un reforç sense elegibilitat verificada.');
 const converted=await materializePlayers(db,match,selected,false);
 const newIds=new Map(selected.map((p,i)=>[p.id,converted[i]]));
 players=players.map(p=>newIds.get(p.id)||p);
 const records=converted.map(snapshot);
 await addBatch([actionRow('basic_participants','none',null,{ids:records.map(p=>p.id),players:records})]);
 draft=new Set(records.map(p=>p.id));preparing=false;flash='Convocatòries confirmades';
}
function closeSheet(){if($('actionSheet').open)$('actionSheet').close();sheet=null;}
function openSheet({actor=null,team=activeSide,bench=false,eventId=null}={}){
 if(busy||!editable())return;
 if(actor&&!state().participants.includes(actor)&&!eventId)return;
 sheet={actor,team,bench,eventId};
 const row=eventId?state().active.find(r=>r.id===eventId):null;
 $('actionTitle').textContent=bench?'Banqueta '+(team==='home'?'local':'visitant'):actor?recordFor(actor)?.full_name||(row?eventName(row):'Jugador'):'Gol sense jugador identificat';
 $('actionContext').textContent=(eventId?'Correcció d’una incidència · ':'')+teamName(team);
 document.querySelectorAll('[data-action]').forEach(b=>{b.hidden=bench&&b.dataset.action==='gol';b.disabled=false;});
 $('actionSheet').showModal();
}
async function choose(kind,context){
 const {actor,team,bench,eventId}=context;
 if(bench&&kind==='gol')throw Error('La banqueta només admet targetes.');
 const row=actionRow(kind,team,actor,{bench:!!bench});
 const original=eventId?state().active.find(r=>r.id===eventId):null;
 if(eventId&&!original)throw Error('Aquesta incidència ja ha estat modificada.');
 if(original?.payload?.details?.player_snapshot&&!row.payload.details.player_snapshot)row.payload.details.player_snapshot={...original.payload.details.player_snapshot};
 const batch=original?[makeRow({match,uid,kind:'correction',related:original.id,side:original.team,details:{previous:fromRow(original),replacement:row.id}}),row]:[row];
 await addBatch(batch);flash=(original?'Incidència corregida':kind==='gol'?'Gol registrat':'Targeta '+cards[kind].toLowerCase()+' registrada')+' · '+teamName(team);
}
async function sync(){
 if(catalogueId){
  await metadata();
  federationText(fixture?.raw_data?.report_status==='verified'?'Catàleg desat rellegit. Hi ha una còpia de l’acta disponible.':'Catàleg consultat. Encara no hi ha cap acta verificada accessible.');
  return;
 }
 if(!officialReportHref(reportRow)||!source?.federation_match_id)throw Error('Falten els codis federatius del partit.');
 if(source.official_data?.source_kind==='verified_calendar')throw Error('El registre federatiu només conté calendari. Consulta el catàleg per veure si s’hi ha incorporat l’acta.');
 federationText('Consultant el servidor federatiu…');
 const result=await syncFederation(db,match,source),message=federationSyncMessage(result);
 if(result==='verified'||result==='team_verified'){
  try{await metadata();}
  catch{federationText(message+' No s’ha pogut recarregar la vista.');return;}
 }
 federationText(message);
}

function openRivalEditor(side,id){
 if(busy||!editable()||!rivalSides.includes(side))return;
 const player=manualPlayers().find(p=>p.team===side&&p.id===id);
 rivalEdit={side,id:player?.id};
 $('rivalTeam').textContent=teamName(side);
 $('rivalDorsal').value=player?.dorsal||'';
 $('rivalName').value=player?.manual_name||'';
 $('rivalError').textContent='';
 $('rivalEditor').showModal();
}
$('closeRival').onclick=()=>$('rivalEditor').close();
$('rivalForm').onsubmit=event=>{
 event.preventDefault();
 if(!rivalEdit||busy||!editable())return;
 const {side,id}=rivalEdit;
 if(!rivalSides.includes(side))return;
 let player;
 try{
  const prior=manualPlayers().find(p=>p.id===id);
  player=rivalPlayer(side,$('rivalDorsal').value,$('rivalName').value,id,(prior?.manual_revision||0)+1);
  if(rosterPlayers().some(p=>p.team===side&&p.id!==id&&(p.selection_basis==='manual_rival'||p.matchVerified||draft.has(p.id))&&Number(p.dorsal)===Number(player.dorsal)))throw Error('Ja hi ha un jugador amb aquest dorsal.');
 }catch(e){$('rivalError').textContent=e.message;return;}
 $('rivalEditor').close();
 action(async()=>{
  await addBatch([actionRow('basic_rival_player','none',null,{player})]);
  if(!id)draft.add(player.id);
  flash=store.pending.length?'Jugador provisional pendent de sincronitzar':'Jugador provisional desat';
 });
};
$('readLineups').onclick=()=>action(async()=>{
 try{
  await metadata();
  const imported=catalogueId&&fixture?.raw_data?.report_status==='verified'?source.official_data.players:
   players.filter(p=>p.matchVerified||(p.federation_active&&source?.import_status==='verified'));
  const counts=['home','away'].map(side=>imported.filter(p=>p.team===side).length);
  federationText(counts.some(Boolean)?counts.map((count,i)=>teamName(i?'away':'home')+' · '+(count?count+' jugadors de l’acta':'sense plantilla de l’acta accessible')).join('. '):'Cap plantilla de l’acta accessible al catàleg. Pots afegir dorsals provisionals a la convocatòria del rival.');
 }catch(e){federationText('Error llegint les plantilles: '+e.message);throw e;}
});

$('rosterGrid').addEventListener('click',e=>{
 const add=e.target.closest('[data-rival-side]'),edit=e.target.closest('[data-rival-edit]');
 if(add){openRivalEditor(add.dataset.rivalSide);return;}
 if(edit){const player=manualPlayers().find(p=>p.id===edit.dataset.rivalEdit);if(player)openRivalEditor(player.team,player.id);return;}
 const button=e.target.closest('[data-reinforcements]');if(!button)return;
 const side=button.dataset.reinforcements,expanded=!expandedReinforcements.has(side);
 if(expanded)expandedReinforcements.add(side);else expandedReinforcements.delete(side);
 button.setAttribute('aria-expanded',String(expanded));button.lastElementChild.textContent=expanded?' ▴':' ▾';$('reinforcements-'+side).hidden=!expanded;
});
$('rosterGrid').addEventListener('change',e=>{if(e.target.matches('[data-player]')){
 if(e.target.checked)draft.add(e.target.dataset.player);else draft.delete(e.target.dataset.player);
 for(const side of ['home','away']){const count=$('reinforcements-'+side).querySelectorAll('input:checked').length;document.querySelector('[data-reinforcement-count="'+side+'"]').textContent=selectionCount(count);}
}});
$('activateContext').onclick=()=>action(activateContext);
$('exportLegacy').onclick=()=>{const blob=new Blob([JSON.stringify({catalogue_match_id:catalogueId,origin:'legacy-device-practice',events:legacyRows},null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='clubhoquei360-prova-local-anterior.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};
$('confirmRosters').onclick=()=>action(confirmRosters);
$('editRosters').onclick=()=>{if(!editable())return;draft=new Set(state().participants);preparing=true;render();$('preparation').scrollIntoView({block:'start'});};
$('cancelPreparation').onclick=()=>{draft=new Set(state().participants);preparing=false;render();};
$('teamList').onclick=e=>{const row=e.target.closest('[data-person]');if(row)openSheet({actor:row.dataset.person});};
$('bench').onclick=()=>openSheet({bench:true});
$('unidentifiedGoal').onclick=()=>action(()=>choose('gol',{team:activeSide,actor:null,bench:false}));
$('closeSheet').onclick=closeSheet;
$('actionSheet').addEventListener('cancel',()=>{sheet=null;});
$('actionSheet').addEventListener('click',e=>{
 const button=e.target.closest('[data-action]');if(!button||!sheet||busy)return;
 const context=sheet,kind=button.dataset.action;closeSheet();action(()=>choose(kind,context));
});
$('teamTabs').addEventListener('click',e=>{const button=e.target.closest('[data-side]');if(!button)return;activeSide=button.dataset.side;render();});
$('teamTabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();activeSide=e.key==='Home'?'home':e.key==='End'?'away':activeSide==='home'?'away':'home';render();$(activeSide==='home'?'tabHome':'tabAway').focus();});
$('events').onclick=e=>{
 const edit=e.target.closest('[data-edit]'),cancel=e.target.closest('[data-cancel]');
 const row=state().active.find(r=>r.id===(edit?.dataset.edit||cancel?.dataset.cancel));if(!row)return;
 if(edit){openSheet({actor:row.payload?.actor,team:row.team,bench:!!row.payload?.details?.bench,eventId:row.id});return;}
 action(async()=>{await addBatch([makeRow({match,uid,kind:'correction',related:row.id,side:row.team,details:{previous:fromRow(row)}})]);flash='Incidència anul·lada; original conservat a l’auditoria';});
};
$('retry').onclick=()=>action(async()=>{await store.flush();await store.refresh();await metadata();flash=store.pending.length?'Encara hi ha anotacions pendents':'Registre recuperat i actualitzat';});
$('sync').onclick=()=>action(async()=>{try{await sync();}catch(e){federationText('Consulta fallida: '+e.message+'. Dades locals i darrera font correcta conservades.');throw e;}});
$('finish').onclick=()=>action(async()=>{
 await store.flush();if(store.pending.length)throw Error('Hi ha incidències pendents; reconnecta abans de finalitzar.');
 await addBatch([actionRow('basic_finished','none')]);
 if(store.pending.length)throw Error('La finalització és pendent de sincronitzar.');
 federationText('Registre local desat. Pots consultar les dades federatives amb el botó d’aquesta secció.');
 flash='Partit finalitzat localment i desat';
});
$('reopen').onclick=()=>action(async()=>{
 if(role!=='operator'||advancedFinished)throw Error('No tens permís per reobrir aquest registre.');
 await store.enqueue([actionRow('basic_reopened','none')]);flash='Registre local reobert';
});
$('match').onchange=()=>action(async()=>{const prior=match;try{const id=$('match').value;if(window.basicAvailableMatches?.get(id))await openCatalogue(id,false);else await open(id);}catch(e){$('match').value=prior;throw e;}});
window.addEventListener('online',()=>{if(store)action(()=>store.flush());});
window.addEventListener('beforeunload',e=>{if(store?.pending.length){e.preventDefault();e.returnValue='';}});
async function init(){
 const auth=await db.auth.getUser();if(auth.error)throw auth.error;if(!auth.data.user)throw Error('Inicia sessió des d’«Inici i sessió» i torna a obrir el partit.');uid=auth.data.user.id;
 if(catalogueId){await openCatalogue(catalogueId,!!requestedPractice);return;}
 const operational=await allRows(db,'pilot_matches');let catalogue=[];
 try{catalogue=(await allRows(db,'federation_matches')).filter(m=>{try{return ['hoqueipatins.fecapa.cat','www.hoqueipatins.fecapa.cat'].includes(new URL(m.raw_data?.source_url).hostname);}catch{return false;}});}catch(e){$('fixtureNotice').textContent='Catàleg federatiu no disponible: '+e.message;}
 const ids=new Set(operational.map(m=>m.id));const matches=[...operational,...catalogue.filter(m=>!ids.has(m.id)).map(m=>({id:m.id,title:m.home_team+' – '+m.away_team+' · catàleg',starts_at:m.federation_start_at,_catalogue:true}))];
 window.basicAvailableMatches=new Map(matches.map(m=>[m.id,m._catalogue]));
 $('match').innerHTML=matches.map(m=>`<option value="${esc(m.id)}">${esc(m.title)}${m.starts_at?' · '+esc(new Date(m.starts_at).toLocaleDateString('ca-ES',{timeZone:'Europe/Madrid'})):''}</option>`).join('');
 $('fixtureNotice').textContent='Partits operatius i catàleg federatiu accessible. L’activació de nous registres manté els permisos d’operador existents.';
 const requested=new URLSearchParams(location.search).get('match');
 if(requested&&!matches.some(m=>m.id===requested))throw Error('El partit sol·licitat no està activat o no és accessible amb aquest usuari.');
 const id=requested;if(!id){location.replace('./partit.html?mode=base');return;}$('match').value=id;if(window.basicAvailableMatches.get(id))await openCatalogue(id,false);else await open(id);
}
if(new URLSearchParams(location.search).get('match')||catalogueId)action(init);
