-- Local predecessor RLS; real identities supplied by Auth and verified by PostgREST.
do $$begin if current_setting('ch360.staging_project',true) is distinct from 'clubhoquei360-3a3-local' then raise exception 'Isolated staging marker required';end if;end$$;
create function app_private.stage_club_read(cid uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and (app_private.is_platform_superadmin() or exists(select 1 from public.club_memberships m where m.user_id=auth.uid() and m.club_id=cid))$$;
create function app_private.stage_team_read(tid uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and (app_private.is_platform_superadmin() or exists(select 1 from public.teams t join public.club_memberships m on m.club_id=t.club_id and m.user_id=auth.uid() where t.id=tid and (m.team_id=tid or m.team_id is null and m.role in('admin','general_coordinator'))))$$;
create function app_private.stage_fixture_read(fid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.federation_match_teams mt join public.federation_team_entries e on e.id=mt.entry_id where mt.match_id=fid and app_private.stage_team_read(e.club_team_id))$$;
do $$declare n text;begin
 for n in select tablename from pg_tables where schemaname='public' loop
 execute format('alter table public.%I enable row level security',n);execute format('revoke all on public.%I from anon,authenticated',n);execute format('grant select on public.%I to authenticated',n);
 end loop;end$$;
revoke all on public.platform_admins from anon,authenticated;
create policy clubs_read on public.clubs for select to authenticated using(app_private.stage_club_read(id));
create policy seasons_read on public.seasons for select to authenticated using(app_private.stage_club_read(club_id));
create policy teams_read on public.teams for select to authenticated using(app_private.stage_team_read(id));
create policy memberships_read on public.club_memberships for select to authenticated using(user_id=auth.uid());
create policy competitions_read on public.federation_competitions for select to authenticated using(exists(select 1 from public.federation_team_entries e where e.competition_id=federation_competitions.id and app_private.stage_team_read(e.club_team_id)));
create policy groups_read on public.federation_groups for select to authenticated using(exists(select 1 from public.federation_competitions c where c.id=competition_id));
create policy entries_read on public.federation_team_entries for select to authenticated using(app_private.stage_team_read(club_team_id));
create policy fixtures_read on public.federation_matches for select to authenticated using(app_private.stage_fixture_read(id));
create policy links_read on public.federation_match_teams for select to authenticated using(app_private.stage_fixture_read(match_id));
create policy federation_players_read on public.federation_players for select to authenticated using(false);
create policy federation_roster_read on public.federation_team_roster for select to authenticated using(exists(select 1 from public.federation_team_entries e where e.id=entry_id));
do $$declare n text;begin
 for n in select unnest(array['pilot_matches','pilot_events','pilot_players','pilot_operator_state','federation_match_sources']) loop
 execute format('create policy stage_member_read on public.%I for select to authenticated using(app_private.is_platform_superadmin() or exists(select 1 from public.pilot_members m where m.user_id=auth.uid() and m.match_id=%I.%I))',n,n,case when n='pilot_matches' then 'id' else 'match_id' end);
 end loop;end$$;
create policy pilot_members_read on public.pilot_members for select to authenticated using(user_id=auth.uid() or app_private.is_platform_superadmin());
-- Production's relevant INSERT predicate, including the statistician branch audited in 3A.2.
create policy pilot_events_authorized_insert on public.pilot_events for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.pilot_members m where m.match_id=pilot_events.match_id and m.user_id=auth.uid() and m.role in('operator','statistician')) and (event_type not in('goal','team_foul','clock','substitution','lineup','correction','card_blue','card_red') or exists(select 1 from public.pilot_members m where m.match_id=pilot_events.match_id and m.user_id=auth.uid() and m.role='operator')));
create policy pilot_events_direct_club_fixture on public.pilot_events as restrictive for insert to authenticated with check(not exists(select 1 from public.federation_match_sources s where s.match_id=pilot_events.match_id) or exists(select 1 from public.federation_match_sources s where s.match_id=pilot_events.match_id and s.import_status='verified'));
grant insert on public.pilot_events to authenticated;
create policy player_insert on public.pilot_players for insert to authenticated with check(exists(select 1 from public.pilot_members m where m.match_id=pilot_players.match_id and m.user_id=auth.uid() and m.role='operator'));
create policy player_update on public.pilot_players for update to authenticated using(exists(select 1 from public.pilot_members m where m.match_id=pilot_players.match_id and m.user_id=auth.uid() and m.role='operator')) with check(exists(select 1 from public.pilot_members m where m.match_id=pilot_players.match_id and m.user_id=auth.uid() and m.role='operator'));
grant insert,update on public.pilot_players to authenticated;
create policy state_insert on public.pilot_operator_state for insert to authenticated with check(updated_by=auth.uid() and exists(select 1 from public.pilot_members m where m.match_id=pilot_operator_state.match_id and m.user_id=auth.uid() and m.role='operator'));
create policy state_update on public.pilot_operator_state for update to authenticated using(exists(select 1 from public.pilot_members m where m.match_id=pilot_operator_state.match_id and m.user_id=auth.uid() and m.role='operator')) with check(updated_by=auth.uid());
grant insert,update on public.pilot_operator_state to authenticated;
create function public.pilot_save_operator_state(p_match uuid,p_revision bigint,p_state jsonb) returns setof public.pilot_operator_state language plpgsql security invoker set search_path='' as $$begin
 if p_revision=0 then insert into public.pilot_operator_state(match_id,revision,state,updated_by) values(p_match,1,p_state,auth.uid()) on conflict(match_id) do nothing;return query select * from public.pilot_operator_state where match_id=p_match and revision=1 and updated_by=auth.uid() and state=p_state;
 else return query update public.pilot_operator_state set revision=revision+1,state=p_state,updated_by=auth.uid(),updated_at=now() where match_id=p_match and revision=p_revision returning *;end if;end$$;
revoke all on all functions in schema app_private from public,anon;grant usage on schema app_private to authenticated;grant execute on all functions in schema app_private to authenticated;
