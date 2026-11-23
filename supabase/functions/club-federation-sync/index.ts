import {createClient} from 'npm:@supabase/supabase-js@2.95.3';
import {fetchOfficialHtml} from '../federation-sync/transport.ts';
import {runJob} from './worker.ts';
// Backend scheduled hook only. Browser users can request jobs via an authorized RPC.
Deno.serve(async req=>{const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});if(req.method!=='POST')return json({error:'POST required'},405);const token=req.headers.get('x-federation-scheduler');if(!token)return json({error:'Scheduler authorization required'},401);const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});try{const r=await db.rpc('federation_scheduler_authorized',{p_token:token});if(r.error||r.data!==true)return json({error:'Unauthorized'},403);return json(await runJob(db,fetchOfficialHtml));}catch{return json({error:'Federation job unavailable'},503);}});
