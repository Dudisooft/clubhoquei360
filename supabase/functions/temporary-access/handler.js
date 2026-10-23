/* No request bodies, tokens, OTPs or credentials may be logged. Dependencies are
 * injected so endpoint behavior is tested without sending real mail. */
const tokenFormat=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
export function createTemporaryAccessHandler({service,callerClient,publicAuth,deliverInvitation,invitationBaseUrl,rateSalt,allowedOrigin,otpReady=false,smtpReady=false}){
 return async request=>{
  const headers={'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':allowedOrigin,'access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS','vary':'Origin'};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(request.headers.get('origin')&&request.headers.get('origin')!==allowedOrigin)return reply({error:'Origen no autoritzat.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Mètode no admès.'},405);
  try{
   const raw=await request.text();if(raw.length>4096)return reply({error:'Petició massa gran.'},413);
   let body;try{body=JSON.parse(raw);}catch{return reply({error:'Petició no vàlida.'},400);}
   if(body.action==='request-code'){
    if(!otpReady)return reply({error:'La verificació de correu encara no està configurada. Contacta amb el superoperador.'},503);
    const email=String(body.email||'').trim().toLowerCase(),token=body.token??null;
    if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||(token!==null&&!tokenFormat(token)))return reply({error:'Correu o enllaç no vàlid.'},400);
    const address=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rateSalt+':'+address))),b=>b.toString(16).padStart(2,'0')).join('');
    const reserved=await service.rpc('temporary_reserve_email',{p_email:email,p_token:token,p_address_hash:hash});
    if(reserved.error)throw reserved.error;
    if(reserved.data?.allowed){
     if(reserved.data.needs_identity){const r=await service.auth.admin.createUser({email:reserved.data.email,email_confirm:false});if(r.error&&r.error.code!=='email_exists')throw r.error;}
     const result=await publicAuth.signInWithOtp({email:reserved.data.email,options:{shouldCreateUser:false}});if(result.error)throw result.error;
    }
    return reply({message:'Si les dades corresponen a una invitació vàlida i no se supera el límit d’intents, rebràs un codi al correu.'});
   }
   const jwt=request.headers.get('authorization')?.replace(/^Bearer /i,'');if(!jwt)return reply({error:'Inicia sessió amb el compte autoritzat.'},401);
   const caller=callerClient(jwt),user=await caller.auth.getUser(jwt);if(user.error||!user.data?.user)return reply({error:'Sessió no vàlida.'},401);
   const permission=await caller.rpc('temporary_admin_access');if(permission.error||permission.data!==true)return reply({error:'Accés exclusiu del superoperador global.'},403);
   if(body.action==='capabilities')return reply({smtpReady,otpReady});
   if(body.action!=='send-invitation')return reply({error:'Acció no admesa.'},400);
   if(!smtpReady)return reply({error:'No hi ha SMTP d’invitacions configurat. Pots copiar l’enllaç; no s’ha enviat cap correu.'},503);
   if(!tokenFormat(body.token)||typeof body.id!=='string')return reply({error:'Enllaç no vàlid.'},400);
   const recipient=await caller.rpc('temporary_email_target',{p_id:body.id,p_token:body.token});if(recipient.error||!recipient.data)return reply({error:'Invitació no disponible o límit d’enviaments assolit.'},409);
   const url=new URL(invitationBaseUrl);url.hash='invite='+body.token;
   await deliverInvitation({to:recipient.data,url:url.href});
   return reply({sent:true,message:'El servidor SMTP ha acceptat el correu d’invitació.'});
  }catch{return reply({error:'No s’ha pogut tramitar el correu. No es confirma cap enviament; revisa la configuració del servei.'},502);}
 };
}
