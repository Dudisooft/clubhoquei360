-- Match-local identities. No historical events or operator clocks are rewritten.
alter table public.pilot_players add column roster_revision bigint not null default 1;
alter table public.pilot_players add column identity_status text generated always as
 (case when federation_player_id is null then 'provisional' else 'federation' end) stored;
create function app_private.roster_revision() returns trigger language plpgsql set search_path='' as $$begin
 new.roster_revision:=old.roster_revision+1;return new;
end $$;
create trigger roster_revision before update on public.pilot_players for each row execute function app_private.roster_revision();
create table public.match_roster_audit(
 mutation_id uuid primary key,match_id uuid not null references public.pilot_matches(id),
 actor_id uuid not null references auth.users(id),request_hash text not null,
 before_data jsonb,after_data jsonb not null,created_at timestamptz not null default now()
);
create index match_roster_audit_match on public.match_roster_audit(match_id,created_at);
create index match_roster_audit_actor on public.match_roster_audit(actor_id);
alter table public.match_roster_audit enable row level security;
create policy roster_audit_read on public.match_roster_audit for select to authenticated using(
 exists(select 1 from public.pilot_members m where m.match_id=match_roster_audit.match_id and m.user_id=(select auth.uid()) and m.role='operator') or app_private.stats_can_manage(match_id));
revoke all on public.match_roster_audit from public,anon,authenticated;
grant select on public.match_roster_audit to authenticated;

create function app_private.roster_can_write(p_match uuid,p_side text,p_player uuid default null) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and p_side in('home','away') and (
 exists(select 1 from public.pilot_members m where m.match_id=p_match and m.user_id=auth.uid() and m.role='operator')
 or exists(select 1 from public.stats_assignments a where a.match_id=p_match and a.user_id=auth.uid()
 and a.role in('primary','operator') and a.revoked_at is null and a.expires_at>now()
 and (a.role='primary' or (p_side=any(a.sides) and (cardinality(a.player_ids)=0 or p_player=any(a.player_ids))))))
$$;

