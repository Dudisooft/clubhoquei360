import {parseHTML} from 'npm:linkedom@0.18.12';
import {parseCalendar,parseMatch,parseStandings} from '../federation-sync/parser.ts';
const text=(e:any)=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
const num=(e:any)=>/^\d+$/.test(text(e))?Number(text(e)):null;
export const SOURCES={FECAPA:{club:'252',origin:'https://www.hoqueipatins.fecapa.cat'},RFEP:{club:'69',origin:'https://hockeypatines.fep.es'}};
export function discover(html:string,federation:keyof typeof SOURCES){
 const {document:d}=parseHTML(html);return [...d.querySelectorAll('.listado_competiciones_fila.temp_41')].filter(e=>e.classList.contains('club_'+SOURCES[federation].club)).map(e=>({federation,id:e.id,name:(e.getAttribute('idc_name')||text(e)).trim()}));
}
export function category(name:string){return name.replace(/\s+(OR|PLATA|BRONZE)(\s.*)?$/,'').replace(/\s+BARCELONA$/,'').trim();}
export function parseCompetition(config:any,calendarHtml:string,rosterHtml:string,standingsHtml:string){
 const federation=config.federation as keyof typeof SOURCES;const source=SOURCES[federation];if(!source||!/^\d+$/.test(config.id))throw Error('Invalid source');
 const {document:d}=parseHTML(calendarHtml);const groupNames=new Map([...d.querySelectorAll('select option')].map(e=>[e.getAttribute('value'),text(e)]));
 const teams=new Map<string,any>();const fixtures:any[]=[];
 for(const table of [...d.querySelectorAll('table[id="my_calendar_table"]')]){
  const group=table.className.match(/content_fase_(\d+)/)?.[1];if(!group)throw Error('Unverified group identity');if(!groupNames.has(group)){const heading=d.querySelector('.filter_fase_'+group);if(!heading&&group!==config.id)throw Error('Unverified group name');groupNames.set(group,text(heading)||config.name);}
  let currentRound='';for(const tr of [...table.querySelectorAll('tr')]){
   const cells=[...tr.children].filter(e=>e.tagName==='TD');if(cells.length===1){currentRound=text(cells[0]);continue;}
   const names=[...tr.querySelectorAll('.nombre_junto_logo')].map(text),ids=(tr.className.match(/team_(\d+)/g)||[]).map(s=>s.slice(5)),logos=[...tr.querySelectorAll('img.team_logo')].map(e=>e.getAttribute('src'));
   if(names.length!==2||ids.length!==2)continue;
   const own=ids.map((id,i)=>{const u=logos[i]?new URL(logos[i]!):null;return !!u&&['sidgad.cloud','www.sidgad.cloud'].includes(u.hostname)&&new RegExp('/logos_clubes/'+source.club+'(?:_[0-9]+)?\\.(png|gif|jpg)$','i').test(u.pathname);});
   if(!own.some(Boolean))continue;
   own.forEach((yes,i)=>{if(!yes)return;if(!/IGUALADA/i.test(names[i])||/FEMEN[IÍ]/i.test(names[i]))throw Error('Unexpected club identity');let t=teams.get(ids[i]);if(t&&t.name!==names[i])throw Error('Ambiguous team name');if(!t){t={external_team_id:ids[i],name:names[i],short_name:names[i].replace('IGUALADA','IHC').replace(/IHC HC/,'IHC'),category:category(config.name),crest_url:logos[i],group_ids:[],roster:[],status:'active',verification:'official'};teams.set(ids[i],t);}if(!t.group_ids.includes(group))t.group_ids.push(group);});
   const wrapped='<table id="my_calendar_table">'+tr.outerHTML+'</table>';const row=parseCalendar(wrapped)[0];
   const scores=row.result?.match(/^(\d+)\s*-\s*(\d+)$/);const round=row.round||text(tr.querySelector('.jor_in_games'))||currentRound;if(!round)throw Error('Fixture round missing');
   const fixture={...row,date:row.date||null,time:row.time||null,venue:row.date?row.venue:null,round,group_id:group,group_name:groupNames.get(group),home_crest:logos[0],away_crest:logos[1],home_score:scores?Number(scores[1]):null,away_score:scores?Number(scores[2]):null,club_sides:own.map((v,i)=>v?(i?'away':'home'):null).filter(Boolean),fingerprint:`${federation}:41:${config.id}:${group}:${round}:${ids[0]}:${ids[1]}`};
   fixtures.push(fixture);
  }
 }
 if(!teams.size||!fixtures.length)throw Error('No verified IHC teams or fixtures');
 if(new Set(fixtures.map(f=>f.fingerprint)).size!==fixtures.length)throw Error('Duplicate fixture identities');
 const {document:r}=parseHTML(rosterHtml);
 const opponents=new Map<string,any>();
 for(const m of fixtures)for(const side of ['home','away']){const id=m[side+'_team_id'];if(teams.has(id))continue;const name=m[side+'_name'];const prior=opponents.get(id);if(prior&&prior.name!==name)throw Error('Ambiguous opponent identity');if(!prior)opponents.set(id,{external_team_id:id,name,roster:[]});}
 for(const team of opponents.values())for(const tr of [...r.querySelectorAll('tr.teamid_'+team.external_team_id)]){
  const link=tr.querySelector('[id_player]');if(!link)continue; // staff and aggregates are not players
  const external_id=link.getAttribute('id_player'),name=text(link);
  if(!/^[1-9]\d*$/.test(external_id||'')||!name||link.getAttribute('team_id')!==team.external_team_id)throw Error('Unverified opponent player identity');
  const previous=team.roster.find((p:any)=>p.external_id===external_id);if(previous){if(previous.name!==name)throw Error('Conflicting opponent player identity');continue;}
  // This table contains season totals, not match shirts or match eligibility.
  team.roster.push({external_id,name,shirt_number:null,position:null,verification:'official_roster'});
 }
 for(const team of teams.values()){
  for(const tr of [...r.querySelectorAll('tr.teamid_'+team.external_team_id)]){
   const c=[...tr.children],link=tr.querySelector('[id_player]');const external_id=link?.getAttribute('id_player')||tr.id.replace('filaplayer_','');const role=link?'player':'staff';const name=text(link||c[4]);
   if(!/^[1-9]\d*$/.test(external_id)||!name||c.length<5)throw Error('Unverified person identity');
   if(link&&link.getAttribute('team_id')!==team.external_team_id)throw Error('Roster team mismatch');
   const prior=team.roster.find((p:any)=>p.role===role&&p.external_id===external_id);if(prior){if(prior.name!==name)throw Error('Conflicting roster identity');continue;}
   team.roster.push({external_id,role,name,shirt_number:null,position:null,verification:'official_roster',staff_role:role==='staff'?(text(c[5])||null):null,...(role==='player'?{games:num(c[6]),goals:num(c[5]),assists:num(c[8]),blue_cards:num(c[14]),red_cards:num(c[16])}:{})});
  }
  team.roster_status=team.roster.length?'published':'not_published';
 }
 let standings:any[]=[],standings_status='published';try{standings=parseStandings(standingsHtml).map(g=>({...g,rows:g.rows.filter(x=>[...teams.values()].some(t=>t.name===x.team_name))})).filter(g=>g.rows.length);if(!standings.length)standings_status='not_published';}catch{standings_status='unavailable';}
 return {...config,season_id:'41',season_label:'2026/27',club_external_id:source.club,source_url:source.origin+'/league/'+config.id,teams:[...teams.values()],opponents:[...opponents.values()],matches:fixtures,standings,standings_status,fetched_at:new Date().toISOString()};
}
export function enrichFromReport(data:any,fixture:any,html:string){
 const report=parseMatch(html,{federation:data.federation,competition_id:data.id,season_id:'41',federation_match_id:fixture.match_id,federation_url:data.source_url});
 if(report.home_name!==fixture.home_name||report.away_name!==fixture.away_name)throw Error('Report identity mismatch');
 const {document:d}=parseHTML(html);const venue=text(d.querySelector('table tr')?.children[1]);if(venue)fixture.venue=venue;
 for(const side of fixture.club_sides){const team=data.teams.find((t:any)=>t.external_team_id===fixture[side+'_team_id']);for(const player of report.players.filter((p:any)=>p.team===side)){
  let person=team.roster.find((p:any)=>p.role==='player'&&p.external_id===player.external_id);
  if(!person){person={external_id:player.external_id,role:'player',name:player.name,verification:'official_match_participant',season_membership:'not_confirmed'};team.roster.push(person);}
  Object.assign(person,{shirt_number:player.dorsal,position:player.position,observed_match_id:fixture.match_id});
 }
 for(const staff of report.staff.filter((p:any)=>p.team===side)){if(!staff.name)continue;const found=team.roster.filter((p:any)=>p.role==='staff'&&p.name===staff.name);if(found.length===1)found[0].observed_role=staff.role;else if(!found.length)team.roster.push({external_id:null,internal_key:fixture.match_id+':'+staff.role+':'+staff.name,role:'staff',name:staff.name,staff_role:staff.role,verification:'official_match_participant',identity_status:'no_federative_identifier',observed_match_id:fixture.match_id});}
 }
 fixture.report_status='verified';fixture.report_summary={fetched_at:report.fetched_at,official_status:report.official_status,score_available:report.home_score!==null&&report.away_score!==null};
 // No opponent-only reports, private statistics or inferred event chronology are retained.
 return data;
}
