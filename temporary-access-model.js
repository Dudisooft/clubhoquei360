export const ACCESS={analyst:'Analista d’estadístiques',viewer:'Consulta',recorder:'Registre limitat'};
export const STATES={pending:'Pendent',active:'Activa',expired:'Caducada',revoked:'Revocada'};
const parts=ms=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
export function expiryInput(ms){const p=parts(ms);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
export function expiry(duration,custom,now=Date.now()){
 const hours={'24':24,'168':168,'720':720};let ms;
 if(hours[duration])ms=now+hours[duration]*3600000;
 else{
  if(duration!=='custom'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(custom))throw Error('Indica una caducitat vàlida.');
  const [y,m,d,h,min]=custom.split(/[-T:]/).map(Number),desired=Date.UTC(y,m-1,d,h,min);ms=desired;
  for(let n=0;n<3;n++){const p=parts(ms),local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);ms+=desired-local;}
  if(expiryInput(ms)!==custom)throw Error('Aquesta hora no existeix a Europe/Madrid pel canvi d’horari.');
 }
 if(!Number.isFinite(ms)||ms<=now)throw Error('La caducitat ha de ser futura.');return new Date(ms).toISOString();
}
export function invitationUrl(token,base){if(!/^[a-f0-9]{64}$/.test(token))throw Error('Enllaç no vàlid.');const url=new URL('./convidat.html',base);url.hash='invite='+token;return url.href;}
