import { parseHTML } from 'npm:linkedom@0.18.12';
const clean=(x:any)=>String(x?.textContent??'').replace(/\s+/g,' ').trim();
const number=(x:any)=>/^\d+$/.test(clean(x))?Number(clean(x)):null;
export function parseMatch(html:string,source:any){
 const {document:d}=parseHTML(html);
 const home=clean(d.querySelector('.nombre1')),away=clean(d.querySelector('.nombre2'));
 const score=[number(d.querySelector('#home_score')),number(d.querySelector('#away_score'))];
 if(!home||!away)throw Error('Missing official team names');
 const tables=Array.from(d.querySelectorAll('table.competiciones_tabla_basic')).filter((t:any)=>t.querySelector('.nombre_equipo_thickbox_stats'));
 if(tables.length!==2)throw Error('Expected exactly two official roster tables');
 const players:any[]=[],staff:any[]=[];
 tables.forEach((table:any,index:number)=>{
  const team=index===0?'home':'away';
  if(clean(table.querySelector('.nombre_equipo_thickbox_stats'))!==(index===0?home:away))throw Error('Roster team mismatch');
  for(const tr of Array.from(table.querySelectorAll('tr')) as any[]){
   const cells=Array.from(tr.children).filter((c:any)=>c.tagName==='TD') as any[];
   const identified=tr.querySelector('div[id]');
   if(cells.length>=15 && /^\d+$/.test(clean(cells[0])) && identified && /^[1-9]\d*$/.test(identified.id)){
    const external_id=identified.id,name=clean(identified).replace(/^[A-Z0-9]+\s*-\s*/, '');
    if(!name)throw Error('Empty player name');
    players.push({external_id,team,dorsal:clean(cells[0]),name,position:clean(cells[1])==='P'?'goalkeeper':'field',starter:clean(cells[3])==='5',captain:clean(cells[5]).includes('(C)'),goals:number(cells[6]),assists:number(cells[7]),yellow:number(cells[12]),blue:number(cells[13]),red:number(cells[14])});
   }else if(cells.length>=7&&/^(E1|E2|D|A|M|F)$/.test(clean(cells[1]))){staff.push({team,role:clean(cells[1]),name:clean(cells[3])});}
  }
 });
 for(const team of ['home','away'])if(!players.some(p=>p.team===team&&p.position==='goalkeeper'))throw Error('Goalkeeper not verified for '+team);
 if(new Set(players.map(p=>p.team+':'+p.external_id)).size!==players.length)throw Error('Duplicate player identifiers');
 const crest=(sel:string)=>{const raw=d.querySelector(sel)?.getAttribute('src');if(!raw)return null;const u=new URL(raw);if(!['www.sidgad.cloud','sidgad.cloud'].includes(u.hostname)||!u.pathname.includes('/logos_clubes/'))throw Error('Unexpected crest URL');return u.href;};
 const incidents=Array.from(d.querySelectorAll('#game_report_inicidencias tr')).map((tr:any)=>({text:clean(tr),player_ids:Array.from(tr.querySelectorAll('a[id]')).map((e:any)=>e.id).filter((x:string)=>/^[1-9]\d*$/.test(x))}));
 return {federation:source.federation,match_id:source.federation_match_id,competition_id:source.competition_id,season_id:source.season_id,home_name:home,away_name:away,home_crest:crest('.logo1 img'),away_crest:crest('.logo2 img'),home_score:score[0],away_score:score[1],players,staff,incidents,official_status:clean(d.querySelector('#game_period')),fetched_at:new Date().toISOString(),source_url:source.federation_url};
}
export function parseCalendar(html:string){
 const {document:d}=parseHTML(html);let round='';const matches:any[]=[];
 for(const tr of Array.from(d.querySelectorAll('#my_calendar_table tr')) as any[]){
  const c=Array.from(tr.children).filter((e:any)=>e.tagName==='TD') as any[];
  if(c.length===1){round=clean(c[0]);continue;} if(c.length<6)continue;
  const link=tr.querySelector('[id^="fichapartido_"]');
  const id=link?.id?.replace('fichapartido_','')||null;
  const names=Array.from(tr.querySelectorAll('.nombre_junto_logo')).map(clean);if(names.length!==2)continue; const texts=c.map(clean); const date=texts.find(t=>/^\d{2}\/\d{2}\/\d{4}$/.test(t))||''; const time=texts.find(t=>/^\d{2}:\d{2}$/.test(t))||''; const dateIndex=texts.indexOf(date); const roundLabel=clean(tr.querySelector('.jor_in_games'))||round; const result=texts.find(t=>/^\d+\s*-\s*\d+$/.test(t)||/^(SUSPENDIDO|AJORNAT|PENDIENTE)$/.test(t))||null; const teams=(tr.className.match(/team_(\d+)/g)||[]).map((x:string)=>x.replace('team_','')); matches.push({match_id:id,round:roundLabel,date,time,venue:texts[dateIndex+2]||null,home_name:names[0],away_name:names[1],home_team_id:teams[0]||null,away_team_id:teams[1]||null,result});
 }
 if(!matches.length)throw Error('Empty/unrecognized official calendar');return matches;
}
export function parseStandings(html:string){
 const {document:d}=parseHTML(html);const groups=Array.from(d.querySelectorAll('table.tabla_standard')).map((table:any,index)=>({group_index:index,heading:clean(table.previousElementSibling)||null,rows:Array.from(table.querySelectorAll('tr')).map((tr:any)=>{const c=Array.from(tr.children) as any[];if(c.length<11||number(c[0])===null)return null;return {rank:number(c[0]),team_name:clean(c[2].querySelector('.no_mobile')||c[2]),points:number(c[3]),played:number(c[4]),won:number(c[5]),drawn:number(c[6]),lost:number(c[7]),goals_for:number(c[8]),goals_against:number(c[9]),goal_difference:clean(c[10])};}).filter(Boolean)})).filter(g=>g.rows.length);
 if(!groups.length)throw Error('Unrecognized standings table');return groups;
}
