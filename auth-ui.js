import {db} from './app-client.js';
const $=id=>document.getElementById(id);
async function refresh(){
 const response=await db.auth.getUser();const user=response.data.user;
 $('authForm').hidden=!!user;$('authSignOut').hidden=!user;$('authOpenMatch').hidden=!user;
 $('authState').textContent=user?'Sessió iniciada: '+user.email:'Inicia sessió amb el teu compte autoritzat del club.';
}
$('authForm').onsubmit=async e=>{
 e.preventDefault();$('authSubmit').disabled=true;$('authState').textContent='Comprovant l’accés…';
 try{const r=await db.auth.signInWithPassword({email:$('authEmail').value.trim(),password:$('authPassword').value});$('authPassword').value='';if(r.error)throw r.error;await refresh();}
 catch(err){$('authState').textContent='No s’ha pogut iniciar sessió: '+err.message;}
 finally{$('authSubmit').disabled=false;}
};
$('authSignOut').onclick=async()=>{const r=await db.auth.signOut();if(r.error)$('authState').textContent=r.error.message;else await refresh();};
refresh().catch(e=>$('authState').textContent='Accés no disponible: '+e.message);
