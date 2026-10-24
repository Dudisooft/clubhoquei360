-- Operator preparation is separate from a federation's match report.
create unique index pilot_player_federation_identity on public.pilot_players(match_id,team,federation_player_id) where federation_player_id is not null;
create table public.pilot_prepared_lineups (
 match_id uuid primary key references public.pilot_matches(id),
 home_ids uuid[] not null check(cardinality(home_ids)=5),away_ids uuid[] not null check(cardinality(away_ids)=5),
 confirmed_by uuid not null references auth.users(id),source_fingerprint text not null,
 state_revision bigint not null,confirmed_at timestamptz not null default now()
);
create index pilot_prepared_actor_idx on public.pilot_prepared_lineups(confirmed_by);
create table public.pilot_preparation_audit (
 mutation_id uuid primary key,match_id uuid not null references public.pilot_matches(id),
 actor_id uuid not null references auth.users(id),action text not null check(action in('players','lineup')),
 request_hash text not null,result jsonb not null,at timestamptz not null default now()
);
create index pilot_preparation_match_idx on public.pilot_preparation_audit(match_id,at);
create index pilot_preparation_actor_idx on public.pilot_preparation_audit(actor_id);
alter table public.pilot_prepared_lineups enable row level security;
alter table public.pilot_preparation_audit enable row level security;
create policy prepared_lineup_read on public.pilot_prepared_lineups for select to authenticated using(
 exists(select 1 from public.pilot_members m where m.match_id=pilot_prepared_lineups.match_id and m.user_id=(select auth.uid())) or app_private.stats_can_read(match_id));
create policy preparation_audit_read on public.pilot_preparation_audit for select to authenticated using(
 exists(select 1 from public.pilot_members m where m.match_id=pilot_preparation_audit.match_id and m.user_id=(select auth.uid()) and m.role='operator') or app_private.stats_can_manage(match_id));
revoke all on public.pilot_prepared_lineups,public.pilot_preparation_audit from public,anon,authenticated;
grant select on public.pilot_prepared_lineups,public.pilot_preparation_audit to authenticated;

create function app_private.pilot_can_prepare(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
 select 1 from public.pilot_members member join public.stats_matches sm on sm.match_id=member.match_id
 join public.federation_match_sources src on src.match_id=sm.match_id
 join public.federation_matches fixture on fixture.id::text=src.official_data->>'calendar_match_id'
 join public.federation_groups g on g.id=fixture.group_id join public.federation_competitions c on c.id=g.competition_id
 join public.teams t on t.id in(sm.home_team_id,sm.away_team_id) and t.club_id=sm.club_id and t.season_id=sm.season_id
 where member.match_id=p_match and member.user_id=auth.uid() and member.role='operator'
 and src.import_status='pending' and src.official_data->>'source_kind'='verified_calendar'
 and src.official_data->>'calendar_fingerprint'=fixture.match_fingerprint
 and fixture.raw_data->>'data_layer'='public_federation'
 and fixture.raw_data->>'home_team_id'=sm.home_external_team_id and fixture.raw_data->>'away_team_id'=sm.away_external_team_id
 and c.federation=src.federation and c.external_competition_id=src.competition_id and c.club_id=sm.club_id and c.season_id=sm.season_id
 and split_part(fixture.match_fingerprint,':',2)=src.season_id)
