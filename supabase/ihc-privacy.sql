-- Restrict new internal observations to verified IHC fixtures, preserving historic rows.
-- The source-less legacy pilot remains available to its existing members.
create policy pilot_events_direct_club_fixture on public.pilot_events as restrictive for insert to authenticated with check(
 not exists(select 1 from public.federation_match_sources s where s.match_id=pilot_events.match_id)
 or exists(select 1 from public.federation_match_sources s where s.match_id=pilot_events.match_id and s.import_status='verified' and (
  (s.federation='RFEP' and (s.home_crest_url ~ '/logos_clubes/69(_[0-9]+)?\.(png|gif|jpg)$' or s.away_crest_url ~ '/logos_clubes/69(_[0-9]+)?\.(png|gif|jpg)$'))
  or (s.federation='FECAPA' and (s.home_crest_url ~ '/logos_clubes/252(_[0-9]+)?\.(png|gif|jpg)$' or s.away_crest_url ~ '/logos_clubes/252(_[0-9]+)?\.(png|gif|jpg)$'))
 ))
);
-- Preparation uses existing service authentication and reference-match operator authorization.
create or replace function public.federation_prepare_match(p_reference uuid,p_external text,p_user uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare src public.federation_match_sources; item jsonb; target uuid; begin
 select * into strict src from public.federation_match_sources where match_id=p_reference;
 if not exists(select 1 from public.pilot_members where match_id=p_reference and user_id=p_user and role='operator') then raise exception 'Operator access required';end if;
 select x.value into item from public.federation_calendar_cache c cross join lateral jsonb_array_elements(c.data) x(value)
 where c.federation=src.federation and c.competition_id=src.competition_id and c.season_id=src.season_id and x.value->>'match_id'=p_external limit 1;
 if item is null or p_external !~ '^[1-9][0-9]*$' then raise exception 'Unverified calendar match';end if;
 if not exists(select 1 from public.federation_team_entries e join public.federation_competitions c on c.id=e.competition_id where c.club_id=md5('clubhoquei360:fecapa:club:252')::uuid and c.federation=src.federation and c.external_competition_id=src.competition_id and e.external_team_id in(item->>'home_team_id',item->>'away_team_id')) then raise exception 'Only direct IHC fixtures can create internal match records; use the public federation result for other clubs';end if;
 perform pg_advisory_xact_lock(hashtextextended(src.federation||':'||p_external,0));
 select match_id into target from public.federation_match_sources where federation=src.federation and federation_match_id=p_external;
 if target is null then
  insert into public.pilot_matches(title,home_team,away_team,starts_at,venue,status) values((item->>'home_name')||' – '||(item->>'away_name'),item->>'home_name',item->>'away_name',case when nullif(item->>'date','') is not null and nullif(item->>'time','') is not null then (to_date(item->>'date','DD/MM/YYYY')+(item->>'time')::time) at time zone 'Europe/Madrid' else null end,item->>'venue','scheduled') returning id into target;
  insert into public.federation_match_sources(match_id,federation,federation_match_id,federation_url,competition_id,season_id,import_status) values(target,src.federation,p_external,src.federation_url,src.competition_id,src.season_id,'pending');
 end if;
 -- This existing function's membership behavior is unchanged; the importer never calls it.
 insert into public.pilot_members(match_id,user_id,role) values(target,p_user,'operator') on conflict(match_id,user_id) do nothing;
 return target;
end $$;
