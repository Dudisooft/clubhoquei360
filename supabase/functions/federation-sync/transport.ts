// Server-side requests to the existing public SIDGAD fragments. No login,
// browser-history assumptions, proxy overrides or automatic retry of a POST.
export class OfficialFetchError extends Error {
 constructor(public state:string,message:string,public http_status:number|null=null){super(state+': '+message);this.name='OfficialFetchError';}
}
const origins:Record<string,string>={FECAPA:'https://www.hoqueipatins.fecapa.cat',RFEP:'https://hockeypatines.fep.es'};
export async function fetchOfficialHtml(federation:string,file:string,params:Record<string,string>,fetcher:typeof fetch=fetch){
 const origin=origins[federation],fed=federation.toLowerCase();
 if(!origin||!new RegExp('^'+fed+'_[a-z0-9_]+\\.php$').test(file))throw new OfficialFetchError('team_unidentified','Invalid federation resource');
 const rosterCompetition=file.match(/_stats_1_(\d+)\.php$/)?.[1];
 if(rosterCompetition&&params.idc!==rosterCompetition)throw new OfficialFetchError('identity_ambiguous','Competition request mismatch');
 let response:Response;
 try{response=await fetcher('https://www.server2.sidgad.es/'+fed+'/'+file,{method:'POST',headers:{Origin:origin,Referer:origin+'/','X-Requested-With':'XMLHttpRequest'},credentials:'omit',body:new URLSearchParams(params),signal:AbortSignal.timeout(25000)});}
 catch(e){const name=e instanceof Error?e.name:'';throw new OfficialFetchError('connection_error',name==='TimeoutError'||name==='AbortError'?'Official request timed out':'Official connection failed');}
 if(!response.ok)throw new OfficialFetchError(response.status===401||response.status===403?'permission_error':'connection_error','Official HTTP '+response.status,response.status);
 let html:string;try{html=await response.text();}catch{throw new OfficialFetchError('connection_error','Official response interrupted');}
 if(!html.trim()||html.length>6000000)throw new OfficialFetchError('response_incomplete','Empty or oversized official response');
 return html;
}
export function importRunStatus(data:any,reports:any){return reports.errors.length||[...data.teams,...(data.opponents||[])].some((t:any)=>t.roster_status!=='published')||data.matches.some((m:any)=>m.report_summary_status==='unavailable')?'partial':'success';}
