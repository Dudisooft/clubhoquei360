-- Club roster and eligibility are curated by the club independently of the
-- federation import. One identity follows the player across eligible teams.
create table app_private.callup_roster (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id),
 full_name text not null check (length(trim(full_name)) between 1 and 120),
 dorsal text check (dorsal ~ '^[0-9]{1,3}$'),
 position text not null check (position in ('field','goalkeeper')),
 catalogue_player_id uuid references public.federation_players(id),
 active boolean not null default true
);
create index callup_roster_team on app_private.callup_roster(team_id) where active;
create unique index callup_roster_catalogue on app_private.callup_roster(catalogue_player_id,team_id)
 where catalogue_player_id is not null and active;

create table app_private.callup_eligibility (
 team_id uuid not null references public.teams(id),
 player_id uuid not null references app_private.callup_roster(id),
 primary key(team_id,player_id)
);

create table app_private.callup_club_branding (
 club_id uuid primary key references public.clubs(id),
 primary_color text not null check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
 header_color text not null check (header_color ~ '^#[0-9a-fA-F]{6}$'),
 crest_url text check (crest_url like 'https://%')
);

create table app_private.club_callups (
 fixture_id uuid not null,
 team_id uuid not null references public.teams(id),
 revision integer not null check (revision > 0),
 published boolean not null,
 players jsonb not null,
 updated_at timestamptz not null default now(),
 primary key(fixture_id,team_id)
);
create table app_private.club_callup_history (
 fixture_id uuid not null,
 team_id uuid not null,
 revision integer not null,
 players jsonb not null,
 published_at timestamptz not null default now(),
 published_by uuid not null references auth.users(id),
 primary key(fixture_id,team_id,revision),
 foreign key(fixture_id,team_id) references app_private.club_callups(fixture_id,team_id)
);
revoke all on app_private.callup_roster, app_private.callup_eligibility,
 app_private.callup_club_branding,app_private.club_callups,app_private.club_callup_history from public,anon,authenticated;

-- Catalogue IDs survive delayed federation reports. Existing operational
-- matches without a catalogue link keep their own ID.
create view app_private.callup_catalogue_fixtures as
 select distinct m.id fixture_id,t.id team_id,t.club_id,t.season_id,t.name team_name,mt.side,
        m.home_team,m.away_team,m.federation_start_at starts_at,'catalogue'::text kind,
        (coalesce(m.raw_data->>'report_status'='verified',false) and exists(
         select 1 from public.federation_match_lineups l where l.match_id=m.id and l.side=mt.side
        )) or coalesce(shared_source.import_status='verified'
          and shared_source.official_data->>'source_kind' is distinct from 'verified_calendar'
          and (shared_source.official_data->'players') @> jsonb_build_array(jsonb_build_object('team',mt.side)),false) has_report,
        coalesce(m.raw_data->>'home_crest',m.raw_data->>'home_crest_url') home_crest,
        coalesce(m.raw_data->>'away_crest',m.raw_data->>'away_crest_url') away_crest,
        c.federation::text federation,coalesce(shared.match_id,b.pilot_match_id,linked.match_id) base_match_id
 from public.federation_matches m
 join public.federation_match_teams mt on mt.match_id=m.id
 join public.federation_team_entries e on e.id=mt.entry_id
 join public.teams t on t.id=e.club_team_id
 join public.federation_groups g on g.id=m.group_id and g.competition_id=e.competition_id
 join public.federation_competitions c on c.id=g.competition_id and c.club_id=t.club_id and c.season_id=t.season_id
 left join public.stats_matches shared on shared.match_id=m.id and shared.club_id=t.club_id
   and shared.season_id=t.season_id
   and t.id=case mt.side when 'home' then shared.home_team_id else shared.away_team_id end
 left join public.federation_match_sources shared_source on shared_source.match_id=shared.match_id
 left join public.basic_match_contexts b on b.catalogue_match_id=m.id and not b.practice
 left join lateral (
  select (array_agg(s.match_id))[1] match_id
  from public.stats_matches s
  join public.federation_match_sources src on src.match_id=s.match_id
  where s.club_id=t.club_id and s.season_id=t.season_id
    and t.id=case mt.side when 'home' then s.home_team_id else s.away_team_id end
    and (src.official_data->>'calendar_match_id'=m.id::text or
      (nullif(src.official_data->>'calendar_match_id','') is null
       and src.federation=c.federation and src.competition_id=c.external_competition_id
       and src.season_id=split_part(m.match_fingerprint,':',2)
       and src.federation_match_id=nullif(m.external_match_id,'')))
  having count(*)=1
 ) linked on true
 where mt.side in ('home','away');

