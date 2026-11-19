import {predictRoster,proposalLabel} from './roster-prediction.js';
import {callupMessage,whatsappHref} from './callup-message.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountCallupWorkflow({root,db,detail,onReload,canEdit,canImport,disabled=false}){
 root.replaceChildren();
 if(!detail.workflow_supported||disabled)return;
 let busy=false;
 const f=detail.fixture,published=detail.callup?.published;
 async function mutate(name,args){
  if(busy)return;busy=true;root.inert=true;
  try{const r=await db.rpc(name,args);if(r.error)throw r.error;await onReload();}
  catch(error){root.querySelector('[data-workflow-status]').textContent=error.message||'No s’ha pogut desar.';}
  finally{busy=false;root.inert=false;}
 }
 root.innerHTML='<p data-workflow-status role="status"></p>';
 if(canEdit){
  const proposals=predictRoster({...detail.evidence,internal:detail.candidates});
  const article=document.createElement('article');
  article.innerHTML='<h2>Propostes basades en l’historial</h2><p>No són convocats confirmats ni acrediten elegibilitat. Revisa la pertinença actual abans d’incorporar-los. Les coincidències de nom no es fusionen.</p>'+
   (proposals.length?'<ul>'+proposals.map(p=>'<li>'+esc(p.full_name)+' · '+esc(proposalLabel(p))+' · '+p.appearances+'/'+p.total_reports+' actes · '+esc(({high:'Confiança alta',medium:'Confiança mitjana',low:'Confiança baixa',current_official:'Acta actual',verified_internal:'Plantilla interna verificada'})[p.confidence])+' · '+esc(p.last_seen?new Date(p.last_seen).toLocaleDateString('ca-ES'):'Plantilla interna verificada')+
    (p.duplicate_warning?' · Possible coincidència de nom':'')+(p.internal_id?' · Disponible a la plantilla':canImport?(!p.position?'<label>Posició pendent de verificar<select data-position="'+esc(p.player_id)+'"><option value="">Tria la posició verificada</option><option value="field">Pista</option><option value="goalkeeper">Porteria</option></select></label>':'')+'<button type="button" data-adopt="'+esc(p.player_id)+'">Valida i incorpora a la plantilla interna</button>':' · Pendent de validació de plantilla')+
    '<details><summary>Procedència</summary><ul>'+p.sources.map(s=>'<li>'+esc(s.kind==='internal_published_callup'?'Convocatòria interna publicada':'Acta federativa')+' · '+esc(s.match_id||'Plantilla interna')+' · '+esc(s.at||'')+'</li>').join('')+'</ul></details></li>').join('')+'</ul>':'<p>Sense actes anteriors verificades accessibles per proposar jugadors.</p>');
  root.append(article);
  article.querySelectorAll('[data-adopt]').forEach(b=>b.onclick=()=>{
   if(!window.confirm('Confirmes que aquest jugador pertany actualment a aquest equip del club? La proposta històrica no acredita elegibilitat.'))return;
   mutate('accept_callup_proposal',{p_fixture:f.fixture_id,p_team:f.team_id,p_player:b.dataset.adopt,p_confirmed:true,p_position:article.querySelector('[data-position="'+b.dataset.adopt+'"]')?.value||null});
  });
 }
 if(published){
  const receipts=detail.receipts||[],mine=detail.can_acknowledge;
  const article=document.createElement('article');
  article.innerHTML='<h2>Lectura del delegat</h2><p>'+ (receipts.length?'Llegida pel delegat · '+esc(new Date(receipts[0].read_at).toLocaleString('ca-ES')):'Pendent de lectura')+'</p><p>Versió '+esc(detail.callup.revision)+'. La lectura no acredita que s’hagi compartit la informació.</p>'+
   (mine?'<button type="button" data-read>He llegit la convocatòria</button>':'');
  root.append(article);
  const button=article.querySelector('[data-read]');
  if(button)button.onclick=()=>mutate('acknowledge_callup',{p_fixture:f.fixture_id,p_team:f.team_id,p_revision:detail.callup.revision});
 }
 if(!published&&!canEdit)return;
 const article=document.createElement('article');
 const values={...f,...detail.message_fields,...detail.preferences};
 const controls=[['team_name','Equip'],['round','Jornada'],['competition_name','Competició'],['venue','Pavelló'],['maps_url','Google Maps'],['address','Adreça confirmada'],['kit','Equipació'],['street','Roba de carrer'],['meeting','Hora de trobada (si es vol ajustar)']];
 article.innerHTML='<h2>Missatge per WhatsApp</h2><p>Informació del partit, sense llista nominal de jugadors. Revisa els camps i el text abans de compartir.</p><details data-message-settings><summary>Revisa les dades i l’equipació</summary><div class="message-fields">'+controls.map(([key,label])=>'<label>'+label+'<input data-field="'+key+'" value="'+esc(values[key]||'')+'" maxlength="500"></label>').join('')+
  '<label>Marge habitual abans del partit (minuts)<input data-field="margin_minutes" type="number" min="0" max="240" value="'+esc(values.margin_minutes??'')+'"></label></div>'+
  '<label><input type="checkbox" data-field="maps_verified" '+(values.maps_verified?'checked':'')+'> He verificat l’enllaç exacte de Google Maps</label>'+
  '<label><input type="checkbox" data-field="address_verified" '+(values.address_verified?'checked':'')+'> He verificat l’adreça del pavelló</label>'+
  '<label><input type="checkbox" data-field="provisional" '+(values.provisional?'checked':'')+'> Data o hora provisionals</label>'+
  '<button type="button" data-regenerate>Actualitza la previsualització</button>'+
  (canEdit?'<button type="button" data-preferences>Desa les preferències d’aquest equip</button>':'')+
  '</details><p data-message-warnings class="warning" role="status" hidden></p>'+
  '<label>Previsualització editable<textarea data-message rows="18" maxlength="12000"></textarea></label>'+
  '<button type="button" class="primary" data-share>Copiar i obrir WhatsApp</button><a data-whatsapp target="_blank" rel="noopener noreferrer" hidden>Obre WhatsApp amb aquest text</a><p data-copy-status role="status"></p>';
 root.append(article);
 const field=key=>article.querySelector('[data-field="'+key+'"]');
 function read(){const input={...values};for(const [key] of controls)input[key]=field(key).value;
  input.margin_minutes=field('margin_minutes').value===''?null:Number(field('margin_minutes').value);
  for(const key of ['maps_verified','address_verified','provisional'])input[key]=field(key).checked;
  if(!input.meeting)delete input.meeting;return input;
 }
 function generate(){const r=callupMessage(read());article.querySelector('[data-message]').value=r.text;const warning=article.querySelector('[data-message-warnings]');warning.textContent=r.warnings.join(' · ');warning.hidden=!r.warnings.length;if(r.warnings.some(w=>!w.includes('provisionals')))article.querySelector('[data-message-settings]').open=true;article.querySelector('[data-whatsapp]').hidden=true;}
 generate();article.querySelector('[data-regenerate]').onclick=generate;
 if(canEdit)article.querySelector('[data-preferences]').onclick=()=>{
  const data=read(),preferences={kit:data.kit,street:data.street};
  if(data.margin_minutes!==null)preferences.margin_minutes=data.margin_minutes;
  mutate('save_callup_preferences',{p_team:f.team_id,p_revision:detail.preferences_revision||0,p_preferences:preferences});
 };
 article.querySelector('[data-share]').onclick=async()=>{
  const text=article.querySelector('[data-message]').value,link=article.querySelector('[data-whatsapp]'),status=article.querySelector('[data-copy-status]');
  if(!text.trim())return;
  link.href=whatsappHref(text);link.hidden=false;
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);
   status.textContent='Text copiat. Si WhatsApp no s’obre, utilitza l’enllaç. Tria el destinatari; el missatge no s’envia automàticament.';
   window.open(link.href,'_blank','noopener,noreferrer');
  }catch{const area=article.querySelector('[data-message]');area.focus();area.select();status.textContent='Còpia manual: copia el text seleccionat i utilitza l’enllaç per obrir WhatsApp. No s’ha enviat cap missatge.';}
 };
}
