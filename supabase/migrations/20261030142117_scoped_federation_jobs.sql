-- Opt-in, bounded queue. Scheduling/deployment must be reviewed separately.
begin;
create table public.federation_sync_scopes(
 id uuid primary key default gen_random_uuid(),club_id uuid not null references public.clubs(id),season_id uuid not null references public.seasons(id),competition_id uuid not null unique references public.federation_competitions(id),
 federation text not null check(federation in('FECAPA','RFEP')),external_club_id text not null check(external_club_id~'^[1-9][0-9]*$'),external_season_id text not null check(external_season_id~'^[1-9][0-9]*$'),
 interval_minutes integer not null default 360 check(interval_minutes between 60 and 10080),enabled boolean not null default false,
 next_due timestamptz not null default now(),lease_id uuid,locked_until timestamptz,attempts integer not null default 0,
 last_payload_hash text,last_status text,last_error text,last_finished_at timestamptz,last_counts jsonb,requested_by uuid,
 reviewed_by uuid,reviewed_at timestamptz
);
create table public.federation_sync_changes(id bigint generated always as identity primary key,scope_id uuid not null references public.federation_sync_scopes(id),at timestamptz not null default now(),status text not null,details jsonb not null default '{}');
alter table public.federation_sync_scopes enable row level security;alter table public.federation_sync_changes enable row level security;
revoke all on public.federation_sync_scopes,public.federation_sync_changes from public,anon,authenticated;
-- Secrets/leases and technical mutation are never visible to ordinary users.
grant select,insert,update on public.federation_sync_scopes,public.federation_sync_changes to service_role;
grant usage,select on sequence public.federation_sync_changes_id_seq to service_role;
create function public.federation_configure_club(p_club uuid,p_season uuid,p_federation text,p_external_club text,p_external_season text,p_interval integer default 360) returns integer language plpgsql security definer set search_path='' as $$declare n integer;begin
 if auth.uid() is null or not(app_private.is_platform_superadmin() or exists(select 1 from public.club_memberships where user_id=auth.uid() and club_id=p_club and team_id is null and role in('admin','general_coordinator'))) then raise exception 'Club administrator required' using errcode='42501';end if;
 if not exists(select 1 from public.seasons where id=p_season and club_id=p_club) then raise exception 'Season scope mismatch';end if;
 insert into public.federation_sync_scopes(club_id,season_id,competition_id,federation,external_club_id,external_season_id,interval_minutes,enabled,reviewed_by,reviewed_at)
 select p_club,p_season,c.id,p_federation,p_external_club,p_external_season,p_interval,true,auth.uid(),now() from public.federation_competitions c where c.club_id=p_club and c.season_id=p_season and c.federation=p_federation
 on conflict(competition_id) do update set external_club_id=excluded.external_club_id,external_season_id=excluded.external_season_id,interval_minutes=excluded.interval_minutes,enabled=true,reviewed_by=auth.uid(),reviewed_at=now();get diagnostics n=row_count;return n;
