-- Prepared for review only. Do not apply to production without authorization.
-- Sporting age group is metadata, never a whitelist of competition/division names.
alter table public.teams add column age_group text check(age_group in('senior','junior','youth'));
alter table public.teams add column age_group_source text;
alter table public.teams add constraint team_age_group_evidence check(age_group is null or nullif(trim(age_group_source),'') is not null);

create function app_private.mode_context(p_catalogue uuid,p_match uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f public.federation_matches; c public.federation_competitions; sm public.stats_matches;
 mid uuid:=p_match; cid uuid; sid uuid; tids uuid[]; age text; principal boolean; allowed boolean; readable boolean;
begin
 if auth.uid() is null or (p_catalogue is null)=(p_match is null) then return jsonb_build_object('read',false,'base',false,'advanced',false);end if;
 if p_match is not null then
  select * into sm from public.stats_matches where match_id=p_match;
  if exists(select 1 from public.basic_match_contexts b join public.federation_match_sources s on s.match_id=b.pilot_match_id
   where b.pilot_match_id=p_match and s.official_data->>'calendar_match_id' is not null and s.official_data->>'calendar_match_id'<>b.catalogue_match_id::text) then
   return jsonb_build_object('read',false,'base',false,'advanced',false);end if;
  select m.* into f from public.federation_matches m where m.id=(select b.catalogue_match_id from public.basic_match_contexts b where b.pilot_match_id=p_match)
   or m.id::text=(select s.official_data->>'calendar_match_id' from public.federation_match_sources s where s.match_id=p_match) limit 1;
 else select * into f from public.federation_matches where id=p_catalogue;end if;
 if f.id is not null then
  select comp.* into c from public.federation_competitions comp join public.federation_groups g on g.competition_id=comp.id where g.id=f.group_id;
  cid:=c.club_id;sid:=c.season_id;
  select array_agg(distinct t.id) into tids from public.teams t join public.federation_team_entries e on e.club_team_id=t.id
   join public.federation_match_teams mt on mt.entry_id=e.id where mt.match_id=f.id and e.competition_id=c.id and t.club_id=cid and t.season_id=sid;
  if sm.match_id is not null and (sm.club_id<>cid or sm.season_id<>sid or not exists(select 1 from public.teams t where t.id=any(array[sm.home_team_id,sm.away_team_id]) and t.id=any(tids) and t.club_id=cid)) then
   return jsonb_build_object('read',false,'base',false,'advanced',false);end if;
  if mid is null then
   select b.pilot_match_id into mid from public.basic_match_contexts b where b.catalogue_match_id=f.id and not b.practice;
   if mid is null then select s.match_id into mid from public.federation_match_sources s where s.federation=c.federation and s.competition_id=c.external_competition_id
    and (s.official_data->>'calendar_match_id'=f.id::text or (f.external_match_id is not null and s.federation_match_id=f.external_match_id and s.season_id=split_part(f.match_fingerprint,':',2))) limit 1;end if;
  end if;
 elsif sm.match_id is not null then cid:=sm.club_id;sid:=sm.season_id;tids:=array_remove(array[sm.home_team_id,sm.away_team_id],null);
 else return jsonb_build_object('read',false,'base',false,'advanced',false);end if;
 if cid is null or coalesce(cardinality(tids),0)=0 then return jsonb_build_object('read',false,'base',false,'advanced',false);end if;
 principal:=app_private.is_platform_superadmin() or exists(select 1 from public.club_memberships m where m.user_id=auth.uid() and m.club_id=cid and m.team_id is null and m.role='general_coordinator');
 readable:=principal or exists(select 1 from public.club_memberships m where m.user_id=auth.uid() and m.club_id=cid and (m.team_id is null or m.team_id=any(tids)))
  or exists(select 1 from public.pilot_members m where m.match_id=mid and m.user_id=auth.uid())
  or exists(select 1 from public.stats_assignments a where a.match_id=mid and a.user_id=auth.uid() and a.revoked_at is null and a.expires_at>now());
 -- Unknown/conflicting evidence fails closed for ordinary Advanced access.
 select case when bool_or(t.age_group='youth') then 'youth' when bool_or(t.age_group is null or nullif(trim(t.age_group_source),'') is null) then 'unknown'
  when bool_or(t.age_group='junior') then 'junior' when bool_and(t.age_group='senior') then 'senior' else 'unknown' end into age
 from public.teams t where t.id=any(tids) and t.club_id=cid and t.season_id=sid;
 allowed:=principal or age in('senior','junior');
 return jsonb_build_object('read',readable,'base',readable,'advanced',readable and allowed,'age_group',coalesce(age,'unknown'),'privileged',principal,
  'club_id',cid,'season_id',sid,'catalogue_id',f.id,'operational',mid,'competition_id',c.external_competition_id,'federation',c.federation,
  'finalized',coalesce(f.raw_data->>'report_status'='verified' and upper(trim(f.raw_data#>>'{report_data,official_status}'))='FINALIZAT',false));
end $$;

create function app_private.match_advanced_allowed(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((app_private.mode_context(null,p_match)->>'advanced')::boolean,false)
$$;
-- Keep every previous assignment/role condition, adding a category gate. Old
-- implementations are private, not callable as bypasses by authenticated users.
alter function app_private.stats_club_manager(uuid) rename to stats_club_manager_before_modes;
alter function app_private.stats_can_manage(uuid) rename to stats_can_manage_before_modes;
alter function app_private.stats_can_read(uuid) rename to stats_can_read_before_modes;
alter function app_private.stats_can_record(uuid,text,text,uuid) rename to stats_can_record_before_modes;
alter function app_private.pilot_can_prepare(uuid) rename to pilot_can_prepare_before_modes;
revoke all on function app_private.stats_club_manager_before_modes(uuid),app_private.stats_can_manage_before_modes(uuid),app_private.stats_can_read_before_modes(uuid),app_private.stats_can_record_before_modes(uuid,text,text,uuid),app_private.pilot_can_prepare_before_modes(uuid) from public,anon,authenticated;
create function app_private.stats_club_manager(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$select app_private.match_advanced_allowed(p_match) and app_private.stats_club_manager_before_modes(p_match)$$;
create function app_private.stats_can_manage(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$select app_private.match_advanced_allowed(p_match) and app_private.stats_can_manage_before_modes(p_match)$$;
create function app_private.stats_can_read(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$select app_private.match_advanced_allowed(p_match) and app_private.stats_can_read_before_modes(p_match)$$;
create function app_private.stats_can_record(p_match uuid,p_action text,p_side text,p_player uuid) returns boolean language sql stable security definer set search_path='' as $$select app_private.match_advanced_allowed(p_match) and app_private.stats_can_record_before_modes(p_match,p_action,p_side,p_player)$$;
create function app_private.pilot_can_prepare(p_match uuid) returns boolean language sql stable security definer set search_path='' as $$select app_private.match_advanced_allowed(p_match) and app_private.pilot_can_prepare_before_modes(p_match)$$;
-- Policies store function OIDs: renaming alone would leave them bound to the
-- previous implementation. Rebind every affected existing policy to the gate.
do $$declare p record; command text;begin
 for p in select * from pg_policies where schemaname='public' and (coalesce(qual,'') like '%_before_modes(%' or coalesce(with_check,'') like '%_before_modes(%') loop
  command:=format('alter policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  if p.qual is not null then command:=command||' using ('||replace(p.qual,'_before_modes(','(')||')';end if;
  if p.with_check is not null then command:=command||' with check ('||replace(p.with_check,'_before_modes(','(')||')';end if;
  execute command;
 end loop;
end$$;

create function app_private.mode_operator_eligible(p_context jsonb) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce((p_context->>'read')::boolean,false) and (
 coalesce((p_context->>'privileged')::boolean,false)
 or exists(select 1 from public.pilot_members m where m.match_id=(p_context->>'operational')::uuid and m.user_id=auth.uid() and m.role='operator') or exists(
 select 1 from public.pilot_members m join public.federation_match_sources s on s.match_id=m.match_id join public.stats_matches sm on sm.match_id=m.match_id
 where m.user_id=auth.uid() and m.role='operator' and sm.club_id=(p_context->>'club_id')::uuid and sm.season_id=(p_context->>'season_id')::uuid
 and s.federation=p_context->>'federation' and s.competition_id=p_context->>'competition_id'))
$$;
create function app_private.match_mode_access(p_catalogue uuid,p_match uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb:=app_private.mode_context(p_catalogue,p_match); mid uuid:=(ctx->>'operational')::uuid; opread boolean; activate boolean;
begin
 if not coalesce((ctx->>'read')::boolean,false) then return jsonb_build_object('read',false,'base',false,'advanced',false,'operational_read',false,'activate_base',false,'activate_advanced',false);end if;
 opread:=mid is not null and (app_private.is_platform_superadmin() or exists(select 1 from public.pilot_members m where m.match_id=mid and m.user_id=auth.uid()) or app_private.stats_can_read(mid));
 activate:=app_private.mode_operator_eligible(ctx) and ctx->>'catalogue_id' is not null;
 return ctx||jsonb_build_object('operational_read',opread,'advanced_context_ready',exists(select 1 from public.stats_matches sm where sm.match_id=mid and sm.club_id=(ctx->>'club_id')::uuid and sm.season_id=(ctx->>'season_id')::uuid),'activate_base',activate,'activate_advanced',activate and (ctx->>'advanced')::boolean);
end $$;
create function public.match_mode_access(p_catalogue uuid default null,p_match uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.match_mode_access(p_catalogue,p_match)$$;

-- An official record shared with Base is not an authorization to issue Advanced
-- clocks or statistical commands. Preserve Base's existing event shapes.
create function app_private.mode_basic_payload(p_payload jsonb,p_type text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_payload#>>'{details,origin}'='basic' and (p_payload->>'kind') in('basic_participants','basic_finished','basic_reopened','gol','groga','blava','vermella','correction')
 and (p_type='correction' or p_type=case p_payload->>'kind' when 'gol' then 'goal' when 'blava' then 'card_blue' when 'vermella' then 'card_red' else 'note' end),false)
$$;
-- A bounded definer avoids recursive RLS when checking a correction's target.
create function app_private.mode_basic_correction_target(p_match uuid,p_related uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.pilot_members m where m.match_id=p_match and m.user_id=auth.uid() and m.role='operator')
 and exists(select 1 from public.pilot_events prior where prior.id=p_related and prior.match_id=p_match
 and prior.payload#>>'{details,origin}'='basic' and prior.payload->>'kind' in('gol','groga','blava','vermella'))
$$;
create policy pilot_event_mode_gate on public.pilot_events as restrictive for insert to authenticated with check(app_private.match_advanced_allowed(match_id) or
 (app_private.mode_basic_payload(payload,event_type) and (event_type<>'correction' or (payload->>'kind'='correction' and app_private.mode_basic_correction_target(match_id,related_event_id)))));
create policy pilot_state_mode_insert on public.pilot_operator_state as restrictive for insert to authenticated with check(app_private.match_advanced_allowed(match_id));
create policy pilot_state_mode_update on public.pilot_operator_state as restrictive for update to authenticated using(app_private.match_advanced_allowed(match_id)) with check(app_private.match_advanced_allowed(match_id));
create function app_private.mode_basic_calendar_ready(p_match uuid,p_payload jsonb,p_type text) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.mode_basic_payload(p_payload,p_type) and exists(
 select 1 from public.pilot_members member join public.federation_match_sources s on s.match_id=member.match_id
 join public.basic_match_contexts b on b.pilot_match_id=s.match_id join public.federation_matches f on f.id=b.catalogue_match_id
 join public.federation_groups g on g.id=f.group_id join public.federation_competitions c on c.id=g.competition_id
 join public.stats_matches sm on sm.match_id=s.match_id
 where member.match_id=p_match and member.user_id=auth.uid() and member.role='operator'
 and s.import_status='pending' and s.official_data->>'source_kind'='verified_calendar' and s.official_data->>'calendar_match_id'=f.id::text
 and s.official_data->>'calendar_fingerprint'=f.match_fingerprint and c.club_id=sm.club_id and c.season_id=sm.season_id
 and c.federation=s.federation and c.external_competition_id=s.competition_id and split_part(f.match_fingerprint,':',2)=s.season_id
 and f.raw_data->>'home_team_id'=sm.home_external_team_id and f.raw_data->>'away_team_id'=sm.away_external_team_id)
$$;
do $$declare original text;begin
 select with_check into strict original from pg_policies where schemaname='public' and tablename='pilot_events' and policyname='pilot_events_direct_club_fixture';
 execute format('alter policy pilot_events_direct_club_fixture on public.pilot_events with check ((%s) or app_private.mode_basic_calendar_ready(match_id,payload,event_type))',original);
end$$;

-- Explicit command only: never called by navigation or capability reads.
create function app_private.match_activate_catalogue(p_catalogue uuid,p_mode text,p_practice boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare ctx jsonb:=app_private.mode_context(p_catalogue,null); actor uuid:=auth.uid(); f public.federation_matches; c public.federation_competitions;
 target uuid; ht uuid; atid uuid; old public.stats_matches; src public.federation_match_sources;
begin
 if p_mode not in('base','advanced') or p_mode is null or p_practice is null then raise exception 'Valid mode and practice flag required' using errcode='22023';end if;
 if not app_private.mode_operator_eligible(ctx) or (p_mode='advanced' and not coalesce((ctx->>'advanced')::boolean,false)) then raise exception 'Match activation denied' using errcode='42501';end if;
 select * into strict f from public.federation_matches where id=p_catalogue;
 select comp.* into strict c from public.federation_competitions comp join public.federation_groups g on g.competition_id=comp.id where g.id=f.group_id;
 if c.federation not in('FECAPA','RFEP') or nullif(f.raw_data->>'home_team_id','') is null or nullif(f.raw_data->>'away_team_id','') is null or nullif(f.match_fingerprint,'') is null or split_part(f.match_fingerprint,':',2)='' then raise exception 'Verified calendar identity required' using errcode='22023';end if;
 if (ctx->>'finalized')::boolean and not p_practice then raise exception 'Finalized official match: explicit separate analysis required' using errcode='22023';end if;
 if p_practice and coalesce(f.raw_data->>'report_status','')<>'verified' then raise exception 'Verified report required for separate analysis' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('basic:'||p_catalogue::text||':'||case when p_practice then actor::text else 'live' end,0));
 select b.pilot_match_id into target from public.basic_match_contexts b where b.catalogue_match_id=f.id and b.practice=p_practice and (not p_practice or b.owner_id=actor);
 if target is null and not p_practice then target:=(ctx->>'operational')::uuid;end if;
 if target is null then
  target:=case when p_practice then gen_random_uuid() else f.id end;
  if exists(select 1 from public.pilot_matches where id=target) then raise exception 'Existing record needs explicit linkage' using errcode='23505';end if;
  insert into public.pilot_matches(id,title,home_team,away_team,starts_at,status) values(target,case when p_practice then 'ANÀLISI SEPARADA · ' else '' end||f.home_team||' – '||f.away_team,f.home_team,f.away_team,f.federation_start_at,'scheduled');
 end if;
 if not exists(select 1 from public.basic_match_contexts where pilot_match_id=target) then insert into public.basic_match_contexts(catalogue_match_id,pilot_match_id,owner_id,practice) values(f.id,target,actor,p_practice);end if;
 select e.club_team_id into ht from public.federation_match_teams mt join public.federation_team_entries e on e.id=mt.entry_id join public.teams t on t.id=e.club_team_id where mt.match_id=f.id and mt.side='home' and e.competition_id=c.id and t.club_id=c.club_id and t.season_id=c.season_id;
 select e.club_team_id into atid from public.federation_match_teams mt join public.federation_team_entries e on e.id=mt.entry_id join public.teams t on t.id=e.club_team_id where mt.match_id=f.id and mt.side='away' and e.competition_id=c.id and t.club_id=c.club_id and t.season_id=c.season_id;
 if ht is null and atid is null then raise exception 'Club participant required' using errcode='42501';end if;
 insert into public.stats_matches(match_id,club_id,season_id,home_team_id,away_team_id,home_external_team_id,away_external_team_id) values(target,c.club_id,c.season_id,ht,atid,f.raw_data->>'home_team_id',f.raw_data->>'away_team_id') on conflict(match_id) do nothing;
 select * into strict old from public.stats_matches where match_id=target;
 if old.club_id<>c.club_id or old.season_id<>c.season_id or old.home_team_id is distinct from ht or old.away_team_id is distinct from atid or old.home_external_team_id is distinct from f.raw_data->>'home_team_id' or old.away_external_team_id is distinct from f.raw_data->>'away_team_id' then raise exception 'Existing statistics context differs: review required' using errcode='23505';end if;
 insert into public.federation_match_sources(match_id,federation,federation_match_id,competition_id,season_id,federation_url,home_name,away_name,import_status,automatic_enabled,official_data)
 values(target,c.federation,f.external_match_id,c.external_competition_id,split_part(f.match_fingerprint,':',2),f.raw_data->>'source_url',f.home_team,f.away_team,'pending',false,
 jsonb_build_object('source_kind','verified_calendar','data_layer','public_federation','calendar_match_id',f.id,'calendar_fingerprint',f.match_fingerprint,'home_team_id',f.raw_data->>'home_team_id','away_team_id',f.raw_data->>'away_team_id','home_score',f.home_score,'away_score',f.away_score,'separate_analysis',p_practice)) on conflict(match_id) do nothing;
 select * into strict src from public.federation_match_sources where match_id=target;
 if src.federation<>c.federation or src.competition_id<>c.external_competition_id or src.season_id<>split_part(f.match_fingerprint,':',2) then raise exception 'Existing source differs: review required' using errcode='23505';end if;
 insert into public.pilot_members(match_id,user_id,role) values(target,actor,'operator') on conflict(match_id,user_id) do nothing;
 if not exists(select 1 from public.pilot_members where match_id=target and user_id=actor and role='operator') then raise exception 'Existing non-operator role requires separate authorization' using errcode='42501';end if;
 return target;
end $$;
create function public.match_activate_catalogue(p_catalogue uuid,p_mode text,p_practice boolean default false) returns uuid language sql security invoker set search_path='' as $$ select app_private.match_activate_catalogue(p_catalogue,p_mode,p_practice) $$;

revoke all on function app_private.mode_context(uuid,uuid),app_private.mode_operator_eligible(jsonb) from public,anon,authenticated;
revoke all on function app_private.mode_basic_correction_target(uuid,uuid) from public,anon;
grant execute on function app_private.mode_basic_correction_target(uuid,uuid) to authenticated;
revoke all on function public.match_mode_access(uuid,uuid),public.match_activate_catalogue(uuid,text,boolean),app_private.match_mode_access(uuid,uuid),app_private.match_activate_catalogue(uuid,text,boolean),app_private.match_advanced_allowed(uuid),app_private.mode_basic_payload(jsonb,text),app_private.mode_basic_calendar_ready(uuid,jsonb,text) from public,anon;
grant execute on function public.match_mode_access(uuid,uuid),public.match_activate_catalogue(uuid,text,boolean),app_private.match_mode_access(uuid,uuid),app_private.match_activate_catalogue(uuid,text,boolean),app_private.match_advanced_allowed(uuid),app_private.mode_basic_payload(jsonb,text),app_private.mode_basic_calendar_ready(uuid,jsonb,text) to authenticated;
revoke all on function app_private.stats_club_manager(uuid),app_private.stats_can_manage(uuid),app_private.stats_can_read(uuid),app_private.stats_can_record(uuid,text,text,uuid),app_private.pilot_can_prepare(uuid) from public,anon;
grant execute on function app_private.stats_club_manager(uuid),app_private.stats_can_manage(uuid),app_private.stats_can_read(uuid),app_private.stats_can_record(uuid,text,text,uuid),app_private.pilot_can_prepare(uuid) to authenticated;
