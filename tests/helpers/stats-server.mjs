/* Local-only browser fixture: PostgREST-shaped transport over the same PostgreSQL
 * and RLS used in integration tests. NOT a production Auth/Realtime substitute. */
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
import {createTemporaryAccessHandler} from '../../supabase/functions/temporary-access/handler.js';
import {createDatabase,ID,asUser,asOwner} from './stats-db.mjs';
const db=await createDatabase(),cwd=path.resolve(new URL('../..',import.meta.url).pathname);let serial=Promise.resolve();
const token=id=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:4070908800})).toString('base64url')+'.local-test-only';
function userOf(req){try{return JSON.parse(Buffer.from((req.headers.authorization||'').replace('Bearer ','').split('.')[1],'base64url')).sub;}catch{return null;}}
const json=(res,data,status=200)=>{res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range'});res.end(JSON.stringify(data));};
const tables=new Set(['stats_matches','stats_events','stats_assignments','stats_actions','stats_event_audit','stats_coverage','stats_sessions','pilot_matches','pilot_members','pilot_players','pilot_operator_state','pilot_events','federation_match_sources','federation_calendar_cache']);
const identifier=s=>{if(!/^[a-z_][a-z0-9_]*$/.test(s))throw Error('Invalid identifier');return '"'+s+'"';};
async function api(req,res,url){
 const uid=userOf(req);const body=await new Promise(resolve=>{let raw='';req.on('data',b=>raw+=b);req.on('end',()=>resolve(raw?JSON.parse(raw):{}));});
 if(url.pathname==='/api/auth/v1/token'){const key=body.email?.split('@')[0];if(!ID[key])return json(res,{error:'invalid_grant',error_description:'Compte de prova desconegut'},400);return json(res,{access_token:token(ID[key]),refresh_token:'local-fixture',expires_in:3600,expires_at:4070908800,token_type:'bearer',user:{id:ID[key],email:body.email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}});}
 if(url.pathname==='/api/auth/v1/verify'){const key=body.email?.split('@')[0];if(!ID[key]||body.token!=='123456')return json(res,{error:'otp_expired',msg:'FICTITIOUS code invalid'},422);return json(res,{access_token:token(ID[key]),refresh_token:'local-fixture',expires_in:3600,expires_at:4070908800,token_type:'bearer',user:{id:ID[key],email:body.email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}});}
 if(url.pathname==='/api/auth/v1/user')return uid?json(res,{id:uid,email:Object.keys(ID).find(k=>ID[k]===uid)+'@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}):json(res,{message:'Not authenticated'},401);
 if(url.pathname==='/api/auth/v1/logout')return json(res,{});
 if(url.pathname==='/api/functions/v1/temporary-access'){
  const handler=createTemporaryAccessHandler({allowedOrigin:'http://127.0.0.1:4173',invitationBaseUrl:'http://127.0.0.1:4173/clubhoquei360/convidat.html',rateSalt:'FICTITIOUS-ONLY',smtpReady:false,otpReady:true,
   service:{rpc:async(name,args)=>{await db.exec("reset role;set role service_role;select set_config('request.jwt.claim.sub','',false)");try{return {data:(await db.query('select temporary_reserve_email($1,$2,$3) value',[args.p_email,args.p_token,args.p_address_hash])).rows[0].value};}catch(error){return {error};}},auth:{admin:{createUser:async()=>({error:Error('No new identities in this fixture')})}}},
   publicAuth:{signInWithOtp:async()=>({})},deliverInvitation:async()=>{throw Error('No SMTP in local fixture');},
   callerClient:()=>({auth:{getUser:async()=>uid?{data:{user:{id:uid}}}:{error:Error('No session')}},rpc:async name=>{try{return {data:(await asUser(db,uid,'select public.'+name+'() value')).rows[0].value};}catch(error){return {error};}}})
  });
  const headers={'content-type':'application/json',origin:'http://127.0.0.1:4173',...(req.headers.authorization?{authorization:req.headers.authorization}:{})};const response=await handler(new Request('http://127.0.0.1:4173',{method:'POST',headers,body:JSON.stringify(body)}));return json(res,await response.json(),response.status);
 }
 if(!uid)return json(res,{code:'42501',message:'Authentication required'},401);
 try{
  const name=url.pathname.split('/').at(-1);
  if(url.pathname.includes('/rpc/')){
   const commands={temporary_admin_access:[],temporary_admin:[],temporary_manage:['p_command','p_value'],temporary_accept:['p_token'],temporary_touch:[],temporary_email_target:['p_id','p_token'],stats_access:['p_match'],stats_write_event:['p_event','p_expected'],stats_save_session:['p_match','p_state','p_expected'],stats_grant:['p_grant'],stats_revoke:['p_id'],stats_set_coverage:['p_match','p_side','p_category','p_complete']};
   if(!commands[name])return json(res,{code:'PGRST202',message:'Unimplemented fixture RPC'},404);
   const keys=commands[name],args=keys.map((k,i)=>`$${i+1}`),vals=keys.map(k=>typeof body[k]==='object'?JSON.stringify(body[k]):body[k]);
   const response=await asUser(db,uid,`select * from public.${identifier(name)}(${args.join(',')})`,vals);
   return json(res,['temporary_admin_access','temporary_admin','temporary_manage','temporary_accept','temporary_touch','temporary_email_target','stats_access','stats_revoke','stats_set_coverage'].includes(name)?Object.values(response.rows[0]||{})[0]:response.rows[0]);
  }
  if(name==='federation_calendar_cache')return json(res,[]);
  if(!tables.has(name))return json(res,{message:'Table not in local fixture'},404);
  if(req.method!=='GET')return json(res,{message:'Only authenticated commands can write'},403);
  const select=url.searchParams.get('select')||'*';const fields=select==='*'?'*':select.split(',').map(identifier).join(',');
  const filters=[],values=[];
  for(const [key,expression] of url.searchParams){if(['select','order','limit','offset'].includes(key))continue;const dot=expression.indexOf('.'),op=expression.slice(0,dot),v=expression.slice(dot+1);const col=identifier(key);
   if(op==='eq'){values.push(v);filters.push(`${col}=$${values.length}`);}else if(op==='in'){const items=v.slice(1,-1).split(',').filter(Boolean);if(!items.length)filters.push('false');else{const params=items.map(x=>{values.push(x.replace(/^"|"$/g,''));return '$'+values.length;});filters.push(`${col} in (${params.join(',')})`);}}
  }
  const order=(url.searchParams.get('order')||'').split(',').filter(Boolean).map(o=>{const [col,dir]=o.split('.');return identifier(col)+(dir==='desc'?' desc':' asc');}).join(',');
  const offset=Number(url.searchParams.get('offset')||0),limit=Math.min(1000,Number(url.searchParams.get('limit')||1000));
  const response=await asUser(db,uid,`select ${fields} from public.${identifier(name)}${filters.length?' where '+filters.join(' and '):''}${order?' order by '+order:''} limit ${limit} offset ${offset}`,values);
  if(req.headers.accept?.includes('vnd.pgrst.object+json')){if(response.rows.length!==1)return json(res,{code:'PGRST116',message:'Expected one row',details:response.rows.length+' rows'},406);return json(res,response.rows[0]);}
  return json(res,response.rows);
 }catch(e){return json(res,{code:e.code||'XX000',message:e.message,details:e.detail||null},e.code==='42501'?403:e.code==='40001'?409:400);}
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4173');
 if(url.pathname==='/health')return json(res,{fixture:'FICTITIOUS FEM15',database:'PostgreSQL/PGlite'});
 if(url.pathname.startsWith('/api/')){serial=serial.then(()=>api(req,res,url)).catch(e=>json(res,{message:e.message},500));return;}
 if(url.pathname==='/__test/reset'){serial=serial.then(async()=>{await db.exec("reset role;delete from stats_event_audit;delete from stats_events;delete from stats_sessions;delete from stats_coverage;delete from stats_access_audit;delete from stats_assignments;delete from temporary_invitation_audit;delete from temporary_invitations;delete from app_private.temporary_email_limits;");await db.query("insert into stats_assignments(match_id,user_id,role,categories,expires_at,granted_by) values($1,$2,'primary','{}',now()+interval '30 days',$3)",[ID.match,ID.principal,ID.manager]);json(res,{ok:true});});return;}
 if(url.pathname==='/__test/snapshot'){serial=serial.then(async()=>json(res,(await asOwner(db,"select jsonb_build_object('official',(select jsonb_agg(to_jsonb(e)) from pilot_events e),'clock',(select jsonb_agg(to_jsonb(s)) from pilot_operator_state s),'events',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from stats_events e),'sessions',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from stats_sessions s),'assignments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from stats_assignments a),'authUsers',(select count(*) from auth.users)) as state")).rows[0].state));return;}
 const relative=url.pathname.replace(/^\/clubhoquei360\//,'/').replace(/^\//,'')||'index.html';const filename=path.resolve(cwd,relative);
 if(!filename.startsWith(cwd+'/')||relative.includes('.git')||relative.endsWith('.sql')){res.writeHead(404);res.end();return;}
 try{const data=fs.readFileSync(filename);res.writeHead(200,{'content-type':types[path.extname(filename)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
});
server.listen(4173,'127.0.0.1',()=>console.log('Local FEM15 fixture ready. Synthetic accounts only.'));
