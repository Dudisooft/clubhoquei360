/* Match call-up preparation. Season candidates never become match participants
 * until an authorized operator explicitly saves them on the server. */
export function mountRoster({db,root,getState,getRevision,onSaved,onChange}){
 let context=null,candidates=[],available=false,prepared=false,busy=false,generation=0;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key=(suffix,c=context)=>`ch360_preparation_${c.uid}_${c.match}_${suffix}`;
 function read(suffix){try{return JSON.parse(localStorage.getItem(key(suffix))||'null');}catch{return null;}}
 function write(suffix,value){if(value===null)localStorage.removeItem(key(suffix));else localStorage.setItem(key(suffix),JSON.stringify(value));}
 function message(text){const el=root.querySelector('[data-roster-message]');if(el)el.textContent=text;}
 function draw(){
  root.hidden=!available;if(!available)return;
  const started=getState().matchStarted||getState().sec>0||getState().finished;
  root.innerHTML='<h3>Convocatòria del partit</h3><p class="muted">Afegeix els convocats i després marca els cinc titulars a sota. El catàleg és de temporada: no acredita la convocatòria ni l’elegibilitat d’avui. Les incorporacions manuals queden identificades com a registre de l’operador; l’acta RFEP continua pendent.</p><div class="roster-preparation-teams">'+['home','away'].map(side=>{
   const saved=getState().players.filter(p=>p.side===side),pool=candidates.filter(p=>p.team===side);
   return '<section data-roster-team="'+side+'"><h4>'+esc(context.teamNames[side])+'</h4><p>'+saved.length+' jugadors desats a la convocatòria</p>'+(pool.length?'<details><summary>Tria del catàleg de temporada ('+pool.length+')</summary><div class="roster-candidates">'+pool.map(p=>{
    const added=saved.some(x=>x.federation_player_id===p.federation_player_id);
    return '<div class="roster-candidate" data-roster-id="'+esc(p.roster_id)+'"><label><input type="checkbox" data-candidate '+(added?'checked disabled':'')+'><span>'+esc(p.full_name)+(added?' · desat':'')+'</span></label><label>Dorsal<input data-shirt inputmode="numeric" maxlength="3" value="'+esc(p.dorsal)+'" aria-label="Dorsal de '+esc(p.full_name)+'"></label><label>Posició<select data-position aria-label="Posició de '+esc(p.full_name)+'"><option value="field">Pista</option><option value="goalkeeper" '+(p.position==='goalkeeper'?'selected':'')+'>Porter</option></select></label></div>';
   }).join('')+'</div><button type="button" data-add-candidates>Afegeix els seleccionats a la convocatòria</button></details>':'<p class="muted">Sense plantilla de temporada importada. Introdueix només jugadors reals coneguts.</p>')+
   '<details><summary>Afegeix un jugador real manualment</summary><div class="roster-manual"><label>Nom i cognoms<input data-manual-name maxlength="120" autocomplete="off"></label><label>Dorsal, si es coneix<input data-manual-shirt inputmode="numeric" maxlength="3"></label><label>Posició<select data-manual-position><option value="field">Pista</option><option value="goalkeeper">Porter</option></select></label><button type="button" data-add-manual>Desa jugador real</button></div></details>'+
   (saved.length?'<details data-edit-callups><summary>Revisa dorsals i porters dels convocats</summary>'+saved.map(p=>'<div class="roster-candidate" data-edit-player="'+esc(p.id)+'"><span>'+esc(p.name)+'</span><label>Dorsal<input data-shirt inputmode="numeric" maxlength="3" value="'+esc(p.num)+'"></label><label>Posició<select data-position><option value="field">Pista</option><option value="goalkeeper" '+(p.goalie?'selected':'')+'>Porter</option></select></label></div>').join('')+'<button type="button" data-save-callups>Desa dorsals i posicions</button></details>':'')+'</section>';
  }).join('')+'</div><p data-roster-message role="status" aria-live="polite"></p><button type="button" data-roster-retry hidden>Reintenta el desament pendent</button>';
  root.querySelectorAll('[data-roster-team]').forEach(section=>{
   const side=section.dataset.rosterTeam;
   section.querySelector('[data-add-candidates]')?.addEventListener('click',()=>{
    const players=[...section.querySelectorAll('[data-candidate]:checked:not(:disabled)')].map(input=>{const row=input.closest('[data-roster-id]');return {team:side,roster_id:row.dataset.rosterId,dorsal:row.querySelector('[data-shirt]').value,position:row.querySelector('[data-position]').value};});
    if(!players.length){message('Selecciona almenys un jugador del catàleg.');return;}savePlayers(players);
   });
   section.querySelector('[data-add-manual]').onclick=()=>{
    const name=section.querySelector('[data-manual-name]').value.trim();if(!name){message('Escriu el nom real del jugador.');return;}
    savePlayers([{team:side,manual:true,full_name:name,dorsal:section.querySelector('[data-manual-shirt]').value,position:section.querySelector('[data-manual-position]').value}]);
   };
   section.querySelector('[data-save-callups]')?.addEventListener('click',()=>savePlayers([...section.querySelectorAll('[data-edit-player]')].map(row=>({team:side,player_id:row.dataset.editPlayer,dorsal:row.querySelector('[data-shirt]').value,position:row.querySelector('[data-position]').value}))));
  });
  root.querySelectorAll('input,select,button').forEach(el=>{if(started||busy)el.disabled=true;});
  const retry=root.querySelector('[data-roster-retry]');retry.hidden=!read('request');retry.disabled=busy;retry.onclick=()=>run(read('request'));
  if(read('request'))message('Hi ha un desament sense confirmació. Reintenta’l per recuperar el resultat sense duplicar jugadors ni alineacions.');
  if(started)message('Convocatòria inicial tancada perquè el partit ja ha començat.');
 }
 async function run(request){
  if(!context||!request||busy)return;const token=generation;busy=true;onChange();draw();message('Desant…');
  try{
   const result=await db.rpc(request.command,request.args);if(result.error)throw result.error;if(token!==generation)return;
   write('request',null);if(request.command==='pilot_confirm_lineup')write('draft',null);
   await onSaved(result.data,request.command);if(token!==generation)return;
   message(request.command==='pilot_confirm_lineup'?'Cinc inicial confirmat i desat.':'Convocats desats. Ja els pots seleccionar a sota.');
  }catch(error){
   if(token!==generation)return;
   // PostgreSQL rejected the transaction: it is safe to correct the form.
   // Transport failures retain the original UUID/body for an idempotent retry.
   if(error.code)write('request',null);
   if(error.code==='40001')await onSaved(null,'conflict');
   const explanation=error.message?.includes('Shirt belongs')?'Aquest dorsal ja correspon a un altre jugador. Revisa’l.':error.message?.includes('One goalkeeper')?'Cal un porter i quatre jugadors de pista per equip.':error.code==='40001'?'Un altre dispositiu ha canviat la preparació. S’ha recuperat la versió desada.':error.message;
   draw();message('No s’ha pogut desar: '+explanation+(error.code?'':' · Reintenta el desament pendent quan torni la connexió.'));
  }finally{if(token===generation){busy=false;root.querySelectorAll('button,input,select').forEach(el=>{if(!getState().matchStarted&&!getState().finished)el.disabled=false;});root.querySelectorAll('[data-candidate]').forEach(el=>{const id=el.closest('[data-roster-id]').dataset.rosterId;const p=candidates.find(x=>x.roster_id===id);if(getState().players.some(x=>x.side===p.team&&x.federation_player_id===p.federation_player_id))el.disabled=true;});const retry=root.querySelector('[data-roster-retry]');if(retry){retry.hidden=!read('request');retry.disabled=false;}onChange();}}
 }
 function submit(command,args){
  if(!available||busy||read('request')){message('Resol primer el desament pendent.');return;}
  const request={command,args:{...args,p_match:context.match,p_mutation:crypto.randomUUID()}};
  try{write('request',request);}catch{message('No es pot conservar la còpia local del desament. Revisa l’emmagatzematge del navegador.');return;}
  return run(request);
 }
 function savePlayers(players){return submit('pilot_prepare_players',{p_players:players});}
 return {
  get available(){return available;},get prepared(){return prepared;},get busy(){return busy;},
  reset(){generation++;context=null;available=false;prepared=false;busy=false;root.hidden=true;root.replaceChildren();},
  async open(next){
   if(!context||context.match!==next.match||context.uid!==next.uid){generation++;busy=false;}context=next;const token=generation;
   available=false;prepared=false;root.hidden=true;if(!next.enabled)return;
   const result=await db.rpc('pilot_roster_catalogue',{p_match:next.match});if(token!==generation)return;
   if(result.error){root.hidden=false;root.textContent='Preparació no disponible: '+result.error.message;return;}
   candidates=result.data.candidates||[];prepared=!!result.data.prepared;available=true;draw();onChange();
  },
  rememberDraft(){if(!context||!available||getState().startersConfirmed)return;try{write('draft',{starterSelections:getState().starterSelections,kits:getState().kits});}catch{message('La selecció provisional no s’ha pogut conservar en aquest navegador.');}},
  restoreDraft(){if(!context||!available||getState().startersConfirmed)return;const draft=read('draft');if(!draft)return;const state=getState();for(const side of ['home','away']){state.starterSelections[side]=(draft.starterSelections?.[side]||[]).filter(id=>state.players.some(p=>p.id===id&&p.side===side));for(const role of ['player','goalie'])if(['first','second'].includes(draft.kits?.[side]?.[role]))state.kits[side][role]=draft.kits[side][role];}},
  confirm(state){return submit('pilot_confirm_lineup',{p_revision:getRevision(),p_state:state});}
 };
}
