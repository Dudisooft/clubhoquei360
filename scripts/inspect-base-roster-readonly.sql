-- Only reads. Minimized snapshot: no player names, birth years, sexes or user identities.
begin read only;
with ts as (select t.* from public.teams t join public.seasons s on s.id=t.season_id where t.club_id='a48efe2f-c218-633e-6be6-4ce26e61f5cd' and s.label='2026/27'),
cs as (select c.* from public.federation_competitions c where c.club_id='a48efe2f-c218-633e-6be6-4ce26e61f5cd' and c.season_id in (select season_id from ts)),
es as (select e.* from public.federation_team_entries e where e.club_team_id in (select id from ts) and e.competition_id in (select id from cs)),
gs as (select g.* from public.federation_groups g where g.competition_id in (select id from cs)),
ms as (select m.* from public.federation_matches m where m.group_id in(select id from gs)),
rs as (select r.* from public.federation_team_roster r where r.entry_id in(select id from es)),
ls as (select l.* from public.federation_match_lineups l join ms m on m.id=l.match_id where m.raw_data->>'report_status'='verified')
select jsonb_build_object(
'captured_at',clock_timestamp(),'project','oevprbchlhyglhvopnvy',
'teams',(select jsonb_agg(jsonb_build_object('id',id,'name',name,'category',category,'club_id',club_id,'season_id',season_id)) from ts),
'federation_competitions',(select jsonb_agg(to_jsonb(c)) from cs c),
'federation_groups',(select jsonb_agg(to_jsonb(g)) from gs g),
'federation_team_entries',(select jsonb_agg(jsonb_build_object('id',id,'club_team_id',club_team_id,'competition_id',competition_id,'external_team_id',external_team_id,'display_name',display_name,'group_id',group_id)) from es),
'federation_team_roster',(select jsonb_agg(jsonb_build_object('id',id,'entry_id',entry_id,'player_id',player_id,'role',role,'display_name','Identitat omesa','shirt_number',null,'raw_data',jsonb_build_object('observed_match_id',raw_data->'observed_match_id','active_in_latest_roster',raw_data->'active_in_latest_roster','verification',raw_data->'verification','membership_scope',raw_data->'membership_scope'))) from rs),
'federation_players',(select jsonb_agg(jsonb_build_object('id',p.id,'federation',p.federation,'external_player_id',p.external_player_id)) from public.federation_players p where p.id in(select player_id from rs) or p.id in(select player_id from ls)),
'federation_match_teams',(select jsonb_agg(to_jsonb(mt)) from public.federation_match_teams mt where mt.match_id in(select id from ms) and mt.entry_id in(select id from es)),
'federation_matches',(select jsonb_agg(jsonb_build_object('id',id,'external_match_id',external_match_id,'group_id',group_id,'federation_start_at',federation_start_at,'home_team',home_team,'away_team',away_team,'raw_data',jsonb_build_object('home_team_id',raw_data->'home_team_id','away_team_id',raw_data->'away_team_id','report_status',raw_data->'report_status','source_url',raw_data->'source_url'))) from ms),
'federation_match_lineups',(select jsonb_agg(jsonb_build_object('id',id,'match_id',match_id,'player_id',player_id,'side',side,'display_name','Identitat omesa','shirt_number',null,'is_goalkeeper',is_goalkeeper,'raw_data',jsonb_build_object('external_id',raw_data->'external_id'))) from ls)
) as snapshot; rollback;
