-- Fictitious participants and scores; no production records.

 insert into federation_competitions(id,federation)values('10000000-0000-4000-8000-000000000021','RFEP');
 insert into federation_groups(id,competition_id)values('10000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000021');
 insert into federation_matches(id,group_id,external_match_id,home_score,away_score,raw_data)values('20000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000022','999999',1,1,'{"report_status":"verified","report_data":{"official_status":"FINALIZAT","reported_home_score":1,"incidents":[{"text":"INCIDENCIA FICTICIA"}],"event_timeline_status":"retrieved"}}');
 insert into federation_match_teams values('20000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000023','home');
 insert into federation_players(id,federation,external_player_id)values('30000000-0000-4000-8000-000000000022','RFEP','100');
 insert into federation_match_lineups(id,match_id,side,display_name,shirt_number,is_goalkeeper,reported_goals,reported_assists,raw_data)values('30000000-0000-4000-8000-000000000021','20000000-0000-4000-8000-000000000021','home','FICTICI','7',false,2,1,'{"external_id":"100"}');
 insert into federation_match_lineups(id,match_id,side,display_name,raw_data)values('30000000-0000-4000-8000-000000000023','20000000-0000-4000-8000-000000000021','away','RIVAL FICTICI','{"external_id":"101"}');
 insert into federation_match_staff(id,match_id,display_name)values('30000000-0000-4000-8000-000000000021','20000000-0000-4000-8000-000000000021','STAFF FICTICI');
 insert into federation_match_events(id,match_id,event_type)values('30000000-0000-4000-8000-000000000021','20000000-0000-4000-8000-000000000021','FICTICI');
 grant select,insert,update on federation_matches,federation_match_lineups,federation_match_staff to service_role;
 grant select on federation_competitions,federation_groups,federation_match_teams,federation_players to service_role;
 revoke all on function federation_commit_official_report(uuid,jsonb) from public;
 grant execute on function federation_commit_official_report(uuid,jsonb) to service_role;
 
