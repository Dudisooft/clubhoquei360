// Shared view adapter: identities come from the provider, never from names.
export function federationStartAt(fixture){
 const date=fixture.date?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/),time=fixture.time?.match(/^(\d{2}):(\d{2})$/);if(!date||!time)return null;
 const wall=Date.UTC(+date[3],+date[2]-1,+date[1],+time[1],+time[2]);
 const parts=ms=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(ms).map(p=>[p.type,p.value]));
 const local=ms=>{const p=parts(ms);return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);};
 let utc=wall;for(let i=0;i<3;i++)utc+=wall-local(utc);
 if(local(utc)!==wall||local(utc-3600000)===wall||local(utc+3600000)===wall)throw Error('Hora federativa inexistent o ambigua');
 return new Date(utc).toISOString();
}
export function fecapaReport(fixture,parsed) {
 if(fixture.federation!=='FECAPA'||String(parsed.match_id)!==fixture.official_match_id||String(parsed.competition_id)!==fixture.competition_id||String(parsed.season_id)!==fixture.season||parsed.home_name!==fixture.home_team||parsed.away_name!==fixture.away_team)throw Error('Acta FECAPA fora del partit');
 const sides={home:[],away:[]};
 for(const p of parsed.players||[]){if(!sides[p.team])throw Error('Equip desconegut');sides[p.team].push({id:p.external_id,name:p.name,number:p.dorsal,position:p.position,starter:p.starter,goals:p.goals,yellow:p.yellow,blue:p.blue,red:p.red});}
 return {match_id:fixture.id,official_match_id:fixture.official_match_id,status:Object.values(sides).every(a=>a.length&&a.some(p=>p.position==='goalkeeper'))?'published':'incomplete',sides,verifiedAt:parsed.fetched_at,source_url:parsed.source_url};
}
export function officialPlayers(fixture,report) {
 if(report?.status!=='published'||report.match_id!==fixture.id)throw Error('Acta no verificada per a aquest partit');
 const seen=new Set(),players=[];
 for(const side of ['home','away'])for(const p of report.sides[side]){
  if(!/^[1-9]\d*$/.test(p.id)||!p.name?.trim())throw Error('Falta la identitat oficial del jugador');
  const identity=fixture.federation+':'+p.id;
  if(seen.has(identity))throw Error('Identitat duplicada entre alineacions');seen.add(identity);
  players.push({id:identity,federation_player_id:p.id,team:side,full_name:p.name,dorsal:p.number,
   position:p.position,starter:p.starter,matchVerified:true,selectable:true,
   selection_basis:'current_match_report',origin:'Acta '+fixture.federation+' d’aquest partit',
   official_source:report.source_url||fixture.source_url,calendar_source_url:report.calendar_source_url||fixture.source_url,public_player_id:p.id,license_number:null,goals:p.goals??null,yellow:p.yellow??null,blue:p.blue??null,red:p.red??null});
 }
 return players;
}
export function historicalCandidates(teamId,fixtures,reports) {
 const out=new Map();
 for(const f of fixtures){const side=f.home_id===teamId?'home':f.away_id===teamId?'away':null;if(!side)continue;
  const r=reports.get(f.id);if(r?.status!=='published')continue;
  for(const p of officialPlayers(f,r).filter(p=>p.team===side))out.set(p.id,{...p,matchVerified:false,selectable:false,
   selection_basis:'same_team_history',origin:'Participació oficial anterior amb aquest equip',
   eligibility:'No acredita convocatòria ni elegibilitat futura',observed_match_id:f.official_match_id});
 }
 return [...out.values()];
}
