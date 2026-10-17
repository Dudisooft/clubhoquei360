-- Additive analysis layer. No writes to official events, clocks or federation data.
-- Private command functions deliberately own writes: this permits atomic CAS,
-- idempotency and an immutable audit without granting clients direct DML.
create schema if not exists app_private;
revoke create on schema app_private from public;
grant usage on schema app_private to authenticated;

create table public.stats_matches (
 match_id uuid primary key references public.pilot_matches(id),
 club_id uuid not null references public.clubs(id), season_id uuid not null references public.seasons(id),
 home_team_id uuid references public.teams(id), away_team_id uuid references public.teams(id),
 home_external_team_id text, away_external_team_id text,
 created_at timestamptz not null default now(),
 check(home_team_id is not null or away_team_id is not null)
);
create table public.stats_actions (code text primary key, label text not null, category text not null);
create table public.stats_assignments (
 id uuid primary key default gen_random_uuid(),match_id uuid not null references public.stats_matches(match_id),
 user_id uuid not null references auth.users(id),role text not null check(role in('primary','operator','viewer')),
 categories text[] not null default '{}',sides text[] not null default array['home','away','disputed'],player_ids uuid[] not null default '{}',
 expires_at timestamptz not null,revoked_at timestamptz,granted_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 check(sides <@ array['home','away','disputed']::text[] and cardinality(sides)>0),
 check(role<>'operator' or cardinality(categories)>0)
);
create index stats_assignments_access_idx on public.stats_assignments(match_id,user_id,expires_at) where revoked_at is null;
create table public.stats_events (
 id uuid primary key,match_id uuid not null references public.stats_matches(match_id),
 club_id uuid not null references public.clubs(id),season_id uuid not null references public.seasons(id),team_id uuid references public.teams(id),external_team_id text,
 period int not null check(period between 1 and 8), match_ms int not null check(match_ms between 0 and 21600000),
 side text not null check(side in('home','away','disputed')),player_id uuid references public.pilot_players(id),assist_player_id uuid references public.pilot_players(id),
 action text not null references public.stats_actions(code),duration_ms int,
 operator_id uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 origin text not null check(origin in('live','video','official_reference')),
 validation text not null check(validation in('recorded','validated','void')),revision int not null default 1,
 source_event_id uuid references public.pilot_events(id),note text not null default '' check(length(note)<=500),
 check((action='possession' and duration_ms is not null and duration_ms>0 and duration_ms<=match_ms and player_id is null) or (action<>'possession' and duration_ms is null and side<>'disputed')),
 check(assist_player_id is null or (action='goal' and assist_player_id is distinct from player_id))
);
create unique index stats_events_source_once on public.stats_events(match_id,source_event_id) where source_event_id is not null;
create index stats_events_timeline_idx on public.stats_events(match_id,period,match_ms);
create index stats_events_player_idx on public.stats_events(player_id) where player_id is not null;
create index stats_events_operator_idx on public.stats_events(operator_id);
create table public.stats_event_audit (
 mutation_id uuid primary key,event_id uuid not null references public.stats_events(id),match_id uuid not null references public.stats_matches(match_id),
 actor_id uuid not null references auth.users(id),revision int not null,at timestamptz not null default now(),
 previous jsonb,current jsonb not null,request_hash text not null,unique(event_id,revision)
);
create index stats_event_audit_match_idx on public.stats_event_audit(match_id,event_id);
create table public.stats_sessions (
 match_id uuid not null references public.stats_matches(match_id),user_id uuid not null references auth.users(id),
 state jsonb not null,revision int not null,updated_at timestamptz not null default now(),primary key(match_id,user_id),
 check(jsonb_typeof(state)='object' and octet_length(state::text)<16000)
);
create table public.stats_coverage (
 match_id uuid not null references public.stats_matches(match_id),side text not null check(side in('home','away')),
 category text not null,complete boolean not null,updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now(),
 primary key(match_id,side,category)
);
create table public.stats_access_audit (
 id uuid primary key default gen_random_uuid(),match_id uuid not null references public.stats_matches(match_id),
 actor_id uuid not null references auth.users(id),at timestamptz not null default now(),previous jsonb,current jsonb not null
);
create index stats_access_audit_match_idx on public.stats_access_audit(match_id);

