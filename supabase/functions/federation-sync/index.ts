import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { parseMatch,parseCalendar,parseStandings } from './parser.ts';
import { syncFem15 } from './fem15.ts';
const cors={'Access-Control-Allow-Origin':'https://dudisooft.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'POST required'},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 try{
  const scheduler=req.headers.get('x-federation-scheduler');let scheduled=false,user:any=null;
  if(scheduler){const r=await db.rpc('federation_scheduler_authorized',{p_token:scheduler});if(r.error)throw r.error;scheduled=r.data===true;}
  if(!scheduled){const token=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';const r=await db.auth.getUser(token);user=r.data.user;if(!user)return json({error:'Authentication required'},401);}
  const body=await req.json();
  if(body.action==='sync-team'){
   if((body.team_id&&body.team_id!=='12419')||(body.competition_id&&body.competition_id!=='4802')||(body.federation&&body.federation!=='FECAPA'))return json({error:'Unconfigured team scope'},400);
   if(!scheduled){const member=await db.from('pilot_members').select('match_id').eq('user_id',user.id).eq('role','operator').limit(1);if(member.error)throw member.error;if(!member.data?.length)return json({error:'Existing operator access required'},403);}
   return json(await syncFem15(db,{actor:user?.id||null,force:scheduled&&body.probe===true}));
  }

  if(!scheduled&&body.action==='prepare'){
   const prepared=await db.rpc('federation_prepare_match',{p_reference:body.match_id,p_external:body.external_match_id,p_user:user.id});if(prepared.error)return json({error:prepared.error.message},400);body.match_id=prepared.data;
  }
  let q=db.from('federation_match_sources').select('*');
  if(scheduled){q=q.eq('automatic_enabled',true);}else{
   if(!/^[0-9a-f-]{36}$/.test(body.match_id||''))return json({error:'match_id required'},400);
   const {data:member}=await db.from('pilot_members').select('role').eq('match_id',body.match_id).eq('user_id',user.id).maybeSingle();
   if(member?.role!=='operator')return json({error:'Operator access required'},403);q=q.eq('match_id',body.match_id);
  }
  const targets=await q.limit(10);if(targets.error)throw targets.error;const results=[];
  for(const source of targets.data||[]){
   if(source.federation==='FECAPA'&&source.competition_id==='4802'){
    results.push({match_id:source.match_id,...await syncFem15(db,{actor:user?.id||null,force:scheduled&&body.probe===true})});continue;
   }

   if(!/^[1-9]\d*$/.test(source.federation_match_id||'')||!/^\d+$/.test(source.competition_id||'')){results.push({match_id:source.match_id,error:'Unverified identifiers'});continue;}
   const claim=await db.rpc('federation_claim_sync',{p_match:source.match_id,p_force:scheduled&&body.probe===true});if(claim.error)throw claim.error;if(!claim.data){results.push({match_id:source.match_id,status:'cached'});continue;}
   const fed=source.federation.toLowerCase();const url=`https://www.server2.sidgad.es/${fed}/${fed}_gr_${source.federation_match_id}_1.php`;
   const run=await db.from('federation_sync_runs').insert({match_id:source.match_id,status:'running',source_url:url}).select('id').single();if(run.error)throw run.error;
   try{
    const fetchHtml=async(u:string,params:Record<string,string>)=>{const r=await fetch(u,{method:'POST',body:new URLSearchParams(params),headers:{'Origin':new URL(source.federation_url).origin,'Referer':source.federation_url,'X-Requested-With':'XMLHttpRequest'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Official source HTTP '+r.status);const h=await r.text();if(!h.trim())throw Error('Official source returned empty HTML');if(h.length>3000000)throw Error('Response too large');return h;};
    const html=await fetchHtml(url,{idm:'1',idc:source.competition_id,idp:source.federation_match_id,tab:'tab_ficha_resumen'});
    const snapshot=parseMatch(html,source);
    const calendarUrl=`https://www.server2.sidgad.es/${fed}/${fed}_cal_idc_${source.competition_id}_1.php`;
    const calendarHtml=await fetchHtml(calendarUrl,{idc:source.competition_id,tipo_stats:'',site_lang:fed==='fecapa'?'ca':'es'});
    const calendar=parseCalendar(calendarHtml);const fixture=calendar.find(x=>x.match_id===source.federation_match_id);
    if(!fixture||fixture.home_name!==snapshot.home_name||fixture.away_name!==snapshot.away_name)throw Error('Calendar and official report identity mismatch');
    Object.assign(snapshot,{home_team_id:fixture.home_team_id,away_team_id:fixture.away_team_id,date:fixture.date,time:fixture.time,round:fixture.round,venue:fixture.venue});
    const committed=await db.rpc('federation_commit_snapshot',{p_match:source.match_id,p_data:snapshot});if(committed.error)throw committed.error;
    let calendarError=null,standingsError=null;
    const cached=await db.from('federation_calendar_cache').upsert({federation:source.federation,competition_id:source.competition_id,season_id:source.season_id,data:calendar,fetched_at:new Date().toISOString()});if(cached.error)calendarError=cached.error.message;
    try{const html=await fetchHtml(`https://www.server2.sidgad.es/${fed}/${fed}_clasif_idc_${source.competition_id}_1.php`,{idc:source.competition_id,tipo_stats:'',site_lang:fed==='fecapa'?'ca':'es'});const standings=parseStandings(html);const r=await db.from('federation_calendar_cache').update({standings}).eq('federation',source.federation).eq('competition_id',source.competition_id).eq('season_id',source.season_id);if(r.error)throw r.error;}catch(e){standingsError=String(e.message||e);}
    await db.from('federation_sync_runs').update({status:'success',finished_at:new Date().toISOString(),counts:{players:snapshot.players.length,calendar_error:calendarError,standings_error:standingsError}}).eq('id',run.data.id);
    results.push({match_id:source.match_id,status:'verified',players:snapshot.players.length,calendar_error:calendarError,standings_error:standingsError});
   }catch(e){const error=String(e.message||e).slice(0,500);await db.from('federation_sync_runs').update({status:'error',error,finished_at:new Date().toISOString()}).eq('id',run.data.id);await db.from('federation_match_sources').update({last_checked_at:new Date().toISOString(),notes:error}).eq('match_id',source.match_id);results.push({match_id:source.match_id,status:'error',error});}
  }
  return json({match_id:body.match_id||null,results});
 }catch(e){return json({error:String(e.message||e).slice(0,500)},500);}
});
