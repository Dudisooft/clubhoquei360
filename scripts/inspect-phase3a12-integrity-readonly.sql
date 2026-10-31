begin isolation level repeatable read read only;
select jsonb_build_object('captured_at',now(),'counts',(select jsonb_agg(to_jsonb(x)) from(select 'auth' schema_name,'identities' table_name,count(*)::bigint row_count from auth.identities
union all
select 'auth' schema_name,'sessions' table_name,count(*)::bigint row_count from auth.sessions
union all
select 'auth' schema_name,'users' table_name,count(*)::bigint row_count from auth.users
union all
select 'public' schema_name,'basic_match_contexts' table_name,count(*)::bigint row_count from public.basic_match_contexts
union all
select 'public' schema_name,'club_match_schedule_history' table_name,count(*)::bigint row_count from public.club_match_schedule_history
union all
select 'public' schema_name,'club_match_schedules' table_name,count(*)::bigint row_count from public.club_match_schedules
union all
select 'public' schema_name,'club_memberships' table_name,count(*)::bigint row_count from public.club_memberships
union all
select 'public' schema_name,'club_staff_people' table_name,count(*)::bigint row_count from public.club_staff_people
union all
select 'public' schema_name,'clubs' table_name,count(*)::bigint row_count from public.clubs
union all
select 'public' schema_name,'discipline_reviews' table_name,count(*)::bigint row_count from public.discipline_reviews
union all
select 'public' schema_name,'discipline_rule_sets' table_name,count(*)::bigint row_count from public.discipline_rule_sets
union all
select 'public' schema_name,'federation_calendar_cache' table_name,count(*)::bigint row_count from public.federation_calendar_cache
union all
select 'public' schema_name,'federation_competitions' table_name,count(*)::bigint row_count from public.federation_competitions
union all
select 'public' schema_name,'federation_groups' table_name,count(*)::bigint row_count from public.federation_groups
union all
select 'public' schema_name,'federation_import_runs' table_name,count(*)::bigint row_count from public.federation_import_runs
union all
select 'public' schema_name,'federation_match_events' table_name,count(*)::bigint row_count from public.federation_match_events
union all
select 'public' schema_name,'federation_match_lineups' table_name,count(*)::bigint row_count from public.federation_match_lineups
union all
select 'public' schema_name,'federation_match_sources' table_name,count(*)::bigint row_count from public.federation_match_sources
union all
select 'public' schema_name,'federation_match_staff' table_name,count(*)::bigint row_count from public.federation_match_staff
union all
select 'public' schema_name,'federation_match_teams' table_name,count(*)::bigint row_count from public.federation_match_teams
union all
select 'public' schema_name,'federation_matches' table_name,count(*)::bigint row_count from public.federation_matches
union all
select 'public' schema_name,'federation_player_competition_stats' table_name,count(*)::bigint row_count from public.federation_player_competition_stats
union all
select 'public' schema_name,'federation_players' table_name,count(*)::bigint row_count from public.federation_players
union all
select 'public' schema_name,'federation_sync_runs' table_name,count(*)::bigint row_count from public.federation_sync_runs
union all
select 'public' schema_name,'federation_team_entries' table_name,count(*)::bigint row_count from public.federation_team_entries
union all
select 'public' schema_name,'federation_team_roster' table_name,count(*)::bigint row_count from public.federation_team_roster
union all
select 'public' schema_name,'pilot_events' table_name,count(*)::bigint row_count from public.pilot_events
union all
select 'public' schema_name,'pilot_matches' table_name,count(*)::bigint row_count from public.pilot_matches
union all
select 'public' schema_name,'pilot_members' table_name,count(*)::bigint row_count from public.pilot_members
union all
select 'public' schema_name,'pilot_operator_state' table_name,count(*)::bigint row_count from public.pilot_operator_state
union all
select 'public' schema_name,'pilot_players' table_name,count(*)::bigint row_count from public.pilot_players
union all
select 'public' schema_name,'pilot_preparation_audit' table_name,count(*)::bigint row_count from public.pilot_preparation_audit
union all
select 'public' schema_name,'pilot_prepared_lineups' table_name,count(*)::bigint row_count from public.pilot_prepared_lineups
union all
select 'public' schema_name,'platform_admin_audit' table_name,count(*)::bigint row_count from public.platform_admin_audit
union all
select 'public' schema_name,'platform_admins' table_name,count(*)::bigint row_count from public.platform_admins
union all
select 'public' schema_name,'profiles' table_name,count(*)::bigint row_count from public.profiles
union all
select 'public' schema_name,'seasons' table_name,count(*)::bigint row_count from public.seasons
union all
select 'public' schema_name,'stats_access_audit' table_name,count(*)::bigint row_count from public.stats_access_audit
union all
select 'public' schema_name,'stats_actions' table_name,count(*)::bigint row_count from public.stats_actions
union all
select 'public' schema_name,'stats_assignments' table_name,count(*)::bigint row_count from public.stats_assignments
union all
select 'public' schema_name,'stats_coverage' table_name,count(*)::bigint row_count from public.stats_coverage
union all
select 'public' schema_name,'stats_event_audit' table_name,count(*)::bigint row_count from public.stats_event_audit
union all
select 'public' schema_name,'stats_events' table_name,count(*)::bigint row_count from public.stats_events
union all
select 'public' schema_name,'stats_matches' table_name,count(*)::bigint row_count from public.stats_matches
union all
select 'public' schema_name,'stats_sessions' table_name,count(*)::bigint row_count from public.stats_sessions
union all
select 'public' schema_name,'teams' table_name,count(*)::bigint row_count from public.teams
union all
select 'public' schema_name,'temporary_invitation_audit' table_name,count(*)::bigint row_count from public.temporary_invitation_audit
union all
select 'public' schema_name,'temporary_invitations' table_name,count(*)::bigint row_count from public.temporary_invitations
union all
select 'storage' schema_name,'buckets' table_name,count(*)::bigint row_count from storage.buckets
union all
select 'storage' schema_name,'objects' table_name,count(*)::bigint row_count from storage.objects)x),'foreign_keys',(select jsonb_agg(to_jsonb(x))from(select 'basic_match_contexts_catalogue_match_id_fkey' constraint_name,'basic_match_contexts' table_name,count(*)::bigint orphan_count from public.basic_match_contexts child where child.catalogue_match_id is not null and not exists(select 1 from public.federation_matches parent where parent.id=child.catalogue_match_id)
union all
select 'basic_match_contexts_owner_id_fkey' constraint_name,'basic_match_contexts' table_name,count(*)::bigint orphan_count from public.basic_match_contexts child where child.owner_id is not null and not exists(select 1 from auth.users parent where parent.id=child.owner_id)
union all
select 'basic_match_contexts_pilot_match_id_fkey' constraint_name,'basic_match_contexts' table_name,count(*)::bigint orphan_count from public.basic_match_contexts child where child.pilot_match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.pilot_match_id)
union all
select 'club_match_schedule_history_changed_by_fkey' constraint_name,'club_match_schedule_history' table_name,count(*)::bigint orphan_count from public.club_match_schedule_history child where child.changed_by is not null and not exists(select 1 from auth.users parent where parent.id=child.changed_by)
union all
select 'club_match_schedule_history_club_id_fkey' constraint_name,'club_match_schedule_history' table_name,count(*)::bigint orphan_count from public.club_match_schedule_history child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'club_match_schedule_history_match_id_fkey' constraint_name,'club_match_schedule_history' table_name,count(*)::bigint orphan_count from public.club_match_schedule_history child where child.match_id is not null and not exists(select 1 from public.federation_matches parent where parent.id=child.match_id)
union all
select 'club_match_schedules_club_id_fkey' constraint_name,'club_match_schedules' table_name,count(*)::bigint orphan_count from public.club_match_schedules child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'club_match_schedules_coordinator_confirmed_by_fkey' constraint_name,'club_match_schedules' table_name,count(*)::bigint orphan_count from public.club_match_schedules child where child.coordinator_confirmed_by is not null and not exists(select 1 from auth.users parent where parent.id=child.coordinator_confirmed_by)
union all
select 'club_match_schedules_match_id_fkey' constraint_name,'club_match_schedules' table_name,count(*)::bigint orphan_count from public.club_match_schedules child where child.match_id is not null and not exists(select 1 from public.federation_matches parent where parent.id=child.match_id)
union all
select 'club_match_schedules_updated_by_fkey' constraint_name,'club_match_schedules' table_name,count(*)::bigint orphan_count from public.club_match_schedules child where child.updated_by is not null and not exists(select 1 from auth.users parent where parent.id=child.updated_by)
union all
select 'club_memberships_club_id_fkey' constraint_name,'club_memberships' table_name,count(*)::bigint orphan_count from public.club_memberships child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'club_memberships_team_id_club_id_fkey' constraint_name,'club_memberships' table_name,count(*)::bigint orphan_count from public.club_memberships child where child.team_id is not null and child.club_id is not null and not exists(select 1 from public.teams parent where parent.id=child.team_id and parent.club_id=child.club_id)
union all
select 'club_memberships_user_id_fkey' constraint_name,'club_memberships' table_name,count(*)::bigint orphan_count from public.club_memberships child where child.user_id is not null and not exists(select 1 from auth.users parent where parent.id=child.user_id)
union all
select 'club_staff_people_club_id_fkey' constraint_name,'club_staff_people' table_name,count(*)::bigint orphan_count from public.club_staff_people child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'discipline_reviews_club_id_fkey' constraint_name,'discipline_reviews' table_name,count(*)::bigint orphan_count from public.discipline_reviews child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'discipline_reviews_competition_id_fkey' constraint_name,'discipline_reviews' table_name,count(*)::bigint orphan_count from public.discipline_reviews child where child.competition_id is not null and not exists(select 1 from public.federation_competitions parent where parent.id=child.competition_id)
union all
select 'discipline_reviews_match_id_fkey' constraint_name,'discipline_reviews' table_name,count(*)::bigint orphan_count from public.discipline_reviews child where child.match_id is not null and not exists(select 1 from public.federation_matches parent where parent.id=child.match_id)
union all
select 'discipline_reviews_player_id_fkey' constraint_name,'discipline_reviews' table_name,count(*)::bigint orphan_count from public.discipline_reviews child where child.player_id is not null and not exists(select 1 from public.federation_players parent where parent.id=child.player_id)
union all
select 'discipline_reviews_reviewed_by_fkey' constraint_name,'discipline_reviews' table_name,count(*)::bigint orphan_count from public.discipline_reviews child where child.reviewed_by is not null and not exists(select 1 from auth.users parent where parent.id=child.reviewed_by)
union all
select 'discipline_reviews_season_id_fkey' constraint_name,'discipline_reviews' table_name,count(*)::bigint orphan_count from public.discipline_reviews child where child.season_id is not null and not exists(select 1 from public.seasons parent where parent.id=child.season_id)
union all
select 'discipline_rule_sets_verified_by_fkey' constraint_name,'discipline_rule_sets' table_name,count(*)::bigint orphan_count from public.discipline_rule_sets child where child.verified_by is not null and not exists(select 1 from auth.users parent where parent.id=child.verified_by)
union all
select 'federation_competitions_club_id_fkey' constraint_name,'federation_competitions' table_name,count(*)::bigint orphan_count from public.federation_competitions child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'federation_competitions_season_id_club_id_fkey' constraint_name,'federation_competitions' table_name,count(*)::bigint orphan_count from public.federation_competitions child where child.season_id is not null and child.club_id is not null and not exists(select 1 from public.seasons parent where parent.id=child.season_id and parent.club_id=child.club_id)
union all
select 'federation_groups_competition_id_fkey' constraint_name,'federation_groups' table_name,count(*)::bigint orphan_count from public.federation_groups child where child.competition_id is not null and not exists(select 1 from public.federation_competitions parent where parent.id=child.competition_id)
union all
select 'federation_match_events_match_id_fkey' constraint_name,'federation_match_events' table_name,count(*)::bigint orphan_count from public.federation_match_events child where child.match_id is not null and not exists(select 1 from public.federation_matches parent where parent.id=child.match_id)
union all
select 'federation_match_events_player_id_fkey' constraint_name,'federation_match_events' table_name,count(*)::bigint orphan_count from public.federation_match_events child where child.player_id is not null and not exists(select 1 from public.federation_players parent where parent.id=child.player_id)
union all
select 'federation_match_lineups_match_id_fkey' constraint_name,'federation_match_lineups' table_name,count(*)::bigint orphan_count from public.federation_match_lineups child where child.match_id is not null and not exists(select 1 from public.federation_matches parent where parent.id=child.match_id)
union all
select 'federation_match_lineups_player_id_fkey' constraint_name,'federation_match_lineups' table_name,count(*)::bigint orphan_count from public.federation_match_lineups child where child.player_id is not null and not exists(select 1 from public.federation_players parent where parent.id=child.player_id)
union all
select 'federation_match_sources_match_id_fkey' constraint_name,'federation_match_sources' table_name,count(*)::bigint orphan_count from public.federation_match_sources child where child.match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.match_id)
union all
select 'federation_match_staff_match_id_fkey' constraint_name,'federation_match_staff' table_name,count(*)::bigint orphan_count from public.federation_match_staff child where child.match_id is not null and not exists(select 1 from public.federation_matches parent where parent.id=child.match_id)
union all
select 'federation_match_staff_staff_person_id_fkey' constraint_name,'federation_match_staff' table_name,count(*)::bigint orphan_count from public.federation_match_staff child where child.staff_person_id is not null and not exists(select 1 from public.club_staff_people parent where parent.id=child.staff_person_id)
union all
select 'federation_match_teams_entry_id_fkey' constraint_name,'federation_match_teams' table_name,count(*)::bigint orphan_count from public.federation_match_teams child where child.entry_id is not null and not exists(select 1 from public.federation_team_entries parent where parent.id=child.entry_id)
union all
select 'federation_match_teams_match_id_fkey' constraint_name,'federation_match_teams' table_name,count(*)::bigint orphan_count from public.federation_match_teams child where child.match_id is not null and not exists(select 1 from public.federation_matches parent where parent.id=child.match_id)
union all
select 'federation_matches_group_id_fkey' constraint_name,'federation_matches' table_name,count(*)::bigint orphan_count from public.federation_matches child where child.group_id is not null and not exists(select 1 from public.federation_groups parent where parent.id=child.group_id)
union all
select 'federation_player_competition_stats_competition_id_fkey' constraint_name,'federation_player_competition_stats' table_name,count(*)::bigint orphan_count from public.federation_player_competition_stats child where child.competition_id is not null and not exists(select 1 from public.federation_competitions parent where parent.id=child.competition_id)
union all
select 'federation_player_competition_stats_player_id_fkey' constraint_name,'federation_player_competition_stats' table_name,count(*)::bigint orphan_count from public.federation_player_competition_stats child where child.player_id is not null and not exists(select 1 from public.federation_players parent where parent.id=child.player_id)
union all
select 'federation_sync_runs_match_id_fkey' constraint_name,'federation_sync_runs' table_name,count(*)::bigint orphan_count from public.federation_sync_runs child where child.match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.match_id)
union all
select 'federation_team_entries_club_team_id_fkey' constraint_name,'federation_team_entries' table_name,count(*)::bigint orphan_count from public.federation_team_entries child where child.club_team_id is not null and not exists(select 1 from public.teams parent where parent.id=child.club_team_id)
union all
select 'federation_team_entries_competition_id_fkey' constraint_name,'federation_team_entries' table_name,count(*)::bigint orphan_count from public.federation_team_entries child where child.competition_id is not null and not exists(select 1 from public.federation_competitions parent where parent.id=child.competition_id)
union all
select 'federation_team_entries_group_id_fkey' constraint_name,'federation_team_entries' table_name,count(*)::bigint orphan_count from public.federation_team_entries child where child.group_id is not null and not exists(select 1 from public.federation_groups parent where parent.id=child.group_id)
union all
select 'federation_team_roster_entry_id_fkey' constraint_name,'federation_team_roster' table_name,count(*)::bigint orphan_count from public.federation_team_roster child where child.entry_id is not null and not exists(select 1 from public.federation_team_entries parent where parent.id=child.entry_id)
union all
select 'federation_team_roster_player_id_fkey' constraint_name,'federation_team_roster' table_name,count(*)::bigint orphan_count from public.federation_team_roster child where child.player_id is not null and not exists(select 1 from public.federation_players parent where parent.id=child.player_id)
union all
select 'federation_team_roster_staff_person_id_fkey' constraint_name,'federation_team_roster' table_name,count(*)::bigint orphan_count from public.federation_team_roster child where child.staff_person_id is not null and not exists(select 1 from public.club_staff_people parent where parent.id=child.staff_person_id)
union all
select 'pilot_events_match_id_fkey' constraint_name,'pilot_events' table_name,count(*)::bigint orphan_count from public.pilot_events child where child.match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.match_id)
union all
select 'pilot_events_related_event_id_fkey' constraint_name,'pilot_events' table_name,count(*)::bigint orphan_count from public.pilot_events child where child.related_event_id is not null and not exists(select 1 from public.pilot_events parent where parent.id=child.related_event_id)
union all
select 'pilot_events_user_id_fkey' constraint_name,'pilot_events' table_name,count(*)::bigint orphan_count from public.pilot_events child where child.user_id is not null and not exists(select 1 from auth.users parent where parent.id=child.user_id)
union all
select 'pilot_members_match_id_fkey' constraint_name,'pilot_members' table_name,count(*)::bigint orphan_count from public.pilot_members child where child.match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.match_id)
union all
select 'pilot_members_user_id_fkey' constraint_name,'pilot_members' table_name,count(*)::bigint orphan_count from public.pilot_members child where child.user_id is not null and not exists(select 1 from auth.users parent where parent.id=child.user_id)
union all
select 'pilot_operator_state_match_id_fkey' constraint_name,'pilot_operator_state' table_name,count(*)::bigint orphan_count from public.pilot_operator_state child where child.match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.match_id)
union all
select 'pilot_operator_state_updated_by_fkey' constraint_name,'pilot_operator_state' table_name,count(*)::bigint orphan_count from public.pilot_operator_state child where child.updated_by is not null and not exists(select 1 from auth.users parent where parent.id=child.updated_by)
union all
select 'pilot_players_match_id_fkey' constraint_name,'pilot_players' table_name,count(*)::bigint orphan_count from public.pilot_players child where child.match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.match_id)
union all
select 'pilot_preparation_audit_actor_id_fkey' constraint_name,'pilot_preparation_audit' table_name,count(*)::bigint orphan_count from public.pilot_preparation_audit child where child.actor_id is not null and not exists(select 1 from auth.users parent where parent.id=child.actor_id)
union all
select 'pilot_preparation_audit_match_id_fkey' constraint_name,'pilot_preparation_audit' table_name,count(*)::bigint orphan_count from public.pilot_preparation_audit child where child.match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.match_id)
union all
select 'pilot_prepared_lineups_confirmed_by_fkey' constraint_name,'pilot_prepared_lineups' table_name,count(*)::bigint orphan_count from public.pilot_prepared_lineups child where child.confirmed_by is not null and not exists(select 1 from auth.users parent where parent.id=child.confirmed_by)
union all
select 'pilot_prepared_lineups_match_id_fkey' constraint_name,'pilot_prepared_lineups' table_name,count(*)::bigint orphan_count from public.pilot_prepared_lineups child where child.match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.match_id)
union all
select 'platform_admin_audit_actor_id_fkey' constraint_name,'platform_admin_audit' table_name,count(*)::bigint orphan_count from public.platform_admin_audit child where child.actor_id is not null and not exists(select 1 from auth.users parent where parent.id=child.actor_id)
union all
select 'platform_admin_audit_club_id_fkey' constraint_name,'platform_admin_audit' table_name,count(*)::bigint orphan_count from public.platform_admin_audit child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'platform_admins_user_id_fkey' constraint_name,'platform_admins' table_name,count(*)::bigint orphan_count from public.platform_admins child where child.user_id is not null and not exists(select 1 from auth.users parent where parent.id=child.user_id)
union all
select 'profiles_user_id_fkey' constraint_name,'profiles' table_name,count(*)::bigint orphan_count from public.profiles child where child.user_id is not null and not exists(select 1 from auth.users parent where parent.id=child.user_id)
union all
select 'seasons_club_id_fkey' constraint_name,'seasons' table_name,count(*)::bigint orphan_count from public.seasons child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'stats_access_audit_actor_id_fkey' constraint_name,'stats_access_audit' table_name,count(*)::bigint orphan_count from public.stats_access_audit child where child.actor_id is not null and not exists(select 1 from auth.users parent where parent.id=child.actor_id)
union all
select 'stats_access_audit_match_id_fkey' constraint_name,'stats_access_audit' table_name,count(*)::bigint orphan_count from public.stats_access_audit child where child.match_id is not null and not exists(select 1 from public.stats_matches parent where parent.match_id=child.match_id)
union all
select 'stats_assignments_granted_by_fkey' constraint_name,'stats_assignments' table_name,count(*)::bigint orphan_count from public.stats_assignments child where child.granted_by is not null and not exists(select 1 from auth.users parent where parent.id=child.granted_by)
union all
select 'stats_assignments_invitation_id_fkey' constraint_name,'stats_assignments' table_name,count(*)::bigint orphan_count from public.stats_assignments child where child.invitation_id is not null and not exists(select 1 from public.temporary_invitations parent where parent.id=child.invitation_id)
union all
select 'stats_assignments_match_id_fkey' constraint_name,'stats_assignments' table_name,count(*)::bigint orphan_count from public.stats_assignments child where child.match_id is not null and not exists(select 1 from public.stats_matches parent where parent.match_id=child.match_id)
union all
select 'stats_assignments_user_id_fkey' constraint_name,'stats_assignments' table_name,count(*)::bigint orphan_count from public.stats_assignments child where child.user_id is not null and not exists(select 1 from auth.users parent where parent.id=child.user_id)
union all
select 'stats_coverage_match_id_fkey' constraint_name,'stats_coverage' table_name,count(*)::bigint orphan_count from public.stats_coverage child where child.match_id is not null and not exists(select 1 from public.stats_matches parent where parent.match_id=child.match_id)
union all
select 'stats_coverage_updated_by_fkey' constraint_name,'stats_coverage' table_name,count(*)::bigint orphan_count from public.stats_coverage child where child.updated_by is not null and not exists(select 1 from auth.users parent where parent.id=child.updated_by)
union all
select 'stats_event_audit_actor_id_fkey' constraint_name,'stats_event_audit' table_name,count(*)::bigint orphan_count from public.stats_event_audit child where child.actor_id is not null and not exists(select 1 from auth.users parent where parent.id=child.actor_id)
union all
select 'stats_event_audit_event_id_fkey' constraint_name,'stats_event_audit' table_name,count(*)::bigint orphan_count from public.stats_event_audit child where child.event_id is not null and not exists(select 1 from public.stats_events parent where parent.id=child.event_id)
union all
select 'stats_event_audit_match_id_fkey' constraint_name,'stats_event_audit' table_name,count(*)::bigint orphan_count from public.stats_event_audit child where child.match_id is not null and not exists(select 1 from public.stats_matches parent where parent.match_id=child.match_id)
union all
select 'stats_events_action_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.action is not null and not exists(select 1 from public.stats_actions parent where parent.code=child.action)
union all
select 'stats_events_assist_player_id_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.assist_player_id is not null and not exists(select 1 from public.pilot_players parent where parent.id=child.assist_player_id)
union all
select 'stats_events_club_id_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'stats_events_match_id_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.match_id is not null and not exists(select 1 from public.stats_matches parent where parent.match_id=child.match_id)
union all
select 'stats_events_operator_id_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.operator_id is not null and not exists(select 1 from auth.users parent where parent.id=child.operator_id)
union all
select 'stats_events_player_id_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.player_id is not null and not exists(select 1 from public.pilot_players parent where parent.id=child.player_id)
union all
select 'stats_events_season_id_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.season_id is not null and not exists(select 1 from public.seasons parent where parent.id=child.season_id)
union all
select 'stats_events_source_event_id_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.source_event_id is not null and not exists(select 1 from public.pilot_events parent where parent.id=child.source_event_id)
union all
select 'stats_events_team_id_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.team_id is not null and not exists(select 1 from public.teams parent where parent.id=child.team_id)
union all
select 'stats_events_updated_by_fkey' constraint_name,'stats_events' table_name,count(*)::bigint orphan_count from public.stats_events child where child.updated_by is not null and not exists(select 1 from auth.users parent where parent.id=child.updated_by)
union all
select 'stats_matches_away_team_id_fkey' constraint_name,'stats_matches' table_name,count(*)::bigint orphan_count from public.stats_matches child where child.away_team_id is not null and not exists(select 1 from public.teams parent where parent.id=child.away_team_id)
union all
select 'stats_matches_club_id_fkey' constraint_name,'stats_matches' table_name,count(*)::bigint orphan_count from public.stats_matches child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'stats_matches_home_team_id_fkey' constraint_name,'stats_matches' table_name,count(*)::bigint orphan_count from public.stats_matches child where child.home_team_id is not null and not exists(select 1 from public.teams parent where parent.id=child.home_team_id)
union all
select 'stats_matches_match_id_fkey' constraint_name,'stats_matches' table_name,count(*)::bigint orphan_count from public.stats_matches child where child.match_id is not null and not exists(select 1 from public.pilot_matches parent where parent.id=child.match_id)
union all
select 'stats_matches_season_id_fkey' constraint_name,'stats_matches' table_name,count(*)::bigint orphan_count from public.stats_matches child where child.season_id is not null and not exists(select 1 from public.seasons parent where parent.id=child.season_id)
union all
select 'stats_sessions_match_id_fkey' constraint_name,'stats_sessions' table_name,count(*)::bigint orphan_count from public.stats_sessions child where child.match_id is not null and not exists(select 1 from public.stats_matches parent where parent.match_id=child.match_id)
union all
select 'stats_sessions_user_id_fkey' constraint_name,'stats_sessions' table_name,count(*)::bigint orphan_count from public.stats_sessions child where child.user_id is not null and not exists(select 1 from auth.users parent where parent.id=child.user_id)
union all
select 'teams_club_id_fkey' constraint_name,'teams' table_name,count(*)::bigint orphan_count from public.teams child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'teams_season_id_club_id_fkey' constraint_name,'teams' table_name,count(*)::bigint orphan_count from public.teams child where child.season_id is not null and child.club_id is not null and not exists(select 1 from public.seasons parent where parent.id=child.season_id and parent.club_id=child.club_id)
union all
select 'temporary_invitation_audit_invitation_id_fkey' constraint_name,'temporary_invitation_audit' table_name,count(*)::bigint orphan_count from public.temporary_invitation_audit child where child.invitation_id is not null and not exists(select 1 from public.temporary_invitations parent where parent.id=child.invitation_id)
union all
select 'temporary_invitations_accepted_by_fkey' constraint_name,'temporary_invitations' table_name,count(*)::bigint orphan_count from public.temporary_invitations child where child.accepted_by is not null and not exists(select 1 from auth.users parent where parent.id=child.accepted_by)
union all
select 'temporary_invitations_club_id_fkey' constraint_name,'temporary_invitations' table_name,count(*)::bigint orphan_count from public.temporary_invitations child where child.club_id is not null and not exists(select 1 from public.clubs parent where parent.id=child.club_id)
union all
select 'temporary_invitations_created_by_fkey' constraint_name,'temporary_invitations' table_name,count(*)::bigint orphan_count from public.temporary_invitations child where child.created_by is not null and not exists(select 1 from auth.users parent where parent.id=child.created_by)
union all
select 'temporary_invitations_team_id_fkey' constraint_name,'temporary_invitations' table_name,count(*)::bigint orphan_count from public.temporary_invitations child where child.team_id is not null and not exists(select 1 from public.teams parent where parent.id=child.team_id))x)) integrity;
rollback;