-- Exact fixture/competition/season context, including opponents without a club team.
create function app_private.roster_candidates(p_match uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with contexts as (
 select f.id fixture_id,c.id competition_id,c.federation,f.raw_data
 from public.basic_match_contexts b join public.federation_matches f on f.id=b.catalogue_match_id
 join public.federation_groups g on g.id=f.group_id join public.federation_competitions c on c.id=g.competition_id
 where b.pilot_match_id=p_match
 union
 select f.id,c.id,c.federation,f.raw_data from public.stats_matches sm
 join public.federation_match_sources s on s.match_id=sm.match_id
 join public.federation_competitions c on c.club_id=sm.club_id and c.season_id=sm.season_id and c.federation=s.federation and c.external_competition_id=s.competition_id
 join public.federation_groups g on g.competition_id=c.id join public.federation_matches f on f.group_id=g.id
 and (f.id::text=s.official_data->>'calendar_match_id' or (s.federation_match_id is not null and f.external_match_id=s.federation_match_id))
 where sm.match_id=p_match and f.raw_data->>'home_team_id'=sm.home_external_team_id and f.raw_data->>'away_team_id'=sm.away_external_team_id
 ), people as (
 select distinct 'roster:'||r.id::text candidate_id,side.value team,r.display_name full_name,r.shirt_number dorsal,
 case when r.raw_data->>'position'='goalkeeper' or r.raw_data->>'is_goalkeeper'='true' then 'goalkeeper' else 'field' end position,
 p.external_player_id federation_player_id,e.source_url||'#season-roster='||r.id::text official_source
 from contexts x cross join lateral(values('home'),('away'))side(value)
 join public.federation_team_entries e on e.competition_id=x.competition_id and e.raw_data->>'verification'='official'
 and e.external_team_id=x.raw_data->>(side.value||'_team_id')
 join public.federation_team_roster r on r.entry_id=e.id and r.role='player' and coalesce(r.raw_data->>'active_in_latest_roster','true')<>'false'
 join public.federation_players p on p.id=r.player_id and p.federation=x.federation and p.external_player_id~'^[1-9][0-9]*$'
 left join public.teams t on t.id=e.club_team_id
 where upper(coalesce(t.category,''))<>'INFANTIL' or r.raw_data->>'observed_match_id' is not null
 union
 select 'lineup:'||l.id::text,l.side,l.display_name,l.shirt_number,case when l.is_goalkeeper then 'goalkeeper' else 'field' end,
 p.external_player_id,coalesce(x.raw_data->>'source_url','')||'#lineup='||l.id::text
 from contexts x join public.federation_match_lineups l on l.match_id=x.fixture_id
 join public.federation_players p on p.id=l.player_id and p.federation=x.federation and p.external_player_id~'^[1-9][0-9]*$'
 where x.raw_data->>'report_status'='verified'
 ) select coalesce(jsonb_agg(to_jsonb(people) order by team,full_name,candidate_id),'[]') from people
$$;

create function app_private.match_roster(p_match uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not (exists(select 1 from public.pilot_members where match_id=p_match and user_id=auth.uid()) or app_private.stats_can_read(p_match)) then
 raise exception 'Match roster access denied' using errcode='42501';end if;
 return jsonb_build_object('players',(select coalesce(jsonb_agg(to_jsonb(p) order by team,dorsal,id),'[]') from public.pilot_players p where p.match_id=p_match),
 'candidates',app_private.roster_candidates(p_match),'write_sides',(select coalesce(jsonb_agg(value),'[]') from (values('home'),('away'))s(value) where app_private.roster_can_write(p_match,value)),
 'editable_ids',(select coalesce(jsonb_agg(id),'[]') from public.pilot_players p where p.match_id=p_match and app_private.roster_can_write(p_match,p.team,p.id)));
end $$;
create function public.match_roster(p_match uuid) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.match_roster(p_match)$$;

create function app_private.match_roster_save(p_match uuid,p_mutation uuid,p_player jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();prior public.match_roster_audit;old public.pilot_players;saved public.pilot_players;other public.pilot_players;
 requested uuid;side text:=p_player->>'team';candidate jsonb;external_id text;name text;shirt text;pos text;provenance text;
 hash text:=md5(jsonb_build_object('match',p_match,'player',p_player)::text);expected bigint;
begin
 if p_mutation is null or jsonb_typeof(p_player) is distinct from 'object' or octet_length(p_player::text)>8000
 or coalesce(side,'') not in('home','away') or p_player->>'id' is null or p_player->>'revision' is null then raise exception 'Valid bounded player request required' using errcode='22023';end if;
 requested:=(p_player->>'id')::uuid;expected:=(p_player->>'revision')::bigint;
 if not app_private.roster_can_write(p_match,side,requested) then raise exception 'Match roster write access denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('pilot-preparation:'||p_match::text,0));
 select * into prior from public.match_roster_audit where mutation_id=p_mutation;
 if found then if prior.actor_id<>actor or prior.match_id<>p_match or prior.request_hash<>hash then raise exception 'Mutation identity conflict' using errcode='42501';end if;return prior.after_data;end if;
 select * into old from public.pilot_players where id=requested for update;
 if old.id is not null and (old.match_id<>p_match or old.team<>side) then raise exception 'Player outside match team' using errcode='42501';end if;
 if coalesce(old.roster_revision,0)<>expected then raise exception 'Roster revision conflict: reload before editing' using errcode='40001';end if;
 if old.id is not null and old.federation_active=false then raise exception 'Inactive player requires review' using errcode='22023';end if;
 if p_player->>'candidate_id' is not null then
  -- Only official operators/managers may reconcile an existing identity.
  if old.id is not null and not (exists(select 1 from public.pilot_members where match_id=p_match and user_id=actor and role='operator') or app_private.stats_can_manage(p_match)) then raise exception 'Identity reconciliation requires match supervision' using errcode='42501';end if;
  select value into candidate from jsonb_array_elements(app_private.roster_candidates(p_match)) where value->>'candidate_id'=p_player->>'candidate_id' and value->>'team'=side;
  if candidate is null then raise exception 'Player outside verified match catalogue' using errcode='42501';end if;
  external_id:=candidate->>'federation_player_id';name:=candidate->>'full_name';provenance:=candidate->>'official_source';
  if old.federation_player_id is not null and old.federation_player_id<>external_id then raise exception 'Verified identity cannot be replaced' using errcode='22023';end if;
  select * into other from public.pilot_players where match_id=p_match and team=side and federation_player_id=external_id;
  if other.id is not null and other.id<>requested then
   if old.id is null then return to_jsonb(other);end if;
   raise exception 'Official identity already has a match record: preserve both and review before reconciliation' using errcode='23505';
  end if;
 else
  if p_player->>'manual' is distinct from 'true' then raise exception 'Explicit manual provenance required' using errcode='22023';end if;
  name:=case when old.federation_player_id is not null then old.full_name else btrim(p_player->>'full_name') end;
  external_id:=old.federation_player_id;provenance:=coalesce(old.official_source,'operator:'||actor::text);
 end if;
 shirt:=nullif(btrim(case when p_player?'dorsal' then p_player->>'dorsal' else coalesce(old.dorsal,candidate->>'dorsal') end),'');
 pos:=coalesce(p_player->>'position',old.position,candidate->>'position','field');
 if name is null or length(name) not between 1 and 120 or name~'[[:cntrl:]]' or pos not in('field','goalkeeper') or (shirt is not null and shirt!~'^[0-9]{1,3}$') then raise exception 'Valid player name, shirt and position required' using errcode='22023';end if;
 if old.id is null and candidate is null and shirt is null then raise exception 'Provisional player requires a shirt' using errcode='22023';end if;
 if shirt is not null and exists(select 1 from public.pilot_players p where p.match_id=p_match and p.team=side and p.id<>requested and p.dorsal~'^[0-9]{1,3}$' and p.dorsal::int=shirt::int) then raise exception 'Shirt belongs to another player: review identity' using errcode='23505';end if;
 if old.id is not null and pos<>old.position and exists(select 1 from public.pilot_prepared_lineups l where l.match_id=p_match and old.id=any(l.home_ids||l.away_ids)) then raise exception 'Confirmed starting position requires lineup review' using errcode='22023';end if;
 if old.id is null then
  insert into public.pilot_players(id,match_id,team,dorsal,full_name,position,federation_player_id,official_source,federation_active)
  values(requested,p_match,side,shirt,name,pos,external_id,provenance,true) returning * into saved;
 else
  update public.pilot_players set dorsal=shirt,full_name=name,position=pos,federation_player_id=external_id,official_source=provenance where id=requested returning * into saved;
 end if;
 insert into public.match_roster_audit(mutation_id,match_id,actor_id,request_hash,before_data,after_data) values(p_mutation,p_match,actor,hash,case when old.id is not null then to_jsonb(old) end,to_jsonb(saved));
 return to_jsonb(saved);
end $$;
create function public.match_roster_save(p_match uuid,p_mutation uuid,p_player jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.match_roster_save(p_match,p_mutation,p_player)$$;

-- All client roster writes use the scoped, audited API. Existing server importers
-- and the approved starting-five preparation retain their own authorization.
revoke insert,update,delete on public.pilot_players from authenticated,anon;
revoke all on function app_private.roster_revision(),app_private.roster_can_write(uuid,text,uuid),app_private.roster_candidates(uuid),app_private.match_roster(uuid),app_private.match_roster_save(uuid,uuid,jsonb),public.match_roster(uuid),public.match_roster_save(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function app_private.match_roster(uuid),app_private.match_roster_save(uuid,uuid,jsonb),public.match_roster(uuid),public.match_roster_save(uuid,uuid,jsonb) to authenticated;
