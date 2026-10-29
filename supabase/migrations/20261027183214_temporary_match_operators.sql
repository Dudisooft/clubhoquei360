-- Additive, review-only authorization. No existing grants, roles or sports rows change.
create table public.match_temporary_operators(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,request_hash text not null,
 club_id uuid not null references public.clubs(id),team_id uuid not null references public.teams(id),
 match_id uuid not null references public.stats_matches(match_id),user_id uuid not null references auth.users(id),
 mode text not null default 'advanced' check(mode='advanced'),
 starts_at timestamptz not null,expires_at timestamptz not null,
 actions text[] not null check(cardinality(actions)>0 and array_position(actions,null) is null),
 sides text[] not null check(cardinality(sides)>0 and sides <@ array['home','away','disputed']::text[] and array_position(sides,null) is null),
 player_ids uuid[] not null default '{}',
 permissions text[] not null default array['match_read','stats_record','analysis_session'] check(permissions=array['match_read','stats_record','analysis_session']::text[]),
 granted_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 revoked_at timestamptz,revoked_by uuid references auth.users(id),
 check(isfinite(starts_at) and isfinite(expires_at) and expires_at>starts_at and expires_at<=starts_at+interval '168 hours'),
 check((revoked_at is null)=(revoked_by is null))
);
create index temporary_operator_user_match on public.match_temporary_operators(user_id,match_id,expires_at) where revoked_at is null;
create index temporary_operator_match on public.match_temporary_operators(match_id);
create table public.match_temporary_operator_audit(
 id uuid primary key default gen_random_uuid(),grant_id uuid not null references public.match_temporary_operators(id),
 match_id uuid not null references public.stats_matches(match_id),actor_id uuid not null references auth.users(id),
 operation text not null check(operation in('granted','revoked')),at timestamptz not null default clock_timestamp(),previous jsonb,current jsonb not null
);
create index temporary_audit_match on public.match_temporary_operator_audit(match_id);
alter table public.match_temporary_operators enable row level security;
alter table public.match_temporary_operator_audit enable row level security;

create function app_private.temporary_can_manage(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.stats_matches sm where sm.match_id=p_match and
 (app_private.is_platform_superadmin() or exists(select 1 from public.club_memberships m where m.user_id=auth.uid() and m.club_id=sm.club_id and m.role='general_coordinator' and m.team_id is null)))
$$;
create function app_private.temporary_active(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.match_temporary_operators a join public.stats_matches sm on sm.match_id=a.match_id
 join public.teams t on t.id=a.team_id and t.club_id=a.club_id and t.season_id=sm.season_id
 where a.match_id=p_match and a.user_id=auth.uid() and a.club_id=sm.club_id and a.team_id in(sm.home_team_id,sm.away_team_id)
 and a.revoked_at is null and a.starts_at<=clock_timestamp() and a.expires_at>clock_timestamp()
 and app_private.mode_context(null,p_match)->>'club_id'=a.club_id::text and app_private.mode_context(null,p_match)->>'operational'=p_match::text)
$$;
create policy temporary_operator_read on public.match_temporary_operators for select to authenticated using(user_id=(select auth.uid()) or app_private.temporary_can_manage(match_id));
create policy temporary_operator_audit_read on public.match_temporary_operator_audit for select to authenticated using(app_private.temporary_can_manage(match_id));
revoke all on public.match_temporary_operators,public.match_temporary_operator_audit from public,anon,authenticated;
grant select on public.match_temporary_operators,public.match_temporary_operator_audit to authenticated;

create function app_private.temporary_summary(p_match uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('id',a.id,'active',app_private.temporary_active(p_match),'starts_at',a.starts_at,'expires_at',a.expires_at,
 'status',case when a.revoked_at is not null then 'revoked' when a.expires_at<=statement_timestamp() then 'expired' when a.starts_at>statement_timestamp() then 'scheduled' else 'active' end,
 'actions',a.actions,'sides',a.sides,'player_ids',a.player_ids,'team_id',a.team_id,'permissions',a.permissions)
 from public.match_temporary_operators a where a.match_id=p_match and a.user_id=auth.uid()
 order by (a.revoked_at is null and a.starts_at<=clock_timestamp() and a.expires_at>clock_timestamp()) desc,a.created_at desc,a.id desc limit 1),'null'::jsonb)
