import {ID,asOwner} from './stats-db.mjs';

export const callupIds={
 starter:'71000000-0000-4000-8000-000000000001',
 reserve:'71000000-0000-4000-8000-000000000002',
 reinforcement:'71000000-0000-4000-8000-000000000003',
 ineligible:'71000000-0000-4000-8000-000000000004',
 lateMatch:'71000000-0000-4000-8000-000000000005',
 unknownMatch:'71000000-0000-4000-8000-000000000006',
 catalogueMatch:'71000000-0000-4000-8000-000000000007'
};

export async function seedCallups(db){
 const ids=callupIds;
 await db.exec('reset role');
 await db.query("insert into public.club_memberships values ($1,$2,null,'general_coordinator'),($3,$2,$4,'section_coordinator')",
  [ID.secondary,ID.club,ID.external,ID.team]);
 await db.query("update public.pilot_matches set starts_at=date_trunc('hour',now())+interval '1 day' + case when id=$2 then interval '60 minutes' else interval '0' end, status='scheduled' where id in ($1,$2)",[ID.match,ID.otherMatch]);
 await db.query('delete from public.federation_match_sources where match_id in ($1,$2)',[ID.match,ID.otherMatch]);
 for(const [id,delay] of [[ids.lateMatch,90],[ids.unknownMatch,null]]){
  await db.query("insert into pilot_matches(id,title,home_team,away_team,starts_at,status) values ($1,'Partit fictici','Equip fictici','Rival fictici',(select starts_at from pilot_matches where id=$2)+($3::integer*interval '1 minute'),'scheduled')",[id,ID.match,delay]);
  await db.query('insert into stats_matches(match_id,club_id,season_id,home_team_id) values($1,$2,$3,$4)',[id,ID.club,ID.season,ID.team]);
 }
 const idsForCatalogue=[
  '71000000-0000-4000-8000-000000000008',
  '71000000-0000-4000-8000-000000000009',
  '71000000-0000-4000-8000-000000000010'
 ];
 const [comp,group,entry]=idsForCatalogue;
 await db.query("insert into federation_competitions values($1,$2,$3,'FECAPA','fictici')",[comp,ID.club,ID.season]);
 await db.query('insert into federation_groups values($1,$2)',[group,comp]);
 await db.query("insert into federation_team_entries(id,club_team_id,competition_id) values($1,$2,$3)",[entry,ID.team,comp]);
 await db.query("insert into federation_matches(id,group_id,home_team,away_team,federation_start_at,raw_data) values($1,$2,'Rival del catàleg','Equip fictici',now()+interval '3 days','{}')",[ids.catalogueMatch,group]);
 await db.query("insert into federation_match_teams values($1,$2,'away')",[ids.catalogueMatch,entry]);
 for(const [id,team,name,dorsal,position] of [
  [ids.starter,ID.team,'Jugadora convocada fictícia','4','field'],
  [ids.reserve,ID.team,'Portera de la plantilla fictícia','1','goalkeeper'],
  [ids.reinforcement,ID.otherTeam,'Reforç elegible fictici','8','field'],
  [ids.ineligible,ID.otherTeam,'Reforç sense elegibilitat fictici','9','field']
 ])await asOwner(db,'insert into app_private.callup_roster(id,team_id,full_name,dorsal,position) values($1,$2,$3,$4,$5)',[id,team,name,dorsal,position]);
 await asOwner(db,'insert into app_private.callup_eligibility values($1,$2)',[ID.team,ids.reinforcement]);
}
