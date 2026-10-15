import { parseHTML } from 'npm:linkedom@0.18.12';
import { parseCalendar, parseMatch, parseStandings } from './parser.ts';
export const FEM15={federation:'FECAPA',season_id:'41',season_label:'2026/27',competition_id:'4802',team_id:'12419',club_id:'252',name:'IGUALADA HC',competition_name:'FEM 15 OR',url:'https://www.hoqueipatins.fecapa.cat/league/4802'};
const clean=(e:any)=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
const numeric=(e:any)=>/^\d+$/.test(clean(e))?Number(clean(e)):null;
export function parseFem15Roster(html:string){
 const {document:d}=parseHTML(html);const people:any[]=[];
 for(const tr of Array.from(d.querySelectorAll('tr.teamid_12419')) as any[]){
  const cells=Array.from(tr.children) as any[];const link=tr.querySelector('[id_player][team_id="12419"]');
  const external_id=link?.getAttribute('id_player')||tr.id.replace('filaplayer_','');
  if(!/^[1-9]\d*$/.test(external_id)||cells.length<5)throw Error('Invalid official roster identity');
  const role=link?'player':'staff',name=clean(link||cells[4]);if(!name)throw Error('Empty roster name');
  const person:any={external_id,role,name};
  if(role==='player')Object.assign(person,{goals:numeric(cells[5]),games:numeric(cells[6]),assists:numeric(cells[8]),blue_cards:numeric(cells[14]),red_cards:numeric(cells[16]),yellow_cards:null,goals_attribution:'unverified'});
  people.push(person);
 }
 if(!people.some(p=>p.role==='player'))throw Error('FEM15 roster is missing');
 if(new Set(people.map(p=>p.role+':'+p.external_id)).size!==people.length)throw Error('Duplicate official roster identities');
 return people;
}
export function buildFem15Dataset(calendarHtml:string,standingsHtml:string,rosterHtml:string,reports:Record<string,string>){
 const {document:d}=parseHTML(calendarHtml);const groups=Array.from(d.querySelectorAll('select option')).filter((e:any)=>clean(e)===FEM15.competition_name&&/^[1-9]\d*$/.test(e.getAttribute('value')||''));
 if(groups.length!==1)throw Error('FEM15 group identifier not verified');
 const group_id=(groups[0] as any).getAttribute('value');
 const calendar=parseCalendar(calendarHtml).filter(r=>r.home_team_id===FEM15.team_id||r.away_team_id===FEM15.team_id);
 if(!calendar.length||calendar.some(r=>(r.home_team_id===FEM15.team_id?r.home_name:r.away_name)!==FEM15.name))throw Error('FEM15 calendar team identity mismatch');
 const standings=parseStandings(standingsHtml).filter(g=>g.rows.some(r=>r.team_name===FEM15.name));if(standings.length!==1)throw Error('FEM15 standings group is ambiguous');
 const roster=parseFem15Roster(rosterHtml);const matches:any[]=[];
 const crests=new Map<string,string[]>();for(const tr of Array.from(d.querySelectorAll('#my_calendar_table tr.team_12419')) as any[]){const ids=(tr.className.match(/team_(\d+)/g)||[]).map((v:string)=>v.replace('team_',''));const imgs=Array.from(tr.querySelectorAll('img.team_logo')).map((e:any)=>e.getAttribute('src'));if(ids.length===2&&imgs.length===2)crests.set(ids.join(':'),imgs as string[]);}

 for(const fixture of calendar){
  const result=fixture.result?.match(/^(\d+)\s*-\s*(\d+)$/);const fingerprint=`FECAPA:41:4802:${group_id}:${fixture.round}:${fixture.home_team_id}:${fixture.away_team_id}`;
  const logos=crests.get(fixture.home_team_id+':'+fixture.away_team_id)||[];for(const url of logos){const u=new URL(url);if(!['sidgad.cloud','www.sidgad.cloud'].includes(u.hostname)||!u.pathname.includes('/logos_clubes/'))throw Error('Unexpected team crest');} const row:any={...fixture,home_crest:logos[0]||null,away_crest:logos[1]||null,fingerprint,group_id,home_score:result?Number(result[1]):null,away_score:result?Number(result[2]):null};
  if(fixture.match_id){
   const html=reports[fixture.match_id];if(!html)throw Error('Missing report for '+fixture.match_id);
   const report=parseMatch(html,{...FEM15,federation_match_id:fixture.match_id,federation_url:FEM15.url});
   if(report.home_name!==fixture.home_name||report.away_name!==fixture.away_name)throw Error('Calendar/report team mismatch for '+fixture.match_id);
   if(report.home_score===null&&report.away_score===null){Object.assign(report,{home_score:row.home_score,away_score:row.away_score,score_source:'calendar',report_score_unavailable:true});}else if(report.home_score!==row.home_score||report.away_score!==row.away_score)throw Error('Calendar/report score mismatch for '+fixture.match_id);else Object.assign(report,{score_source:'calendar_and_report',report_score_unavailable:false});
   const {document:acta}=parseHTML(html);const cells=acta.querySelector('table tr')?.children;
   report.venue=cells?.[1]?clean(cells[1])||null:null;
   Object.assign(report,{home_team_id:fixture.home_team_id,away_team_id:fixture.away_team_id,date:fixture.date,time:fixture.time,round:fixture.round,group_id});
   row.venue=report.venue||fixture.venue;row.report=report;
  }
  matches.push(row);
 }
 // Dorsals and goalkeeper roles are observations of the latest accessible match, not assumptions.
 const byId=new Map<string,any>();for(const m of [...matches].filter(m=>m.report).sort((a,b)=>a.date.split('/').reverse().join('').localeCompare(b.date.split('/').reverse().join('')))){
  const side=m.home_team_id===FEM15.team_id?'home':'away';for(const p of m.report.players.filter((p:any)=>p.team===side))byId.set(p.external_id,{shirt_number:p.dorsal,is_goalkeeper:p.position==='goalkeeper',observed_match_id:m.match_id});
 }
 for(const p of roster)if(p.role==='player')Object.assign(p,byId.get(p.external_id)||{shirt_number:null,is_goalkeeper:null,observed_match_id:null});
 return {...FEM15,group_id,roster,matches,standings,fetched_at:new Date().toISOString(),limitations:{pending_match_ids:'not_published',individual_goals:'published_totals_unverified',event_timeline:'not_available_when_empty',personal_data:'names_and_sporting_identifiers_only'}};
}
export async function syncFem15(db:any,{actor=null,force=false}:{actor?:string|null,force?:boolean}={}){
 const cache=await db.from('federation_team_entries').select('fetched_at').eq('external_team_id',FEM15.team_id).maybeSingle();if(cache.error)throw cache.error;
 if(!force&&cache.data?.fetched_at&&Date.now()-Date.parse(cache.data.fetched_at)<6*3600000)return {status:'cached',team_id:FEM15.team_id};
 const run=await db.from('federation_import_runs').insert({federation:'FECAPA',resource_type:'team',external_resource_id:'12419',source_url:FEM15.url,status:'started',details:{competition_id:'4802',season_id:'41'}}).select('id').single();if(run.error)throw run.error;
 try{
  const fetchHtml=async(file:string,params:Record<string,string>)=>{const r=await fetch('https://www.server2.sidgad.es/fecapa/'+file,{method:'POST',headers:{Origin:'https://www.hoqueipatins.fecapa.cat',Referer:FEM15.url,'X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams(params),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Official source HTTP '+r.status);const h=await r.text();if(!h.trim()||h.length>3000000)throw Error('Empty or excessive official response');return h;};
  const calendar=await fetchHtml('fecapa_cal_idc_4802_1.php',{idc:'4802',site_lang:'ca'});
  const standings=await fetchHtml('fecapa_clasif_idc_4802_1.php',{idc:'4802',site_lang:'ca'});
  const roster=await fetchHtml('fecapa_stats_1_4802.php',{idc:'4802',site_lang:'ca',tipo_stats:'plantillas'});
  const targets=parseCalendar(calendar).filter(r=>r.home_team_id==='12419'||r.away_team_id==='12419');const reports:Record<string,string>={};
  for(const fixture of targets.filter(r=>r.match_id))reports[fixture.match_id]=await fetchHtml(`fecapa_gr_${fixture.match_id}_1.php`,{idm:'1',idc:'4802',idp:fixture.match_id,tab:'tab_ficha_resumen'});
  const data=buildFem15Dataset(calendar,standings,roster,reports);
  const committed=await db.rpc('federation_commit_fem15',{p_data:data,p_actor:actor});if(committed.error)throw committed.error;
  const result={status:'verified',team_id:'12419',...committed.data};
  const logged=await db.from('federation_import_runs').update({status:'success',finished_at:new Date().toISOString(),records_read:data.matches.length+data.roster.length,records_written:committed.data.matches+committed.data.roster,details:{...result,limitations:data.limitations}}).eq('id',run.data.id);if(logged.error)throw logged.error;
  return result;
 }catch(e){await db.from('federation_import_runs').update({status:'failed',finished_at:new Date().toISOString(),error_summary:String(e.message||e).slice(0,500)}).eq('id',run.data.id);throw e;}
}
