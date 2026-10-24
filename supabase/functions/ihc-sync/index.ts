import{syncOfficialReports}from'./report-sync.ts';
import{createClient}from'npm:@supabase/supabase-js@2.95.3';
import manifest from './manifest.json' with {type:'json'};
import{parseCompetition,enrichFromReport,SOURCES,discover}from'./parse.ts';
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method!=='POST')return json({error:'POST required'},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});let run:any=null;
 try{
  const token=req.headers.get('x-federation-scheduler');if(!token)return json({error:'Scheduler authorization required'},401);
  const auth=await db.rpc('federation_scheduler_authorized',{p_token:token});if(auth.error||auth.data!==true)return json({error:'Unauthorized'},401);
  const body=await req.json();
  const get=async(fed:string,file:string,params:Record<string,string>)=>{const origin=SOURCES[fed as keyof typeof SOURCES].origin;const r=await fetch(`https://www.server2.sidgad.es/${fed.toLowerCase()}/${file}`,{method:'POST',headers:{Origin:origin,Referer:origin+'/','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams(params),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Federation HTTP '+r.status);const h=await r.text();if(!h.trim()||h.length>6000000)throw Error('Empty/oversized official response');return h;};
  if(body.action==='discover'){const found=[];for(const fed of ['FECAPA','RFEP'] as const)found.push(...discover(await get(fed,`${fed.toLowerCase()}_ls_1.php`,{temp:'41'}),fed));return json({competitions:found,unconfigured:found.filter(c=>!manifest.some(m=>m.id===c.id&&m.federation===c.federation))});}
  let config:any;
  if(body.action==='next'){
   const latest=await db.from('federation_import_runs').select('external_resource_id,finished_at').eq('resource_type','competition').in('status',['success','partial','failed']).order('finished_at',{ascending:false}).limit(1);if(latest.error)throw latest.error;
   const queue=manifest;const key=latest.data?.[0]?.external_resource_id;const i=queue.findIndex(c=>c.federation+':'+c.id===key);config=queue[(i+1)%queue.length];
  }else config=manifest.find(c=>c.id===body.competition_id&&c.federation===body.federation);
  if(!config)return json({error:'Unconfigured official competition'},400);
  if(config.federation==='FECAPA'&&config.id==='4802'){
   const started=await db.from('federation_import_runs').insert({federation:'FECAPA',resource_type:'competition',external_resource_id:'FECAPA:4802',source_url:SOURCES.FECAPA.origin+'/league/4802',status:'started'}).select('id').single();if(started.error)throw started.error;run=started;
   const response=await fetch(Deno.env.get('SUPABASE_URL')!+'/functions/v1/federation-sync',{method:'POST',headers:{'Content-Type':'application/json','x-federation-scheduler':token},body:JSON.stringify({action:'sync-team',federation:'FECAPA',competition_id:'4802',team_id:'12419'}),signal:AbortSignal.timeout(90000)});if(!response.ok)throw Error('Existing FEM15 synchronizer HTTP '+response.status);
   const reportSync=await syncOfficialReports(db,{federation:'FECAPA',source_url:SOURCES.FECAPA.origin+'/league/4802'},get,new Map());const stats=await db.rpc('federation_refresh_published_stats');if(stats.error)throw stats.error;
   await db.from('federation_import_runs').update({status:reportSync.errors.length?'partial':'success',finished_at:new Date().toISOString(),records_written:reportSync.processed,details:{updater:'existing_fem15_importer',official_reports:reportSync}}).eq('id',run.data.id);
   return json({status:'verified',competition:'FECAPA:4802',updater:'existing_fem15_importer',official_reports:reportSync});
  }
  const external=config.federation+':'+config.id;
  const cached=await db.from('federation_import_runs').select('finished_at,details').eq('resource_type','competition').eq('external_resource_id',external).eq('status','success').order('finished_at',{ascending:false}).limit(1);if(cached.error)throw cached.error;
  if(!body.force&&cached.data?.[0]?.details?.importer_version==='ihc-rosters-v2'&&cached.data?.[0]?.finished_at&&Date.now()-Date.parse(cached.data[0].finished_at)<18*3600000)return json({status:'cached',competition:external});
  run=await db.from('federation_import_runs').insert({federation:config.federation,resource_type:'competition',external_resource_id:external,source_url:SOURCES[config.federation as keyof typeof SOURCES].origin+'/league/'+config.id,status:'started'}).select('id').single();if(run.error)throw run.error;
  const fed=config.federation.toLowerCase(),params={idc:config.id,site_lang:fed==='fecapa'?'ca':'es'};
  const calendar=await get(config.federation,`${fed}_cal_idc_${config.id}_1.php`,params);
  const roster=await get(config.federation,`${fed}_stats_1_${config.id}.php`,{...params,tipo_stats:'plantillas'});
  const standings=await get(config.federation,`${fed}_clasif_idc_${config.id}_1.php`,params);
  const data=parseCompetition(config,calendar,roster,standings),selected=new Map(),reportHtml=new Map<string,string>();
  for(const team of data.teams){const candidates=data.matches.filter(m=>m.match_id&&(m.home_team_id===team.external_team_id||m.away_team_id===team.external_team_id)).sort((a,b)=>(b.date||'').split('/').reverse().join('').localeCompare((a.date||'').split('/').reverse().join('')));if(candidates[0])selected.set(candidates[0].match_id,candidates[0]);}
  for(const m of selected.values()){try{const h=await get(config.federation,`${fed}_gr_${m.match_id}_1.php`,{idm:'1',idc:m.group_id,idp:m.match_id,tab:'tab_ficha_resumen'});reportHtml.set(m.match_id,h);enrichFromReport(data,m,h);}catch(e){m.report_status='unavailable';m.report_error=String(e.message||e).slice(0,150);}}
  const result=await db.rpc('federation_commit_ihc',{p_data:data});if(result.error)throw result.error;
  const visitors=await db.rpc('federation_commit_opponents',{p_federation:data.federation,p_competition:data.id,p_teams:data.opponents,p_stamp:data.fetched_at,p_source_url:data.source_url});if(visitors.error)throw visitors.error;
  const reportSync=await syncOfficialReports(db,data,get,reportHtml);const totals=await db.rpc('federation_refresh_published_stats');if(totals.error)throw totals.error;
  const log=await db.from('federation_import_runs').update({status:'success',finished_at:new Date().toISOString(),records_read:data.matches.length+data.teams.reduce((n,t)=>n+t.roster.length,0),records_written:result.data.matches+result.data.roster_entries,details:{...result.data,importer_version:'ihc-rosters-v2',opponent_rosters:visitors.data,official_reports:reportSync,season:'2026/27',report_failures:data.matches.filter(m=>m.report_status==='unavailable').length}}).eq('id',run.data.id);if(log.error)throw log.error;
  return json({competition:external,...result.data,official_reports:{processed:reportSync.processed,pending:reportSync.pending,errors:reportSync.errors}});
 }catch(e){const error=String(e.message||e).slice(0,500);if(run?.data?.id)await db.from('federation_import_runs').update({status:'failed',finished_at:new Date().toISOString(),error_summary:error}).eq('id',run.data.id);return json({error},500);}
});