$$;
create function app_private.temporary_grant(p_grant jsonb) returns public.match_temporary_operators language plpgsql security definer set search_path='' as $$
declare mid uuid:=(p_grant->>'match_id')::uuid; target uuid:=(p_grant->>'user_id')::uuid; tid uuid:=(p_grant->>'team_id')::uuid;
 rid uuid:=(p_grant->>'request_id')::uuid; ctx public.stats_matches; result public.match_temporary_operators;
 starts timestamptz:=coalesce((p_grant->>'starts_at')::timestamptz,statement_timestamp()); ends timestamptz;
 codes text[]; sides_list text[]; persons uuid[]; hash text;begin
 if not app_private.temporary_can_manage(mid) then raise exception 'Temporary authorization management denied' using errcode='42501';end if;
 if exists(select 1 from jsonb_object_keys(p_grant) k where k not in('match_id','club_id','team_id','user_id','request_id','starts_at','expires_at','actions','sides','player_ids','mode')) then raise exception 'Unsupported authorization fields' using errcode='22023';end if;
 if rid is null or target is null or tid is null or coalesce(p_grant->>'mode','advanced')<>'advanced' then raise exception 'Authenticated target, team and request UUID required' using errcode='22023';end if;
 select * into strict ctx from public.stats_matches where match_id=mid;
 if not coalesce((app_private.mode_context(null,mid)->>'read')::boolean,false) then raise exception 'Canonical match context verification required' using errcode='42501';end if;
 if p_grant->>'club_id' is distinct from ctx.club_id::text or not exists(select 1 from public.teams t where t.id=tid and t.club_id=ctx.club_id and t.season_id=ctx.season_id and tid in(ctx.home_team_id,ctx.away_team_id)) then raise exception 'Club/team/match mismatch' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=target) then raise exception 'Existing authenticated account required' using errcode='22023';end if;
 ends:=coalesce((p_grant->>'expires_at')::timestamptz,starts+interval '24 hours');
 if not isfinite(starts) or not isfinite(ends) or ends<=starts or ends<=statement_timestamp() or ends>starts+interval '168 hours' then raise exception 'Finite authorization of at most 168 hours required' using errcode='22023';end if;
 select coalesce(array_agg(distinct value order by value),'{}') into codes from jsonb_array_elements_text(coalesce(p_grant->'actions','[]'));
 select coalesce(array_agg(distinct value order by value),'{}') into sides_list from jsonb_array_elements_text(coalesce(p_grant->'sides','["home","away","disputed"]'));
 select coalesce(array_agg(distinct value::uuid order by value::uuid),'{}') into persons from jsonb_array_elements_text(coalesce(p_grant->'player_ids','[]'));
 if cardinality(codes)=0 or cardinality(sides_list)=0 or not sides_list <@ array['home','away','disputed']::text[] or exists(select 1 from unnest(codes) requested(code) where not exists(select 1 from public.stats_actions s where s.code=requested.code)) then raise exception 'Valid explicit statistical actions and sides required' using errcode='22023';end if;
 if exists(select 1 from unnest(persons) person where not exists(select 1 from public.pilot_players p where p.id=person and p.match_id=mid and p.team=any(sides_list))) then raise exception 'Player scope mismatch' using errcode='42501';end if;
 hash:=md5(jsonb_build_object('match',mid,'club',ctx.club_id,'team',tid,'user',target,'start',p_grant->'starts_at','end',p_grant->'expires_at','actions',codes,'sides',sides_list,'players',persons)::text);
 perform pg_advisory_xact_lock(hashtextextended('temporary:'||mid::text,0));
 select * into result from public.match_temporary_operators where request_id=rid;
 if found then if result.granted_by<>auth.uid() or result.request_hash<>hash then raise exception 'Authorization request UUID reused' using errcode='23505';end if;return result;end if;
 if exists(select 1 from public.match_temporary_operators a where a.match_id=mid and a.revoked_at is null and a.starts_at<ends and a.expires_at>starts and
 (a.user_id=target or (a.actions&&codes and a.sides&&sides_list and (cardinality(a.player_ids)=0 or cardinality(persons)=0 or a.player_ids&&persons))))
 or exists(select 1 from public.stats_assignments a where a.match_id=mid and a.user_id<>target and a.role='operator' and a.revoked_at is null and a.expires_at>starts and a.created_at<ends and a.sides&&sides_list
 and exists(select 1 from public.stats_actions s where s.code=any(codes) and s.category=any(a.categories)) and (cardinality(a.player_ids)=0 or cardinality(persons)=0 or a.player_ids&&persons)) then raise exception 'Statistical recording scopes overlap' using errcode='23P01';end if;
 insert into public.match_temporary_operators(request_id,request_hash,club_id,team_id,match_id,user_id,starts_at,expires_at,actions,sides,player_ids,granted_by)
 values(rid,hash,ctx.club_id,tid,mid,target,starts,ends,codes,sides_list,persons,auth.uid()) returning * into result;
 insert into public.match_temporary_operator_audit(grant_id,match_id,actor_id,operation,current) values(result.id,mid,auth.uid(),'granted',to_jsonb(result));return result;
