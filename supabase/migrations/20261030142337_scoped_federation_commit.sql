-- Generalized persistence derived from reviewed #33 additive importer. Legacy entry point unchanged.
begin;
create or replace function public.federation_commit_scoped(p_scope uuid,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare job public.federation_sync_scopes; prior_ids uuid[]; ns text; c uuid; s uuid; comp uuid; grp uuid; tid uuid; ent uuid; pid uuid; staffid uuid; mid uuid; ownentry uuid;
 personkey text; team jsonb; person jsonb; fixture jsonb; gid text; fed text; cid text; side_label text; stamp timestamptz; roster_id uuid; existing_count int;
 nteams int:=0; npeople int:=0; nmatches int:=0;
begin
 fed:=p_data->>'federation';cid:=p_data->>'id';
 select * into strict job from public.federation_sync_scopes where id=p_scope and enabled and reviewed_at is not null and lease_id=(p_data->>'_lease')::uuid and locked_until>now() for update;
 if fed is distinct from job.federation or cid is null or p_data->>'season_id' is distinct from job.external_season_id or p_data->>'club_external_id' is distinct from job.external_club_id or not exists(select 1 from public.federation_competitions where id=job.competition_id and club_id=job.club_id and season_id=job.season_id and federation=fed and external_competition_id=cid) then raise exception 'Scoped import identity mismatch';end if;
 if p_data->>'source_url' is distinct from (case when fed='RFEP' then 'https://hockeypatines.fep.es' else 'https://www.hoqueipatins.fecapa.cat' end||'/league/'||cid) then raise exception 'Source URL mismatch';end if;
 c:=job.club_id;s:=job.season_id;ns:='clubhoquei360:scoped:'||c::text||':'||s::text||':'||lower(fed)||':'||job.external_season_id||':';
 if jsonb_typeof(p_data->'teams') is distinct from 'array' or jsonb_array_length(p_data->'teams')=0 or jsonb_typeof(p_data->'matches') is distinct from 'array' or jsonb_array_length(p_data->'matches')=0 then raise exception 'Empty import rejected';end if;
 perform pg_advisory_xact_lock(hashtextextended(ns||cid,0));stamp:=(p_data->>'fetched_at')::timestamptz;comp:=job.competition_id;
 insert into public.federation_competitions(id,club_id,season_id,federation,external_competition_id,name,category) values(comp,c,s,fed,cid,p_data->>'name',p_data->>'name') on conflict(club_id,federation,external_competition_id) do nothing;
 select id into strict comp from public.federation_competitions where club_id=c and season_id=s and federation=fed and external_competition_id=cid;
 for fixture in select value from jsonb_array_elements(p_data->'matches') loop
  gid:=fixture->>'group_id';if gid !~ '^[1-9][0-9]*$' then raise exception 'Invalid group';end if;
  select id into grp from public.federation_groups where competition_id=comp and external_group_id=gid;grp:=coalesce(grp,md5(ns||cid||':group:'||gid)::uuid);
  insert into public.federation_groups(id,competition_id,external_group_id,name) values(grp,comp,gid,fixture->>'group_name') on conflict(competition_id,external_group_id) do nothing;
 end loop;
 for team in select value from jsonb_array_elements(p_data->'teams') loop
  if jsonb_typeof(team->'roster') is distinct from 'array' or team->>'external_team_id' is null or team->>'external_team_id' !~ '^[1-9][0-9]*$' or team->>'verification' is distinct from 'official' or nullif(team->>'name','') is null then raise exception 'Unverified managed team';end if;
  select array_agg(distinct e.club_team_id) filter(where e.club_team_id is not null) into prior_ids from public.federation_team_entries e join public.federation_competitions co on co.id=e.competition_id where co.club_id=c and co.season_id=s and co.federation=fed and e.external_team_id=team->>'external_team_id';
  if cardinality(prior_ids)>1 then raise exception 'Ambiguous managed team mapping';end if;
  tid:=coalesce(prior_ids[1],md5(ns||'team:'||(team->>'external_team_id'))::uuid);
  insert into public.teams(id,club_id,season_id,name,category,short_name,verification_status,source_url) values(tid,c,s,team->>'name',team->>'category',team->>'short_name','verified',p_data->>'source_url') on conflict(id) do nothing;
  if not exists(select 1 from public.teams where id=tid and club_id=c and season_id=s) then raise exception 'Existing team scope mismatch';end if;
  select id into strict grp from public.federation_groups where competition_id=comp and external_group_id=team->'group_ids'->>0;
  select id into ent from public.federation_team_entries where competition_id=comp and external_team_id=team->>'external_team_id';ent:=coalesce(ent,md5(ns||cid||':team:'||(team->>'external_team_id'))::uuid);
  insert into public.federation_team_entries(id,competition_id,group_id,external_team_id,display_name,club_team_id,source_url,fetched_at,raw_data) values(ent,comp,grp,team->>'external_team_id',team->>'name',tid,p_data->>'source_url',stamp,(team-'roster')||jsonb_build_object('season_id',job.external_season_id,'club_external_id',p_data->>'club_external_id','standings',p_data->'standings','standings_status',p_data->>'standings_status','importer','scoped-v1'))
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
  select id into ent from public.federation_team_entries where competition_id=comp and external_team_id=team->>'external_team_id';ent:=coalesce(ent,md5(ns||cid||':team:'||(team->>'external_team_id'))::uuid);
  insert into public.federation_team_entries(id,competition_id,group_id,external_team_id,display_name,club_team_id,source_url,fetched_at,raw_data)
  values(ent,comp,grp,team->>'external_team_id',team->>'name',null,p_data->>'source_url',stamp,(team-'roster')||jsonb_build_object('season_id',job.external_season_id,'source_url',p_data->>'source_url','importer','scoped-v1'))
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
  if fixture->>'home_team_id' is null or fixture->>'away_team_id' is null or nullif(fixture->>'fingerprint','') is null then raise exception 'Incomplete fixture identity';end if;
  select array_agg(m.id) into prior_ids from public.federation_matches m join public.federation_groups g on g.id=m.group_id where g.competition_id=comp and ((fixture->>'match_id' is not null and m.external_match_id=fixture->>'match_id') or (m.group_id=grp and m.match_fingerprint=fixture->>'fingerprint'));
  if cardinality(prior_ids)>1 then raise exception 'Ambiguous match reconciliation';end if;
  mid:=coalesce(prior_ids[1],md5(ns||'match:'||(fixture->>'fingerprint'))::uuid);
  if exists(select 1 from public.federation_matches where id=mid and ((raw_data->>'home_team_id') is distinct from (fixture->>'home_team_id') or (raw_data->>'away_team_id') is distinct from (fixture->>'away_team_id'))) then raise exception 'Match sides mismatch';end if;
  insert into public.federation_matches(id,group_id,external_match_id,match_fingerprint,round_label,home_team,away_team,federation_start_at,venue,home_score,away_score,fetched_at,raw_data)
  values(mid,grp,fixture->>'match_id',fixture->>'fingerprint',fixture->>'round',fixture->>'home_name',fixture->>'away_name',case when nullif(fixture->>'date','') is not null and nullif(fixture->>'time','') is not null then (to_date(fixture->>'date','DD/MM/YYYY')+coalesce(nullif(fixture->>'time',''),'00:00')::time) at time zone 'Europe/Madrid' else null end,nullif(fixture->>'venue',''),(fixture->>'home_score')::integer,(fixture->>'away_score')::integer,stamp,fixture||jsonb_build_object('source_url',p_data->>'source_url','data_layer','public_federation','external_id_status',case when fixture->>'match_id' is null then 'not_published' else 'verified' end))
  on conflict(id) do update set group_id=excluded.group_id,match_fingerprint=excluded.match_fingerprint,round_label=excluded.round_label,external_match_id=coalesce(excluded.external_match_id,public.federation_matches.external_match_id),federation_start_at=coalesce(excluded.federation_start_at,public.federation_matches.federation_start_at),venue=coalesce(excluded.venue,public.federation_matches.venue),home_score=coalesce(excluded.home_score,public.federation_matches.home_score),away_score=coalesce(excluded.away_score,public.federation_matches.away_score),fetched_at=excluded.fetched_at,raw_data=public.federation_matches.raw_data||jsonb_strip_nulls(excluded.raw_data);
  for side_label in select unnest(array['home','away']) loop
   if side_label not in ('home','away') then raise exception 'Invalid side';end if;
   select id into ownentry from public.federation_team_entries where competition_id=comp and external_team_id=fixture->>(side_label||'_team_id');
   if ownentry is null then continue;end if;
   insert into public.federation_match_teams(match_id,entry_id,side) values(mid,ownentry,side_label) on conflict do nothing;
  end loop;nmatches:=nmatches+1;
 end loop;
 return jsonb_build_object('status','verified','teams',nteams,'roster_entries',npeople,'matches',nmatches);
end $$;
revoke all on function public.federation_commit_scoped(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.federation_commit_scoped(uuid,jsonb) to service_role;
commit;
