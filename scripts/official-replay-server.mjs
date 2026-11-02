// Local rehearsal using the real Base/Advanced UIs and SQL permission policies.
// No production URL/key, no upstream write path and no arbitrary SQL endpoint.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {replayDatabase} from './lib/local-replay-db.mjs';
import {ID,asOwner,asUser} from '../tests/helpers/stats-db.mjs';
import {clubCatalogue,catalogueQuery} from './lib/local-club-catalogue.mjs';
const root=process.cwd(),folder=process.env.REPLAY_DATA_DIR||'work/official-replay-db';
const {db,bundle,ids}=await replayDatabase(folder);let serial=Promise.resolve();
const sessions=new Map(),matches=Object.values(ids),port=Number(process.env.REPLAY_PORT)||4187;
const catalogue=clubCatalogue(bundle,ids);
const tables=new Set(['pilot_matches','pilot_members','pilot_players','pilot_operator_state','pilot_events','federation_match_sources','stats_matches','stats_events','stats_assignments','stats_actions','stats_event_audit','stats_coverage','stats_sessions']);
const commands={match_mode_access:['p_catalogue','p_match'],pilot_save_operator_state:['p_match','p_revision','p_state'],pilot_roster_catalogue:['p_match'],pilot_prepare_players:['p_match','p_mutation','p_players'],pilot_confirm_lineup:['p_match','p_mutation','p_revision','p_state'],stats_access:['p_match'],stats_write_event:['p_event','p_expected'],stats_save_session:['p_match','p_state','p_expected'],stats_grant:['p_grant'],stats_revoke:['p_id'],stats_set_coverage:['p_match','p_side','p_category','p_complete'],match_temporary_list:['p_match']};
const ident=s=>{if(!/^[a-z_][a-z0-9_]*$/.test(s))throw Error('Invalid column');return '"'+s+'"';};
const json=(res,value,status=200)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1048576)throw Error('Body too large');}return JSON.parse(raw||'{}');}
async function api(req,res,url){
 const b=await body(req);
 if(url.pathname==='/api/local-session'&&req.method==='POST'){
  const uid=b.role==='viewer'?ID.coach:ID.manager;
  const token=Buffer.from(JSON.stringify({alg:'LOCAL',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.'+crypto.randomBytes(32).toString('base64url');
  const session={access_token:token,refresh_token:crypto.randomUUID(),expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,aud:'authenticated',role:'authenticated',email:'local-rehearsal@example.invalid',app_metadata:{},user_metadata:{}}};sessions.set(token,session);return json(res,session);
 }
 const token=(req.headers.authorization||'').replace(/^Bearer /,''),session=sessions.get(token);
 if(!session||session.expires_at*1000<=Date.now())return json(res,{message:'Local session required'},401);
 const uid=session.user.id;
 if(url.pathname==='/api/auth/v1/user')return json(res,session.user);
 if(url.pathname==='/api/auth/v1/logout'){sessions.delete(token);return json(res,{});}
 const name=url.pathname.split('/').at(-1);
 if(url.pathname.includes('/rpc/')){
  if(name==='match_mode_access'&&b.p_catalogue&&!matches.includes(b.p_catalogue)){const f=catalogue.federation_matches.find(f=>f.id===b.p_catalogue);return json(res,{read:!!f,base:!!f,advanced:!!f,operational:null,operational_read:false,activate_base:false,activate_advanced:false});}
  if(name==='match_mode_access'&&matches.includes(b.p_catalogue)){b.p_match=b.p_catalogue;b.p_catalogue=null;}
  const keys=commands[name];if(!keys)return json(res,{message:'Command unavailable in local rehearsal'},403);
  const target=b.p_match||b.p_event?.match_id||b.p_grant?.match_id;
  if(target&&!matches.includes(target))return json(res,{message:'Outside local rehearsal'},403);
  const vals=keys.map(k=>b[k]&&typeof b[k]==='object'?JSON.stringify(b[k]):b[k]??null);
  const r=await asUser(db,uid,`select * from public.${ident(name)}(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,vals);
  return json(res,name==='pilot_save_operator_state'?r.rows:['stats_write_event','stats_save_session','stats_grant'].includes(name)?r.rows[0]:Object.values(r.rows[0]||{})[0]);
 }
 if(name==='basic_match_contexts')return json(res,req.headers.accept?.includes('vnd.pgrst.object+json')?null:[]);
 if(catalogue[name]){if(req.method!=='GET')return json(res,{message:'Official catalogue is read only'},403);const rows=catalogueQuery(catalogue[name],url.searchParams);return json(res,req.headers.accept?.includes('vnd.pgrst.object+json')?rows[0]||null:rows);}
 if(name==='federation_calendar_cache')return json(res,{data:bundle.calendar.fixtures.map(f=>({round:f.round_label,date:f.date,time:f.time,home_name:f.home_team,away_name:f.away_team,home_team_id:f.home_id,away_team_id:f.away_id,match_id:f.official_match_id,result:f.score?.join(':')}))});
 if(!tables.has(name))return json(res,{message:'Table unavailable locally'},403);
 if(req.method==='POST'&&name==='pilot_events'){
  const rows=Array.isArray(b)?b:[b];if(!rows.length||rows.some(r=>!matches.includes(r.match_id)||r.user_id!==uid))return json(res,{message:'Outside local scope'},403);
  const cols=[...new Set(rows.flatMap(Object.keys))],vals=[];
  const tuples=rows.map(row=>'('+cols.map(c=>{const v=row[c];vals.push(v!==null&&typeof v==='object'?JSON.stringify(v):v??null);return '$'+vals.length;}).join(',')+')');
  await asUser(db,uid,`insert into pilot_events(${cols.map(ident).join(',')}) values ${tuples.join(',')}`,vals);return json(res,null,201);
 }
 if(req.method!=='GET')return json(res,{message:'Official data is read only'},403);
 const columns=url.searchParams.get('select')||'*',select=columns==='*'?'*':columns.split(',').map(ident).join(',');
 const values=[],filters=[];
 if(name!=='stats_actions'){const field=name==='pilot_matches'?'id':'match_id';values.push(...matches);filters.push(`${ident(field)} in ($1,$2)`);}
 for(const [key,expression] of url.searchParams){if(['select','order','limit','offset'].includes(key))continue;const [op,...parts]=expression.split('.'),v=parts.join('.');
  if(op==='eq'){values.push(v);filters.push(`${ident(key)}=$${values.length}`);}
  else if(op==='in'){const items=v.slice(1,-1).split(',').filter(Boolean);if(!items.length)filters.push('false');else filters.push(ident(key)+' in ('+items.map(x=>{values.push(x.replace(/^"|"$/g,''));return '$'+values.length;}).join(',')+')');}
  else throw Error('Unsupported filter');
 }
 const order=(url.searchParams.get('order')||'').split(',').filter(Boolean).map(o=>{const [c,d]=o.split('.');return ident(c)+(d==='desc'?' desc':' asc');}).join(',');
 const offset=Math.max(0,Number(url.searchParams.get('offset')||0)),limit=Math.min(1000,Math.max(0,Number(url.searchParams.get('limit')||1000)));
 if(!Number.isInteger(offset)||!Number.isInteger(limit))throw Error('Invalid range');
 const r=await asUser(db,uid,`select ${select} from public.${ident(name)}${filters.length?' where '+filters.join(' and '):''}${order?' order by '+order:''} limit ${limit} offset ${offset}`,values);
 if(req.headers.accept?.includes('vnd.pgrst.object+json'))return r.rows.length===1?json(res,r.rows[0]):json(res,{code:'PGRST116',message:'Expected one row',details:r.rows.length+' rows'},406);
 return json(res,r.rows);
}
const client=`export const db=window.supabase.createClient(location.origin+'/api','local-rehearsal-only',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const requestedRole=new URLSearchParams(location.search).get('localRole');if(['operator','viewer'].includes(requestedRole))sessionStorage.setItem('ch360-local-replay-role',requestedRole);
const session=await fetch('/api/local-session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:sessionStorage.getItem('ch360-local-replay-role')||'operator'})}).then(r=>r.json());await db.auth.setSession(session);
db.channel=()=>({on(){return this},subscribe(){return this}});db.removeChannel=async()=>{};`;
const staticFiles=new Set(fs.readdirSync(root).filter(f=>/\.(html|js|css)$/.test(f)));
async function route(req,res){
 const origin='http://'+req.headers.host;if(!new RegExp('^127\\.0\\.0\\.1:'+port+'$').test(req.headers.host||''))return json(res,{},403);
 if(req.headers.origin&&req.headers.origin!==origin)return json(res,{},403);
 const url=new URL(req.url,origin);
 if(url.pathname==='/health')return json(res,{mode:'LOCAL_OFFICIAL_REPLAY',production:false,ids,officialHash:bundle.officialHash,teams:catalogue.teams.length,fixtures:catalogue.federation_matches.length});
 if(url.pathname==='/evidence'){const r=await asOwner(db,'select hash,document from local_official_snapshots');const events=await asOwner(db,'select count(*) count from pilot_events where match_id=$1',[ids.vic]);const roster=await asOwner(db,"select team,count(*) count from pilot_players where match_id=$1 group by team",[ids.vic]);return json(res,{officialUnchanged:r.rows[0].hash===bundle.officialHash&&isDeepStrictEqual(r.rows[0].document,bundle.report),events:events.rows[0].count,rosters:Object.fromEntries(roster.rows.map(r=>[r.team,Number(r.count)]))});}
 if(url.pathname.startsWith('/api/'))return api(req,res,url);
 if(url.pathname==='/dashboard.html'){res.writeHead(302,{location:'/club.html'});return res.end();}
 if(url.pathname==='/'){res.writeHead(302,{location:'/partit.html'});return res.end();}
 if(url.pathname==='/vic'||url.pathname==='/noia'){res.writeHead(302,{location:'/base.html?match='+ids[url.pathname==='/noia'?'noia':'vic']});return res.end();}
 let file=url.pathname.slice(1),data,mime;
 if(file==='supabase.js'){data=fs.readFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js');mime='text/javascript';}
 else if(file==='app-client.js'){data=client;mime='text/javascript';}
 else{if(!staticFiles.has(file))return json(res,{},404);data=fs.readFileSync(file,'utf8');mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(file)];
  if(file.endsWith('.html'))data=data.replace(/https:\/\/cdn.jsdelivr.net\/npm\/@supabase\/supabase-js@[^"']+\/dist\/umd\/supabase.js/g,'/supabase.js').replace('<body>','<body><p style="padding:12px;background:#fff2b3;color:#111">DIFERIT LOCAL · Dades públiques federatives · anotacions pròpies separades de l’acta · no modifica producció. <a href="/club.html">Tots els equips</a> · <a href="/partit.html">Selecciona partit</a> · <a href="/vic">SIMAR–Vic</a> · <a href="/noia">SIMAR–Noia</a></p>');
 }
 res.writeHead(200,{'content-type':mime,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://sidgad.cloud https://www.sidgad.cloud data:; connect-src 'self'; frame-src 'none'; base-uri 'self'"});res.end(data);
}
http.createServer((req,res)=>{serial=serial.then(()=>route(req,res)).catch(e=>json(res,{code:e.code||'LOCAL_ERROR',message:e.message},e.code==='42501'?403:400));}).listen(port,'127.0.0.1',()=>console.log('Official replay ready: http://127.0.0.1:'+port+'/vic'));