create function app_private.stats_club_manager(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(select 1 from public.stats_matches s where s.match_id=p_match and (
 app_private.is_platform_superadmin() or app_private.has_club_role(s.club_id,array['admin','general_coordinator'])
 or app_private.has_team_role(s.home_team_id,array['section_coordinator']) or app_private.has_team_role(s.away_team_id,array['section_coordinator'])))
$$;
create function app_private.stats_can_manage(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and (app_private.stats_club_manager(p_match) or exists(select 1 from public.stats_assignments a where a.match_id=p_match and a.user_id=(select auth.uid()) and a.role='primary' and a.revoked_at is null and a.expires_at>now()))
$$;
create function app_private.stats_can_read(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and (app_private.stats_club_manager(p_match)
 or exists(select 1 from public.stats_matches s where s.match_id=p_match and (app_private.has_team_role(s.home_team_id,array['coach','section_coordinator']) or app_private.has_team_role(s.away_team_id,array['coach','section_coordinator'])))
 or exists(select 1 from public.stats_assignments a where a.match_id=p_match and a.user_id=(select auth.uid()) and a.revoked_at is null and a.expires_at>now()))
$$;
create function app_private.stats_can_record(p_match uuid,p_action text,p_side text,p_player uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(
 select 1 from public.stats_assignments a join public.stats_actions k on k.code=p_action
 where a.match_id=p_match and a.user_id=(select auth.uid()) and a.revoked_at is null and a.expires_at>now() and a.role in('primary','operator')
 and (a.role='primary' or (k.category=any(a.categories) and p_side=any(a.sides) and (cardinality(a.player_ids)=0 or p_player=any(a.player_ids))))
 and not exists(select 1 from public.stats_assignments other where other.match_id=p_match and other.id<>a.id and other.user_id<>a.user_id and other.role='operator' and other.revoked_at is null and other.expires_at>now() and k.category=any(other.categories) and p_side=any(other.sides) and (cardinality(other.player_ids)=0 or p_player=any(other.player_ids))))
$$;

alter table public.stats_matches enable row level security;
alter table public.stats_actions enable row level security;
alter table public.stats_assignments enable row level security;
alter table public.stats_events enable row level security;
alter table public.stats_event_audit enable row level security;
alter table public.stats_sessions enable row level security;
alter table public.stats_coverage enable row level security;
alter table public.stats_access_audit enable row level security;
create policy stats_matches_read on public.stats_matches for select to authenticated using(app_private.stats_can_read(match_id));
create policy stats_actions_read on public.stats_actions for select to authenticated using((select auth.uid()) is not null);
create policy stats_assignments_read on public.stats_assignments for select to authenticated using(app_private.stats_can_read(match_id));
create policy stats_events_read on public.stats_events for select to authenticated using(app_private.stats_can_read(match_id));
create policy stats_event_audit_read on public.stats_event_audit for select to authenticated using(app_private.stats_can_read(match_id));
create policy stats_sessions_read on public.stats_sessions for select to authenticated using(app_private.stats_can_read(match_id) and (user_id=(select auth.uid()) or app_private.stats_can_manage(match_id)));
create policy stats_coverage_read on public.stats_coverage for select to authenticated using(app_private.stats_can_read(match_id));
create policy stats_access_audit_read on public.stats_access_audit for select to authenticated using(app_private.stats_can_manage(match_id));
revoke all on public.stats_matches,public.stats_actions,public.stats_assignments,public.stats_events,public.stats_event_audit,public.stats_sessions,public.stats_coverage,public.stats_access_audit from public,anon,authenticated;
grant select on public.stats_matches,public.stats_actions,public.stats_assignments,public.stats_events,public.stats_event_audit,public.stats_sessions,public.stats_coverage,public.stats_access_audit to authenticated;

-- Exact-match access for temporary analysts. These add SELECT only; official
-- INSERT/UPDATE policies and roles are deliberately unchanged.
create policy stats_match_reference_read on public.pilot_matches for select to authenticated using(app_private.stats_can_read(id));
create policy stats_player_reference_read on public.pilot_players for select to authenticated using(app_private.stats_can_read(match_id));
create policy stats_event_reference_read on public.pilot_events for select to authenticated using(app_private.stats_can_read(match_id));
create policy stats_source_reference_read on public.federation_match_sources for select to authenticated using(app_private.stats_can_read(match_id));
create policy stats_clock_reference_read on public.pilot_operator_state for select to authenticated using(app_private.stats_can_read(match_id));

create function app_private.stats_write_event(p_event jsonb,p_expected int) returns public.stats_events language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); old public.stats_events; result public.stats_events; ctx public.stats_matches; mid uuid:=(p_event->>'match_id')::uuid; eid uuid:=(p_event->>'id')::uuid;
 mutation uuid:=(p_event->>'mutation_id')::uuid; hash text:=md5(p_event::text||p_expected::text); audit public.stats_event_audit; person_id uuid:=nullif(p_event->>'player_id','')::uuid; assistant uuid:=nullif(p_event->>'assist_player_id','')::uuid; src uuid:=nullif(p_event->>'source_event_id','')::uuid;
 code text:=p_event->>'action'; side_label text:=p_event->>'side'; valid text:=coalesce(p_event->>'validation','recorded');
begin
 if uid is null or not app_private.stats_can_read(mid) then raise exception 'Statistics access denied' using errcode='42501';end if;
 if mutation is null or eid is null then raise exception 'Stable event and mutation UUID required';end if;
 perform pg_advisory_xact_lock(hashtextextended('stats:'||mid::text,0));
 select * into audit from public.stats_event_audit where mutation_id=mutation;
 if found then
  if audit.actor_id<>uid or audit.request_hash<>hash then raise exception 'Idempotency key reused for another command';end if;
  select * into strict result from public.stats_events where id=audit.event_id;return result;
 end if;
 select * into strict ctx from public.stats_matches where match_id=mid;
 select * into old from public.stats_events where id=eid for update;
 if found then
  if old.match_id<>mid or old.revision<>p_expected then raise exception 'Revision conflict' using errcode='40001';end if;
  if not (app_private.stats_can_manage(mid) or (old.operator_id=uid and app_private.stats_can_record(mid,old.action,old.side,old.player_id))) then raise exception 'Correction access denied' using errcode='42501';end if;
 elsif p_expected<>0 then raise exception 'Revision conflict' using errcode='40001';
 end if;
 if not (old.id is not null and app_private.stats_can_manage(mid)) and not app_private.stats_can_record(mid,code,side_label,person_id) then raise exception 'Action outside assigned scope' using errcode='42501';end if;
 if old.source_event_id is not null and src is distinct from old.source_event_id then raise exception 'Official reference is immutable';end if;
 if valid='validated' and not app_private.stats_can_manage(mid) then raise exception 'Validation requires principal';end if;
 if code in('assist','player_in','player_out','save','save_block','save_rebound','save_stretch','goal_conceded','goalkeeper_target','goalkeeper_rebound','goalkeeper_second','goalkeeper_exit_complete','goalkeeper_exit_failed') and person_id is null then raise exception 'Player identity required';end if;
 if person_id is not null and not exists(select 1 from public.pilot_players p where p.id=person_id and p.match_id=mid and p.team=side_label) then raise exception 'Player does not belong to this match and side';end if;
 if code in('save','save_block','save_rebound','save_stretch','goal_conceded','goalkeeper_target','goalkeeper_rebound','goalkeeper_second','goalkeeper_exit_complete','goalkeeper_exit_failed') and not exists(select 1 from public.pilot_players p where p.id=person_id and p.position='goalkeeper') then raise exception 'Goalkeeper required';end if;
 if assistant is not null and not exists(select 1 from public.pilot_players p where p.id=assistant and p.match_id=mid and p.team=side_label) then raise exception 'Assistant identity mismatch';end if;
 if src is not null and not exists(select 1 from public.pilot_events e where e.id=src and e.match_id=mid and e.event_type in('goal','team_foul','assist')) then raise exception 'Invalid official reference';end if;
 if code='possession' and valid<>'void' and exists(select 1 from public.stats_events e where e.match_id=mid and e.id<>eid and e.action='possession' and e.validation<>'void' and e.period=(p_event->>'period')::int and e.match_ms-e.duration_ms<(p_event->>'match_ms')::int and e.match_ms>(p_event->>'match_ms')::int-(p_event->>'duration_ms')::int) then raise exception 'Possession interval overlaps an existing observation' using errcode='23P01';end if;
 insert into public.stats_events(id,match_id,club_id,season_id,team_id,external_team_id,period,match_ms,side,player_id,assist_player_id,action,duration_ms,operator_id,updated_by,origin,validation,source_event_id,note)
 values(eid,mid,ctx.club_id,ctx.season_id,case side_label when 'home' then ctx.home_team_id when 'away' then ctx.away_team_id end,case side_label when 'home' then ctx.home_external_team_id when 'away' then ctx.away_external_team_id end,(p_event->>'period')::int,(p_event->>'match_ms')::int,side_label,person_id,assistant,code,(p_event->>'duration_ms')::int,uid,uid,case when src is not null then 'official_reference' else p_event->>'origin' end,valid,src,coalesce(p_event->>'note',''))
 on conflict(id) do update set team_id=excluded.team_id,external_team_id=excluded.external_team_id,period=excluded.period,match_ms=excluded.match_ms,side=excluded.side,player_id=excluded.player_id,assist_player_id=excluded.assist_player_id,action=excluded.action,duration_ms=excluded.duration_ms,updated_by=uid,updated_at=clock_timestamp(),origin=excluded.origin,validation=excluded.validation,source_event_id=excluded.source_event_id,note=excluded.note,revision=public.stats_events.revision+1
 returning * into result;
 insert into public.stats_event_audit(mutation_id,event_id,match_id,actor_id,revision,previous,current,request_hash) values(mutation,eid,mid,uid,result.revision,case when old.id is not null then to_jsonb(old) end,to_jsonb(result),hash);
 return result;
end $$;
create function public.stats_write_event(p_event jsonb,p_expected int default 0) returns public.stats_events language sql security invoker set search_path='' as $$ select app_private.stats_write_event(p_event,p_expected) $$;

create function app_private.stats_save_session(p_match uuid,p_state jsonb,p_expected int) returns public.stats_sessions language plpgsql security definer set search_path='' as $$
declare result public.stats_sessions; uid uuid:=auth.uid();begin
 if uid is null or not app_private.stats_can_read(p_match) or not exists(select 1 from public.stats_assignments where match_id=p_match and user_id=uid and role in('primary','operator') and revoked_at is null and expires_at>now()) then raise exception 'Analysis session access denied' using errcode='42501';end if;
 if p_state->>'period' is null or p_state->>'ms' is null or p_state->>'mode' is null then raise exception 'Analysis clock fields required';end if;
 if coalesce(p_state->>'videoUrl','')<>'' and (p_state->>'videoUrl' !~ '^https?://' or length(p_state->>'videoUrl')>2000) then raise exception 'Invalid video URL';end if;
 if jsonb_typeof(p_state) is distinct from 'object' or (p_state->>'period')::int not between 1 and 8 or (p_state->>'ms')::int not between 0 and 21600000 or p_state->>'mode' not in('live','video') then raise exception 'Invalid analysis clock';end if;
 perform pg_advisory_xact_lock(hashtextextended('stats-session:'||p_match::text||uid::text,0));
 select * into result from public.stats_sessions where match_id=p_match and user_id=uid for update;
 if coalesce(result.revision,0)<>p_expected then raise exception 'Session revision conflict' using errcode='40001';end if;
 insert into public.stats_sessions(match_id,user_id,state,revision) values(p_match,uid,p_state-'running',1)
 on conflict(match_id,user_id) do update set state=excluded.state,revision=public.stats_sessions.revision+1,updated_at=clock_timestamp() returning * into result;return result;
end $$;
create function public.stats_save_session(p_match uuid,p_state jsonb,p_expected int) returns public.stats_sessions language sql security invoker set search_path='' as $$ select app_private.stats_save_session(p_match,p_state,p_expected) $$;

create function app_private.stats_grant(p_grant jsonb) returns public.stats_assignments language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();mid uuid:=(p_grant->>'match_id')::uuid;result public.stats_assignments;old public.stats_assignments;cats text[];sides_list text[];players uuid[];target uuid:=(p_grant->>'user_id')::uuid;role_label text:=p_grant->>'role';expiry timestamptz:=(p_grant->>'expires_at')::timestamptz;begin
 if uid is null or not app_private.stats_can_manage(mid) then raise exception 'Assignment management denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stats:'||mid::text,0));
 select array_agg(value) into cats from jsonb_array_elements_text(coalesce(p_grant->'categories','[]'));select array_agg(value) into sides_list from jsonb_array_elements_text(coalesce(p_grant->'sides','[]'));select array_agg(value::uuid) into players from jsonb_array_elements_text(coalesce(p_grant->'player_ids','[]'));
 cats:=coalesce(cats,'{}');sides_list:=coalesce(sides_list,'{}');players:=coalesce(players,'{}');
 if role_label='primary' and not app_private.stats_club_manager(mid) then raise exception 'Only club management can appoint a principal';end if;
 if role_label='primary' and exists(select 1 from public.stats_assignments a where a.match_id=mid and a.role='primary' and a.revoked_at is null and a.expires_at>now() and a.id is distinct from nullif(p_grant->>'id','')::uuid) then raise exception 'Revoke the active principal before appointing another';end if;
 if expiry is null or expiry<=now() then raise exception 'Future expiry required';end if;
 if exists(select 1 from unnest(cats) c where not exists(select 1 from public.stats_actions a where a.category=c)) then raise exception 'Unknown category';end if;
 if exists(select 1 from unnest(players) p where not exists(select 1 from public.pilot_players x where x.id=p and x.match_id=mid and x.team=any(sides_list))) then raise exception 'Player scope mismatch';end if;
 if role_label='operator' and exists(select 1 from public.stats_assignments a where a.match_id=mid and a.role='operator' and a.revoked_at is null and a.expires_at>now() and a.categories&&cats and a.sides&&sides_list and (cardinality(a.player_ids)=0 or cardinality(players)=0 or a.player_ids&&players) and a.id is distinct from nullif(p_grant->>'id','')::uuid) then raise exception 'Recording scopes overlap; split categories, sides or players';end if;
 if nullif(p_grant->>'id','') is not null then
  select * into strict old from public.stats_assignments where id=(p_grant->>'id')::uuid and match_id=mid;
  if old.role='primary' and not app_private.stats_club_manager(mid) then raise exception 'Cannot modify a principal';end if;
  update public.stats_assignments set revoked_at=now() where id=old.id;
 end if;
 insert into public.stats_assignments(match_id,user_id,role,categories,sides,player_ids,expires_at,granted_by) values(mid,target,role_label,cats,sides_list,players,expiry,uid) returning * into result;
 insert into public.stats_access_audit(match_id,actor_id,previous,current) values(mid,uid,case when old.id is not null then to_jsonb(old) end,to_jsonb(result));return result;
end $$;
create function public.stats_grant(p_grant jsonb) returns public.stats_assignments language sql security invoker set search_path='' as $$ select app_private.stats_grant(p_grant) $$;
create function app_private.stats_revoke(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare old public.stats_assignments;uid uuid:=auth.uid();begin
 select * into strict old from public.stats_assignments where id=p_id;
 if uid is null or not app_private.stats_can_manage(old.match_id) or (old.role='primary' and not app_private.stats_club_manager(old.match_id)) then raise exception 'Revocation denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stats:'||old.match_id::text,0));
 update public.stats_assignments set revoked_at=now() where id=p_id;
 insert into public.stats_access_audit(match_id,actor_id,previous,current) values(old.match_id,uid,to_jsonb(old),to_jsonb(old)||jsonb_build_object('revoked_at',now()));
