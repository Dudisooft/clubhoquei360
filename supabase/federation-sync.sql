-- Additive cache: never writes pilot_events or operator state.
alter table public.federation_match_sources add column if not exists competition_id text;
alter table public.federation_match_sources add column if not exists season_id text default '41';
alter table public.federation_match_sources add column if not exists official_data jsonb not null default '{}'::jsonb;
alter table public.federation_match_sources add column if not exists automatic_enabled boolean not null default false;
create unique index if not exists federation_source_external_unique on public.federation_match_sources(federation,federation_match_id) where federation_match_id is not null;
alter table public.pilot_players add column if not exists federation_player_id text;
alter table public.pilot_players add column if not exists federation_active boolean not null default true;
create table if not exists public.federation_sync_runs (
 id uuid primary key default gen_random_uuid(), match_id uuid references public.pilot_matches(id),
 started_at timestamptz not null default now(), finished_at timestamptz,
 status text not null check(status in ('running','success','error')), error text, source_url text, counts jsonb
);
alter table public.federation_sync_runs enable row level security;
create policy federation_sync_runs_member_read on public.federation_sync_runs for select to authenticated
 using (exists(select 1 from public.pilot_members m where m.match_id=federation_sync_runs.match_id and m.user_id=(select auth.uid())));
grant select on public.federation_sync_runs to authenticated;
create table if not exists public.federation_calendar_cache (
 federation text not null check(federation in ('RFEP','FECAPA')), competition_id text not null,
 season_id text not null, data jsonb not null, standings jsonb, fetched_at timestamptz not null default now(),
 primary key(federation,competition_id,season_id)
);
alter table public.federation_calendar_cache enable row level security;
create policy federation_calendar_member_read on public.federation_calendar_cache for select to authenticated
 using (exists(select 1 from public.federation_match_sources f join public.pilot_members m on m.match_id=f.match_id
 where m.user_id=(select auth.uid()) and f.federation=federation_calendar_cache.federation and f.competition_id=federation_calendar_cache.competition_id and f.season_id=federation_calendar_cache.season_id));
grant select on public.federation_calendar_cache to authenticated;
-- Atomic server-only commit. Retains player UUIDs and never deletes manual annotations.
create or replace function public.federation_commit_snapshot(p_match uuid,p_data jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare p jsonb; src public.federation_match_sources; existing public.pilot_players; begin
 select * into strict src from public.federation_match_sources where match_id=p_match for update;
 if (p_data->>'match_id') is distinct from src.federation_match_id or (p_data->>'competition_id') is distinct from src.competition_id then raise exception 'Source identity mismatch'; end if;
 if jsonb_array_length(p_data->'players')<2 then raise exception 'Incomplete roster'; end if;
 update public.pilot_players set federation_active=false where match_id=p_match and federation_player_id is not null;
 for p in select value from jsonb_array_elements(p_data->'players') loop
 select * into existing from public.pilot_players where match_id=p_match and team=p->>'team' and federation_player_id=p->>'external_id' limit 1;
 if found then
 -- A changed dorsal can conflict with an existing operator-linked row. Fail atomically for review.
 update public.pilot_players set dorsal=p->>'dorsal',full_name=p->>'name',position=p->>'position',official_source=src.federation_url,federation_active=true where id=existing.id;
 else
 select * into existing from public.pilot_players where match_id=p_match and team=p->>'team' and dorsal=p->>'dorsal';
 if found and existing.federation_player_id is null and existing.full_name=p->>'name' then
 update public.pilot_players set federation_player_id=p->>'external_id',federation_active=true,position=p->>'position',official_source=src.federation_url where id=existing.id;
 elsif found then raise exception 'Dorsal conflict: manual review required';
 else insert into public.pilot_players(match_id,team,dorsal,full_name,position,official_source,federation_player_id) values(p_match,p->>'team',p->>'dorsal',p->>'name',p->>'position',src.federation_url,p->>'external_id'); end if;
 end if;
 end loop;
 update public.federation_match_sources set home_name=p_data->>'home_name',away_name=p_data->>'away_name',home_crest_url=p_data->>'home_crest',away_crest_url=p_data->>'away_crest',official_data=p_data,import_status='verified',last_checked_at=now(),last_imported_at=now(),notes=null where match_id=p_match;
end $$;
revoke all on function public.federation_commit_snapshot(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.federation_commit_snapshot(uuid,jsonb) to service_role;
create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;
do $$ begin if not exists(select 1 from vault.secrets where name='federation_sync_scheduler') then perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'federation_sync_scheduler'); end if; end $$;
create or replace function public.federation_scheduler_authorized(p_token text) returns boolean language sql security invoker set search_path='' as $$
 select coalesce(p_token <> '' and exists(select 1 from vault.decrypted_secrets where name='federation_sync_scheduler' and decrypted_secret=p_token),false)
$$;
revoke all on function public.federation_scheduler_authorized(text) from public,anon,authenticated;
grant execute on function public.federation_scheduler_authorized(text) to service_role;
insert into public.federation_match_sources(match_id,federation,federation_match_id,federation_url,competition_id,season_id,import_status)
values('55e1e031-517b-48bd-bef7-4fe7eefde205','RFEP','35529','https://www.hockeypatines.fep.es/league/3575','3575','41','pending'),
('408787db-310f-42dd-90e6-16ee2cf971a5','RFEP','35537','https://www.hockeypatines.fep.es/league/3575','3575','41','pending')
on conflict(match_id) do update set competition_id=excluded.competition_id,season_id=excluded.season_id;
grant select,insert,update on public.federation_match_sources,public.pilot_players,public.federation_sync_runs,public.federation_calendar_cache to service_role;
grant select on public.pilot_members to service_role;
create or replace function public.federation_claim_sync(p_match uuid,p_force boolean default false) returns boolean language plpgsql security invoker set search_path='' as $$ begin
 update public.federation_match_sources set last_checked_at=now() where match_id=p_match and (p_force or last_checked_at is null or last_checked_at<now()-interval '6 hours') and not exists(select 1 from public.federation_sync_runs r where r.match_id=p_match and r.status='running' and r.started_at>now()-interval '2 minutes');
 return found;
end $$;
revoke all on function public.federation_claim_sync(uuid,boolean) from public,anon,authenticated;
grant execute on function public.federation_claim_sync(uuid,boolean) to service_role;
grant select on public.federation_match_sources,public.pilot_players,public.pilot_matches,public.pilot_members to authenticated;
