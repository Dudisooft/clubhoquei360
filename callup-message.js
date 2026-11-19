const timePattern=/^(?:[01]?\d|2[0-3]):[0-5]\d$/;
export function verifiedMaps({maps_url,maps_verified,address,address_verified}={}){
 if(maps_verified&&maps_url){try{const u=new URL(maps_url);if(u.protocol==='https:'&&!u.username&&!u.password&&
  (['maps.app.goo.gl','maps.google.com'].includes(u.hostname)||(u.hostname==='goo.gl'&&u.pathname.startsWith('/maps/'))||(['www.google.com','google.com'].includes(u.hostname)&&u.pathname.startsWith('/maps'))))return u.href;}catch{/* invalid */}}
 return address_verified&&address?.trim()?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address.trim()):null;
}
export function meetingTime(startsAt,margin){
 if(!Number.isInteger(margin)||margin<0||margin>240||!Number.isFinite(Date.parse(startsAt)))return '';
 return new Intl.DateTimeFormat('ca-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(new Date(Date.parse(startsAt)-margin*60000));
}
export function callupMessage(fields){
 const f={...fields},warnings=[];
 f.round=String(f.round??'').replace(/^JORNADA\s*/i,'').trim();
 const starts=Number.isFinite(Date.parse(f.starts_at))?new Date(f.starts_at):null;
 const day=f.day|| (starts?new Intl.DateTimeFormat('ca-ES',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:'Europe/Madrid'}).format(starts).replace(',',''):'');
 const displayDay=day?day[0].toLocaleUpperCase('ca')+day.slice(1):day;
 const hour=f.hour||(starts?new Intl.DateTimeFormat('ca-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(starts):'');
 const meeting=f.meeting??meetingTime(f.starts_at,f.margin_minutes);
 const maps=verifiedMaps(f);
 for(const [key,value] of Object.entries({equip:f.team_name,jornada:f.round,competició:f.competition_name,data:day,hora:hour,local:f.home_team,visitant:f.away_team,pavelló:f.venue,trobada:meeting,equipació:f.kit,roba:f.street}))if(!String(value??'').trim())warnings.push('Falta '+key);
 if(hour&&!timePattern.test(hour))warnings.push('Hora de partit no vàlida');
 if(meeting&&!timePattern.test(meeting))warnings.push('Hora de trobada no vàlida');
 if(!maps)warnings.push('Ubicació de Google Maps no verificada');
 if(f.provisional)warnings.push('Data o hora del partit provisionals');
 const value=x=>String(x??'').trim()||'[PENDENT]';
 const text=`‼️ CONVOCATÒRIA ${value(f.team_name)}
JORNADA ${value(f.round)} ${value(f.competition_name)}

📅 ${value(displayDay)}${f.provisional?' · PROVISIONAL':''}
⏰ Hora Partit: ${value(hour)}h${f.provisional?' · PROVISIONAL':''}
🏑  ${value(f.home_team)} - ${value(f.away_team)}

📍Pista: ${value(f.venue)} ${maps||'[UBICACIÓ PENDENT]'}

⏰ *Convocats: ${value(meeting)}h

👕Samarreta: ${value(f.kit)} (sempre portar les dos equipacions)

👕 ${value(f.street)}

EQUIP I FORÇA!!🔴🔵💪🤟`;
 return {text,warnings,maps};
}
export function whatsappHref(text){return 'https://wa.me/?text='+encodeURIComponent(text);}
