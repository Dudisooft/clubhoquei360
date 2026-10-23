import {db} from './app-client.js';
const $=id=>document.getElementById(id);
let token=null,email='',busy=false,generation=0;
function message(text,error=false){$('guestState').textContent=text;$('guestState').dataset.error=String(error);}
// Keep the acceptance secret only in memory, including when a user opens another
// invitation in the same tab (fragment navigation does not reload the module).
function receive(){
 generation++;busy=false;token=new URLSearchParams(location.hash.slice(1)).get('invite');email='';
 if(location.hash)history.replaceState(null,'',location.pathname+location.search);
 $('guestEmail').disabled=false;$('guestEmail').value='';$('guestCode').value='';$('guestCodeForm').hidden=$('guestOpen').hidden=true;$('guestEmailForm').hidden=false;$('guestRequest').disabled=$('guestVerify').disabled=false;
 if(token&&!/^[a-f0-9]{64}$/.test(token)){token=null;message('Enllaç no vàlid. Demana’n un altre al superoperador.',true);$('guestEmailForm').hidden=true;}
 else message('Introdueix el correu autoritzat.');
}
receive();window.addEventListener('hashchange',receive);
const run=fn=>async e=>{e.preventDefault();if(busy)return;const current=generation;busy=true;$('guestRequest').disabled=$('guestVerify').disabled=true;try{await fn(current);}catch(e){if(current===generation)message(e.message||String(e),true);}finally{if(current===generation){busy=false;$('guestRequest').disabled=$('guestVerify').disabled=false;}}};
$('guestEmailForm').onsubmit=run(async current=>{email=$('guestEmail').value.trim().toLowerCase();const r=await db.functions.invoke('temporary-access',{body:{action:'request-code',email,token}});if(current!==generation)return;if(r.error)throw Error('No s’ha pogut sol·licitar el codi. Comprova l’enllaç o contacta amb el superoperador.');if(r.data?.error)throw Error(r.data.error);message(r.data.message);$('guestEmail').disabled=true;$('guestCodeForm').hidden=false;});
$('guestCodeForm').onsubmit=run(async current=>{const acceptanceToken=token,r=await db.auth.verifyOtp({email,token:$('guestCode').value.trim(),type:'email'});if(current!==generation)return;$('guestCode').value='';if(r.error)throw Error('No s’ha pogut verificar el codi. Comprova’l o demana’n un altre.');
 if(acceptanceToken){const accepted=await db.rpc('temporary_accept',{p_token:acceptanceToken});if(current!==generation)return;if(accepted.error)throw Error('Invitació caducada, revocada, consumida o amb un altre destinatari. Demana al superoperador que la revisi.');token=null;}
 else{const active=await db.rpc('temporary_touch');if(current!==generation)return;if(active.error||active.data!==true)throw Error('No hi ha cap accés temporal vigent per a aquest correu.');}
 $('guestEmailForm').hidden=$('guestCodeForm').hidden=true;$('guestOpen').hidden=false;message('Correu verificat. Accés limitat als permisos i a la caducitat de la invitació.');});
$('guestChange').onclick=()=>{if(busy)return;$('guestEmail').disabled=false;$('guestCode').value='';$('guestCodeForm').hidden=true;$('guestEmail').focus();message('Introdueix el correu destinatari correcte.');};
