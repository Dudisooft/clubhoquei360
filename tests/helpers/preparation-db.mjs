import {ID,asOwner} from './stats-db.mjs';
export const PREP={match:'18fa0a6e-e5c6-487e-8315-5bc371e22cb1',calendar:'51894d05-c323-f3e1-8534-fa79e062c448',competition:'70000000-0000-4000-8000-000000000001',group:'70000000-0000-4000-8000-000000000002',entry:'70000000-0000-4000-8000-000000000003',fingerprint:'RFEP:41:3575:3575:JORNADA 5:3697:3727'};
export async function seedPreparation(db){
 await asOwner(db,"insert into federation_competitions values($1,$2,$3,'RFEP','3575') on conflict(id) do nothing",[PREP.competition,ID.club,ID.season]);
 await asOwner(db,'insert into federation_groups values($1,$2) on conflict(id) do nothing',[PREP.group,PREP.competition]);
 await asOwner(db,"insert into federation_matches(id,group_id,home_team,away_team,federation_start_at,match_fingerprint,raw_data) values($1,$2,'SIMAR · FICTICI','VIC · FICTICI','2026-10-24 18:30Z',$3,$4) on conflict(id) do nothing",[PREP.calendar,PREP.group,PREP.fingerprint,JSON.stringify({data_layer:'public_federation',home_team_id:'3697',away_team_id:'3727'})]);
 await asOwner(db,"insert into pilot_matches(id,title,home_team,away_team,starts_at,status) values($1,'Cinc inicial · PROVA FICTÍCIA','SIMAR · FICTICI','VIC · FICTICI','2026-10-24 18:30Z','scheduled') on conflict(id) do nothing",[PREP.match]);
 await asOwner(db,"insert into federation_match_sources(match_id,federation,competition_id,season_id,home_name,away_name,import_status,official_data) values($1,'RFEP','3575','41','SIMAR · FICTICI','VIC · FICTICI','pending',$2) on conflict(match_id) do nothing",[PREP.match,JSON.stringify({source_kind:'verified_calendar',calendar_match_id:PREP.calendar,calendar_fingerprint:PREP.fingerprint,home_team_id:'3697',away_team_id:'3727'})]);
 await asOwner(db,"insert into stats_matches(match_id,club_id,season_id,home_team_id,home_external_team_id,away_external_team_id) values($1,$2,$3,$4,'3697','3727') on conflict(match_id) do nothing",[PREP.match,ID.club,ID.season,ID.team]);
 await asOwner(db,"insert into pilot_members values($1,$2,'operator') on conflict do nothing",[PREP.match,ID.manager]);
 await asOwner(db,"insert into federation_team_entries(id,club_team_id,competition_id,external_team_id,raw_data,source_url) values($1,$2,$3,'3697',$4,'https://hockeypatines.fep.es/league/3575') on conflict(id) do nothing",[PREP.entry,ID.team,PREP.competition,JSON.stringify({season_id:'41',verification:'official'})]);
 for(let i=0;i<5;i++){
  const person='71000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),roster='72000000-0000-4000-8000-'+String(i+1).padStart(12,'0');
  await asOwner(db,"insert into federation_players values($1,'RFEP',$2,$3) on conflict(id) do nothing",[person,String(90001+i),'Jugador FICTICI '+(i+1)]);
  await asOwner(db,"insert into federation_team_roster(id,entry_id,player_id,display_name,role,shirt_number,fetched_at,raw_data) values($1,$2,$3,$4,'player',$5,now(),$6) on conflict(id) do nothing",[roster,PREP.entry,person,'Jugador FICTICI '+(i+1),String(i+1),JSON.stringify({position:i===0?'goalkeeper':'field'})]);
 }
}
