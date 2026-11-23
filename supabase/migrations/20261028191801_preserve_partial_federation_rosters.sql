-- Additive roster refresh and scoped opponents. No classifications or client permission changes.
-- Existing importer tables required. Review and apply only in an authorized environment.
begin;
do $$declare dependency text;begin
 foreach dependency in array array['seasons','teams','federation_competitions','federation_groups','federation_team_entries','federation_players','club_staff_people','federation_team_roster','federation_matches','federation_match_teams','federation_match_events'] loop
  if to_regclass('public.'||dependency) is null then raise exception 'Missing importer prerequisite: %',dependency;end if;
 end loop;
end$$;
create or replace function public.federation_commit_ihc(p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c uuid; s uuid; comp uuid; grp uuid; tid uuid; ent uuid; pid uuid; staffid uuid; mid uuid; ownentry uuid;
 personkey text; team jsonb; person jsonb; fixture jsonb; gid text; fed text; cid text; side_label text; stamp timestamptz; roster_id uuid; existing_count int;
 nteams int:=0; npeople int:=0; nmatches int:=0;
begin
 fed:=p_data->>'federation';cid:=p_data->>'id';
 if fed is null or fed not in ('FECAPA','RFEP') or cid is null or cid !~ '^[1-9][0-9]*$' or p_data->>'season_id' is distinct from '41' or p_data->>'club_external_id' is distinct from (case when fed='FECAPA' then '252' else '69' end) then raise exception 'IHC import scope mismatch';end if;
 if jsonb_typeof(p_data->'teams') is distinct from 'array' or jsonb_array_length(p_data->'teams')=0 or jsonb_typeof(p_data->'matches') is distinct from 'array' or jsonb_array_length(p_data->'matches')=0 then raise exception 'Empty import rejected';end if;
 if fed='FECAPA' and cid='4802' then return jsonb_build_object('status','preserved_fem15');end if;
 perform pg_advisory_xact_lock(hashtextextended('ihc:'||fed||':'||cid,0));
 c:=md5('clubhoquei360:fecapa:club:252')::uuid;select id into strict s from public.seasons where club_id=c and label='2026/27';stamp:=(p_data->>'fetched_at')::timestamptz;
 comp:=md5('clubhoquei360:'||lower(fed)||':41:competition:'||cid)::uuid;
 insert into public.federation_competitions(id,club_id,season_id,federation,external_competition_id,name,category) values(comp,c,s,fed,cid,p_data->>'name',p_data->>'name') on conflict(club_id,federation,external_competition_id) do nothing;
 select id into strict comp from public.federation_competitions where club_id=c and season_id=s and federation=fed and external_competition_id=cid;
 for fixture in select value from jsonb_array_elements(p_data->'matches') loop
  gid:=fixture->>'group_id';if gid !~ '^[1-9][0-9]*$' then raise exception 'Invalid group';end if;
  grp:=md5('clubhoquei360:'||lower(fed)||':41:group:'||gid)::uuid;
  insert into public.federation_groups(id,competition_id,external_group_id,name) values(grp,comp,gid,fixture->>'group_name') on conflict(competition_id,external_group_id) do nothing;
 end loop;
 for team in select value from jsonb_array_elements(p_data->'teams') loop
  if jsonb_typeof(team->'roster') is distinct from 'array' or team->>'external_team_id' is null or team->>'external_team_id' !~ '^[1-9][0-9]*$' or team->>'verification' is distinct from 'official' or team->>'name' not ilike '%IGUALADA%' or team->>'name' ilike '%FEMEN%' then raise exception 'Unverified IHC team';end if;
  tid:=md5('clubhoquei360:'||lower(fed)||':41:team:'||(team->>'external_team_id'))::uuid;
  -- Same first team verified across the official competition calendars and the club's municipal match report.
  if (fed='FECAPA' and team->>'external_team_id'='12074') or (fed='RFEP' and team->>'external_team_id'='3696') then tid:=md5('clubhoquei360:ihc:41:first-team')::uuid;end if;
  insert into public.teams(id,club_id,season_id,name,category,short_name,verification_status,source_url) values(tid,c,s,case when tid=md5('clubhoquei360:ihc:41:first-team')::uuid then 'IGUALADA RIGAT HC' else team->>'name' end,case when tid=md5('clubhoquei360:ihc:41:first-team')::uuid then 'SÈNIOR · primer equip' else team->>'category' end,team->>'short_name','verified',p_data->>'source_url') on conflict(id) do nothing;
  if not exists(select 1 from public.teams where id=tid and club_id=c and season_id=s) then raise exception 'Existing team scope mismatch';end if;
  select id into strict grp from public.federation_groups where competition_id=comp and external_group_id=team->'group_ids'->>0;
  ent:=md5('clubhoquei360:'||lower(fed)||':41:'||cid||':team:'||(team->>'external_team_id'))::uuid;
  insert into public.federation_team_entries(id,competition_id,group_id,external_team_id,display_name,club_team_id,source_url,fetched_at,raw_data) values(ent,comp,grp,team->>'external_team_id',team->>'name',tid,p_data->>'source_url',stamp,(team-'roster')||jsonb_build_object('season_id','41','club_external_id',p_data->>'club_external_id','standings',p_data->'standings','standings_status',p_data->>'standings_status','importer','ihc-v1'))
  on conflict(competition_id,external_team_id) do update set fetched_at=excluded.fetched_at,raw_data=public.federation_team_entries.raw_data||excluded.raw_data;
  select id into strict ent from public.federation_team_entries where competition_id=comp and external_team_id=team->>'external_team_id' and club_team_id=tid;
  -- Additive refresh: an observed subset is not a certified complete roster.
  -- Never deactivate missing people on partial/unavailable responses.
  for person in select value from jsonb_array_elements(team->'roster') loop
   pid:=null;staffid:=null;personkey:=coalesce(person->>'external_id','entry:'||ent::text||':'||(person->>'name')||':'||coalesce(person->>'staff_role','staff'));if nullif(person->>'name','') is null or (person->>'external_id' is not null and person->>'external_id' !~ '^[1-9][0-9]*$') or (person->>'external_id' is null and (person->>'role'<>'staff' or person->>'identity_status' is distinct from 'no_federative_identifier')) then raise exception 'Invalid person identity';end if;
   if person->>'role'='player' then
    if person->>'external_id' is null then raise exception 'Missing player identifier';end if;
    pid:=md5('clubhoquei360:'||lower(fed)||':player:'||(person->>'external_id'))::uuid;
    insert into public.federation_players(id,federation,external_player_id,display_name) values(pid,fed,person->>'external_id',person->>'name') on conflict do nothing;
    select id into strict pid from public.federation_players where federation=fed and external_player_id=person->>'external_id';
   elsif person->>'role'='staff' then
    staffid:=md5('clubhoquei360:staff:'||c::text||':'||fed||':'||personkey)::uuid;
    insert into public.club_staff_people(id,club_id,federation,external_person_id,display_name,source_url,fetched_at) values(staffid,c,fed,person->>'external_id',person->>'name',p_data->>'source_url',stamp) on conflict(id) do nothing;
   else raise exception 'Unsupported role';end if;
   insert into public.federation_team_roster(id,entry_id,player_id,staff_person_id,external_person_id,display_name,role,shirt_number,fetched_at,raw_data)
   values(md5('clubhoquei360:ihc:roster:'||ent::text||':'||(person->>'role')||':'||personkey)::uuid,ent,pid,staffid,person->>'external_id',person->>'name',person->>'role',person->>'shirt_number',stamp,person||jsonb_build_object('source_url',p_data->>'source_url','active_in_latest_roster',true))
   on conflict(id) do update set fetched_at=excluded.fetched_at,shirt_number=coalesce(excluded.shirt_number,public.federation_team_roster.shirt_number),raw_data=public.federation_team_roster.raw_data||jsonb_strip_nulls(excluded.raw_data);
   npeople:=npeople+1;
  end loop;nteams:=nteams+1;
 end loop;
 -- Opponents belong to this imported competition, not to the managed club.
 -- Never create a club team, membership, match call-up or official event here.
 for team in select value from jsonb_array_elements(coalesce(p_data->'opponents','[]'::jsonb)) loop
  if team->>'verification' is distinct from 'official_calendar' or team->>'external_team_id' is null or team->>'external_team_id' !~ '^[1-9][0-9]*$'
   or nullif(team->>'name','') is null or team->>'club_external_id' is null or team->>'club_external_id' !~ '^[1-9][0-9]*$'
   or team->>'club_external_id'=p_data->>'club_external_id' or jsonb_typeof(team->'roster') is distinct from 'array'
   or exists(select 1 from jsonb_array_elements(p_data->'teams') x where x->>'external_team_id'=team->>'external_team_id')
   or not exists(select 1 from jsonb_array_elements(p_data->'matches') x where team->>'external_team_id' in(x->>'home_team_id',x->>'away_team_id') and (x->>'group_id')=(team->'group_ids'->>0)) then raise exception 'Unverified opponent scope';end if;
  select id into strict grp from public.federation_groups where competition_id=comp and external_group_id=team->'group_ids'->>0;
  ent:=md5('clubhoquei360:'||lower(fed)||':41:'||cid||':team:'||(team->>'external_team_id'))::uuid;
  insert into public.federation_team_entries(id,competition_id,group_id,external_team_id,display_name,club_team_id,source_url,fetched_at,raw_data)
  values(ent,comp,grp,team->>'external_team_id',team->>'name',null,p_data->>'source_url',stamp,(team-'roster')||jsonb_build_object('season_id','41','source_url',p_data->>'source_url','importer','ihc-v1'))
  on conflict(competition_id,external_team_id) do update set fetched_at=excluded.fetched_at,raw_data=public.federation_team_entries.raw_data||excluded.raw_data;
  select id into strict ent from public.federation_team_entries where competition_id=comp and external_team_id=team->>'external_team_id' and club_team_id is null;
  for person in select value from jsonb_array_elements(team->'roster') loop
   if person->>'role'='staff' then continue;end if;
   if person->>'role' is distinct from 'player' or person->>'external_id' is null or person->>'external_id' !~ '^[1-9][0-9]*$' or nullif(person->>'name','') is null then raise exception 'Invalid opponent player identity';end if;
   pid:=md5('clubhoquei360:'||lower(fed)||':player:'||(person->>'external_id'))::uuid;
   insert into public.federation_players(id,federation,external_player_id,display_name) values(pid,fed,person->>'external_id',person->>'name') on conflict do nothing;
   select id into strict pid from public.federation_players where federation=fed and external_player_id=person->>'external_id';
   select count(*) into existing_count from public.federation_team_roster where entry_id=ent and role='player' and external_person_id=person->>'external_id';
   if existing_count>1 then raise exception 'Ambiguous existing opponent roster identity';end if;
   select id into roster_id from public.federation_team_roster where entry_id=ent and role='player' and external_person_id=person->>'external_id';
   if exists(select 1 from public.federation_team_roster where id=roster_id and player_id is distinct from pid) then raise exception 'Conflicting existing opponent player identity';end if;
   roster_id:=coalesce(roster_id,md5('clubhoquei360:ihc:roster:'||ent::text||':player:'||(person->>'external_id'))::uuid);
   insert into public.federation_team_roster(id,entry_id,player_id,external_person_id,display_name,role,shirt_number,fetched_at,raw_data)
   values(roster_id,ent,pid,person->>'external_id',person->>'name','player',null,stamp,person||jsonb_build_object('source_url',p_data->>'source_url','active_in_latest_roster',true,'is_opponent',true))
   on conflict(id) do update set fetched_at=excluded.fetched_at,raw_data=public.federation_team_roster.raw_data||jsonb_strip_nulls(excluded.raw_data);
   npeople:=npeople+1;
  end loop;
 end loop;
 for fixture in select value from jsonb_array_elements(p_data->'matches') loop
  if not exists(select 1 from jsonb_array_elements(p_data->'teams') x where x->>'external_team_id' in(fixture->>'home_team_id',fixture->>'away_team_id')) then raise exception 'Foreign-only match rejected';end if;
  select id into strict grp from public.federation_groups where competition_id=comp and external_group_id=fixture->>'group_id';
  mid:=md5('clubhoquei360:ihc:match:'||(fixture->>'fingerprint'))::uuid;
  insert into public.federation_matches(id,group_id,external_match_id,match_fingerprint,round_label,home_team,away_team,federation_start_at,venue,home_score,away_score,fetched_at,raw_data)
  values(mid,grp,fixture->>'match_id',fixture->>'fingerprint',fixture->>'round',fixture->>'home_name',fixture->>'away_name',case when nullif(fixture->>'date','') is not null and nullif(fixture->>'time','') is not null then (to_date(fixture->>'date','DD/MM/YYYY')+coalesce(nullif(fixture->>'time',''),'00:00')::time) at time zone 'Europe/Madrid' else null end,nullif(fixture->>'venue',''),(fixture->>'home_score')::integer,(fixture->>'away_score')::integer,stamp,fixture||jsonb_build_object('source_url',p_data->>'source_url','data_layer','public_federation','external_id_status',case when fixture->>'match_id' is null then 'not_published' else 'verified' end))
  on conflict(group_id,match_fingerprint) where match_fingerprint is not null do update set external_match_id=coalesce(excluded.external_match_id,public.federation_matches.external_match_id),federation_start_at=coalesce(excluded.federation_start_at,public.federation_matches.federation_start_at),venue=coalesce(excluded.venue,public.federation_matches.venue),home_score=coalesce(excluded.home_score,public.federation_matches.home_score),away_score=coalesce(excluded.away_score,public.federation_matches.away_score),fetched_at=excluded.fetched_at,raw_data=public.federation_matches.raw_data||jsonb_strip_nulls(excluded.raw_data);
  select id into strict mid from public.federation_matches where group_id=grp and match_fingerprint=fixture->>'fingerprint';
  for side_label in select unnest(array['home','away']) loop
   if side_label not in ('home','away') then raise exception 'Invalid side';end if;
   select id into ownentry from public.federation_team_entries where competition_id=comp and external_team_id=fixture->>(side_label||'_team_id');
   if ownentry is null then continue;end if;
   insert into public.federation_match_teams(match_id,entry_id,side) values(mid,ownentry,side_label) on conflict do nothing;
  end loop;nmatches:=nmatches+1;
 end loop;
 return jsonb_build_object('status','verified','teams',nteams,'roster_entries',npeople,'matches',nmatches);
end $$;
revoke all on function public.federation_commit_ihc(jsonb) from public,anon,authenticated;
grant execute on function public.federation_commit_ihc(jsonb) to service_role;
-- Only the existing backend importer receives the missing table privilege.
grant select,insert on public.federation_match_events to service_role;

-- Repair the verified canonical predecessor without changing row policies or callers.
-- Refuse to overwrite an unreviewed canonical implementation; repeat accepts the repaired body.
do $canonical_preflight$
declare body text;
begin
 select p.prosrc into body from pg_proc p where p.oid=to_regprocedure('public.federation_commit_official_report(uuid,jsonb)');
 if body is not null and md5(body) not in ('a233a99c0b0e60db6cf5f42beef9f76e','df66e4d470de1fa8119f140386a3ac35') then raise exception 'Unreviewed canonical report function; stop and review predecessor';end if;
end $canonical_preflight$;
CREATE OR REPLACE FUNCTION public.federation_commit_official_report(p_match uuid, p_report jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare m public.federation_matches; fed text; comp uuid; person jsonb; pid uuid; lid uuid; item jsonb; count_players int:=0; count_staff int:=0; report_update jsonb;
begin
 select * into strict m from public.federation_matches where id=p_match;
 if not exists(select 1 from public.federation_match_teams where match_id=p_match) then raise exception 'Only direct club fixtures';end if;
 select c.federation,c.id into strict fed,comp from public.federation_competitions c join public.federation_groups g on g.competition_id=c.id where g.id=m.group_id;
 if p_report->>'external_match_id' is distinct from m.external_match_id or jsonb_typeof(p_report->'players') is distinct from 'array' or jsonb_array_length(p_report->'players')=0 then raise exception 'Invalid official report';end if;
 perform pg_advisory_xact_lock(hashtextextended('official-report:'||p_match::text,0));
 for person in select value from jsonb_array_elements(p_report->'players') loop
  if person->>'external_id' is null or person->>'external_id' !~ '^[1-9][0-9]*$' or coalesce(person->>'side','') not in ('home','away') then raise exception 'Invalid participant identity';end if;
  pid:=null;select id into pid from public.federation_players where federation=fed and external_player_id=person->>'external_id';
  lid:=null;select id into lid from public.federation_match_lineups where match_id=p_match and side=person->>'side' and raw_data->>'external_id'=person->>'external_id' limit 1;
  lid:=coalesce(lid,md5('clubhoquei360:report-lineup:'||p_match::text||':'||(person->>'side')||':'||(person->>'external_id'))::uuid);
  insert into public.federation_match_lineups(id,match_id,player_id,side,display_name,shirt_number,is_goalkeeper,is_captain,reported_goals,reported_assists,raw_data)
  values(lid,p_match,pid,person->>'side',person->>'name',person->>'dorsal',case when person->>'position' is null then null else person->>'position'='goalkeeper' end,(person->>'captain')::boolean,(person->>'goals')::integer,(person->>'assists')::integer,person||jsonb_build_object('source_url',p_report->>'source_url','report_endpoint',p_report->>'report_endpoint','data_layer','public_federation'))
  on conflict(id) do update set player_id=coalesce(excluded.player_id,public.federation_match_lineups.player_id),display_name=coalesce(nullif(excluded.display_name,''),public.federation_match_lineups.display_name),is_goalkeeper=coalesce(excluded.is_goalkeeper,public.federation_match_lineups.is_goalkeeper),is_captain=coalesce(excluded.is_captain,public.federation_match_lineups.is_captain),shirt_number=coalesce(excluded.shirt_number,public.federation_match_lineups.shirt_number),reported_goals=coalesce(excluded.reported_goals,public.federation_match_lineups.reported_goals),reported_assists=coalesce(excluded.reported_assists,public.federation_match_lineups.reported_assists),raw_data=public.federation_match_lineups.raw_data||jsonb_strip_nulls(excluded.raw_data);
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
 -- An endpoint that only provides participants cannot clear earlier report facts.
 report_update:=jsonb_strip_nulls(p_report-'players'-'staff');
 if p_report->>'event_timeline_status'='not_retrieved' then report_update:=report_update-'incidents'-'event_timeline_status';end if;
 update public.federation_matches set venue=coalesce(p_report->>'venue',venue),raw_data=raw_data||jsonb_build_object('report_status','verified','report_data',coalesce(raw_data->'report_data','{}'::jsonb)||report_update,'report_fetched_at',p_report->>'fetched_at') where id=p_match;
 return jsonb_build_object('match_id',p_match,'players',count_players,'staff',count_staff,'incidents',jsonb_array_length(p_report->'incidents'));
end $function$
;


revoke all on function public.federation_commit_official_report(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.federation_commit_official_report(uuid,jsonb) to service_role;

commit;
