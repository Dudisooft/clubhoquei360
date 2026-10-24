// One match-local editor for both modes; historical incidents keep their UUIDs.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const provisional=p=>!p.federation_player_id&&!String(p.official_source||'').includes('#lineup=');
export const identityLabel=p=>provisional(p)?'Provisional · no verificat':'Identitat federativa · convocatòria no certificada';
export function rosterRequest(match,player,mutation=crypto.randomUUID()) {return {p_match:match,p_mutation:mutation,p_player:player};}
export async function saveRoster(db,request){const r=await db.rpc('match_roster_save',request);if(r.error)throw r.error;if(!r.data?.id)throw Error('El servidor no ha confirmat el jugador.');return r.data;}
export function mountMatchRoster({db,root,onSaved=async()=>{},storage=localStorage}){
 let context=null,data={players:[],candidates:[],write_sides:[],editable_ids:[]},busy=false,generation=0;
 root.classList.add('match-roster');
 root.innerHTML=`<button type="button" data-complete-roster>Completa plantilla manualment</button><span data-roster-status role="status"></span><dialog data-roster-dialog aria-label="Completa plantilla manualment"><form data-roster-form><h2>Completa plantilla manualment</h2><p>Introdueix només dades conegudes. Els jugadors manuals són provisionals, no verificats. Pots corregir-los i vincular-los després amb una font oficial sense perdre incidències.</p><label>Equip<select data-roster-side></select></label><label>Jugador<select data-roster-person></select></label><label>Font oficial per incorporar o vincular<select data-roster-candidate></select></label><label>Nom i cognoms<input data-roster-name maxlength="120" autocomplete="off" required></label><label>Dorsal<input data-roster-shirt inputmode="numeric" pattern="[0-9]{1,3}" maxlength="3"></label><label>Posició<select data-roster-position><option value="field">Pista</option><option value="goalkeeper">Porter</option></select></label><div class="roster-toolbar"><button type="submit" data-roster-save>Desa jugador</button><button type="button" data-roster-refresh>Actualitza fonts</button><button type="button" data-roster-close>Tanca</button></div><p data-roster-message role="status"></p><div class="roster-toolbar"><button type="button" data-roster-retry hidden>Reintenta desament pendent</button><button type="button" data-roster-discard hidden>Descarta petició pendent</button></div></form></dialog>`;
 const $=name=>root.querySelector('[data-roster-'+name+']'),button=root.querySelector('[data-complete-roster]');
 const key=()=>`ch360_match_roster_${context.uid}_${context.match}`;
 const pending=()=>{try{return JSON.parse(storage.getItem(key())||'null');}catch{return null;}};
 const tell=text=>{$('message').textContent=text;$('status').textContent=text;};
 const person=()=>data.players.find(p=>p.id===$('person').value);
 function lock(){const wait=!!context&&!!pending();for(const el of root.querySelectorAll('input,select,button'))el.disabled=busy||(wait&&!el.matches('[data-roster-retry],[data-roster-discard],[data-roster-close],[data-complete-roster]'));$('retry').hidden=!wait;$('discard').hidden=!wait;button.disabled=busy||!context||(!wait&&!data.write_sides.length&&!data.editable_ids.length);}
 function fields(){const p=person(),c=data.candidates.find(c=>c.candidate_id===$('candidate').value);$('name').value=c?.full_name||p?.full_name||'';$('shirt').value=p?.dorsal??c?.dorsal??'';$('position').value=p?.position||c?.position||'field';$('name').readOnly=!!c||!!p?.federation_player_id;$('shirt').required=!c&&!p?.federation_player_id;tell(p?identityLabel(p):'Nou jugador provisional · dorsal i nom obligatoris.');lock();}
 function choices(){const side=$('side').value,old=$('person').value;
  $('person').innerHTML=(data.write_sides.includes(side)?'<option value="">Nou jugador</option>':'')+data.players.filter(p=>p.team===side&&p.federation_active!==false&&data.editable_ids.includes(p.id)).map(p=>`<option value="${esc(p.id)}">${esc(p.dorsal?'#'+p.dorsal+' · ':'')}${esc(p.full_name)} · ${esc(identityLabel(p))}</option>`).join('');
  if([...$('person').options].some(o=>o.value===old))$('person').value=old;
  $('candidate').innerHTML='<option value="">Entrada manual / mantén identitat actual</option>'+data.candidates.filter(c=>c.team===side).map(c=>`<option value="${esc(c.candidate_id)}">${esc(c.full_name)} · codi ${esc(c.federation_player_id||'no publicat')}</option>`).join('');fields();
 }
 async function refresh(){const target=context,token=generation;const r=await db.rpc('match_roster',{p_match:target.match});if(token!==generation||target!==context)return;if(r.error)throw r.error;data=r.data;const side=$('side').value;
  const sides=['home','away'].filter(s=>data.write_sides.includes(s)||data.players.some(p=>p.team===s&&data.editable_ids.includes(p.id)));
  $('side').innerHTML=sides.map(s=>`<option value="${s}">${esc(context.teamNames[s])}</option>`).join('');$('side').value=sides.includes(side)?side:sides.includes('away')?'away':sides[0]||'';choices();lock();
 }
 async function send(request){if(busy||!request||request.p_match!==context.match)return;const token=generation;busy=true;lock();tell('Desant jugador…');
  try{const saved=await saveRoster(db,request);if(token!==generation)return;storage.removeItem(key());await onSaved(saved);if(token!==generation)return;await refresh();$('person').value=saved.id;fields();tell('Jugador desat. '+identityLabel(saved)+'. Incidències conservades.');}
  catch(e){if(token!==generation)return;if(e.code)storage.removeItem(key());const text=e.message||String(e);tell(e.code==='40001'?'Un altre dispositiu ha modificat el jugador. Actualitza les fonts i revisa els camps.':text.includes('Shirt belongs')?'Aquest dorsal ja correspon a un altre jugador. Revisa la identitat.':text.includes('already has a match record')?'Aquest jugador oficial ja té un registre al partit. Les dues identitats es conserven: cal revisar-les abans d’unificar-les.':'No s’ha completat: '+text+(e.code?'':' · Petició conservada per reintentar.'));}
  finally{if(token===generation){busy=false;lock();}}
 }
 button.onclick=()=>{if(!context)return;$('dialog').showModal();if(pending())tell('Recupera o descarta la petició pendent abans de continuar.');};
 $('close').onclick=()=>$('dialog').close();$('side').onchange=choices;$('person').onchange=fields;$('candidate').onchange=fields;
 $('refresh').onclick=async()=>{try{await refresh();tell('Fonts importades actualitzades. No es modifica cap incidència.');}catch(e){tell('No s’han actualitzat les fonts: '+e.message);}};
 $('retry').onclick=()=>send(pending());$('discard').onclick=()=>{storage.removeItem(key());lock();tell('Petició descartada. Si el servidor ja l’havia desat, el jugador es recuperarà en actualitzar les fonts.');};
 $('form').onsubmit=e=>{e.preventDefault();if(busy||pending())return;const p=person(),candidate=$('candidate').value;
  const input={id:p?.id||crypto.randomUUID(),revision:p?.roster_revision??(p?1:0),team:$('side').value,manual:true,full_name:$('name').value.trim(),dorsal:$('shirt').value.trim()||null,position:$('position').value,...(candidate?{candidate_id:candidate}:{})};
  const request=rosterRequest(context.match,input);try{storage.setItem(key(),JSON.stringify(request));}catch{tell('No es pot conservar la petició. Revisa l’emmagatzematge del navegador.');return;}send(request);
 };
 button.disabled=true;
 return {async open(next){const token=++generation;context=next;busy=false;if($('dialog').open)$('dialog').close();try{await refresh();if(token!==generation)return;if(pending())tell('Hi ha un jugador pendent de confirmació; obre la plantilla per reintentar.');}catch(e){if(token===generation){button.disabled=true;tell('Editor de plantilla no disponible: '+e.message);}}},reset(){generation++;context=null;data={players:[],candidates:[],write_sides:[],editable_ids:[]};button.disabled=true;if($('dialog').open)$('dialog').close();}};
}
