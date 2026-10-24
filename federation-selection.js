/* Calendar identity does not depend on a report link being published yet. */
export const calendarIdentity=row=>row?.round&&row?.home_team_id&&row?.away_team_id?JSON.stringify([row.round,String(row.home_team_id),String(row.away_team_id)]):null;
export const isCalendarOnlySource=source=>source?.import_status==='pending'&&source?.official_data?.source_kind==='verified_calendar';
export function competitionOptions(matches,sources,rows,competition,team=''){
 const scoped=sources.filter(s=>s.federation+':'+s.competition_id===competition);
 const registered=matches.filter(m=>scoped.some(s=>s.match_id===m.id));
 const teams=[...new Set([...registered.flatMap(m=>[m.home_team,m.away_team]),...rows.flatMap(r=>[r.home_name,r.away_name])].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ca'));
 const chosen=teams.includes(team)?team:'';
 const visible=registered.filter(m=>!chosen||[m.home_team,m.away_team].includes(chosen));
 const knownIds=new Set(scoped.map(s=>s.federation_match_id&&String(s.federation_match_id)).filter(Boolean));
 const knownCalendar=new Set(scoped.filter(isCalendarOnlySource).map(s=>calendarIdentity(s.official_data)).filter(Boolean));
 const when=date=>date&&!Number.isNaN(Date.parse(date))?' · '+new Date(date).toLocaleString('ca-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
 const options=visible.map(m=>({value:m.id,label:m.title+when(m.starts_at),disabled:false,kind:'registered'}));
 const seen=new Set();
 for(const [index,row] of rows.entries()){
  if(chosen&&![row.home_name,row.away_name].includes(chosen))continue;
  const id=row.match_id?String(row.match_id):null,key=calendarIdentity(row),identity=id?'id:'+id:'calendar:'+key;
  if((id&&knownIds.has(id))||(key&&knownCalendar.has(key))||seen.has(identity))continue;
  seen.add(identity);
  options.push({value:id?'external:'+id:'pending:'+index,label:[row.date,row.time,row.home_name+' – '+row.away_name].filter(Boolean).join(' · ')+(id?'':' · Fitxa federativa pendent'),disabled:!id,kind:id?'external':'pending'});
 }
 return {teams,selectedTeam:chosen,visible,options,pending:options.filter(o=>o.kind==='pending').length};
}
