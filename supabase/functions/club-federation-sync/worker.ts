import {parseCompetition} from '../ihc-sync/parse.ts';
import {syncOfficialReports} from '../ihc-sync/report-sync.ts';
export function canonical(value:any):any{if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(k=>!['fetched_at','_lease'].includes(k)).sort().map(k=>[k,canonical(value[k])]));return value;}
export async function payloadHash(data:any){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(data))));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
const must=(r:any)=>{if(r.error)throw r.error;return r.data;};
// One competition, sequential retrieval and at most four official reports per invocation.
export async function runJob(db:any,get:any){const job=must(await db.rpc('federation_claim_job'));if(!job)return {status:'idle'};let committed=false;
 try{
  const fed=job.federation.toLowerCase(),params={idc:job.external_competition_id,temp:job.external_season_id,site_lang:fed==='fecapa'?'ca':'es'},config={id:job.external_competition_id,name:job.name,federation:job.federation,external_club_id:job.external_club_id,external_season_id:job.external_season_id};
  const calendar=await get(job.federation,`${fed}_cal_idc_${config.id}_1.php`,params);let roster='',standings='',rosterError:any=null;
  try{roster=await get(job.federation,`${fed}_stats_1_${config.id}.php`,{...params,tipo_stats:'plantillas'});}catch(e){rosterError=e;}
  try{standings=await get(job.federation,`${fed}_clasif_idc_${config.id}_1.php`,params);}catch{}
  const data=parseCompetition({...config,roster_unavailable:!!rosterError},calendar,roster,standings),hash=await payloadHash(data);let result:any={matches:0,roster_entries:0,status:'unchanged'};
  if(hash!==job.last_payload_hash){result=must(await db.rpc('federation_commit_scoped',{p_scope:job.id,p_data:{...data,_lease:job.lease_id}}));committed=true;}
  const reports=await syncOfficialReports(db,{...data,competition_internal_id:job.competition_id,report_budget:4},get,new Map());
  const details={status:rosterError||reports.errors.length||data.teams.some((t:any)=>t.roster_status!=='published')?'partial':'success',...result,payload_hash:hash,official_reports:reports,roster_state:rosterError?.state||'retrieved'};
  // result.status denotes a commit, not completeness. The public status must reflect pending data.
  details.status=rosterError||reports.errors.length||data.teams.some((t:any)=>t.roster_status!=='published')?'partial':'success';
  must(await db.rpc('federation_finish_job',{p_scope:job.id,p_lease:job.lease_id,p_ok:true,p_details:details}));return {scope:job.id,...details};
 }catch(e){const error=e instanceof Error?e.message:'Federation job failed';must(await db.rpc('federation_finish_job',{p_scope:job.id,p_lease:job.lease_id,p_ok:false,p_details:{error:error.slice(0,500),error_state:(e as any)?.state||'import_error',calendar_committed:committed}}));return {scope:job.id,status:'failed',error};}
}
