begin isolation level repeatable read read only;
select jsonb_build_object(
 'duplicate_player_ids',(select count(*)from(select federation,external_player_id from federation_players where nullif(trim(external_player_id),'')is not null group by 1,2 having count(*)>1)x),
 'duplicate_entry_ids',(select count(*)from(select competition_id,group_id,external_team_id from federation_team_entries where nullif(trim(external_team_id),'')is not null group by 1,2,3 having count(*)>1)x),
 'duplicate_match_ids',(select count(*)from(select group_id,external_match_id from federation_matches where nullif(trim(external_match_id),'')is not null group by 1,2 having count(*)>1)x),
 'duplicate_fingerprints',(select count(*)from(select match_fingerprint from federation_matches where match_fingerprint is not null group by 1 having count(*)>1)x),
 'duplicate_roster_players',(select count(*)from(select entry_id,player_id from federation_team_roster where player_id is not null group by 1,2 having count(*)>1)x),
 'duplicate_lineup_players',(select count(*)from(select match_id,side,player_id from federation_match_lineups where player_id is not null group by 1,2,3 having count(*)>1)x),
 'entry_club_season_mismatch',(select count(*)from federation_team_entries e join teams t on t.id=e.club_team_id join federation_competitions c on c.id=e.competition_id where t.club_id is distinct from c.club_id or t.season_id is distinct from c.season_id),
 'stats_club_season_mismatch',(select count(*)from stats_events e join stats_matches m on m.match_id=e.match_id where e.club_id is distinct from m.club_id or e.season_id is distinct from m.season_id),
 'stats_foreign_team',(select count(*)from stats_events e join stats_matches m on m.match_id=e.match_id where e.team_id is not null and e.team_id is distinct from m.home_team_id and e.team_id is distinct from m.away_team_id),
 'stats_foreign_player',(select count(*)from stats_events e join pilot_players p on p.id=e.player_id where p.match_id is distinct from e.match_id),
 'null_match_external_id',(select count(*)from federation_matches where nullif(trim(external_match_id),'')is null),
 'null_player_external_id',(select count(*)from federation_players where nullif(trim(external_player_id),'')is null),
 'null_source_match_link',(select count(*)from federation_match_sources where federation_match_id is null),
 'pending_tables',jsonb_build_object('temporary_operators_installed',to_regclass('public.match_temporary_operators')is not null,'scoped_sync_installed',to_regclass('public.federation_sync_scopes')is not null),
 'membership_roles',(select jsonb_agg(x)from(select to_jsonb(m)->>'role' role,count(*)from club_memberships m group by 1)x)
) semantic_integrity;rollback;
