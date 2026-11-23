create table if not exists public.federation_match_staff(
 id uuid primary key,match_id uuid not null references public.federation_matches(id),side text not null check(side in('home','away')),
 staff_person_id uuid references public.club_staff_people(id),external_person_id text,display_name text not null,role text not null,
 yellow_cards integer,blue_cards integer,red_cards integer,raw_data jsonb not null default '{}'
);
alter table public.federation_match_staff enable row level security;
create index if not exists federation_match_staff_match_idx on public.federation_match_staff(match_id);
create policy federation_match_staff_read on public.federation_match_staff for select to authenticated using(
 (select app_private.is_platform_superadmin()) or exists(select 1 from public.federation_matches m join public.federation_groups g on g.id=m.group_id join public.federation_competitions c on c.id=g.competition_id where m.id=federation_match_staff.match_id and app_private.has_club_role(c.club_id,array['admin','general_coordinator','section_coordinator','coach','delegate']))
);
revoke all on public.federation_match_staff from anon,authenticated;
grant select on public.federation_match_staff to authenticated;
grant select,insert,update on public.federation_match_staff to service_role;
-- Backend report transaction also persists incidents; no client grant.
grant select,insert on public.federation_match_events to service_role;
create or replace function public.federation_commit_official_report(p_match uuid,p_report jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.federation_matches; fed text; comp uuid; person jsonb; pid uuid; lid uuid; item jsonb; count_players int:=0; count_staff int:=0;
begin
 select * into strict m from public.federation_matches where id=p_match;
 if not exists(select 1 from public.federation_match_teams where match_id=p_match) then raise exception 'Only direct club fixtures';end if;
 select c.federation,c.id into strict fed,comp from public.federation_competitions c join public.federation_groups g on g.competition_id=c.id where g.id=m.group_id;
 if p_report->>'external_match_id' is distinct from m.external_match_id or jsonb_typeof(p_report->'players') is distinct from 'array' or jsonb_array_length(p_report->'players')=0 then raise exception 'Invalid official report';end if;
 perform pg_advisory_xact_lock(hashtextextended('official-report:'||p_match::text,0));
 for person in select value from jsonb_array_elements(p_report->'players') loop
  if person->>'external_id' !~ '^[1-9][0-9]*$' or person->>'side' not in ('home','away') then raise exception 'Invalid participant identity';end if;
  pid:=null;select id into pid from public.federation_players where federation=fed and external_player_id=person->>'external_id';
  lid:=null;select id into lid from public.federation_match_lineups where match_id=p_match and side=person->>'side' and raw_data->>'external_id'=person->>'external_id' limit 1;
  lid:=coalesce(lid,md5('clubhoquei360:report-lineup:'||p_match::text||':'||(person->>'side')||':'||(person->>'external_id'))::uuid);
  insert into public.federation_match_lineups(id,match_id,player_id,side,display_name,shirt_number,is_goalkeeper,is_captain,reported_goals,reported_assists,raw_data)
  values(lid,p_match,pid,person->>'side',person->>'name',person->>'dorsal',case when person->>'position' is null then null else person->>'position'='goalkeeper' end,(person->>'captain')::boolean,(person->>'goals')::integer,(person->>'assists')::integer,person||jsonb_build_object('source_url',p_report->>'source_url','report_endpoint',p_report->>'report_endpoint','data_layer','public_federation'))
  on conflict(id) do update set shirt_number=coalesce(excluded.shirt_number,public.federation_match_lineups.shirt_number),reported_goals=coalesce(excluded.reported_goals,public.federation_match_lineups.reported_goals),reported_assists=coalesce(excluded.reported_assists,public.federation_match_lineups.reported_assists),raw_data=public.federation_match_lineups.raw_data||jsonb_strip_nulls(excluded.raw_data);
  count_players:=count_players+1;
 end loop;
 for person in select value from jsonb_array_elements(p_report->'staff') loop
  insert into public.federation_match_staff(id,match_id,side,display_name,role,yellow_cards,blue_cards,red_cards,raw_data)
  values(md5('clubhoquei360:report-staff:'||p_match::text||':'||(person->>'side')||':'||(person->>'role')||':'||(person->>'name'))::uuid,p_match,person->>'side',person->>'name',person->>'role',(person->>'yellow')::integer,(person->>'blue')::integer,(person->>'red')::integer,person||jsonb_build_object('source_url',p_report->>'source_url','identity_status','no_federative_identifier','data_layer','public_federation'))
  on conflict(id) do update set yellow_cards=coalesce(excluded.yellow_cards,public.federation_match_staff.yellow_cards),blue_cards=coalesce(excluded.blue_cards,public.federation_match_staff.blue_cards),red_cards=coalesce(excluded.red_cards,public.federation_match_staff.red_cards),raw_data=public.federation_match_staff.raw_data||jsonb_strip_nulls(excluded.raw_data);
  count_staff:=count_staff+1;
 end loop;
 -- Text-only incidents are retained exactly, with no inferred minute, scorer or sanction duration.
 for item in select value from jsonb_array_elements(p_report->'incidents') loop
  pid:=null;select id into pid from public.federation_players where federation=fed and external_player_id=item->>'player_external_id';
  insert into public.federation_match_events(id,match_id,event_order,event_type,period_label,clock_label,side,player_id,player_name,attribution,raw_data)
  values(md5('clubhoquei360:report-incident:'||p_match::text||':'||(item->>'order')||':'||(item->>'text'))::uuid,p_match,(item->>'order')::integer,item->>'event_type',item->>'period_label',item->>'clock_label',item->>'side',pid,item->>'player_name',case when item->>'player_external_id' is not null then 'verified_individual' else 'unverified' end,item||jsonb_build_object('source_url',p_report->>'source_url','data_layer','public_federation')) on conflict(id) do nothing;
 end loop;
 update public.federation_matches set venue=coalesce(p_report->>'venue',venue),raw_data=raw_data||jsonb_build_object('report_status','verified','report_data',p_report-'players'-'staff','report_fetched_at',p_report->>'fetched_at') where id=p_match;
 return jsonb_build_object('match_id',p_match,'players',count_players,'staff',count_staff,'incidents',jsonb_array_length(p_report->'incidents'));
end $$;
revoke all on function public.federation_commit_official_report(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.federation_commit_official_report(uuid,jsonb) to service_role;
