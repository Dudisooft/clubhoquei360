-- New opt-in features only. No scheduler installed or production data changed.
begin;
create function app_private.callup_team_allowed(p_team uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.teams t where t.id=p_team and (
 app_private.is_platform_superadmin() or exists(select 1 from public.club_memberships m where m.user_id=auth.uid() and m.club_id=t.club_id
 and ((m.team_id=t.id and m.role in('admin','general_coordinator','section_coordinator','coach','delegate')) or (m.team_id is null and m.role in('admin','general_coordinator'))))))
$$;
revoke all on function app_private.callup_team_allowed(uuid) from public,anon;
grant execute on function app_private.callup_team_allowed(uuid) to authenticated;
create table public.callup_preferences(
 user_id uuid not null,team_id uuid not null references public.teams(id),
 preferences jsonb not null default '{}',updated_at timestamptz not null default now(),primary key(user_id,team_id),
 check(jsonb_typeof(preferences)='object' and octet_length(preferences::text)<=8000)
);
alter table public.callup_preferences enable row level security;
revoke all on public.callup_preferences from public,anon,authenticated;
grant select,insert,update on public.callup_preferences to authenticated;
create policy callup_preferences_read on public.callup_preferences for select to authenticated using(user_id=auth.uid() and app_private.callup_team_allowed(team_id));
create policy callup_preferences_insert on public.callup_preferences for insert to authenticated with check(user_id=auth.uid() and app_private.callup_team_allowed(team_id));
create policy callup_preferences_update on public.callup_preferences for update to authenticated using(user_id=auth.uid() and app_private.callup_team_allowed(team_id)) with check(user_id=auth.uid() and app_private.callup_team_allowed(team_id));
create function public.callup_catalogue() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('teams',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'club_id',t.club_id,'name',t.name,'category',t.category,'season_id',t.season_id,'season',s.label) order by s.label desc,t.name) from public.teams t join public.seasons s on s.id=t.season_id and s.club_id=t.club_id where app_private.callup_team_allowed(t.id)),'[]'),
 'clubs',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name) order by c.name) from public.clubs c where exists(select 1 from public.teams t where t.club_id=c.id and app_private.callup_team_allowed(t.id))),'[]'))
$$;
create function public.callup_fixtures(p_team uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not app_private.callup_team_allowed(p_team) then raise exception 'Team access denied' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'home_team',m.home_team,'away_team',m.away_team,'federation_start_at',m.federation_start_at,'round_label',m.round_label,'venue',m.venue,'competition',c.name,'group',g.name,'category',t.category,'team_name',t.name,'season',s.label,'home_score',m.home_score,'away_score',m.away_score,'source_url',m.raw_data->>'source_url','fetched_at',m.fetched_at,'address',m.raw_data->>'venue_address','maps',case when m.raw_data->>'maps_verified'='true' then m.raw_data->>'maps_url' end) order by m.federation_start_at,m.id)
 from public.federation_matches m join public.federation_groups g on g.id=m.group_id join public.federation_competitions c on c.id=g.competition_id
 join public.teams t on t.id=p_team and t.club_id=c.club_id and t.season_id=c.season_id join public.seasons s on s.id=t.season_id
 where exists(select 1 from public.federation_match_teams mt join public.federation_team_entries e on e.id=mt.entry_id where mt.match_id=m.id and e.competition_id=c.id and e.club_team_id=t.id)),'[]');
end$$;
revoke all on function public.callup_catalogue(),public.callup_fixtures(uuid) from public,anon;
grant execute on function public.callup_catalogue(),public.callup_fixtures(uuid) to authenticated;
commit;
