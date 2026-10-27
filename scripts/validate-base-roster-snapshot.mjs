// Offline, read-only replay of a minimized catalogue snapshot. No network or writes to DB.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalogueRoster} from '../basic-roster.js';
import {readCatalogueFixture} from '../basic-practice.js';
import {categoryKey} from '../basic-eligibility.js';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/validate-base-roster-snapshot.mjs snapshot.json summary.json');
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const digest=()=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const before=digest();
const db={from(table){let predicates=[],start=0,end=Infinity,single=false;const q={
 select(){return q;},eq(k,v){predicates.push(r=>r[k]===v);return q;},in(k,values){predicates.push(r=>values.includes(r[k]));return q;},order(){return q;},range(a,b){start=a;end=b;return q;},maybeSingle(){single=true;return q;},
 then(resolve,reject){const rows=(data[table]||[]).filter(r=>predicates.every(f=>f(r))).slice(start,end+1);return Promise.resolve({data:single?rows[0]||null:rows,error:null}).then(resolve,reject);}
};return q;}};
const baseCategories=new Set(['PREBENJAMIINICIACIO','PREBENJAMI','BENJAMI','ALEVI','INFANTIL','JUVENIL','JUNIOR','FEM9','FEM11','FEM13','FEM15','FEM17']);
const results=[];
for(const team of data.teams.filter(t=>baseCategories.has(categoryKey(t.category))).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name))){
 const entries=data.federation_team_entries.filter(e=>e.club_team_id===team.id);
 const links=data.federation_match_teams.filter(l=>entries.some(e=>e.id===l.entry_id));
 const games=data.federation_matches.filter(g=>links.some(l=>l.match_id===g.id));
 const next=games.filter(g=>g.federation_start_at&&Date.parse(g.federation_start_at)>=Date.parse(data.captured_at)).sort((a,b)=>a.federation_start_at.localeCompare(b.federation_start_at))[0];
 const last=games.filter(g=>g.raw_data?.report_status==='verified').sort((a,b)=>String(b.federation_start_at).localeCompare(String(a.federation_start_at)))[0];
 const samples=[];
 for(const [kind,game] of [['next',next],['verified_report',last]]){
  if(!game)continue;
  const side=links.find(l=>l.match_id===game.id)?.side;
  try{
   const input=await readCatalogueFixture(db,game.id);
   const out=await catalogueRoster(db,input);
   const own=out.players.filter(p=>p.team===side),regular=own.filter(p=>!p.reinforcement),reinforcements=own.filter(p=>p.reinforcement);
   const violations=[];
   if(!out.restrictedSides?.includes(side))violations.push('IHC side not scoped');
   const identities=own.map(p=>p.federation_player_id||p.catalog_player_id||p.id);
   if(new Set(identities).size!==identities.length)violations.push('Duplicate identities');
   if(reinforcements.some(p=>p.selectable&&!p.matchVerified))violations.push('Unverified reinforcement selectable');
   for(const p of regular){
    const inReport=data.federation_match_lineups.some(l=>l.match_id===game.id&&l.side===side&&l.id===p.catalog_lineup_id);
    const inRoster=data.federation_team_roster.some(r=>entries.some(e=>e.id===r.entry_id)&&r.player_id===p.catalog_player_id&&r.raw_data?.observed_match_id&&games.some(g=>g.external_match_id===r.raw_data.observed_match_id&&g.raw_data?.report_status==='verified'&&Date.parse(g.federation_start_at)<=Date.parse(game.federation_start_at)));
    const inPrior=data.federation_match_lineups.some(l=>{const g=games.find(g=>g.id===l.match_id);return g&&Date.parse(g.federation_start_at)<Date.parse(game.federation_start_at)&&entries.some(e=>e.external_team_id===g.raw_data?.[l.side+'_team_id'])&&((l.player_id&&l.player_id===p.catalog_player_id)||(l.raw_data?.external_id&&l.raw_data.external_id===p.federation_player_id));});
    if(!inReport&&!inRoster&&!inPrior)violations.push('Own membership lacks team evidence');
   }
   samples.push({kind,match_id:game.id,side,regular:regular.length,reinforcements:reinforcements.length,blocked_reinforcements:reinforcements.filter(p=>!p.selectable).length,violations});
  }catch(error){samples.push({kind,match_id:game.id,side,violations:[error.message]});}
 }
 const violations=samples.flatMap(s=>s.violations);
 const status=violations.length?'incidència':!next||!samples.find(s=>s.kind==='next')?.regular?'pendent per manca de dades':'verificat';
 results.push({team_id:team.id,team:team.name,category:team.category,entries:entries.length,fixtures:games.length,verified_reports:games.filter(g=>g.raw_data?.report_status==='verified').length,status,samples});
}
const absent=[...baseCategories].filter(c=>!data.teams.some(t=>categoryKey(t.category)===c));
if(before!==digest())throw Error('Snapshot changed during replay');
const summary={captured_at:data.captured_at,season:'2026/27',source:'Supabase catalogue read-only snapshot; personal names and birth/sex values omitted',snapshot_sha256:before,eligibility_rules_changed:false,production_writes:0,scope:'IHC Base catalogue replay; not authenticated browser or official eligibility certification',results,absent_categories:absent,counts:Object.fromEntries(['verificat','incidència','pendent per manca de dades'].map(s=>[s,results.filter(t=>t.status===s).length]))};
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({teams:results.length,counts:summary.counts,absent},null,2));