create view app_private.callup_fixtures as
 select f.* from app_private.callup_catalogue_fixtures f
 union all
 select m.id,t.id,t.club_id,t.season_id,t.name,sides.side,m.home_team,m.away_team,m.starts_at,'match',
        coalesce(src.import_status='verified'
          and src.official_data->>'source_kind' is distinct from 'verified_calendar'
          and (src.official_data->'players') @> jsonb_build_array(jsonb_build_object('team',sides.side)),false),
        src.home_crest_url,src.away_crest_url,src.federation::text,m.id
 from public.stats_matches s join public.pilot_matches m on m.id=s.match_id
 cross join lateral (values(s.home_team_id,'home'),(s.away_team_id,'away')) sides(team_id,side)
 join public.teams t on t.id=sides.team_id and t.club_id=s.club_id and t.season_id=s.season_id
 left join public.federation_match_sources src on src.match_id=m.id
 where not exists(select 1 from public.basic_match_contexts b where b.pilot_match_id=m.id and b.practice)
 and not exists(select 1 from app_private.callup_catalogue_fixtures f where m.id in (f.fixture_id,f.base_match_id) and f.team_id=t.id);
revoke all on app_private.callup_catalogue_fixtures,app_private.callup_fixtures from public,anon,authenticated;

create function app_private.callup_can_edit(p_club uuid,p_team uuid)
returns boolean language sql stable set search_path='' as $$
 select auth.uid() is not null and coalesce((
  app_private.has_club_role(p_club,array['general_coordinator']) or
  app_private.has_team_role(p_team,array['section_coordinator'])
 ),false)
$$;

create function app_private.callup_candidates(p_team uuid)
returns table(id uuid, full_name text, dorsal text, "position" text, catalogue_player_id uuid,
 origin_team_id uuid, origin_team text, reinforcement boolean)
language sql stable set search_path='' as $$
 select r.id,r.full_name,r.dorsal,r.position,r.catalogue_player_id,origin.id,origin.name,origin.id<>target.id
 from app_private.callup_roster r
 join public.teams origin on origin.id=r.team_id
 join public.teams target on target.id=p_team and target.club_id=origin.club_id and target.season_id=origin.season_id
 where r.active and (origin.id=target.id or exists(
   select 1 from app_private.callup_eligibility e where e.team_id=target.id and e.player_id=r.id))
 order by origin.name,r.full_name,r.id
$$;

-- A scheduled slot lasts 90 minutes. Unknown start times produce no overlap.
create function app_private.callup_overlaps(p_fixture uuid,p_club uuid,p_starts timestamptz,p_players uuid[])
returns uuid[] language sql stable set search_path='' as $$
 select coalesce(array_agg(distinct u.player_id),'{}'::uuid[])
 from app_private.club_callups c
 join app_private.callup_fixtures f on f.team_id=c.team_id and c.fixture_id in (f.fixture_id,f.base_match_id)
 cross join unnest(p_players) u(player_id)
 where c.published and f.club_id=p_club
 and f.fixture_id<>p_fixture and p_starts<f.starts_at+interval '90 minutes'
 and f.starts_at<p_starts+interval '90 minutes'
 and c.players @> jsonb_build_array(jsonb_build_object('id',u.player_id))