end$$;
create function public.federation_request_team_sync(p_team uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare n integer;configured integer;begin
 if not app_private.callup_team_allowed(p_team) then raise exception 'Team access denied' using errcode='42501';end if;
 select count(*) into configured from public.federation_sync_scopes s where s.enabled and exists(select 1 from public.federation_team_entries e where e.competition_id=s.competition_id and e.club_team_id=p_team);
 update public.federation_sync_scopes s set next_due=least(s.next_due,now()),requested_by=auth.uid() where s.enabled and (s.next_due<=now() or (coalesce(s.last_status,'')<>'failed' and coalesce(s.last_counts->>'source_blocked','false')<>'true')) and (s.last_finished_at is null or s.last_finished_at<now()-interval '15 minutes') and exists(select 1 from public.federation_team_entries e where e.competition_id=s.competition_id and e.club_team_id=p_team);get diagnostics n=row_count;return jsonb_build_object('queued',n>0,'configured',configured>0,'reason',case when configured=0 then 'unconfigured' when n=0 then 'cooldown' else 'queued' end);
end$$;
create function public.federation_team_sync_status(p_team uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not app_private.callup_team_allowed(p_team) then raise exception 'Team access denied' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('federation',s.federation,'competition',c.name,'source',case when s.federation='RFEP' then 'https://hockeypatines.fep.es' else 'https://www.hoqueipatins.fecapa.cat' end||'/league/'||c.external_competition_id,'last_finished_at',s.last_finished_at,'status',s.last_status,'error',s.last_error,'counts',s.last_counts,'next_due',s.next_due,'enabled',s.enabled)) from public.federation_sync_scopes s join public.federation_competitions c on c.id=s.competition_id where exists(select 1 from public.federation_team_entries e where e.competition_id=s.competition_id and e.club_team_id=p_team)),'[]');
end$$;
create function public.federation_claim_job() returns jsonb language plpgsql security invoker set search_path='' as $$declare job public.federation_sync_scopes;begin
 -- Discover newly linked catalogue competitions using one unambiguous reviewed club/season binding.
 insert into public.federation_sync_scopes(club_id,season_id,competition_id,federation,external_club_id,external_season_id,interval_minutes,enabled,reviewed_by,reviewed_at)
 select c.club_id,c.season_id,c.id,c.federation,b.external_club_id,b.external_season_id,b.interval_minutes,true,b.reviewed_by,b.reviewed_at from public.federation_competitions c join public.federation_sync_scopes b on b.club_id=c.club_id and b.season_id=c.season_id and b.federation=c.federation and b.enabled and b.reviewed_at is not null
 where not exists(select 1 from public.federation_sync_scopes other where other.club_id=b.club_id and other.season_id=b.season_id and other.federation=b.federation and (other.external_club_id<>b.external_club_id or other.external_season_id<>b.external_season_id))
 on conflict(competition_id) do nothing;
 select * into job from public.federation_sync_scopes where enabled and reviewed_at is not null and next_due<=now() and (locked_until is null or locked_until<now()) order by next_due,id limit 1 for update skip locked;
 if job.id is null then return null;end if;
 update public.federation_sync_scopes set lease_id=gen_random_uuid(),locked_until=now()+interval '10 minutes' where id=job.id returning * into job;
 return to_jsonb(job)||(select jsonb_build_object('external_competition_id',external_competition_id,'name',name,'season_label',(select label from public.seasons where id=job.season_id)) from public.federation_competitions where id=job.competition_id and club_id=job.club_id and season_id=job.season_id and federation=job.federation);
end$$;
create function public.federation_finish_job(p_scope uuid,p_lease uuid,p_ok boolean,p_details jsonb) returns void language plpgsql security invoker set search_path='' as $$declare job public.federation_sync_scopes;begin
 select * into strict job from public.federation_sync_scopes where id=p_scope and lease_id=p_lease and locked_until>now() for update;
 update public.federation_sync_scopes set last_finished_at=now(),last_status=case when p_ok then coalesce(p_details->>'status','success') else 'failed' end,last_payload_hash=case when p_ok then coalesce(p_details->>'payload_hash',last_payload_hash) else last_payload_hash end,last_counts=p_details-'error',last_error=left(p_details->>'error',500),attempts=case when p_ok then 0 else least(attempts+1,5) end,
 next_due=now()+case when p_details->>'source_blocked'='true' then interval '1 day' when p_ok then make_interval(mins=>interval_minutes) when attempts>=4 or p_details->>'error_state'='permission_error' then interval '1 day' else make_interval(mins=>least(interval_minutes,15*(2^attempts)::integer)) end,locked_until=null,lease_id=null where id=p_scope;
 insert into public.federation_sync_changes(scope_id,status,details) values(p_scope,case when p_ok then 'completed' else 'failed' end,p_details);
end$$;
revoke all on function public.federation_configure_club(uuid,uuid,text,text,text,integer),public.federation_request_team_sync(uuid),public.federation_team_sync_status(uuid),public.federation_claim_job(),public.federation_finish_job(uuid,uuid,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.federation_configure_club(uuid,uuid,text,text,text,integer),public.federation_request_team_sync(uuid),public.federation_team_sync_status(uuid) to authenticated;
grant execute on function public.federation_claim_job(),public.federation_finish_job(uuid,uuid,boolean,jsonb) to service_role;
commit;
