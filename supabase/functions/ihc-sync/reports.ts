import {parseHTML} from 'npm:linkedom@0.18.12';
const clean=(e:any)=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
const number=(e:any)=>/^\d+$/.test(clean(e))?Number(clean(e)):null;
export function parseOfficialReport(html:string,match:any){
 const {document:d}=parseHTML(html);if(clean(d.querySelector('.nombre1'))!==match.home_team||clean(d.querySelector('.nombre2'))!==match.away_team)throw Error('Official report team mismatch');
 const tables=[...d.querySelectorAll('table.competiciones_tabla_basic')].filter(t=>t.querySelector('.nombre_equipo_thickbox_stats'));if(tables.length!==2)throw Error('Official report roster tables missing');
 const players:any[]=[],staff:any[]=[];
 tables.forEach((table,index)=>{const side=index?'away':'home';if(clean(table.querySelector('.nombre_equipo_thickbox_stats'))!==match[side+'_team'])throw Error('Roster heading mismatch');
  for(const tr of table.querySelectorAll('tr')){const c=[...tr.children].filter(e=>e.tagName==='TD');const person=tr.querySelector('div[id]');
   if(c.length>=15&&/^\d+$/.test(clean(c[0]))&&person&&/^[1-9]\d*$/.test(person.id)){
    const nameNode=person.cloneNode(true) as any;for(const e of nameNode.querySelectorAll('spam, .category_badge'))e.remove();const name=clean(nameNode).replace(/\s*\(C\)\s*/g,' ').trim();if(!name)throw Error('Missing report name');
    players.push({external_id:person.id,side,name,dorsal:clean(c[0]),position:clean(c[1])==='P'?'goalkeeper':clean(c[1])?'field':null,starter:clean(c[3])==='5',captain:clean(c[5]).includes('(C)'),goals:number(c[6]),assists:number(c[7]),penalties:clean(c[8])||null,direct_free_hits:clean(c[10])||null,yellow:number(c[12]),blue:number(c[13]),red:number(c[14])});
   }else if(c.length>=7&&/^(E1|E2|D|A|M|F)$/.test(clean(c[1]))&&clean(c[3]))staff.push({side,role:clean(c[1]),name:clean(c[3]),external_id:null,yellow:number(c[4]),blue:number(c[5]),red:number(c[6])});
  }
 });
 if(!players.length)throw Error('No report participants');if(new Set(players.map(p=>p.side+':'+p.external_id)).size!==players.length)throw Error('Duplicate official participant');
 const scores=[number(d.querySelector('#home_score')),number(d.querySelector('#away_score'))];const scoreDiscrepancy=scores.every(s=>s!==null)&&(scores[0]!==match.home_score||scores[1]!==match.away_score);
 const incidents=d.querySelector('#game_report_inicidencias');const incidentRows=[...(incidents?.querySelectorAll('tr')||[])].map((r,i)=>{
  const link=r.querySelector('a[id_player]'),team=link?.getAttribute('team_id');const side=team===match.home_team_id?'home':team===match.away_team_id?'away':null;
  const label=clean(r.querySelector('.evento_destacado .lang_es,.evento_negativo .lang_es,.evento_neutro .lang_es,.evento_positivo .lang_es'));
  const icon=r.querySelector('img[src*=icon_gol]');const type=icon?'goal':/TARJETA AZUL/.test(label)?'card_blue':/TARJETA ROJA/.test(label)?'card_red':/TARJETA AMARILLA/.test(label)?'card_yellow':/^FALTA$/.test(label)?'team_foul':/PENALTI/.test(label)?'penalty':/FALTA DIRECTA/.test(label)?'direct_free_hit':'official_event';
  const id=link?.getAttribute('id_player');const actor=id&&/^[1-9]\d*$/.test(id)?id:null;const labels=[...r.querySelectorAll('td:last-child .lang_es')].map(clean);const outcome=labels.find(x=>['GOL','PARADA','FUERA','PALO','FALLADO'].includes(x))||null;
  return {order:i,text:clean(r),label,event_type:type,period_label:clean(r.querySelector('.game_view_indcidencias_period'))||null,clock_label:clean(r.querySelector('.game_view_incidencias_time'))||null,clock_basis:'as_published_not_converted',side,team_external_id:team||null,player_external_id:actor,player_name:actor?clean(link):null,outcome:type==='penalty'||type==='direct_free_hit'?outcome:null,score_label:clean(r.querySelector('.game_view_incidencias_result'))||null};
 }).filter(r=>r.text);
 const fouls=[...d.querySelectorAll('.report_faltas')].map(number);return {players,staff,incidents:incidentRows,home_fouls:fouls[0]??null,away_fouls:fouls[1]??null,venue:clean(d.querySelector('table tr')?.children[1])||null,reported_home_score:scores[0],reported_away_score:scores[1],score_discrepancy:scoreDiscrepancy,report_score_available:scores.every(s=>s!==null),score_source:scores.every(s=>s!==null)?'calendar_and_report':'calendar',official_status:clean(d.querySelector('#game_period .lang_ca')||d.querySelector('#game_period .lang_es'))||null,event_timeline_status:incidentRows.length?'published_structured':'not_published',fetched_at:new Date().toISOString(),source_url:match.source_url,report_endpoint:`https://www.server2.sidgad.es/${match.federation.toLowerCase()}/${match.federation.toLowerCase()}_gr_${match.external_match_id}_1.php`,external_match_id:match.external_match_id};
}
