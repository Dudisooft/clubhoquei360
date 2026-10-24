-- Catalogue linkage only: all incident data stays in pilot_events.
create table public.basic_match_contexts (
 id uuid primary key default gen_random_uuid(),
 catalogue_match_id uuid not null references public.federation_matches(id),
 pilot_match_id uuid not null unique references public.pilot_matches(id),
 owner_id uuid not null references auth.users(id),
 practice boolean not null,
 created_at timestamptz not null default now()
);
create unique index basic_live_catalogue on public.basic_match_contexts(catalogue_match_id) where not practice;
create unique index basic_practice_owner on public.basic_match_contexts(catalogue_match_id,owner_id) where practice;
create index basic_context_owner on public.basic_match_contexts(owner_id);
alter table public.basic_match_contexts enable row level security;
create policy basic_context_member_read on public.basic_match_contexts for select to authenticated using (
 exists(select 1 from public.pilot_members m where m.match_id=basic_match_contexts.pilot_match_id and m.user_id=(select auth.uid()))
 or (select app_private.is_platform_superadmin())
);
revoke all on public.basic_match_contexts from anon,authenticated;
grant select on public.basic_match_contexts to authenticated;

-- A private privileged helper is necessary to reuse the existing server-only
-- match creation path. Auth and an existing same-competition operator are checked
-- on every invocation; there is no client-selected user/role or metadata claim.
create function app_private.basic_open_catalogue(p_catalogue uuid,p_reference uuid,p_practice boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); fixture public.federation_matches; comp public.federation_competitions;
 target uuid; existing public.pilot_matches; begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_practice is null then raise exception 'Practice flag required' using errcode='22023'; end if;
 select * into strict fixture from public.federation_matches where id=p_catalogue;
 select c.* into strict comp from public.federation_competitions c join public.federation_groups g on g.competition_id=c.id where g.id=fixture.group_id;
 if comp.federation<>'FECAPA' then raise exception 'FECAPA catalogue required' using errcode='22023'; end if;
 if not exists(select 1 from public.federation_match_teams mt join public.federation_team_entries e on e.id=mt.entry_id join public.teams t on t.id=e.club_team_id
  where mt.match_id=p_catalogue and e.competition_id=comp.id and t.club_id=comp.club_id) then
  raise exception 'Verified club participant required' using errcode='42501';
 end if;
 if not p_practice and fixture.raw_data->>'report_status'='verified' and upper(trim(fixture.raw_data#>>'{report_data,official_status}'))='FINALIZAT' then
  raise exception 'Historical finalized match: use a separate rehearsal' using errcode='22023';
 end if;

 if not app_private.is_platform_superadmin() and not exists(
  select 1 from public.pilot_members m join public.federation_match_sources s on s.match_id=m.match_id
  where m.match_id=p_reference and m.user_id=actor and m.role='operator'
   and s.federation=comp.federation and s.competition_id=comp.external_competition_id
   and exists(select 1 from public.stats_matches sm where sm.match_id=m.match_id and sm.club_id=comp.club_id and sm.season_id=comp.season_id)
 ) then raise exception 'Existing operator access in this competition required' using errcode='42501'; end if;
 if p_practice and coalesce(fixture.raw_data->>'report_status','')<>'verified' then
  raise exception 'Verified report required for rehearsal' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('basic:'||p_catalogue::text||':'||case when p_practice then actor::text else 'live' end,0));
 select pilot_match_id into target from public.basic_match_contexts where catalogue_match_id=p_catalogue and practice=p_practice and (not p_practice or owner_id=actor);
 if target is null then
  -- A previously imported live match is reused by federation identity.
  if not p_practice and fixture.external_match_id is not null then
   select s.match_id into target from public.federation_match_sources s where s.federation=comp.federation and s.competition_id=comp.external_competition_id and s.federation_match_id=fixture.external_match_id;
  end if;
  if target is null then
   target:=case when p_practice then gen_random_uuid() else p_catalogue end;
   select * into existing from public.pilot_matches where id=target;
   if found then
    -- Never adopt or overwrite a historical record by a coincident UUID.
    raise exception 'Existing match requires explicit catalogue linkage' using errcode='23505';
   end if;
   insert into public.pilot_matches(id,title,home_team,away_team,starts_at,status)
   values(target,case when p_practice then 'PROVA · ' else '' end||fixture.home_team||' – '||fixture.away_team,fixture.home_team,fixture.away_team,fixture.federation_start_at,'scheduled');
  end if;
  insert into public.basic_match_contexts(catalogue_match_id,pilot_match_id,owner_id,practice) values(p_catalogue,target,actor,p_practice);
 end if;
 insert into public.pilot_members(match_id,user_id,role) values(target,actor,'operator') on conflict(match_id,user_id) do nothing;
 return target;
end $$;
revoke all on function app_private.basic_open_catalogue(uuid,uuid,boolean) from public,anon;
grant execute on function app_private.basic_open_catalogue(uuid,uuid,boolean) to authenticated;
grant usage on schema app_private to authenticated;
create function public.basic_open_catalogue_match(p_catalogue uuid,p_reference uuid default null,p_practice boolean default false)
returns uuid language sql security invoker set search_path='' as $$
 select app_private.basic_open_catalogue(p_catalogue,p_reference,p_practice)
$$;
revoke all on function public.basic_open_catalogue_match(uuid,uuid,boolean) from public,anon;
grant execute on function public.basic_open_catalogue_match(uuid,uuid,boolean) to authenticated;