end $$;
create function app_private.temporary_revoke(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare old public.match_temporary_operators; result public.match_temporary_operators;begin
 select * into strict old from public.match_temporary_operators where id=p_id;
 if not app_private.temporary_can_manage(old.match_id) then raise exception 'Temporary revocation denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('temporary:'||old.match_id::text,0));
 select * into strict old from public.match_temporary_operators where id=p_id for update;
 if old.revoked_at is not null then return;end if;
 update public.match_temporary_operators set revoked_at=clock_timestamp(),revoked_by=auth.uid() where id=p_id returning * into result;
 insert into public.match_temporary_operator_audit(grant_id,match_id,actor_id,operation,previous,current) values(p_id,old.match_id,auth.uid(),'revoked',to_jsonb(old),to_jsonb(result));
end $$;
create function public.match_temporary_grant(p_grant jsonb) returns public.match_temporary_operators language sql security invoker set search_path='' as $$select app_private.temporary_grant(p_grant)$$;
create function public.match_temporary_revoke(p_id uuid) returns void language sql security invoker set search_path='' as $$select app_private.temporary_revoke(p_id)$$;
create function app_private.temporary_list(p_match uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('match_title',m.title,'team_name',t.name,'status',case when a.revoked_at is not null then 'revoked' when a.expires_at<=statement_timestamp() then 'expired' when a.starts_at>statement_timestamp() then 'scheduled' else 'active' end) order by a.created_at desc),'[]'::jsonb)
 from public.match_temporary_operators a join public.pilot_matches m on m.id=a.match_id join public.teams t on t.id=a.team_id
 where auth.uid() is not null and (p_match is null and a.user_id=auth.uid() or p_match=a.match_id and (a.user_id=auth.uid() or app_private.temporary_can_manage(p_match)))