end $$;
create function public.stats_revoke(p_id uuid) returns void language sql security invoker set search_path='' as $$ select app_private.stats_revoke(p_id) $$;
create function app_private.stats_set_coverage(p_match uuid,p_side text,p_category text,p_complete boolean) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not app_private.stats_can_manage(p_match) then raise exception 'Coverage review requires principal' using errcode='42501';end if;
 if not exists(select 1 from public.stats_actions where category=p_category) then raise exception 'Unknown category';end if;
 insert into public.stats_coverage(match_id,side,category,complete,updated_by) values(p_match,p_side,p_category,p_complete,auth.uid())
 on conflict(match_id,side,category) do update set complete=excluded.complete,updated_by=excluded.updated_by,updated_at=clock_timestamp();
end $$;
create function public.stats_set_coverage(p_match uuid,p_side text,p_category text,p_complete boolean) returns void language sql security invoker set search_path='' as $$ select app_private.stats_set_coverage(p_match,p_side,p_category,p_complete) $$;
create function public.stats_access(p_match uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('read',app_private.stats_can_read(p_match),'manage',app_private.stats_can_manage(p_match),'club_manager',app_private.stats_club_manager(p_match))
$$;

-- Construct contexts ONLY from verified federation identifiers and current local
-- team entries, never from team/player names or inferred season dates.
insert into public.stats_matches(match_id,club_id,season_id,home_team_id,away_team_id,home_external_team_id,away_external_team_id)
 select s.match_id,c.club_id,c.season_id,
 max(e.club_team_id::text) filter(where e.external_team_id=s.official_data->>'home_team_id')::uuid,
 max(e.club_team_id::text) filter(where e.external_team_id=s.official_data->>'away_team_id')::uuid,
 s.official_data->>'home_team_id',s.official_data->>'away_team_id'
 from public.federation_match_sources s join public.federation_competitions c on c.federation=s.federation and c.external_competition_id=s.competition_id
 join public.seasons season on season.id=c.season_id
 join public.federation_team_entries e on e.competition_id=c.id and e.external_team_id in(s.official_data->>'home_team_id',s.official_data->>'away_team_id')
 join public.teams t on t.id=e.club_team_id and t.club_id=c.club_id and t.season_id=c.season_id
 where s.import_status='verified' and (e.raw_data->>'season_id'=s.season_id or (s.season_id='41' and season.label in('2026/27','2026/2027')))
 group by s.match_id,c.club_id,c.season_id,s.official_data on conflict(match_id) do nothing;

-- Future federation refreshes can add a context after an identity becomes
-- verified. This trigger never edits an existing context, observation or grant.
create function app_private.stats_context_from_source() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.import_status='verified' then
  insert into public.stats_matches(match_id,club_id,season_id,home_team_id,away_team_id,home_external_team_id,away_external_team_id)
  select new.match_id,c.club_id,c.season_id,
   max(e.club_team_id::text) filter(where e.external_team_id=new.official_data->>'home_team_id')::uuid,
   max(e.club_team_id::text) filter(where e.external_team_id=new.official_data->>'away_team_id')::uuid,
   new.official_data->>'home_team_id',new.official_data->>'away_team_id'
  from public.federation_competitions c join public.seasons s on s.id=c.season_id
  join public.federation_team_entries e on e.competition_id=c.id and e.external_team_id in(new.official_data->>'home_team_id',new.official_data->>'away_team_id')
  join public.teams t on t.id=e.club_team_id and t.club_id=c.club_id and t.season_id=c.season_id
  where c.federation=new.federation and c.external_competition_id=new.competition_id and (e.raw_data->>'season_id'=new.season_id or (new.season_id='41' and s.label in('2026/27','2026/2027')))
  group by c.club_id,c.season_id on conflict(match_id) do nothing;
 end if;return new;
end $$;
revoke all on function app_private.stats_context_from_source() from public,anon,authenticated;
create trigger stats_context_after_verified_source after insert or update of official_data,import_status on public.federation_match_sources for each row execute function app_private.stats_context_from_source();

-- Newly prepared/imported matches can be registered by verified club managers;
-- this does not create membership or change the source tables.
create function app_private.stats_register_match(p_match uuid,p_team uuid) returns public.stats_matches language plpgsql security definer set search_path='' as $$
declare result public.stats_matches;t public.teams;src public.federation_match_sources;begin
 select * into strict t from public.teams where id=p_team;
 if auth.uid() is null or not (app_private.is_platform_superadmin() or app_private.has_club_role(t.club_id,array['admin','general_coordinator']) or app_private.has_team_role(t.id,array['section_coordinator'])) then raise exception 'Verified club management required' using errcode='42501';end if;
 select * into strict src from public.federation_match_sources where match_id=p_match and import_status='verified';
 if not exists(select 1 from public.federation_team_entries e join public.federation_competitions c on c.id=e.competition_id where e.club_team_id=p_team and c.federation=src.federation and c.external_competition_id=src.competition_id and c.season_id=t.season_id and e.external_team_id in(src.official_data->>'home_team_id',src.official_data->>'away_team_id')) then raise exception 'Federation team identity mismatch';end if;
 insert into public.stats_matches(match_id,club_id,season_id,home_team_id,away_team_id,home_external_team_id,away_external_team_id)
 select p_match,t.club_id,t.season_id,
 (select e.club_team_id from public.federation_team_entries e join public.federation_competitions c on c.id=e.competition_id where c.club_id=t.club_id and c.season_id=t.season_id and c.federation=src.federation and c.external_competition_id=src.competition_id and e.external_team_id=src.official_data->>'home_team_id' limit 1),
 (select e.club_team_id from public.federation_team_entries e join public.federation_competitions c on c.id=e.competition_id where c.club_id=t.club_id and c.season_id=t.season_id and c.federation=src.federation and c.external_competition_id=src.competition_id and e.external_team_id=src.official_data->>'away_team_id' limit 1),src.official_data->>'home_team_id',src.official_data->>'away_team_id'
 on conflict(match_id) do nothing;
 select * into strict result from public.stats_matches where match_id=p_match and club_id=t.club_id;return result;
end $$;
create function public.stats_register_match(p_match uuid,p_team uuid) returns public.stats_matches language sql security invoker set search_path='' as $$ select app_private.stats_register_match(p_match,p_team) $$;

-- Supabase Realtime retains RLS filtering; polling is also used after reconnects
-- and to recheck time-based access, which produces no change notification.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.stats_events,public.stats_assignments,public.stats_coverage;
 end if;
end $$;

-- No client can execute a SECURITY DEFINER function through the exposed schema.
-- Only these narrow, authenticated command functions are made available.
revoke all on function app_private.stats_club_manager(uuid),app_private.stats_can_manage(uuid),app_private.stats_can_read(uuid),app_private.stats_can_record(uuid,text,text,uuid),app_private.stats_write_event(jsonb,int),app_private.stats_save_session(uuid,jsonb,int),app_private.stats_grant(jsonb),app_private.stats_revoke(uuid),app_private.stats_set_coverage(uuid,text,text,boolean),app_private.stats_register_match(uuid,uuid) from public,anon;
grant execute on function app_private.stats_club_manager(uuid),app_private.stats_can_manage(uuid),app_private.stats_can_read(uuid),app_private.stats_can_record(uuid,text,text,uuid),app_private.stats_write_event(jsonb,int),app_private.stats_save_session(uuid,jsonb,int),app_private.stats_grant(jsonb),app_private.stats_revoke(uuid),app_private.stats_set_coverage(uuid,text,text,boolean),app_private.stats_register_match(uuid,uuid) to authenticated;
revoke all on function public.stats_write_event(jsonb,int),public.stats_save_session(uuid,jsonb,int),public.stats_grant(jsonb),public.stats_revoke(uuid),public.stats_set_coverage(uuid,text,text,boolean),public.stats_access(uuid),public.stats_register_match(uuid,uuid) from public,anon;
grant execute on function public.stats_write_event(jsonb,int),public.stats_save_session(uuid,jsonb,int),public.stats_grant(jsonb),public.stats_revoke(uuid),public.stats_set_coverage(uuid,text,text,boolean),public.stats_access(uuid),public.stats_register_match(uuid,uuid) to authenticated;

insert into public.stats_actions(code,label,category) values
('pass_complete','Passada completada','pass'),
('pass_failed','Passada fallada','pass'),
('pass_unknown','Passada · resultat desconegut','pass'),
('shot_target','Xut a porteria','shot'),
('shot_off','Xut fora','shot'),
('shot_blocked','Xut bloquejat','shot'),
('shot_unknown','Xut · resultat desconegut','shot'),
('goal','Gol','goal'),
('assist','Assistència','assist'),
('recovery','Recuperació','recovery'),
('loss','Pèrdua de pilota','loss'),
('foul','Falta comesa','foul'),
('foul_received','Falta rebuda','foul'),
('save','Aturada','goalkeeper'),
('save_block','Parada · blocatge','goalkeeper'),
('save_rebound','Parada · rebuig','goalkeeper'),
('save_stretch','Parada · estirada','goalkeeper'),
('goal_conceded','Gol encaixat','goalkeeper'),
('interception','Intercepció','defence'),
('block','Bloqueig defensiu','defence'),
('player_in','Entrada a pista','participation'),
('player_out','Sortida de pista','participation'),
('pass_key','Passada clau','construction'),
('shot_assist','Assistència de xut','construction'),
('receive_complete','Recepció correcta','construction'),
('receive_failed','Recepció fallada','construction'),
('pass_sequence','Seqüència de passades','construction'),
('offensive_entry','Entrada a zona ofensiva','attack'),
('chance','Ocasió clara de gol','attack'),
('chance_missed','Ocasió clara fallada','attack'),
('dribble_complete','Dríbling superat','attack'),
('dribble_failed','Dríbling fallat','attack'),
('offensive_block_complete','Bloqueig ofensiu efectiu','attack'),
('offensive_block_failed','Bloqueig ofensiu no efectiu','attack'),
('defence_complete','Acció defensiva superada','defence'),
('defence_failed','Acció defensiva fallada','defence'),
('duel_won','Duel defensiu guanyat','defence'),
('duel_lost','Duel defensiu perdut','defence'),
('defensive_entry','Entrada rival a zona defensiva','defence'),
('chance_conceded','Ocasió clara concedida','defence'),
('counterattack','Contraatac iniciat','transition'),
('counterattack_shot','Contraatac finalitzat amb xut','transition'),
('counterattack_participation','Participació en contraatac','transition'),
('press_exit_complete','Sortida de pressió superada','transition'),
('press_exit_failed','Sortida de pressió fallada','transition'),
('defensive_loss','Pèrdua en zona defensiva','transition'),
('build_loss','Pèrdua en sortida de pilota','transition'),
('possession_shot','Possessió acabada en xut','transition'),
('possession_loss','Possessió acabada en pèrdua','transition'),
('goalkeeper_target','Xut rebut a porteria','goalkeeper'),
('goalkeeper_rebound','Rebuig concedit','goalkeeper'),
('goalkeeper_second','Aturada amb segona intervenció','goalkeeper'),
('goalkeeper_exit_complete','Sortida de porteria correcta','goalkeeper'),
('goalkeeper_exit_failed','Sortida de porteria fallada','goalkeeper'),
('possession','Temps de possessió','possession');
