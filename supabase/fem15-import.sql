-- Additive FEM15 importer. Existing pilot rows, events, clocks and memberships are never updated.
-- Uses current federation tables. No new tables or client permissions.
create or replace function public.federation_commit_fem15(p_data jsonb,p_actor uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c uuid; s uuid; t uuid; comp uuid; g uuid; entry uuid; owner_id uuid;
 fixture jsonb; person jsonb; report jsonb; player jsonb; pid uuid; mid uuid; side_label text; stamp timestamptz;
 roster_n int:=0; matches_n int:=0; reports_n int:=0; before_hash text; after_hash text; protected uuid[];
begin
 if p_data->>'federation' is distinct from 'FECAPA' or p_data->>'season_id' is distinct from '41' or p_data->>'competition_id' is distinct from '4802' or p_data->>'team_id' is distinct from '12419' or p_data->>'club_id' is distinct from '252' or p_data->>'group_id' is distinct from '5010' then raise exception 'FEM15 scope mismatch';end if;
 if jsonb_array_length(p_data->'matches')=0 or jsonb_array_length(p_data->'roster')=0 then raise exception 'Incomplete FEM15 data';end if;
 perform pg_advisory_xact_lock(hashtextextended('FECAPA:41:4802:12419',0));
 if p_actor is not null then
  if not exists(select 1 from public.pilot_members where user_id=p_actor and role='operator') then raise exception 'Existing operator required';end if;owner_id:=p_actor;
 else
  if (select count(distinct user_id) from public.pilot_members where role='operator')<>1 then raise exception 'Specify an existing operator';end if;
  select user_id into owner_id from public.pilot_members where role='operator' limit 1;
 end if;
 select array_agg(id) into protected from public.pilot_matches where id not in(select match_id from public.federation_match_sources where federation='FECAPA' and competition_id='4802');
 select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by id),'')) into before_hash from public.pilot_matches p where id=any(protected);
 stamp:=(p_data->>'fetched_at')::timestamptz;
 c:=md5('clubhoquei360:fecapa:club:252')::uuid;
 insert into public.clubs(id,name,short_name) values(c,'Igualada Hoquei Club','IHC') on conflict(id) do nothing;
 s:=md5('clubhoquei360:fecapa:252:season:41')::uuid;
 -- These are the min/max covered match dates, not invented federation season boundaries.
 insert into public.seasons(id,club_id,label,starts_on,ends_on) select s,c,'2026/27',min(to_date(value->>'date','DD/MM/YYYY')),max(to_date(value->>'date','DD/MM/YYYY')) from jsonb_array_elements(p_data->'matches') on conflict(club_id,label) do nothing;
 select id into s from public.seasons where club_id=c and label='2026/27';
 t:=md5('clubhoquei360:fecapa:41:team:12419')::uuid;
 insert into public.teams(id,club_id,season_id,name,category) values(t,c,s,'Igualada HC · FEM15','FEM15') on conflict(id) do nothing;
 comp:=md5('clubhoquei360:fecapa:41:competition:4802')::uuid;
 insert into public.federation_competitions(id,club_id,season_id,federation,external_competition_id,name,category) values(comp,c,s,'FECAPA','4802','FEM 15 OR','FEM15') on conflict(club_id,federation,external_competition_id) do nothing;
 select id into comp from public.federation_competitions where club_id=c and federation='FECAPA' and external_competition_id='4802';
 g:=md5('clubhoquei360:fecapa:41:group:5010')::uuid;
 insert into public.federation_groups(id,competition_id,external_group_id,name) values(g,comp,'5010','FEM 15 OR') on conflict(competition_id,external_group_id) do nothing;
 select id into g from public.federation_groups where competition_id=comp and external_group_id='5010';
 entry:=md5('clubhoquei360:fecapa:41:4802:team:12419')::uuid;
 insert into public.federation_team_entries(id,competition_id,group_id,external_team_id,display_name,club_team_id,source_url,fetched_at,raw_data)
 values(entry,comp,g,'12419','IGUALADA HC',t,p_data->>'url',stamp,jsonb_build_object('season_id','41','club_external_id','252','category','FEM15','standings',p_data->'standings','limitations',p_data->'limitations'))
 on conflict(competition_id,external_team_id) do update set fetched_at=excluded.fetched_at,raw_data=excluded.raw_data;
 select id into entry from public.federation_team_entries where competition_id=comp and external_team_id='12419';
 update public.federation_team_roster set raw_data=jsonb_set(coalesce(raw_data,'{}'::jsonb),'{active_in_latest_roster}','false'::jsonb) where entry_id=entry;
 for person in select value from jsonb_array_elements(p_data->'roster') loop
  pid:=null;
  if person->>'role'='player' then
   pid:=md5('clubhoquei360:fecapa:player:'||(person->>'external_id'))::uuid;
   insert into public.federation_players(id,federation,external_player_id,display_name) values(pid,'FECAPA',person->>'external_id',person->>'name') on conflict do nothing;
   select id into pid from public.federation_players where federation='FECAPA' and external_player_id=person->>'external_id';
   insert into public.federation_player_competition_stats(id,player_id,competition_id,team_external_id,player_display_name,games,goals,assists,blue_cards,yellow_cards,red_cards,goals_attribution,fetched_at,raw_data)
   values(md5('clubhoquei360:fem15:stats:'||pid::text)::uuid,pid,comp,'12419',person->>'name',(person->>'games')::integer,(person->>'goals')::integer,(person->>'assists')::integer,(person->>'blue_cards')::integer,(person->>'yellow_cards')::integer,(person->>'red_cards')::integer,'unverified',stamp,jsonb_build_object('source_url',p_data->>'url','competition_id','4802','reported',person))
   on conflict(player_id,competition_id) do update set games=excluded.games,goals=excluded.goals,assists=excluded.assists,blue_cards=excluded.blue_cards,yellow_cards=excluded.yellow_cards,red_cards=excluded.red_cards,fetched_at=excluded.fetched_at,raw_data=excluded.raw_data;
  end if;
  insert into public.federation_team_roster(id,entry_id,player_id,external_person_id,display_name,role,shirt_number,fetched_at,raw_data)
  values(md5('clubhoquei360:fem15:roster:'||(person->>'role')||':'||(person->>'external_id'))::uuid,entry,pid,person->>'external_id',person->>'name',person->>'role',person->>'shirt_number',stamp,person||jsonb_build_object('source_url',p_data->>'url','active_in_latest_roster',true))
  on conflict(id) do update set display_name=excluded.display_name,shirt_number=excluded.shirt_number,fetched_at=excluded.fetched_at,raw_data=excluded.raw_data;
  roster_n:=roster_n+1;
 end loop;
 for fixture in select value from jsonb_array_elements(p_data->'matches') loop
  if not (fixture->>'home_team_id'='12419' or fixture->>'away_team_id'='12419') or fixture->>'group_id'<>'5010' then raise exception 'Out-of-scope fixture';end if;
  mid:=md5('clubhoquei360:fem15:match:'||(fixture->>'fingerprint'))::uuid;
  if mid=any(protected) then raise exception 'Protected match collision';end if;
  insert into public.federation_matches(id,group_id,external_match_id,match_fingerprint,round_label,home_team,away_team,federation_start_at,venue,home_score,away_score,fetched_at,raw_data)
  values(mid,g,fixture->>'match_id',fixture->>'fingerprint',fixture->>'round',fixture->>'home_name',fixture->>'away_name',(to_date(fixture->>'date','DD/MM/YYYY')+coalesce(nullif(fixture->>'time',''),'00:00')::time) at time zone 'Europe/Madrid',fixture->>'venue',(fixture->>'home_score')::integer,(fixture->>'away_score')::integer,stamp,(fixture-'report')||jsonb_build_object('source_url',p_data->>'url','external_id_status',case when fixture->>'match_id' is null then 'not_published' else 'verified' end))
  on conflict(id) do update set external_match_id=excluded.external_match_id,federation_start_at=excluded.federation_start_at,venue=excluded.venue,home_score=excluded.home_score,away_score=excluded.away_score,fetched_at=excluded.fetched_at,raw_data=excluded.raw_data;
  insert into public.pilot_matches(id,title,home_team,away_team,starts_at,venue,status)
  select mid,'FEM15 · '||(fixture->>'date')||' · '||(fixture->>'home_name')||' – '||(fixture->>'away_name'),fixture->>'home_name',fixture->>'away_name',federation_start_at,fixture->>'venue','scheduled' from public.federation_matches where id=mid
  on conflict(id) do nothing;
  -- Only the already-authorized current operator is associated with NEW FEM15 matches. No external users.
  insert into public.pilot_members(match_id,user_id,role) values(mid,owner_id,'operator') on conflict(match_id,user_id) do nothing;
  insert into public.federation_match_sources(match_id,federation,federation_match_id,federation_url,competition_id,season_id,home_name,away_name,home_crest_url,away_crest_url,official_data,import_status,last_checked_at,last_imported_at,automatic_enabled)
  values(mid,'FECAPA',fixture->>'match_id',p_data->>'url','4802','41',fixture->>'home_name',fixture->>'away_name',fixture->>'home_crest',fixture->>'away_crest',jsonb_build_object('federation','FECAPA','competition_id','4802','season_id','41','team_id','12419','group_id','5010','date',fixture->>'date','time',fixture->>'time','round',fixture->>'round','home_team_id',fixture->>'home_team_id','away_team_id',fixture->>'away_team_id','home_name',fixture->>'home_name','away_name',fixture->>'away_name','home_crest',fixture->>'home_crest','away_crest',fixture->>'away_crest','home_score',fixture->'home_score','away_score',fixture->'away_score','players','[]'::jsonb,'staff','[]'::jsonb,'lineup_status','not_published','federation_match_id',fixture->>'match_id','identity_key',fixture->>'fingerprint','source_url',p_data->>'url'),'verified',stamp,stamp,false)
  on conflict(match_id) do update set federation_match_id=excluded.federation_match_id,home_crest_url=excluded.home_crest_url,away_crest_url=excluded.away_crest_url,last_checked_at=excluded.last_checked_at,last_imported_at=excluded.last_imported_at,
   official_data=case when fixture->'report' is not null then public.federation_match_sources.official_data else excluded.official_data end;
  report:=fixture->'report';
  if report is not null then
   perform public.federation_commit_snapshot(mid,report||jsonb_build_object('lineup_status','verified','team_id','12419'));
   side_label:=case when fixture->>'home_team_id'='12419' then 'home' else 'away' end;
   for player in select value from jsonb_array_elements(report->'players') where value->>'team'=side_label loop
    select id into pid from public.federation_players where federation='FECAPA' and external_player_id=player->>'external_id';
    insert into public.federation_match_lineups(id,match_id,player_id,side,display_name,shirt_number,is_goalkeeper,is_captain,reported_goals,reported_assists,raw_data)
    values(md5('clubhoquei360:fem15:lineup:'||mid::text||':'||(player->>'external_id'))::uuid,mid,pid,side_label,player->>'name',player->>'dorsal',player->>'position'='goalkeeper',(player->>'captain')::boolean,(player->>'goals')::integer,(player->>'assists')::integer,player||jsonb_build_object('source_url',p_data->>'url','attribution','unverified','event_timing','not_available'))
    on conflict(id) do update set reported_goals=excluded.reported_goals,reported_assists=excluded.reported_assists,raw_data=excluded.raw_data,shirt_number=excluded.shirt_number;
   end loop;
   reports_n:=reports_n+1;
  end if;
  matches_n:=matches_n+1;
 end loop;
 insert into public.federation_calendar_cache(federation,competition_id,season_id,data,standings,fetched_at) values('FECAPA','4802','41',(select jsonb_agg(value-'report') from jsonb_array_elements(p_data->'matches')),p_data->'standings',stamp)
 on conflict(federation,competition_id,season_id) do update set data=excluded.data,standings=excluded.standings,fetched_at=excluded.fetched_at;
 select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by id),'')) into after_hash from public.pilot_matches p where id=any(protected);
 if before_hash<>after_hash then raise exception 'Protected match data changed';end if;
 return jsonb_build_object('matches',matches_n,'reports',reports_n,'roster',roster_n,'group_id','5010','competition_id','4802','team_entry_id',entry,'protected_matches_unchanged',true);
end $$;
revoke all on function public.federation_commit_fem15(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.federation_commit_fem15(jsonb,uuid) to service_role;
grant select,insert,update on public.clubs,public.seasons,public.teams,public.federation_competitions,public.federation_groups,public.federation_team_entries,public.federation_team_roster,public.federation_players,public.federation_matches,public.federation_match_lineups,public.federation_player_competition_stats,public.federation_import_runs to service_role;