$$;
create function public.match_temporary_list(p_match uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.temporary_list(p_match)$$;

-- Statistical exception only. Keep match_advanced_allowed/mode_context and all
-- official-write, Base, roster and activation guards from 3A unchanged.
create or replace function app_private.stats_can_read(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$select (app_private.match_advanced_allowed(p_match) and app_private.stats_can_read_before_modes(p_match)) or app_private.temporary_active(p_match)$$;
create or replace function app_private.stats_can_record(p_match uuid,p_action text,p_side text,p_player uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 (app_private.match_advanced_allowed(p_match) and app_private.stats_can_record_before_modes(p_match,p_action,p_side,p_player)) or
 (app_private.temporary_active(p_match) and exists(select 1 from public.match_temporary_operators a where a.match_id=p_match and a.user_id=auth.uid() and a.revoked_at is null and a.starts_at<=clock_timestamp() and a.expires_at>clock_timestamp() and p_action=any(a.actions) and p_side=any(a.sides) and (cardinality(a.player_ids)=0 or p_player=any(a.player_ids)))
 and not exists(select 1 from public.stats_assignments a join public.stats_actions s on s.category=any(a.categories) where a.match_id=p_match and a.user_id<>auth.uid() and a.role='operator' and a.revoked_at is null and a.expires_at>clock_timestamp() and s.code=p_action and p_side=any(a.sides) and (cardinality(a.player_ids)=0 or p_player=any(a.player_ids)))))
 and not exists(select 1 from public.match_temporary_operators a where a.match_id=p_match and a.user_id<>auth.uid() and a.revoked_at is null and a.starts_at<=clock_timestamp() and a.expires_at>clock_timestamp() and p_action=any(a.actions) and p_side=any(a.sides) and (cardinality(a.player_ids)=0 or p_player=any(a.player_ids)))
$$;
alter function app_private.stats_write_event(jsonb,int) rename to stats_write_event_before_temporary;
revoke all on function app_private.stats_write_event_before_temporary(jsonb,int) from public,anon,authenticated;
create function app_private.stats_write_event(p_event jsonb,p_expected int) returns public.stats_events language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended('temporary:'||(p_event->>'match_id'),0));
 if app_private.temporary_active((p_event->>'match_id')::uuid) and not (app_private.match_advanced_allowed((p_event->>'match_id')::uuid) and app_private.stats_can_record_before_modes((p_event->>'match_id')::uuid,p_event->>'action',p_event->>'side',(p_event->>'player_id')::uuid)) and (p_event->>'source_event_id' is not null or coalesce(p_event->>'origin','') not in('live','video')) then raise exception 'Temporary access is statistical observations only' using errcode='42501';end if;
 if app_private.temporary_active((p_event->>'match_id')::uuid) and not (app_private.match_advanced_allowed((p_event->>'match_id')::uuid) and app_private.stats_can_record_before_modes((p_event->>'match_id')::uuid,p_event->>'action',p_event->>'side',(p_event->>'player_id')::uuid)) and p_event->>'assist_player_id' is not null
 and not app_private.stats_can_record((p_event->>'match_id')::uuid,'assist',p_event->>'side',(p_event->>'assist_player_id')::uuid) then raise exception 'Assist outside temporary scope' using errcode='42501';end if;
 if app_private.temporary_active((p_event->>'match_id')::uuid) and not (app_private.match_advanced_allowed((p_event->>'match_id')::uuid) and app_private.stats_can_record_before_modes((p_event->>'match_id')::uuid,p_event->>'action',p_event->>'side',(p_event->>'player_id')::uuid))
 and exists(select 1 from public.stats_events e where e.id=(p_event->>'id')::uuid and e.match_id=(p_event->>'match_id')::uuid and e.assist_player_id is not null and not app_private.stats_can_record(e.match_id,'assist',e.side,e.assist_player_id)) then raise exception 'Existing assist outside temporary scope' using errcode='42501';end if;
 return app_private.stats_write_event_before_temporary(p_event,p_expected);
end $$;
create or replace function public.stats_write_event(p_event jsonb,p_expected int default 0) returns public.stats_events language sql security invoker set search_path='' as $$select app_private.stats_write_event(p_event,p_expected)$$;

-- Prevent later legacy operator assignments from colliding with reserved
-- temporary scopes. Existing assignment rows remain untouched.
alter function app_private.stats_grant(jsonb) rename to stats_grant_before_temporary;
revoke all on function app_private.stats_grant_before_temporary(jsonb) from public,anon,authenticated;
create function app_private.stats_grant(p_grant jsonb) returns public.stats_assignments language plpgsql security definer set search_path='' as $$
declare mid uuid:=(p_grant->>'match_id')::uuid;begin
 if not app_private.stats_can_manage(mid) then raise exception 'Assignment management denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('temporary:'||mid::text,0));
 if p_grant->>'role'='operator' and exists(select 1 from public.match_temporary_operators a where a.match_id=mid and a.revoked_at is null and a.expires_at>clock_timestamp() and a.starts_at<(p_grant->>'expires_at')::timestamptz
 and exists(select 1 from public.stats_actions s where s.code=any(a.actions) and s.category in(select jsonb_array_elements_text(p_grant->'categories')))
 and a.sides&&array(select jsonb_array_elements_text(p_grant->'sides'))
 and (cardinality(a.player_ids)=0 or jsonb_array_length(coalesce(p_grant->'player_ids','[]'))=0 or a.player_ids&&array(select jsonb_array_elements_text(p_grant->'player_ids')::uuid))) then raise exception 'Statistical recording scopes overlap' using errcode='23P01';end if;
 return app_private.stats_grant_before_temporary(p_grant);
end $$;
create or replace function public.stats_grant(p_grant jsonb) returns public.stats_assignments language sql security invoker set search_path='' as $$select app_private.stats_grant(p_grant)$$;
revoke all on function app_private.stats_grant(jsonb) from public,anon;
grant execute on function app_private.stats_grant(jsonb) to authenticated;

create function app_private.temporary_access_summary(p_match uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('read',app_private.stats_can_read(p_match),'manage',app_private.stats_can_manage(p_match),'club_manager',app_private.stats_club_manager(p_match),
 'temporary',app_private.temporary_summary(p_match),'temporary_manage',app_private.temporary_can_manage(p_match),'temporary_max_hours',168,'temporary_default_hours',24,
 'temporary_teams',case when app_private.temporary_can_manage(p_match) then (select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name)) from public.stats_matches sm join public.teams t on t.id in(sm.home_team_id,sm.away_team_id) and t.club_id=sm.club_id where sm.match_id=p_match) else '[]'::jsonb end)