$$;
create function app_private.pilot_calendar_ready(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.pilot_can_prepare(p_match) and exists(select 1 from public.pilot_prepared_lineups l join public.federation_match_sources s on s.match_id=l.match_id where l.match_id=p_match and l.source_fingerprint=s.official_data->>'calendar_fingerprint'
 and (select count(*) from public.pilot_players p where p.match_id=p_match and p.team='home' and p.federation_active and p.id=any(l.home_ids))=5
 and (select count(*) from public.pilot_players p where p.match_id=p_match and p.team='away' and p.federation_active and p.id=any(l.away_ids))=5
 and (select count(*) from public.pilot_players p where p.match_id=p_match and p.position='goalkeeper' and p.id=any(l.home_ids))=1
 and (select count(*) from public.pilot_players p where p.match_id=p_match and p.position='goalkeeper' and p.id=any(l.away_ids))=1)
$$;
create function app_private.pilot_roster_catalogue(p_match uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not app_private.pilot_can_prepare(p_match) then raise exception 'Match operator and verified calendar required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('roster_id',r.id,'team',side.value,'full_name',r.display_name,
 'dorsal',r.shirt_number,'position',case when r.raw_data->>'position'='goalkeeper' or r.raw_data->>'is_goalkeeper'='true' then 'goalkeeper' else 'field' end,
 'federation_player_id',p.external_player_id,'source_url',e.source_url,'fetched_at',r.fetched_at) order by side.value,r.display_name),'[]')
 from public.stats_matches sm join public.federation_match_sources src on src.match_id=sm.match_id
 join public.federation_competitions c on c.club_id=sm.club_id and c.season_id=sm.season_id and c.federation=src.federation and c.external_competition_id=src.competition_id
 cross join lateral (values('home'),('away'))side(value)
 join public.federation_team_entries e on e.competition_id=c.id and e.raw_data->>'verification'='official' and e.external_team_id=case side.value when 'home' then sm.home_external_team_id else sm.away_external_team_id end
 join public.federation_team_roster r on r.entry_id=e.id and r.role='player' and coalesce(r.raw_data->>'active_in_latest_roster','true')<>'false'
 join public.federation_players p on p.id=r.player_id and p.federation=src.federation and p.external_player_id~'^[1-9][0-9]*$'
 where sm.match_id=p_match);
end $$;
create function public.pilot_roster_catalogue(p_match uuid) returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('candidates',app_private.pilot_roster_catalogue(p_match),'prepared',app_private.pilot_calendar_ready(p_match))$$;

