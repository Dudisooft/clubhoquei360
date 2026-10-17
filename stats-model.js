/* One event represents one observed action. Individual actions also contribute
 * to team totals; totals are never entered as a second event. */
export const ACTIONS = Object.freeze([
  ['pass_complete','Passada completada','pass'],['pass_failed','Passada fallada','pass'],['pass_unknown','Passada · resultat desconegut','pass'],
  ['shot_target','Xut a porteria','shot'],['shot_off','Xut fora','shot'],['shot_blocked','Xut bloquejat','shot'],['shot_unknown','Xut · resultat desconegut','shot'],
  ['goal','Gol','goal'],['assist','Assistència','assist'],['recovery','Recuperació','recovery'],['loss','Pèrdua de pilota','loss'],
  ['foul','Falta comesa','foul'],['foul_received','Falta rebuda','foul'],['save','Aturada','goalkeeper'],
  ['save_block','Parada · blocatge','goalkeeper'],['save_rebound','Parada · rebuig','goalkeeper'],['save_stretch','Parada · estirada','goalkeeper'],
  ['goal_conceded','Gol encaixat','goalkeeper'],['interception','Intercepció','defence'],['block','Bloqueig defensiu','defence'],
  ['player_in','Entrada a pista','participation'],['player_out','Sortida de pista','participation'],
  ['pass_key','Passada clau','construction'],['shot_assist','Assistència de xut','construction'],['receive_complete','Recepció correcta','construction'],['receive_failed','Recepció fallada','construction'],
  ['pass_sequence','Seqüència de passades','construction'],['offensive_entry','Entrada a zona ofensiva','attack'],['chance','Ocasió clara de gol','attack'],['chance_missed','Ocasió clara fallada','attack'],
  ['dribble_complete','Dríbling superat','attack'],['dribble_failed','Dríbling fallat','attack'],['offensive_block_complete','Bloqueig ofensiu efectiu','attack'],['offensive_block_failed','Bloqueig ofensiu no efectiu','attack'],
  ['defence_complete','Acció defensiva superada','defence'],['defence_failed','Acció defensiva fallada','defence'],['duel_won','Duel defensiu guanyat','defence'],['duel_lost','Duel defensiu perdut','defence'],
  ['defensive_entry','Entrada rival a zona defensiva','defence'],['chance_conceded','Ocasió clara concedida','defence'],['counterattack','Contraatac iniciat','transition'],['counterattack_shot','Contraatac finalitzat amb xut','transition'],
  ['counterattack_participation','Participació en contraatac','transition'],['press_exit_complete','Sortida de pressió superada','transition'],['press_exit_failed','Sortida de pressió fallada','transition'],
  ['defensive_loss','Pèrdua en zona defensiva','transition'],['build_loss','Pèrdua en sortida de pilota','transition'],['possession_shot','Possessió acabada en xut','transition'],['possession_loss','Possessió acabada en pèrdua','transition'],
  ['goalkeeper_target','Xut rebut a porteria','goalkeeper'],['goalkeeper_rebound','Rebuig concedit','goalkeeper'],['goalkeeper_second','Aturada amb segona intervenció','goalkeeper'],
  ['goalkeeper_exit_complete','Sortida de porteria correcta','goalkeeper'],['goalkeeper_exit_failed','Sortida de porteria fallada','goalkeeper'],
  ['possession','Temps de possessió','possession'],
].map(([code,label,category])=>Object.freeze({code,label,category})));
export const CATEGORIES = Object.freeze({pass:'Passades',shot:'Xuts',goal:'Gols',assist:'Assistències',recovery:'Recuperacions',loss:'Pèrdues',foul:'Faltes',goalkeeper:'Porteria',defence:'Defensa',participation:'Participació',construction:'Construcció',attack:'Atac',transition:'Transicions',possession:'Possessió'});
export const action = code => ACTIONS.find(a=>a.code===code);
export const fmt = ms => `${String(Math.floor(Math.max(0,ms)/60000)).padStart(2,'0')}:${String(Math.floor(Math.max(0,ms)/1000)%60).padStart(2,'0')}`;
export function parseTime(value){const m=String(value).match(/^(\d{1,3}):([0-5]\d)$/);return m?Math.min(21600000,(Number(m[1])*60+Number(m[2]))*1000):null;}
export function activeOfficial(rows){const cancelled=new Set(rows.filter(r=>r.event_type==='correction').map(r=>r.related_event_id));return rows.filter(r=>r.event_type!=='correction'&&!cancelled.has(r.id));}
export function projectOfficial(rows){
  return activeOfficial(rows).flatMap(r=>{
    const p=r.payload||{},kind=p.kind||r.event_type;
    const code=({gol:'goal',goal:r.delta<0?null:'goal',falta:'foul',team_foul:'foul',assistència_manual:'assist'})[kind];
    if(!code||!['home','away'].includes(r.team)||Number(r.delta)<0)return [];
    return [{id:'official:'+r.id,source_event_id:r.id,match_id:r.match_id,action:code,side:r.team,player_id:p.actor||r.player_id||null,
      assist_player_id:p.details?.assist||null,period:Number(p.half)||1,match_ms:Math.max(0,((Number(r.match_second)||0)-((Number(p.half)||1)-1)*1500)*1000),
      operator_id:r.user_id,created_at:r.created_at,updated_at:r.created_at,origin:'official_reference',validation:'recorded',revision:0,readonly:true}];
  });
}
export function effectiveEvents(manual,official=[]){
  // A stable link suppresses its official projection, including an analytic void.
  // Corrections remain in the analytic layer and never update the source row.
  const unique=[...new Map(manual.map(e=>[e.id,e])).values()];
  const linked=new Set(unique.map(e=>e.source_event_id).filter(Boolean));
  return [...unique.filter(e=>e.validation!=='void'),...projectOfficial(official).filter(e=>!linked.has(e.source_event_id))];
}
const percent=(n,d)=>d>0&&n!==null&&n<=d?Math.round(n/d*1000)/10:null;
export function aggregate(events,{side,playerId=null,coverage=[]}={}){
  const rows=events.filter(e=>(!side||e.side===side)&&(!playerId||e.player_id===playerId||e.assist_player_id===playerId));
  const observed=category=>rows.some(e=>action(e.action)?.category===category)||(!playerId&&coverage.some(c=>c.side===side&&c.category===category&&c.complete));
  const count=(category,codes)=>observed(category)?rows.filter(e=>codes.includes(e.action)&&(!playerId||e.player_id===playerId)).length:null;
  const passes=count('pass',['pass_complete','pass_failed','pass_unknown']),completed=count('pass',['pass_complete']),failed=count('pass',['pass_failed']);
  const shots=count('shot',['shot_target','shot_off','shot_blocked','shot_unknown']);
  const goals=count('goal',['goal']),assists=observed('assist')||rows.some(e=>e.assist_player_id)?rows.filter(e=>(e.action==='assist'&&(!playerId||e.player_id===playerId))||(e.assist_player_id&&(!playerId||e.assist_player_id===playerId))).length:null;
  const saves=count('goalkeeper',['save','save_block','save_rebound','save_stretch']);
  const possess=events.filter(e=>e.action==='possession'&&e.validation!=='void');
  const possessionMs=possess.filter(e=>e.side===side).reduce((n,e)=>n+(e.duration_ms||0),0),observedMs=possess.reduce((n,e)=>n+(e.duration_ms||0),0);
  return {passes,completed,failed,passAccuracy:passes!==null&&passes===completed+failed?percent(completed,passes):null,shots,onTarget:count('shot',['shot_target']),offTarget:count('shot',['shot_off']),blocked:count('shot',['shot_blocked']),goals,assists,
    // Goals and shots are separate observations. An official goal alone does not
    // manufacture a shot; no efficiency is shown for an inconsistent sample.
    effectiveness:percent(goals,shots),recoveries:count('recovery',['recovery']),losses:count('loss',['loss']),fouls:count('foul',['foul']),saves,
    possessionMs:observedMs?possessionMs:null,possessionPercent:observedMs?Math.round(possessionMs/observedMs*1000)/10:null,observedMs,
    participationMs:playerId?participation(rows.filter(e=>e.player_id===playerId)):null,actions:rows.length};
}
export function participation(events){
  const rows=events.filter(e=>['player_in','player_out'].includes(e.action)).sort((a,b)=>a.period-b.period||a.match_ms-b.match_ms);let start=null,total=0;
  if(!rows.length)return null;
  for(const e of rows){if(e.action==='player_in'){if(start)return null;start=e;}else{if(!start||start.period!==e.period||e.match_ms<start.match_ms)return null;total+=e.match_ms-start.match_ms;start=null;}}
  return start?null:total;
}
export function csv(rows){const cell=v=>{let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return '\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n');}
export function eventCsv(events){return csv([['id','club','temporada','equip_club','partit','periode','millisegons','equip','jugador_id','accio','operador_id','origen','validacio','creacio','modificacio','referencia_oficial','durada_ms'],...events.map(e=>[e.id,e.club_id,e.season_id,e.team_id,e.match_id,e.period,e.match_ms,e.side,e.player_id,e.action,e.operator_id,e.origin,e.validation,e.created_at,e.updated_at,e.source_event_id,e.duration_ms])]);}
