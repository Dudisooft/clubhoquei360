export function refreshMinutes(source:any,matches:any[],now=new Date()){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
 const minutes=matches.some(m=>m.date&&m.date.split('/').reverse().join('-')===day.format(now))?source.today_minutes:
 matches.some(m=>{if(!m.date)return false;const [d,mo,y]=m.date.split('/');const delta=Date.parse(`${y}-${mo}-${d}T12:00:00Z`)-now.getTime();return delta>=0&&delta<=7*86400000;})?source.upcoming_minutes:source.calendar_minutes;
 return Math.max(source.min_interval_minutes,minutes);
}
export const sourceOrigins={FECAPA:'https://www.hoqueipatins.fecapa.cat',RFEP:'https://hockeypatines.fep.es'};
export function createConnector(federation:string,fetcher=fetch){
 const origin=sourceOrigins[federation as keyof typeof sourceOrigins];if(!origin)throw Error('Unsupported federation');
 const fed=federation.toLowerCase();
 return {async get(kind:'calendar'|'roster'|'standings',competition:string){
  if(!/^[1-9]\d*$/.test(competition))throw Error('Unverified competition identifier');
  const files={calendar:`${fed}_cal_idc_${competition}_1.php`,roster:`${fed}_stats_1_${competition}.php`,standings:`${fed}_clasif_idc_${competition}_1.php`};
  const response=await fetcher(`https://www.server2.sidgad.es/${fed}/${files[kind]}`,{method:'POST',redirect:'error',headers:{Origin:origin,Referer:origin+'/','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams({idc:competition,site_lang:fed==='fecapa'?'ca':'es',...(kind==='roster'?{tipo_stats:'plantillas'}:{})}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Federation HTTP '+response.status);
  const body=await response.text();if(!body.trim()||body.length>6000000)throw Error('Empty or oversized federation response');return body;
 }};
}
