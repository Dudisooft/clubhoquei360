const dateInMadrid=new Intl.DateTimeFormat('en-CA',{
 timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'
});
const fullDate=new Intl.DateTimeFormat('ca-ES',{dateStyle:'full',timeZone:'UTC'});
const shortDate=new Intl.DateTimeFormat('ca-ES',{dateStyle:'medium',timeZone:'UTC'});

export function localMatchDay(value){
 const parts=Object.fromEntries(dateInMadrid.formatToParts(new Date(value)).map(part=>[part.type,part.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}

export function offsetDay(day,offset){
 const civil=new Date(day+'T00:00:00Z');
 civil.setUTCDate(civil.getUTCDate()+offset);
 return civil.toISOString().slice(0,10);
}

export function mondayOf(value){
 const day=localMatchDay(value);
 const weekday=new Date(day+'T00:00:00Z').getUTCDay();
 return offsetDay(day,-((weekday+6)%7));
}

export function weekRange(monday){
 return shortDate.formatRange(new Date(monday+'T00:00:00Z'),new Date(offsetDay(monday,6)+'T00:00:00Z'));
}

export function groupWeek(fixtures,monday){
 const end=offsetDay(monday,7);
 const days=new Map();
 for(const fixture of fixtures){
  if(!fixture.starts_at)continue;
  const day=localMatchDay(fixture.starts_at);
  if(day<monday||day>=end)continue;
  if(!days.has(day))days.set(day,[]);
  days.get(day).push(fixture);
 }
 return [...days].sort(([a],[b])=>a.localeCompare(b)).map(([day,matches])=>({
  label:fullDate.format(new Date(day+'T00:00:00Z')),
  matches:matches.sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)||a.team_name.localeCompare(b.team_name,'ca'))
 }));
}
