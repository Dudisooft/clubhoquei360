-- Read-only catalogue access. Existing RLS policies still enforce club membership
-- and the existing platform_superadmin identity. No write or membership grants.
grant select on public.federation_competitions,public.federation_groups,public.federation_matches,
 public.federation_match_teams,public.federation_team_entries,public.federation_team_roster,
 public.federation_players,public.federation_player_competition_stats,
 public.federation_match_lineups,public.federation_match_events to authenticated;
