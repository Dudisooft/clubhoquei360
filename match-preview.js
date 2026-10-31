import {db} from './app-client.js';
import {readModeAccess,modeAllowed,activateCatalogue} from './match-mode-access.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),catalogue=params.get('catalogue'),mode=params.get('mode')==='base'?'base':'advanced';
let access;
const href=id=>'./'+(mode==='base'?'base':'avancat')+'.html?match='+encodeURIComponent(id);
(async()=>{
 const auth=await db.auth.getUser();if(auth.error)throw auth.error;if(!auth.data.user)throw Error('Inicia sessió al Dashboard.');
 access=await readModeAccess(db,{catalogue});if(!modeAllowed(access,mode))throw Error(access.read?'Aquest mode no està autoritzat per a la categoria i el teu rol.':'No tens accés al partit sol·licitat.');
 const r=await db.from('federation_matches').select('*').eq('id',catalogue).maybeSingle();if(r.error)throw r.error;if(!r.data)throw Error('El partit no és accessible.');
 const f=r.data;$('fixtureTitle').textContent=f.home_team+' – '+f.away_team;
 $('fixtureDetails').textContent=(f.federation_start_at?new Date(f.federation_start_at).toLocaleString('ca-ES',{timeZone:'Europe/Madrid'}):'Data pendent')+' · Mode '+(mode==='base'?'Base':'Avançat')+' · '+(f.home_score!=null&&f.away_score!=null?'Resultat publicat '+f.home_score+'–'+f.away_score:Date.parse(f.federation_start_at)>Date.now()?'Partit futur':'Sense resultat publicat / estat en curs no acreditat');
 $('previewStatus').textContent=access.operational?'El partit té context operatiu. La consulta no el modifica.':'Calendari federatiu disponible. Encara no hi ha context operatiu; el fet de ser futur no impedeix consultar-lo.';
 if(access.operational&&access.operational_read&&(mode!=='advanced'||access.advanced_context_ready!==false)){$('openExisting').href=href(access.operational);$('openExisting').hidden=false;}
 if(access['activate_'+mode]){if(access.finalized){$('activateMatch').textContent='Inicia una anàlisi separada del partit finalitzat';$('activationNote').textContent='Acció explícita: prepara un context separat per preservar l’acta finalitzada.';}else if(access.operational&&access.operational_read&&(mode!=='advanced'||access.advanced_context_ready!==false)){$('activateMatch').hidden=true;return;}else if(access.operational&&mode==='advanced'&&access.advanced_context_ready===false){$('activateMatch').textContent='Prepara el context del Mode Avançat';$('activationNote').textContent='Completa explícitament el context existent; les convocatòries i incidències es conserven.';}else $('activationNote').textContent='L’activació comprova els permisos al servidor i reutilitza el context existent. No importa jugadors ni crea incidències.';$('activateMatch').hidden=false;}
 else $('activationNote').textContent='Consulta disponible. L’activació necessita una assignació operativa autoritzada; no es concedeixen permisos en obrir aquesta pantalla.';
})().catch(e=>{$('previewStatus').textContent=e.message;$('activateMatch').hidden=true;$('openExisting').hidden=true;});
$('activateMatch').onclick=async()=>{if($('activateMatch').disabled)return;$('activateMatch').disabled=true;try{const id=await activateCatalogue(db,{catalogue,mode,practice:access.finalized===true});location.href=href(id);}catch(e){$('previewStatus').textContent=e.message;$('activateMatch').disabled=false;}};
