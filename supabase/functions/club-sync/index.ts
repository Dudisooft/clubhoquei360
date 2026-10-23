import {createClient} from 'npm:@supabase/supabase-js@2.95.3';
import {parseCompetition} from '../ihc-sync/parse.ts';
import {createConnector,refreshMinutes} from './policy.ts';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'https://dudisooft.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return json({error:'POST required'},405);
 const url=Deno.env.get('SUPABASE_URL')!;
 const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const call=async(name:string,args={})=>{const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data;};
 let job:any=null;
 try{
  const scheduler=req.headers.get('x-federation-scheduler');
  if(scheduler){if(await call('federation_scheduler_authorized',{p_token:scheduler})!==true)return json({error:'Unauthorized scheduler'},401);}
  else {
   const token=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
   const user=await db.auth.getUser(token);if(user.error||!user.data.user)return json({error:'Authentication required'},401);
   const body=await req.json();
   const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
   const requested=await client.rpc('request_club_sync',{p_club:body.club_id,p_scope:body.scope||'club',p_target:body.target_id||null});
   if(requested.error)return json({error:requested.error.message},403);
   // A manual request can only wake the authenticated scheduler through its existing cron.
   return json({status:'queued',jobs:requested.data},202);
  }
  job=(await call('claim_club_sync'))?.[0];if(!job)return json({status:'idle'});
  const s=await db.from('club_federation_sources').select('*').eq('id',job.source_id).single();if(s.error)throw s.error;
  const source=s.data;if(!source.access_verified)throw Error('Source access is not verified');
  const c=await db.from('federation_competitions').select('*').eq('id',source.competition_id).single();if(c.error)throw c.error;
  const connector=createConnector(source.federation),id=c.data.external_competition_id;
  // Sequential requests impose a conservative budget of three requests per invocation.
  const calendar=await connector.get('calendar',id),roster=await connector.get('roster',id),standings=await connector.get('standings',id);
  const data=parseCompetition({federation:source.federation,id,name:c.data.name,external_season_id:source.external_season_id,club_external_id:source.external_club_id,verified_team_ids:source.verified_team_ids},calendar,roster,standings);
  if(data.standings_status==='unavailable')throw Error('Standings format unavailable');
  return json({status:'success',job:job.id,...await call('finish_club_sync',{p_job:job.id,p_lease:job.lease_token,p_data:data,p_minutes:refreshMinutes(source,data.matches)})});
 }catch(error){const message=String((error as Error).message||error).slice(0,500);if(job)try{await call('fail_club_sync',{p_job:job.id,p_lease:job.lease_token,p_error:message,p_retry:!message.includes('HTTP 403')&&!message.includes('HTTP 401')&&!message.includes('HTTP 429')});}catch{/* A stale lease must never overwrite another worker. */}return json({error:message},500);}
});
