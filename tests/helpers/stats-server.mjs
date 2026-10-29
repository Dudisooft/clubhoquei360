/* Local-only browser fixture: PostgREST-shaped transport over the same PostgreSQL
 * and RLS used in integration tests. NOT a production Auth/Realtime substitute. */
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
import {createDatabase,ID,asUser,asOwner} from './stats-db.mjs';
import {seedPreparation} from './preparation-db.mjs';
const db=await createDatabase(),cwd=path.resolve(new URL('../..',import.meta.url).pathname);let serial=Promise.resolve();
const vic='18fa0a6e-e5c6-487e-8315-5bc371e22cb1';let vicCalendar=null;
const token=id=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:4070908800})).toString('base64url')+'.local-test-only';
function userOf(req){try{return JSON.parse(Buffer.from((req.headers.authorization||'').replace('Bearer ','').split('.')[1],'base64url')).sub;}catch{return null;}}
const json=(res,data,status=200)=>{res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range'});res.end(JSON.stringify(data));};
const tables=new Set(['stats_matches','stats_events','stats_assignments','stats_actions','stats_event_audit','stats_coverage','stats_sessions','pilot_matches','pilot_members','pilot_players','pilot_operator_state','pilot_events','federation_match_sources','federation_calendar_cache','federation_matches']);
const identifier=s=>{if(!/^[a-z_][a-z0-9_]*$/.test(s))throw Error('Invalid identifier');return '"'+s+'"';};
async function api(req,res,url){
 const uid=userOf(req);const body=await new Promise(resolve=>{let raw='';req.on('data',b=>raw+=b);req.on('end',()=>resolve(raw?JSON.parse(raw):{}));});
 if(url.pathname==='/api/auth/v1/token'){const key=body.email?.split('@')[0];if(!ID[key])return json(res,{error:'invalid_grant',error_description:'Compte de prova desconegut'},400);return json(res,{access_token:token(ID[key]),refresh_token:'local-fixture',expires_in:3600,expires_at:4070908800,token_type:'bearer',user:{id:ID[key],email:body.email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}});}
 if(url.pathname==='/api/auth/v1/user')return uid?json(res,{id:uid,email:Object.keys(ID).find(k=>ID[k]===uid)+'@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}):json(res,{message:'Not authenticated'},401);
 if(url.pathname==='/api/auth/v1/logout')return json(res,{});
 if(!uid)return json(res,{code:'42501',message:'Authentication required'},401);
 try{
  const name=url.pathname.split('/').at(-1);
  if(url.pathname.includes('/rpc/')){
   // Frontend contract fixture only. Real sporting/RLS policy is tested in the separate server PR.
   if(name==='match_mode_access'&&!process.env.MATCH_MODE_SERVER_MIGRATION){
    const visible=await asUser(db,uid,'select id from pilot_matches where id=$1',[body.p_match]);const read=!!visible.rows.length;
    return json(res,{read,base:read,advanced:read,operational_read:read,operational:read?body.p_match:null,catalogue_id:null,activate_base:false,activate_advanced:false});
   }
   const commands={match_temporary_grant:['p_grant'],match_temporary_revoke:['p_id'],match_temporary_list:['p_match'],match_mode_access:['p_catalogue','p_match'],match_activate_catalogue:['p_catalogue','p_mode','p_practice'],pilot_roster_catalogue:['p_match'],pilot_prepare_players:['p_match','p_mutation','p_players'],pilot_confirm_lineup:['p_match','p_mutation','p_revision','p_state'],pilot_save_operator_state:['p_match','p_revision','p_state'],stats_access:['p_match'],stats_write_event:['p_event','p_expected'],stats_save_session:['p_match','p_state','p_expected'],stats_grant:['p_grant'],stats_revoke:['p_id'],stats_set_coverage:['p_match','p_side','p_category','p_complete']};
   if(!commands[name])return json(res,{code:'PGRST202',message:'Unimplemented fixture RPC'},404);
   const keys=commands[name],args=keys.map((k,i)=>`$${i+1}`),vals=keys.map(k=>body[k]!==null&&typeof body[k]==='object'?JSON.stringify(body[k]):body[k]??null);
   const response=await asUser(db,uid,`select * from public.${identifier(name)}(${args.join(',')})`,vals);
   if(name==='pilot_save_operator_state')return json(res,response.rows);
   return json(res,['match_temporary_list','match_temporary_revoke','match_mode_access','match_activate_catalogue','pilot_roster_catalogue','pilot_prepare_players','pilot_confirm_lineup','stats_access','stats_revoke','stats_set_coverage'].includes(name)?Object.values(response.rows[0]||{})[0]:response.rows[0]);
  }
  if(name==='federation_calendar_cache'){const data=vicCalendar&&url.searchParams.get('federation')==='eq.RFEP'?{data:vicCalendar}:null;return json(res,req.headers.accept?.includes('vnd.pgrst.object+json')?data:data?[data]:[]);}
  if(!tables.has(name))return json(res,{message:'Table not in local fixture'},404);
  if(name==='pilot_events'&&req.method==='POST'){
   const batch=Array.isArray(body)?body:[body];const cols=[...new Set(batch.flatMap(Object.keys))],vals=[];
   const tuples=batch.map(row=>'('+cols.map(col=>{vals.push(typeof row[col]==='object'&&row[col]!==null?JSON.stringify(row[col]):row[col]??null);return '$'+vals.length;}).join(',')+')');
   await asUser(db,uid,`insert into pilot_events(${cols.map(identifier).join(',')}) values ${tuples.join(',')}`,vals);return json(res,null,201);
  }
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
 if(url.pathname==='/__test/reset'){serial=serial.then(async()=>{vicCalendar=null;await db.exec("reset role;delete from stats_event_audit;delete from stats_events;delete from stats_sessions;delete from stats_coverage;delete from stats_access_audit;delete from stats_assignments;");for(const table of ['pilot_preparation_audit','pilot_prepared_lineups','pilot_events','pilot_operator_state','pilot_players','pilot_members'])await db.query('delete from '+table+' where match_id=$1',[vic]);for(const table of ['federation_match_sources','stats_matches','pilot_matches'])await db.query('delete from '+table+' where '+(table==='pilot_matches'?'id':'match_id')+'=$1',[vic]);await db.query("insert into stats_assignments(match_id,user_id,role,categories,expires_at,granted_by) values($1,$2,'primary','{}',now()+interval '30 days',$3)",[ID.match,ID.principal,ID.manager]);json(res,{ok:true});});return;}
 // Explicit local-only pending-calendar scenario; no production fetch/Auth.
 if(url.pathname==='/__test/rfep-vic'){serial=serial.then(async()=>{
  const row={round:'JORNADA 5',date:'24/10/2026',time:'20:30',home_name:'SIMAR IGUALADA HC',away_name:'AUTO VIGATANA PATÍ VIC',home_team_id:'3697',away_team_id:'3727',match_id:null};
  await seedPreparation(db);
  await asOwner(db,"update federation_match_sources set home_name=$2,away_name=$3,official_data=official_data||$4::jsonb where match_id=$1",[vic,row.home_name,row.away_name,JSON.stringify(row)]);
  await asOwner(db,"update pilot_matches set title='Igualada – Vic · PROVA FICTÍCIA' where id=$1",[vic]);
  vicCalendar=[row,{...row,round:'JORNADA 6',date:'31/10/2026',away_team_id:'99999',away_name:'Futur rival · FICTICI'}];json(res,{ok:true});
 });return;}
 // Optional real PostgreSQL mode contract integration. Still entirely local/fictitious.
 if(url.pathname==='/__test/mode-future'&&process.env.MATCH_MODE_SERVER_MIGRATION){serial=serial.then(async()=>{
  const future='80000000-0000-4000-8000-000000000001';
  await asOwner(db,"update teams set age_group='senior',age_group_source='FICTITIOUS SENIOR INTEGRATION' where id=$1",[ID.team]);
  await asOwner(db,"insert into federation_matches(id,group_id,home_team,away_team,federation_start_at,match_fingerprint,raw_data) select $1,group_id,'Sènior FUTUR FICTICI','Rival FUTUR FICTICI','2027-01-01T12:00Z','RFEP:41:3575:FICTICI-FUTUR:3697:3727',raw_data||$3::jsonb from federation_matches where id=$2",[future,'51894d05-c323-f3e1-8534-fa79e062c448',JSON.stringify({source_url:'https://hockeypatines.fep.es/league/3575'})]);
  await asOwner(db,"insert into federation_match_teams(match_id,entry_id,side) select $1,entry_id,side from federation_match_teams where match_id=$2",[future,'51894d05-c323-f3e1-8534-fa79e062c448']);
  await asOwner(db,'grant select on federation_matches to authenticated');json(res,{id:future});
 });return;}
 if(url.pathname==='/__test/mode-counts'&&process.env.MATCH_MODE_SERVER_MIGRATION){serial=serial.then(async()=>json(res,(await asOwner(db,"select jsonb_build_object('contexts',(select count(*) from basic_match_contexts where catalogue_match_id='80000000-0000-4000-8000-000000000001'),'events',(select count(*) from stats_events where match_id='80000000-0000-4000-8000-000000000001'),'official',(select count(*) from pilot_events where match_id='80000000-0000-4000-8000-000000000001'),'members',(select count(*) from pilot_members where match_id='80000000-0000-4000-8000-000000000001')) state")).rows[0].state));return;}
 if(url.pathname==='/__test/temporary-pilot'&&process.env.MATCH_MODE_SERVER_MIGRATION){serial=serial.then(async()=>{
  await asOwner(db,"update teams set age_group='youth',age_group_source='FEM15 FICTICI' where id=$1",[ID.team]);
  await asOwner(db,"insert into club_memberships(user_id,club_id,team_id,role) values($1,$2,null,'general_coordinator')",[ID.principal,ID.club]);json(res,{ok:true});
 });return;}
 if(url.pathname==='/__test/temporary-state'&&process.env.MATCH_MODE_SERVER_MIGRATION){serial=serial.then(async()=>json(res,(await asOwner(db,"select jsonb_build_object('grants',(select coalesce(jsonb_agg(a),'[]') from match_temporary_operators a),'events',(select count(*) from stats_events where operator_id=$1),'external_members',(select count(*) from pilot_members where user_id=$1),'assignments',(select count(*) from stats_assignments),'contexts',(select count(*) from basic_match_contexts)) state",[ID.external])).rows[0].state));return;}
 if(url.pathname==='/__test/temporary-expire'&&process.env.MATCH_MODE_SERVER_MIGRATION){serial=serial.then(async()=>{await asOwner(db,"update match_temporary_operators set starts_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where revoked_at is null");json(res,{ok:true});});return;}
 if(url.pathname==='/__test/vic-without-source'){serial=serial.then(async()=>{await asOwner(db,'delete from federation_match_sources where match_id=$1',[vic]);json(res,{ok:true});});return;}
 if(url.pathname==='/__test/snapshot'){serial=serial.then(async()=>json(res,(await asOwner(db,"select jsonb_build_object('official',(select jsonb_agg(to_jsonb(e)) from pilot_events e),'clock',(select jsonb_agg(to_jsonb(s)) from pilot_operator_state s),'events',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from stats_events e),'sessions',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from stats_sessions s),'assignments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from stats_assignments a),'authUsers',(select count(*) from auth.users)) as state")).rows[0].state));return;}
 const relative=url.pathname.replace(/^\/clubhoquei360\//,'/').replace(/^\//,'')||'index.html';const filename=path.resolve(cwd,relative);
 if(!filename.startsWith(cwd+'/')||relative.includes('.git')||relative.endsWith('.sql')){res.writeHead(404);res.end();return;}
 try{const data=fs.readFileSync(filename);res.writeHead(200,{'content-type':types[path.extname(filename)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
});
server.listen(4173,'127.0.0.1',()=>console.log('Local FEM15 fixture ready. Synthetic accounts only.'));
