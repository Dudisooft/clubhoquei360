// Loopback-only functional lab. Public calendar metadata + fictional operators.
// This process never imports app-client.js or connects to production Supabase.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import crypto from 'node:crypto';import {isDeepStrictEqual} from 'node:util';
import {PGlite} from '@electric-sql/pglite';import {PublicFederation} from './lib/public-federation.mjs';import {ACTIONS} from '../stats-model.js';
import {validateAccess, invitationGrant} from './lib/pilot-access.mjs';
const access=process.env.PILOT_ACCESS_FILE?validateAccess(JSON.parse(fs.readFileSync(process.env.PILOT_ACCESS_FILE,'utf8'))):null;
const root=fileURLToPath(new URL('..',import.meta.url));
const work=process.env.PILOT_DATA_DIR||path.join(root,'work','functional-demo');fs.mkdirSync(work,{recursive:true});
const db=new PGlite(path.join(work,'club-statistics'));
await db.exec('create table if not exists pilot_demo_events(id uuid primary key, mutation_id uuid unique not null, club text not null, match text not null, user_id text not null, payload jsonb not null, created_at timestamptz default now())');
const snapshotsDir=process.env.PILOT_SNAPSHOT_DIR||path.join(root,'work','public-cache');fs.mkdirSync(snapshotsDir,{recursive:true});
const seed=JSON.parse(fs.readFileSync(new URL('../demo/public-calendar-snapshot.json',import.meta.url),'utf8'));
const stored=fs.readdirSync(snapshotsDir).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync(path.join(snapshotsDir,x),'utf8')));
const snapshots=[...new Map([...seed,...stored].map(s=>[s.key,s])).values()];
const source=new PublicFederation({snapshots,onSnapshot:s=>{fs.writeFileSync(path.join(snapshotsDir,s.key.replaceAll(':','-')+'.json'),JSON.stringify(s,null,2));}});
const grants=new Map();const actions=new Set(ACTIONS.map(x=>x.code));let serial=Promise.resolve();
const allowedFiles=new Set(['pilot-demo.html','pilot-demo.js','pilot-demo.css','pilot-journal.js','callup-model.js','stats-clock.js','stats-model.js']);
const json=(res,body,status=200)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));};
function fixture(id){for(const s of source.cache.values()){const f=s.fixtures?.find(x=>x.id===id);if(f)return f;}return null;}
function authorize(req,match,write=false){const g=grants.get((req.headers.authorization||'').replace(/^Bearer /,''));if(!g||g.expiresAt<Date.now()||g.match!==match||write&&g.role==='coach')throw Object.assign(Error('Accés fictici caducat, de només lectura o fora del partit'),{status:403});return g;}
async function body(req){let b='';for await(const chunk of req){b+=chunk;if(Buffer.byteLength(b)>65536)throw Object.assign(Error('Petició massa gran'),{status:413});}return JSON.parse(b||'{}');}
async function route(req,res){
 const origin=`http://${req.headers.host}`;const url=new URL(req.url,origin);
 if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))return json(res,{error:'Host no permès'},403);
 if(req.headers.origin&&req.headers.origin!==origin)return json(res,{error:'Origen no permès'},403);
 if(url.pathname==='/health')return json(res,{mode:access?'LOCAL_AUTHENTICATED_PILOT':'ISOLATED_DEMO',statistics:'fictional',production:false});
 if(url.pathname==='/api/logout'&&req.method==='POST'){grants.delete((req.headers.authorization||'').replace(/^Bearer /,''));return json(res,{signedOut:true});}
 if(url.pathname==='/api/calendar'&&req.method==='GET'){
  const fed=url.searchParams.get('federation')||'RFEP',comp=url.searchParams.get('competition')||'3575';
  const result=await source.calendar(fed,comp,'41');return json(res,result);
 }
 if(url.pathname==='/api/report'&&req.method==='GET'){
  const f=fixture(url.searchParams.get('match'));if(!f)return json(res,{error:'Partit desconegut'},404);
  // Only adult RFEP competition is enabled for real lineup evidence in this lab.
  if(f.federation!=='RFEP'||f.competition_id!=='3575')return json(res,{status:'not_checked',sides:{home:[],away:[]}});
  return json(res,await source.report(f));
 }
 if(url.pathname==='/api/demo-session'&&req.method==='POST'){
  if(access)return json(res,{error:'Une invitació local és necessària'},403);
  const b=await body(req),f=fixture(b.match);if(!f||!['operator','coach','external'].includes(b.role))return json(res,{error:'Àmbit de prova invàlid'},400);
  if(![f.home_id,f.away_id].includes(b.team))return json(res,{error:'Equip fora del partit'},400);
  const lifetime=Math.min(3600000,Math.max(100,Number(process.env.PILOT_GRANT_MS)||3600000));
  const token=crypto.randomUUID(),grant={match:f.id,club:f.federation+':'+b.team,role:b.role,user:'fictional-'+b.role,expiresAt:Date.now()+lifetime};grants.set(token,grant);return json(res,{token,...grant,fictional:true});
 }
 if(url.pathname==='/api/pilot-session'&&req.method==='POST'){
  if(!access)return json(res,{error:'Mode autenticat no configurat'},403);
  const b=await body(req),f=fixture(b.match),g=invitationGrant(access,b.invitation,b.match,b.team);
  if(!f||!g||g.club!==f.federation+':'+b.team||![f.home_id,f.away_id].includes(b.team))return json(res,{error:'Invitació invàlida, caducada o fora del partit'},403);
  const token=crypto.randomBytes(32).toString('base64url');grants.set(token,g);return json(res,{token,...g,fictional:true,authenticated:true});
 }
 if(url.pathname==='/api/events'&&req.method==='GET'){
  const match=url.searchParams.get('match'),g=authorize(req,match);const r=await db.query('select payload from pilot_demo_events where club=$1 and match=$2 order by created_at,id',[g.club,g.match]);return json(res,r.rows.map(x=>x.payload));
 }
 if(url.pathname==='/api/events'&&req.method==='POST'){
  const e=await body(req),g=authorize(req,e.match_id,true);
  if(!actions.has(e.action)||!['home','away'].includes(e.side)||!/^fictional-[1-5]$/.test(e.player_id)||!Number.isInteger(e.match_ms)||e.match_ms<0||e.match_ms>21600000||e.user_id!==g.user||e.club_id!==g.club)return json(res,{error:'Acció o àmbit invàlid'},400);
  const old=await db.query('select payload from pilot_demo_events where id=$1 or mutation_id=$2',[e.id,e.mutation_id]);
  if(old.rows.length){if(!isDeepStrictEqual(old.rows[0].payload,e))return json(res,{error:'Conflicte de versió: acció conservada per revisar'},409);return json(res,{saved:true,id:e.id,duplicate:true});}
  await db.query('insert into pilot_demo_events(id,mutation_id,club,match,user_id,payload) values($1,$2,$3,$4,$5,$6)',[e.id,e.mutation_id,g.club,g.match,g.user,JSON.stringify(e)]);return json(res,{saved:true,id:e.id});
 }
 const filename=url.pathname==='/'?'pilot-demo.html':url.pathname.slice(1);if(!allowedFiles.has(filename))return json(res,{error:'No trobat'},404);
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
 res.writeHead(200,{'content-type':mime[path.extname(filename)],'x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-src 'none'; base-uri 'none'; form-action 'none'"});res.end(fs.readFileSync(path.join(root,filename)));
}
const server=http.createServer((req,res)=>{serial=serial.then(()=>route(req,res)).catch(e=>json(res,{error:e.status?e.message:'No s’ha pogut completar l’operació; les dades locals es conserven'},e.status||502));});
server.listen(Number(process.env.PILOT_PORT)||4180,'127.0.0.1',()=>console.log('ClubHoquei360 pilot demo: http://127.0.0.1:'+server.address().port+' — fictional statistics, real public calendar'));
