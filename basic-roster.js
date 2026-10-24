// View adapters over the existing pilot/catalogue identities. No name-based joins.
export const sideLabel=side=>side==='home'?'Local':'Visitant';
export function safeCrest(value){try{const u=new URL(value);return u.protocol==='https:'&&['sidgad.cloud','www.sidgad.cloud'].includes(u.hostname)&&u.pathname.includes('/logos_clubes/')?u.href:null;}catch{return null;}}
export function kitFor(side,teamKey=null,role='player'){
 const palette=['#b92336','#203f83','#176451','#633d83','#8f451e','#3c536e'];let index=side==='home'?0:1;
 if(teamKey){let hash=0;for(const c of String(teamKey)+':'+role)hash=(hash*31+c.charCodeAt(0))>>>0;index=hash%palette.length;}
 return {background:palette[index],ink:'#ffffff',verified:false,label:'Equipació provisional · colors no verificats'};
}
export function mergeRoster(players,candidates=[]){
 const out=players.map(p=>({...p,selectable:p.selectable??(p.federation_active!==false),origin:p.origin||'Plantilla del partit',eligibility:p.eligibility||'Elegibilitat no acreditada per la font'}));
 for(const candidate of candidates){const found=out.find(p=>p.team===candidate.team&&((p.federation_player_id&&candidate.federation_player_id&&p.federation_player_id===candidate.federation_player_id)||(p.catalog_player_id&&candidate.catalog_player_id&&p.catalog_player_id===candidate.catalog_player_id)||(p.catalog_lineup_id&&candidate.catalog_lineup_id&&p.catalog_lineup_id===candidate.catalog_lineup_id)||p.id===candidate.id));
  if(found){if(candidate.scopeChecked)Object.assign(found,{selectable:candidate.selectable,origin:candidate.origin,eligibility:candidate.eligibility,scopeChecked:true});Object.assign(found,{otherTeams:candidate.otherTeams||found.otherTeams,reinforcement:candidate.reinforcement||found.reinforcement});if(candidate.matchVerified){found.eligibility='Consta a l’acta d’aquest partit';found.selectable=true;found.matchVerified=true;}continue;}out.push(candidate);
 }
 return out.sort((a,b)=>a.team.localeCompare(b.team)||Number(!a.selectable)-Number(!b.selectable)||String(a.dorsal??'').localeCompare(String(b.dorsal??''),'ca',{numeric:true})||a.full_name.localeCompare(b.full_name,'ca'));
}
export async function allRows(db,table,filter=q=>q){const out=[];for(let offset=0;;offset+=500){let query=filter(db.from(table).select('*'));if(table==='federation_match_teams')query=query.order('match_id').order('entry_id');else if(table==='pilot_members')query=query.order('match_id').order('user_id');else query=query.order('id');const r=await query.range(offset,offset+499);if(r.error)throw r.error;out.push(...(r.data||[]));if((r.data||[]).length<500)return out;}}
const categoryKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
export function infantilRosterScope(rows,entryIds,entryMap,teamMap){
 const own=rows.find(r=>entryIds.has(r.entry_id)&&r.raw_data?.active_in_latest_roster!==false&&r.raw_data?.observed_match_id);
 const otherInfant=rows.some(r=>!entryIds.has(r.entry_id)&&r.raw_data?.observed_match_id&&categoryKey(teamMap.get(entryMap.get(r.entry_id)?.club_team_id)?.category)==='INFANTIL');
 const lower=otherInfant?[]:rows.filter(r=>!entryIds.has(r.entry_id)&&r.raw_data?.active_in_latest_roster!==false&&categoryKey(teamMap.get(entryMap.get(r.entry_id)?.club_team_id)?.category)==='ALEVI');
 // A competition-wide roster is not evidence of membership of this infant team.
 return {primary:own,lower};
}
const scoped=async(db,table,key,ids)=>{const out=[];for(let i=0;i<ids.length;i+=60)out.push(...await allRows(db,table,q=>q.in(key,ids.slice(i,i+60))));return out;};
export async function catalogueRoster(db,{players,source,fixture}){
 if(!fixture&&source?.federation_match_id){const matches=await allRows(db,'federation_matches',q=>q.eq('external_match_id',source.federation_match_id));fixture=matches.find(m=>{try{const u=new URL(m.raw_data?.source_url);return u.hostname.includes('fecapa.cat')&&u.pathname==='/league/'+source.competition_id;}catch{return false;}});}
 if(!fixture)return {players:mergeRoster(players),notice:'Plantilla del partit. No s’ha pogut vincular un catàleg addicional verificat.'};
 const links=await allRows(db,'federation_match_teams',q=>q.eq('match_id',fixture.id));
 const direct=await scoped(db,'federation_team_entries','id',[...new Set(links.map(l=>l.entry_id))]);
 const teamRows=await scoped(db,'teams','id',direct.map(e=>e.club_team_id).filter(Boolean));
 const peers=[];for(const t of teamRows){if(peers.some(x=>x.club_id===t.club_id&&x.season_id===t.season_id))continue;peers.push(...await allRows(db,'teams',q=>q.eq('club_id',t.club_id).eq('season_id',t.season_id)));}
 const entries=await scoped(db,'federation_team_entries','club_team_id',[...new Set(peers.map(t=>t.id))]);
 const entryMap=new Map([...entries,...direct].map(e=>[e.id,e]));
 const roster=await scoped(db,'federation_team_roster','entry_id',[...entryMap.keys()]);
 const identities=await scoped(db,'federation_players','id',[...new Set(roster.map(r=>r.player_id).filter(Boolean))]);
 const external=new Map(identities.filter(p=>p.federation==='FECAPA').map(p=>[p.id,p.external_player_id]));
 const official=fixture.raw_data?.report_status==='verified'?await allRows(db,'federation_match_lineups',q=>q.eq('match_id',fixture.id)):[];
 const candidates=[];const restrictedSides=new Set();const teamMap=new Map(peers.map(t=>[t.id,t]));
 for(const side of ['home','away']){
  const entryIds=new Set(links.filter(l=>l.side===side).map(l=>l.entry_id));const directTeam=direct.find(e=>entryIds.has(e.id));
  const ownTeam=teamRows.find(t=>t.id===directTeam?.club_team_id);const clubTeamIds=new Set(peers.filter(t=>t.club_id===ownTeam?.club_id&&t.season_id===ownTeam?.season_id).map(t=>t.id));
  const personRows=roster.filter(r=>r.role==='player'&&r.player_id&&(entryIds.has(r.entry_id)||clubTeamIds.has(entryMap.get(r.entry_id)?.club_team_id)));
  const infantil=categoryKey(ownTeam?.category)==='INFANTIL';if(infantil)restrictedSides.add(side);
  const unique=new Map();for(const r of personRows){const rows=unique.get(r.player_id)||[];rows.push(r);unique.set(r.player_id,rows);}
  for(const [id,rows] of unique){const scope=infantil?infantilRosterScope(rows,entryIds,entryMap,teamMap):null;const primary=infantil?scope.primary:rows.find(r=>entryIds.has(r.entry_id)&&r.raw_data?.active_in_latest_roster!==false);const verified=official.find(l=>l.side===side&&l.player_id===id);if(infantil&&!primary&&!scope.lower.length&&!verified)continue;const r=primary||scope?.lower[0]||rows[0];const otherTeams=[...new Set(rows.filter(x=>!entryIds.has(x.entry_id)).map(x=>entryMap.get(x.entry_id)?.display_name).filter(Boolean))];
   candidates.push({id:`catalog:${side}:${id}`,scopeChecked:infantil,catalog_player_id:id,federation_player_id:external.get(id)||null,team:side,full_name:verified?.display_name||r.display_name,dorsal:verified?.shirt_number??primary?.shirt_number??null,position:r.raw_data?.is_goalkeeper?'goalkeeper':'field',origin:verified?'Acta FECAPA d’aquest partit':primary?(infantil?'Participació documentada amb aquest equip':'Catàleg de l’equip'):'Possible reforç · '+(entryMap.get(r.entry_id)?.display_name||'equip d’origen'),eligibility:verified?'Consta a l’acta d’aquest partit':primary?'Elegibilitat no acreditada per la font':'Elegibilitat de reforç no verificable',matchVerified:!!verified,selectable:(!!verified||!!primary)&&!!external.get(id),reinforcement:!primary,otherTeams,needsImport:true,official_source:fixture.raw_data?.source_url||null});
  }
 }
 const scopedPlayers=players.filter(p=>!restrictedSides.has(p.team)||candidates.some(c=>c.team===p.team&&((c.federation_player_id&&c.federation_player_id===p.federation_player_id)||(c.catalog_player_id&&c.catalog_player_id===p.catalog_player_id)) )||official.some(l=>l.side===p.team&&l.id===p.catalog_lineup_id));
 return {players:mergeRoster(scopedPlayers,candidates),restrictedSides:[...restrictedSides],notice:'Infantil: només participació documentada amb l’equip i possibles reforços alevins del club, amb origen visible. La plantilla general de competició no acredita pertinença. Una acta anterior no certifica elegibilitat futura; els reforços sense acta d’aquest partit queden bloquejats. Font: importació FECAPA disponible.'};
}
export async function materializePlayers(db,match,selected,practice=false){
 const pending=selected.filter(p=>p.needsImport);if(practice||!pending.length)return selected;
 // Only the existing operator-authorized player table is used. UUIDs are local
 // database identities, never fabricated federation identifiers.
 const existing=await allRows(db,'pilot_players',q=>q.eq('match_id',match));
 const converted=[];
 for(const p of selected){if(!p.needsImport){converted.push(p);continue;}
  if(!p.selectable||(!p.federation_player_id&&(!p.catalog_lineup_id||!p.matchVerified)))throw Error('Cal una identitat federativa verificada per incorporar '+p.full_name+'.');
  const marker=p.catalog_lineup_id?(p.official_source||'')+'#lineup='+p.catalog_lineup_id:p.official_source;
  const found=existing.find(x=>x.team===p.team&&((p.federation_player_id&&x.federation_player_id===p.federation_player_id)||(p.catalog_lineup_id&&x.official_source===marker)));if(found){converted.push({...p,...found,needsImport:false});continue;}
  const row={id:crypto.randomUUID(),match_id:match,team:p.team,dorsal:p.dorsal||null,full_name:p.full_name,position:p.position||'field',federation_player_id:p.federation_player_id||null,official_source:marker||null,federation_active:true};
  const r=await db.from('pilot_players').insert(row).select('*');if(r.error)throw Error('No s’ha pogut incorporar el jugador: '+r.error.message);if(!r.data?.[0]?.id)throw Error('La incorporació del jugador no ha estat confirmada.');const saved=r.data[0];existing.push(saved);converted.push({...p,...saved,needsImport:false});
 }
 return converted;
}