$$;
create or replace function public.stats_access(p_match uuid) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.temporary_access_summary(p_match)$$;
alter function app_private.match_mode_access(uuid,uuid) rename to match_mode_access_before_temporary;
revoke all on function app_private.match_mode_access_before_temporary(uuid,uuid) from public,anon,authenticated;
create function app_private.match_mode_access(p_catalogue uuid,p_match uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb:=app_private.mode_context(p_catalogue,p_match); result jsonb:=app_private.match_mode_access_before_temporary(p_catalogue,p_match);mid uuid:=(ctx->>'operational')::uuid; temp jsonb;begin
 temp:=app_private.temporary_summary(mid);
 if app_private.temporary_active(mid) then result:=result||jsonb_build_object('read',true,'advanced',true,'operational',mid,'operational_read',true,'advanced_context_ready',true,'catalogue_id',ctx->'catalogue_id','activate_advanced',false,'temporary_stats_only',not app_private.match_advanced_allowed(mid));end if;
 return result||jsonb_build_object('temporary',temp);
end $$;
create or replace function public.match_mode_access(p_catalogue uuid default null,p_match uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.match_mode_access(p_catalogue,p_match)$$;

revoke all on function app_private.temporary_can_manage(uuid),app_private.temporary_active(uuid),app_private.temporary_summary(uuid),app_private.temporary_grant(jsonb),app_private.temporary_revoke(uuid),app_private.temporary_list(uuid),app_private.temporary_access_summary(uuid),app_private.stats_write_event(jsonb,int),app_private.match_mode_access(uuid,uuid),public.match_temporary_grant(jsonb),public.match_temporary_revoke(uuid),public.match_temporary_list(uuid) from public,anon;
grant execute on function app_private.temporary_can_manage(uuid),app_private.temporary_active(uuid),app_private.temporary_summary(uuid),app_private.temporary_grant(jsonb),app_private.temporary_revoke(uuid),app_private.temporary_list(uuid),app_private.temporary_access_summary(uuid),app_private.stats_write_event(jsonb,int),app_private.match_mode_access(uuid,uuid),public.match_temporary_grant(jsonb),public.match_temporary_revoke(uuid),public.match_temporary_list(uuid) to authenticated;

-- Preserve session CAS and validation; add the same finite statistical authorization.
create or replace function app_private.stats_save_session(p_match uuid,p_state jsonb,p_expected int) returns public.stats_sessions language plpgsql security definer set search_path='' as $$
declare result public.stats_sessions; uid uuid:=auth.uid();begin
 perform pg_advisory_xact_lock(hashtextextended('temporary:'||p_match::text,0));
 if uid is null or not app_private.stats_can_read(p_match) or (not app_private.temporary_active(p_match) and not exists(select 1 from public.stats_assignments where match_id=p_match and user_id=uid and role in('primary','operator') and revoked_at is null and expires_at>now())) then raise exception 'Analysis session access denied' using errcode='42501';end if;
 if p_expected is null or p_expected<0 then raise exception 'Expected session revision required' using errcode='22023';end if;
 if p_state->>'period' is null or p_state->>'ms' is null or p_state->>'mode' is null then raise exception 'Analysis clock fields required';end if;
 if coalesce(p_state->>'videoUrl','')<>'' and (p_state->>'videoUrl' !~ '^https?://' or length(p_state->>'videoUrl')>2000) then raise exception 'Invalid video URL';end if;
 if jsonb_typeof(p_state) is distinct from 'object' or (p_state->>'period')::int not between 1 and 8 or (p_state->>'ms')::int not between 0 and 21600000 or p_state->>'mode' not in('live','video') then raise exception 'Invalid analysis clock';end if;
 perform pg_advisory_xact_lock(hashtextextended('stats-session:'||p_match::text||uid::text,0));
 select * into result from public.stats_sessions where match_id=p_match and user_id=uid for update;
 if coalesce(result.revision,0)<>p_expected then raise exception 'Session revision conflict' using errcode='40001';end if;
 insert into public.stats_sessions(match_id,user_id,state,revision) values(p_match,uid,p_state-'running',1)
 on conflict(match_id,user_id) do update set state=excluded.state,revision=public.stats_sessions.revision+1,updated_at=clock_timestamp() returning * into result;return result;
end $$;