$$;

create function app_private.read_club_callups(p_fixture uuid,p_team uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare f app_private.callup_fixtures; c app_private.club_callups; editor boolean; candidates jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_fixture is null then
  return coalesce((
   select jsonb_agg(to_jsonb(q) order by past,case when past then -extract(epoch from starts_at) else extract(epoch from starts_at) end nulls last,fixture_id,team_id) from (
    select x.*,cl.name club_name,branding.primary_color,branding.header_color,branding.crest_url club_crest,
      access.can_edit,saved.published,saved.revision,
      coalesce(x.starts_at<now()-interval '90 minutes',false) past,
      exists(select 1 from app_private.club_callup_history h where h.fixture_id=saved.fixture_id
        and h.team_id=x.team_id and h.revision<saved.revision) modified
    from app_private.callup_fixtures x
    join public.clubs cl on cl.id=x.club_id
    left join app_private.callup_club_branding branding on branding.club_id=x.club_id
    cross join lateral (select app_private.callup_can_edit(x.club_id,x.team_id) can_edit) access
    left join lateral (
     select candidate.* from app_private.club_callups candidate where candidate.team_id=x.team_id
       and candidate.fixture_id in (x.fixture_id,x.base_match_id) and (candidate.published or access.can_edit)
     order by (candidate.fixture_id=x.fixture_id) desc limit 1
    ) saved on true
    where (p_team is null or x.team_id=p_team)
      and (x.starts_at is null or x.starts_at>=now()-interval '90 minutes' or saved.fixture_id is not null)
      and (access.can_edit or app_private.has_team_role(x.team_id,array['coach','delegate']))
   ) q
  ),'[]'::jsonb);
 end if;
 if p_team is null then
  return coalesce((
   select jsonb_agg(app_private.read_club_callups(x.fixture_id,x.team_id) order by x.side,x.team_id)
   from app_private.callup_fixtures x
   where p_fixture in (x.fixture_id,x.base_match_id)
     and (app_private.callup_can_edit(x.club_id,x.team_id) or app_private.has_team_role(x.team_id,array['coach','delegate']))
  ),'[]'::jsonb);
 end if;
 select * into f from app_private.callup_fixtures x where p_fixture in (x.fixture_id,x.base_match_id)
  and x.team_id=p_team order by (x.fixture_id=p_fixture) desc limit 1;
 editor:=app_private.callup_can_edit(f.club_id,f.team_id);
 if f.fixture_id is null or not (editor or coalesce(app_private.has_team_role(f.team_id,array['coach','delegate']),false)) then
  raise exception 'Team access required' using errcode='42501';
 end if;
 select * into c from app_private.club_callups x where x.fixture_id in (f.fixture_id,f.base_match_id)
  and x.team_id=p_team and (x.published or editor) order by (x.fixture_id=f.fixture_id) desc limit 1;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into candidates
 from app_private.callup_candidates(p_team) r where editor or (not f.has_report and not r.reinforcement);
 return jsonb_build_object('fixture',to_jsonb(f),'can_edit',editor,'callup',case when c.fixture_id is not null then to_jsonb(c) end,
  'candidates',candidates,
  'overlaps',case when editor then to_jsonb(app_private.callup_overlaps(f.fixture_id,f.club_id,f.starts_at,
    array(select (j->>'id')::uuid from jsonb_array_elements(candidates) j))) else '[]'::jsonb end,
  'history',coalesce((select jsonb_agg(to_jsonb(h)-'published_by' order by h.revision desc)
    from app_private.club_callup_history h where h.fixture_id=c.fixture_id and h.team_id=p_team),'[]'::jsonb));
end
$$;

create function app_private.save_club_callup(p_fixture uuid,p_team uuid,p_revision integer,p_players uuid[],
 p_publish boolean,p_acknowledged uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare f app_private.callup_fixtures; c app_private.club_callups; players jsonb; conflicts uuid[]; next_revision integer; storage_id uuid;
begin
 select * into f from app_private.callup_fixtures x where p_fixture in (x.fixture_id,x.base_match_id)
  and x.team_id=p_team order by (x.fixture_id=p_fixture) desc limit 1;
 if f.fixture_id is null or not app_private.callup_can_edit(f.club_id,f.team_id) then
  raise exception 'Coordinator access required' using errcode='42501';
 end if;
 if p_publish is null or p_revision is null or p_players is null or cardinality(p_players)>100
  or (p_publish and cardinality(p_players)=0) then
  raise exception 'Invalid call-up selection' using errcode='22023';
 end if;
 -- Serialize all publications in a club so overlap checks see prior commits.
 perform pg_advisory_xact_lock(hashtextextended('club-callup:'||f.club_id::text,0));
 select * into c from app_private.club_callups x where x.fixture_id in (f.fixture_id,f.base_match_id)
  and x.team_id=p_team order by (x.fixture_id=f.fixture_id) desc limit 1;
 storage_id:=coalesce(c.fixture_id,f.fixture_id);
 if p_revision<>coalesce(c.revision,0) then
  raise exception 'La convocatòria ha canviat. Torna a carregar-la.' using errcode='40001';
 end if;
 if c.published and not p_publish then
  raise exception 'Published call-up cannot be reverted to draft' using errcode='22023';
 end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) into players
 from app_private.callup_candidates(p_team) r where r.id=any(p_players);
 if jsonb_array_length(players)<>cardinality(p_players) then
  raise exception 'Selection contains duplicate or ineligible players' using errcode='22023';
 end if;
 conflicts:=app_private.callup_overlaps(f.fixture_id,f.club_id,f.starts_at,p_players);
 if p_publish and not (conflicts <@ coalesce(p_acknowledged,'{}'::uuid[])) then
  return jsonb_build_object('requires_confirmation',true,'overlaps',conflicts);
 end if;
 if c.players=players and c.published=p_publish then
  return jsonb_build_object('revision',c.revision,'overlaps',conflicts);
 end if;
 next_revision:=p_revision+1;
 insert into app_private.club_callups values(storage_id,p_team,next_revision,p_publish,players,now())
 on conflict(fixture_id,team_id) do update
 set revision=excluded.revision,published=excluded.published,players=excluded.players,updated_at=excluded.updated_at;
 if p_publish then
  insert into app_private.club_callup_history(fixture_id,team_id,revision,players,published_by)
  values(storage_id,p_team,next_revision,players,auth.uid());
 end if;
 return jsonb_build_object('revision',next_revision,'overlaps',conflicts);
end
$$;

create function public.read_club_callups(p_fixture uuid default null,p_team uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.read_club_callups(p_fixture,p_team)
$$;
create function public.save_club_callup(p_fixture uuid,p_team uuid,p_revision integer,p_players uuid[],
 p_publish boolean,p_acknowledged uuid[] default '{}')
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.save_club_callup(p_fixture,p_team,p_revision,p_players,p_publish,p_acknowledged)
$$;

revoke execute on function app_private.callup_can_edit(uuid,uuid),app_private.callup_candidates(uuid),
 app_private.callup_overlaps(uuid,uuid,timestamptz,uuid[]) from public,anon,authenticated;
revoke execute on function app_private.read_club_callups(uuid,uuid),public.read_club_callups(uuid,uuid),
 app_private.save_club_callup(uuid,uuid,integer,uuid[],boolean,uuid[]),
 public.save_club_callup(uuid,uuid,integer,uuid[],boolean,uuid[]) from public,anon,authenticated;
grant execute on function app_private.read_club_callups(uuid,uuid),public.read_club_callups(uuid,uuid),
 app_private.save_club_callup(uuid,uuid,integer,uuid[],boolean,uuid[]),
 public.save_club_callup(uuid,uuid,integer,uuid[],boolean,uuid[]) to authenticated;