create function app_private.pilot_prepare_players(p_match uuid,p_mutation uuid,p_players jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();entry jsonb;candidate jsonb;name text;shirt text;position_label text;external_id text;provenance text;
 existing public.pilot_players;by_shirt public.pilot_players;saved public.pilot_players;catalogue jsonb;result jsonb:='[]';prior public.pilot_preparation_audit;
 hash text:=md5(jsonb_build_object('match',p_match,'players',p_players)::text);
begin
 if not app_private.pilot_can_prepare(p_match) then raise exception 'Match operator and verified calendar required' using errcode='42501';end if;
 if p_mutation is null or jsonb_typeof(p_players) is distinct from 'array' or jsonb_array_length(p_players) not between 1 and 40 or octet_length(p_players::text)>64000 then raise exception 'Valid bounded player request required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('pilot-preparation:'||p_match::text,0));
 select * into prior from public.pilot_preparation_audit where mutation_id=p_mutation;
 if found then if prior.actor_id<>actor or prior.match_id<>p_match or prior.action<>'players' or prior.request_hash<>hash then raise exception 'Mutation identity conflict' using errcode='42501';end if;return prior.result;end if;
 if exists(select 1 from public.pilot_operator_state where match_id=p_match and (state->>'matchStarted'='true' or state->>'finished'='true' or coalesce(state->>'sec','0')<>'0')) then raise exception 'Preparation is closed after match start';end if;
 catalogue:=app_private.pilot_roster_catalogue(p_match);
 for entry in select value from jsonb_array_elements(p_players) loop
  if coalesce(entry->>'team','') not in('home','away') then raise exception 'Valid team required';end if;
  candidate:=null;external_id:=null;existing:=null;
  if nullif(entry->>'player_id','') is not null then
   select * into existing from public.pilot_players where id=(entry->>'player_id')::uuid and match_id=p_match and team=entry->>'team';
   if existing.id is null then raise exception 'Player outside active match team' using errcode='42501';end if;
   name:=existing.full_name;external_id:=existing.federation_player_id;provenance:=existing.official_source;
  elsif nullif(entry->>'roster_id','') is not null then
   select value into candidate from jsonb_array_elements(catalogue) where value->>'roster_id'=entry->>'roster_id' and value->>'team'=entry->>'team';
   if candidate is null then raise exception 'Player outside verified match catalogue' using errcode='42501';end if;
   name:=candidate->>'full_name';external_id:=candidate->>'federation_player_id';provenance:=coalesce(candidate->>'source_url','')||'#season-roster='||(candidate->>'roster_id');
  else
   if entry->>'manual' is distinct from 'true' then raise exception 'Explicit manual provenance required';end if;
   name:=btrim(entry->>'full_name');provenance:='operator:'||actor::text;
  end if;
  shirt:=nullif(btrim(case when entry?'dorsal' then entry->>'dorsal' else candidate->>'dorsal' end),'');
  position_label:=coalesce(entry->>'position',candidate->>'position');
  if name is null or length(name) not between 1 and 120 or coalesce(position_label,'') not in('field','goalkeeper') or (shirt is not null and shirt!~'^[0-9]{1,3}$') then raise exception 'Valid real name, shirt and position required' using errcode='22023';end if;
  by_shirt:=null;
  if external_id is not null then select * into existing from public.pilot_players where match_id=p_match and team=entry->>'team' and federation_player_id=external_id;end if;
  if shirt is not null then
   select * into by_shirt from public.pilot_players where match_id=p_match and team=entry->>'team' and dorsal~'^[0-9]{1,3}$' and dorsal::int=shirt::int limit 1;
   if by_shirt.id is not null and by_shirt.id is distinct from existing.id then
    if external_id is null and by_shirt.federation_player_id is null and lower(by_shirt.full_name)=lower(name) then existing:=by_shirt;
    else raise exception 'Shirt belongs to another player; review identity';end if;
   end if;
  end if;
  if existing.id is null then
   insert into public.pilot_players(match_id,team,dorsal,full_name,position,official_source,federation_player_id,federation_active)
   values(p_match,entry->>'team',shirt,name,position_label,provenance,external_id,true) returning * into saved;
  else
   update public.pilot_players set dorsal=shirt,full_name=name,position=position_label,official_source=provenance,federation_active=true where id=existing.id returning * into saved;
  end if;
  if exists(select 1 from jsonb_array_elements(result)x where x->>'id'=saved.id::text) then raise exception 'Duplicate player in request';end if;
  result:=result||jsonb_build_array(to_jsonb(saved));
 end loop;
 if exists(select 1 from public.pilot_prepared_lineups where match_id=p_match) then
  delete from public.pilot_prepared_lineups where match_id=p_match;
  update public.pilot_operator_state set state=jsonb_set(state,'{startersConfirmed}','false'),revision=revision+1,updated_by=actor,updated_at=now() where match_id=p_match;
 end if;
 insert into public.pilot_preparation_audit(mutation_id,match_id,actor_id,action,request_hash,result) values(p_mutation,p_match,actor,'players',hash,result);
 return result;
end $$;
create function public.pilot_prepare_players(p_match uuid,p_mutation uuid,p_players jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.pilot_prepare_players(p_match,p_mutation,p_players)$$;

create function app_private.pilot_confirm_lineup(p_match uuid,p_mutation uuid,p_revision bigint,p_state jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();prior public.pilot_preparation_audit;old public.pilot_operator_state;saved public.pilot_operator_state;
 home uuid[];away uuid[];people jsonb;canonical jsonb;result jsonb;fingerprint text;
 hash text:=md5(jsonb_build_object('match',p_match,'revision',p_revision,'state',p_state)::text);
begin
 if not app_private.pilot_can_prepare(p_match) then raise exception 'Match operator and verified calendar required' using errcode='42501';end if;
 if p_mutation is null or p_revision is null or p_revision<0 or jsonb_typeof(p_state) is distinct from 'object' or octet_length(p_state::text)>64000 then raise exception 'Valid state, mutation and revision required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('pilot-preparation:'||p_match::text,0));
 select * into prior from public.pilot_preparation_audit where mutation_id=p_mutation;
 if found then if prior.actor_id<>actor or prior.match_id<>p_match or prior.action<>'lineup' or prior.request_hash<>hash then raise exception 'Mutation identity conflict' using errcode='42501';end if;return prior.result;end if;
 select * into old from public.pilot_operator_state where match_id=p_match for update;
 if coalesce(old.revision,0)<>p_revision then raise exception 'Operator state revision conflict' using errcode='40001';end if;
 if old.state->>'matchStarted'='true' or old.state->>'finished'='true' or coalesce(old.state->>'sec','0')<>'0' then raise exception 'Starting five cannot change after match start';end if;
 if jsonb_typeof(p_state#>'{starterSelections,home}') is distinct from 'array' or jsonb_typeof(p_state#>'{starterSelections,away}') is distinct from 'array' then raise exception 'Both starting fives required';end if;
 select array_agg(value::uuid) into home from jsonb_array_elements_text(p_state#>'{starterSelections,home}');
 select array_agg(value::uuid) into away from jsonb_array_elements_text(p_state#>'{starterSelections,away}');
 if cardinality(home) is distinct from 5 or cardinality(away) is distinct from 5 or (select count(distinct x) from unnest(home||away)x)<>10 then raise exception 'Exactly five distinct players per team required';end if;
 if (select count(*) from public.pilot_players where match_id=p_match and team='home' and federation_active and id=any(home))<>5 or (select count(*) from public.pilot_players where match_id=p_match and team='away' and federation_active and id=any(away))<>5 then raise exception 'Starting player outside active match team' using errcode='42501';end if;
 if (select count(*) from public.pilot_players where match_id=p_match and position='goalkeeper' and id=any(home))<>1 or (select count(*) from public.pilot_players where match_id=p_match and position='goalkeeper' and id=any(away))<>1 then raise exception 'One goalkeeper and four field players per team required';end if;
 select jsonb_agg(jsonb_build_object('id',id,'side',team,'num',dorsal,'name',full_name,'goalie',position='goalkeeper','on',id=any(home||away),'secs',0,'entries',case when id=any(home||away) then 1 else 0 end,'blueRemaining',0,'red',false,'yellow',0,'stats','{}'::jsonb) order by team,dorsal,id) into people from public.pilot_players where match_id=p_match and federation_active;
 canonical:=(p_state-'events')||jsonb_build_object('players',people,'starterSelections',jsonb_build_object('home',home,'away',away),'startersConfirmed',true,'matchStarted',false,'finished',false,'running',false,'sec',0,'half',1,'preparationSource','operator_confirmed');
 if old.match_id is null then
  insert into public.pilot_operator_state(match_id,revision,state,updated_by) values(p_match,1,canonical,actor) returning * into saved;
 else update public.pilot_operator_state set revision=revision+1,state=canonical,updated_by=actor,updated_at=now() where match_id=p_match returning * into saved;end if;
 select official_data->>'calendar_fingerprint' into fingerprint from public.federation_match_sources where match_id=p_match;
 insert into public.pilot_prepared_lineups(match_id,home_ids,away_ids,confirmed_by,source_fingerprint,state_revision) values(p_match,home,away,actor,fingerprint,saved.revision)
 on conflict(match_id) do update set home_ids=excluded.home_ids,away_ids=excluded.away_ids,confirmed_by=excluded.confirmed_by,source_fingerprint=excluded.source_fingerprint,state_revision=excluded.state_revision,confirmed_at=now();
 insert into public.pilot_events(id,match_id,user_id,event_type,team,delta,match_second,payload) values(p_mutation,p_match,actor,'lineup','home',1,0,jsonb_build_object('kind','titulars_confirmats','half',1,'details',jsonb_build_object('home',home,'away',away,'origin','operator_prepared')));
 result:=to_jsonb(saved);
 insert into public.pilot_preparation_audit(mutation_id,match_id,actor_id,action,request_hash,result) values(p_mutation,p_match,actor,'lineup',hash,result);
 return result;
end $$;
create function public.pilot_confirm_lineup(p_match uuid,p_mutation uuid,p_revision bigint,p_state jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.pilot_confirm_lineup(p_match,p_mutation,p_revision,p_state)$$;

-- Retain the entire existing restrictive policy. Add only the independently
-- verified calendar + operator-confirmed preparation path, not arbitrary pending sources.
do $$declare old_check text;begin
 select with_check into old_check from pg_policies where schemaname='public' and tablename='pilot_events' and policyname='pilot_events_direct_club_fixture';
 if old_check is null then raise exception 'Existing direct-club event policy required';end if;
 execute 'alter policy pilot_events_direct_club_fixture on public.pilot_events with check (('||old_check||') or app_private.pilot_calendar_ready(match_id))';
end $$;
revoke all on function app_private.pilot_can_prepare(uuid),app_private.pilot_calendar_ready(uuid),app_private.pilot_roster_catalogue(uuid),app_private.pilot_prepare_players(uuid,uuid,jsonb),app_private.pilot_confirm_lineup(uuid,uuid,bigint,jsonb),public.pilot_roster_catalogue(uuid),public.pilot_prepare_players(uuid,uuid,jsonb),public.pilot_confirm_lineup(uuid,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function app_private.pilot_calendar_ready(uuid),app_private.pilot_roster_catalogue(uuid),app_private.pilot_prepare_players(uuid,uuid,jsonb),app_private.pilot_confirm_lineup(uuid,uuid,bigint,jsonb),public.pilot_roster_catalogue(uuid),public.pilot_prepare_players(uuid,uuid,jsonb),public.pilot_confirm_lineup(uuid,uuid,bigint,jsonb) to authenticated;
