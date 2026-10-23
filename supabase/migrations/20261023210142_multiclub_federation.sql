-- Additive multiclub configuration and server queue. No changes to live cron jobs.
create table public.club_settings(
 club_id uuid primary key references public.clubs(id), slug text unique not null check(slug ~ '^[a-z0-9-]+$'),
 official_name text not null, short_name text not null, crest_url text,
 primary_color text not null check(primary_color ~ '^#[0-9a-fA-F]{6}$'),
 secondary_color text not null check(secondary_color ~ '^#[0-9a-fA-F]{6}$'),
 contrast_color text not null check(contrast_color ~ '^#[0-9a-fA-F]{6}$'),
 active_season_id uuid references public.seasons(id), verification_status text not null default 'pending' check(verification_status in ('verified','pending'))
);
create table public.club_federation_sources(
 id uuid primary key default gen_random_uuid(), club_id uuid not null references public.clubs(id),
 season_id uuid not null references public.seasons(id), federation text not null check(federation in ('FECAPA','RFEP')),
 external_club_id text not null check(external_club_id ~ '^[1-9][0-9]*$'),
 competition_id uuid not null references public.federation_competitions(id),
 external_season_id text not null default '41', verified_team_ids text[] not null,
 access_verified boolean not null default false, automatic_enabled boolean not null default false,
 min_interval_minutes int not null default 720 check(min_interval_minutes>=15),
 calendar_minutes int not null default 720 check(calendar_minutes>=15),
 upcoming_minutes int not null default 120 check(upcoming_minutes>=15),
 today_minutes int not null default 15 check(today_minutes>=15),
 next_due_at timestamptz not null default now(), last_verified_at timestamptz,
 unique(club_id,competition_id)
);
create table public.club_sync_jobs(
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.club_federation_sources(id),
 club_id uuid not null references public.clubs(id), scope text not null check(scope in ('club','team','match')),
 target_id uuid, actor_id uuid references auth.users(id), trigger_kind text not null check(trigger_kind in ('manual','scheduled')),
 status text not null default 'pending' check(status in ('pending','running','success','failed','blocked')),
 requested_at timestamptz not null default now(), available_at timestamptz not null default now(),
 lease_until timestamptz, lease_token uuid, attempts int not null default 0, finished_at timestamptz,
 records_new int not null default 0, records_updated int not null default 0, records_unchanged int not null default 0,
 error_summary text, source_url text
);
create unique index club_sync_one_open_source on public.club_sync_jobs(source_id) where status in ('pending','running');
create index club_sync_due on public.club_sync_jobs(available_at,requested_at) where status='pending';
create index club_sync_club_history on public.club_sync_jobs(club_id,requested_at desc);
create table public.club_sync_observations(
 source_id uuid not null references public.club_federation_sources(id), resource_key text not null,
 official_data jsonb not null, verified_at timestamptz not null, primary key(source_id,resource_key)
);
alter table public.club_settings enable row level security;
alter table public.club_federation_sources enable row level security;
alter table public.club_sync_jobs enable row level security;
alter table public.club_sync_observations enable row level security;
create policy settings_read on public.club_settings for select to authenticated using(exists(select 1 from public.clubs c where c.id=club_id));
create policy sources_read on public.club_federation_sources for select to authenticated using(exists(select 1 from public.clubs c where c.id=club_id));
create policy jobs_read on public.club_sync_jobs for select to authenticated using(exists(select 1 from public.clubs c where c.id=club_id));
-- Observations have no client policy: normalized tables retain their own existing RLS.
revoke all on public.club_settings,public.club_federation_sources,public.club_sync_jobs,public.club_sync_observations from public,anon,authenticated;
grant select on public.club_settings,public.club_federation_sources,public.club_sync_jobs to authenticated;
grant all on public.club_settings,public.club_federation_sources,public.club_sync_jobs,public.club_sync_observations to service_role;

create function app_private.request_club_sync(p_club uuid,p_scope text,p_target uuid default null)
returns setof public.club_sync_jobs language plpgsql security definer set search_path='' as $$
declare src public.club_federation_sources; actor uuid:=auth.uid();
begin
 if actor is null or not (app_private.is_platform_superadmin() or app_private.has_club_role(p_club,array['admin','general_coordinator'])) then raise exception 'Club synchronization permission denied' using errcode='42501';end if;
 if p_scope not in ('club','team','match') or (p_scope='club' and p_target is not null) or (p_scope<>'club' and p_target is null) then raise exception 'Invalid synchronization scope';end if;
 if p_scope='team' and not exists(select 1 from public.teams where id=p_target and club_id=p_club) then raise exception 'Foreign team';end if;
 if p_scope='match' and not exists(select 1 from public.federation_matches m join public.federation_groups g on g.id=m.group_id join public.federation_competitions c on c.id=g.competition_id where m.id=p_target and c.club_id=p_club) then raise exception 'Foreign match';end if;
 for src in select s.* from public.club_federation_sources s where s.club_id=p_club and (p_scope='club' or exists(select 1 from public.federation_team_entries e where e.competition_id=s.competition_id and e.club_team_id=p_target) or (p_scope='match' and exists(select 1 from public.federation_matches m join public.federation_groups g on g.id=m.group_id where m.id=p_target and g.competition_id=s.competition_id))) loop
  -- Even manual requests observe the source cooldown. Repeated clicks share one job.
  insert into public.club_sync_jobs(source_id,club_id,scope,target_id,actor_id,trigger_kind,status,available_at)
  values(src.id,p_club,p_scope,p_target,actor,'manual',case when src.access_verified then 'pending' else 'blocked' end,greatest(now(),src.next_due_at))
  on conflict(source_id) where status in ('pending','running') do nothing;
 end loop;
 return query select j.* from public.club_sync_jobs j where j.club_id=p_club order by j.requested_at desc limit 30;
end $$;
revoke all on function app_private.request_club_sync(uuid,text,uuid) from public,anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.request_club_sync(uuid,text,uuid) to authenticated;
create function public.request_club_sync(p_club uuid,p_scope text,p_target uuid default null)
returns setof public.club_sync_jobs language sql security invoker set search_path='' as $$select * from app_private.request_club_sync(p_club,p_scope,p_target)$$;
revoke all on function public.request_club_sync(uuid,text,uuid) from public,anon;
grant execute on function public.request_club_sync(uuid,text,uuid) to authenticated;

create function public.claim_club_sync() returns setof public.club_sync_jobs language plpgsql security invoker set search_path='' as $$
declare j public.club_sync_jobs;
begin
 -- Expired workers cannot commit. Bounded retries after worker loss.
 update public.club_sync_jobs set status=case when attempts>=3 then 'failed' else 'pending' end,available_at=now()+interval '5 minutes',error_summary='Worker lease expired',lease_token=null where status='running' and lease_until<now();
 insert into public.club_sync_jobs(source_id,club_id,scope,trigger_kind)
 select s.id,s.club_id,'club','scheduled' from public.club_federation_sources s where s.automatic_enabled and s.access_verified and s.next_due_at<=now()
 on conflict(source_id) where status in ('pending','running') do nothing;
 select * into j from public.club_sync_jobs where status='pending' and available_at<=now() order by requested_at for update skip locked limit 1;
 if j.id is null then return;end if;
 update public.club_sync_jobs set status='running',attempts=attempts+1,lease_until=now()+interval '3 minutes',lease_token=gen_random_uuid(),error_summary=null where id=j.id returning * into j;
 return next j;
end $$;
revoke all on function public.claim_club_sync() from public,anon,authenticated;
grant execute on function public.claim_club_sync() to service_role;

create function public.fail_club_sync(p_job uuid,p_lease uuid,p_error text,p_retry boolean default true) returns void language plpgsql security invoker set search_path='' as $$
declare j public.club_sync_jobs;
begin
 select * into strict j from public.club_sync_jobs where id=p_job and status='running' and lease_token=p_lease and lease_until>now() for update;
 update public.club_sync_jobs set status=case when p_retry and attempts<3 then 'pending' else 'failed' end,
 available_at=now()+make_interval(mins=>least(60,5*j.attempts)),finished_at=case when not p_retry or attempts>=3 then now() end,error_summary=left(p_error,500),lease_token=null where id=p_job;
 update public.club_federation_sources set next_due_at=greatest(next_due_at,now()+interval '15 minutes'),access_verified=case when not p_retry then false else access_verified end where id=j.source_id;
end $$;
revoke all on function public.fail_club_sync(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.fail_club_sync(uuid,uuid,text,boolean) to service_role;

create or replace function public.federation_commit_club(p_data jsonb,p_source uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cfg public.club_federation_sources; c uuid; s uuid; comp uuid; grp uuid; tid uuid; ent uuid; pid uuid; staffid uuid; mid uuid; ownentry uuid;
 personkey text; team jsonb; person jsonb; fixture jsonb; gid text; fed text; cid text; side_label text; stamp timestamptz;
 nteams int:=0; npeople int:=0; nmatches int:=0;
begin
 fed:=p_data->>'federation';cid:=p_data->>'id';
 select * into strict cfg from public.club_federation_sources where id=p_source and access_verified;
 if fed is distinct from cfg.federation or p_data->>'club_external_id' is distinct from cfg.external_club_id or p_data->>'season_id' is distinct from cfg.external_season_id then raise exception 'Club import scope mismatch';end if;
 if jsonb_typeof(p_data->'teams') is distinct from 'array' or jsonb_array_length(p_data->'teams')=0 or jsonb_typeof(p_data->'matches') is distinct from 'array' or jsonb_array_length(p_data->'matches')=0 then raise exception 'Empty import rejected';end if;
 if not exists(select 1 from public.federation_competitions where id=cfg.competition_id and club_id=cfg.club_id and external_competition_id=cid and season_id=cfg.season_id and federation=fed) then raise exception 'Competition scope mismatch';end if;
 if fed='FECAPA' and cid='4802' and cfg.external_club_id='252' then return jsonb_build_object('status','preserved_fem15');end if;
 perform pg_advisory_xact_lock(hashtextextended('ihc:'||fed||':'||cid,0));
 c:=cfg.club_id;s:=cfg.season_id;stamp:=(p_data->>'fetched_at')::timestamptz;
 comp:=cfg.competition_id;
 insert into public.federation_competitions(id,club_id,season_id,federation,external_competition_id,name,category) values(comp,c,s,fed,cid,p_data->>'name',p_data->>'name') on conflict(club_id,federation,external_competition_id) do nothing;
 select id into strict comp from public.federation_competitions where club_id=c and federation=fed and external_competition_id=cid;
 for fixture in select value from jsonb_array_elements(p_data->'matches') loop
  gid:=fixture->>'group_id';if gid !~ '^[1-9][0-9]*$' then raise exception 'Invalid group';end if;
  grp:=md5('clubhoquei360:'||(case when c=md5('clubhoquei360:fecapa:club:252')::uuid then '' else c::text||':' end)||lower(fed)||':'||cfg.external_season_id||':group:'||gid)::uuid;
  insert into public.federation_groups(id,competition_id,external_group_id,name) values(grp,comp,gid,fixture->>'group_name') on conflict(competition_id,external_group_id) do nothing;
 end loop;
 for team in select value from jsonb_array_elements(p_data->'teams') loop
  if team->>'external_team_id' !~ '^[1-9][0-9]*$' or team->>'verification' is distinct from 'official' or not ((team->>'external_team_id')=any(cfg.verified_team_ids)) then raise exception 'Unverified IHC team';end if;
  tid:=md5('clubhoquei360:'||(case when c=md5('clubhoquei360:fecapa:club:252')::uuid then '' else c::text||':' end)||lower(fed)||':'||cfg.external_season_id||':team:'||(team->>'external_team_id'))::uuid;
  -- Same first team verified across the official competition calendars and the club's municipal match report.
  if cfg.external_season_id='41' and cfg.club_id=md5('clubhoquei360:fecapa:club:252')::uuid and ((fed='FECAPA' and team->>'external_team_id'='12074') or (fed='RFEP' and team->>'external_team_id'='3696')) then tid:=md5('clubhoquei360:ihc:41:first-team')::uuid;end if;
  insert into public.teams(id,club_id,season_id,name,category,short_name,verification_status,source_url) values(tid,c,s,case when tid=md5('clubhoquei360:ihc:41:first-team')::uuid then 'IGUALADA RIGAT HC' else team->>'name' end,case when tid=md5('clubhoquei360:ihc:41:first-team')::uuid then 'SÈNIOR · primer equip' else team->>'category' end,team->>'short_name','verified',p_data->>'source_url') on conflict(id) do nothing;
  select id into strict grp from public.federation_groups where competition_id=comp and external_group_id=team->'group_ids'->>0;
  ent:=md5('clubhoquei360:'||(case when c=md5('clubhoquei360:fecapa:club:252')::uuid then '' else c::text||':' end)||lower(fed)||':'||cfg.external_season_id||':'||cid||':team:'||(team->>'external_team_id'))::uuid;
  insert into public.federation_team_entries(id,competition_id,group_id,external_team_id,display_name,club_team_id,source_url,fetched_at,raw_data) values(ent,comp,grp,team->>'external_team_id',team->>'name',tid,p_data->>'source_url',stamp,(team-'roster')||jsonb_build_object('season_id','41','club_external_id',p_data->>'club_external_id','standings',p_data->'standings','standings_status',p_data->>'standings_status','importer','ihc-v1'))
  on conflict(competition_id,external_team_id) do update set fetched_at=excluded.fetched_at,raw_data=public.federation_team_entries.raw_data||excluded.raw_data;
  select id into strict ent from public.federation_team_entries where competition_id=comp and external_team_id=team->>'external_team_id';
  if jsonb_array_length(team->'roster')>0 then update public.federation_team_roster set raw_data=jsonb_set(raw_data,'{active_in_latest_roster}','false'::jsonb) where entry_id=ent;end if;
  for person in select value from jsonb_array_elements(team->'roster') loop
   pid:=null;staffid:=null;personkey:=coalesce(person->>'external_id','entry:'||ent::text||':'||(person->>'name')||':'||coalesce(person->>'staff_role','staff'));if nullif(person->>'name','') is null or (person->>'external_id' is not null and person->>'external_id' !~ '^[1-9][0-9]*$') or (person->>'external_id' is null and (person->>'role'<>'staff' or person->>'identity_status' is distinct from 'no_federative_identifier')) then raise exception 'Invalid person identity';end if;
   if person->>'role'='player' then
    if person->>'external_id' is null then raise exception 'Missing player identifier';end if;
    pid:=md5('clubhoquei360:'||(case when c=md5('clubhoquei360:fecapa:club:252')::uuid then '' else c::text||':' end)||lower(fed)||':player:'||(person->>'external_id'))::uuid;
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
 for fixture in select value from jsonb_array_elements(p_data->'matches') loop
  if not exists(select 1 from jsonb_array_elements(p_data->'teams') x where x->>'external_team_id' in(fixture->>'home_team_id',fixture->>'away_team_id')) then raise exception 'Foreign-only match rejected';end if;
  select id into strict grp from public.federation_groups where competition_id=comp and external_group_id=fixture->>'group_id';
  mid:=md5('clubhoquei360:ihc:match:'||(case when c=md5('clubhoquei360:fecapa:club:252')::uuid then '' else c::text||':' end)||(fixture->>'fingerprint'))::uuid;
  insert into public.federation_matches(id,group_id,external_match_id,match_fingerprint,round_label,home_team,away_team,federation_start_at,venue,home_score,away_score,fetched_at,raw_data)
  values(mid,grp,fixture->>'match_id',fixture->>'fingerprint',fixture->>'round',fixture->>'home_name',fixture->>'away_name',case when nullif(fixture->>'date','') is not null and nullif(fixture->>'time','') is not null then (to_date(fixture->>'date','DD/MM/YYYY')+coalesce(nullif(fixture->>'time',''),'00:00')::time) at time zone 'Europe/Madrid' else null end,nullif(fixture->>'venue',''),(fixture->>'home_score')::integer,(fixture->>'away_score')::integer,stamp,fixture||jsonb_build_object('source_url',p_data->>'source_url','data_layer','public_federation','external_id_status',case when fixture->>'match_id' is null then 'not_published' else 'verified' end))
  on conflict(group_id,match_fingerprint) where match_fingerprint is not null do update set external_match_id=coalesce(excluded.external_match_id,public.federation_matches.external_match_id),federation_start_at=case when coalesce(public.federation_matches.raw_data->'manual_fields','[]'::jsonb) ? 'federation_start_at' then public.federation_matches.federation_start_at else coalesce(excluded.federation_start_at,public.federation_matches.federation_start_at) end,venue=case when coalesce(public.federation_matches.raw_data->'manual_fields','[]'::jsonb) ? 'venue' then public.federation_matches.venue else coalesce(excluded.venue,public.federation_matches.venue) end,home_score=case when coalesce(public.federation_matches.raw_data->'manual_fields','[]'::jsonb) ? 'home_score' then public.federation_matches.home_score else coalesce(excluded.home_score,public.federation_matches.home_score) end,away_score=case when coalesce(public.federation_matches.raw_data->'manual_fields','[]'::jsonb) ? 'away_score' then public.federation_matches.away_score else coalesce(excluded.away_score,public.federation_matches.away_score) end,fetched_at=excluded.fetched_at,raw_data=public.federation_matches.raw_data||jsonb_strip_nulls(excluded.raw_data);
  select id into strict mid from public.federation_matches where group_id=grp and match_fingerprint=fixture->>'fingerprint';
  for side_label in select value#>>'{}' from jsonb_array_elements(fixture->'club_sides') loop
   if side_label not in ('home','away') then raise exception 'Invalid side';end if;
   select id into strict ownentry from public.federation_team_entries where competition_id=comp and external_team_id=fixture->>(side_label||'_team_id');
   insert into public.federation_match_teams(match_id,entry_id,side) values(mid,ownentry,side_label) on conflict do nothing;
  end loop;nmatches:=nmatches+1;
 end loop;
 return jsonb_build_object('status','verified','teams',nteams,'roster_entries',npeople,'matches',nmatches);
end $$;
revoke all on function public.federation_commit_club(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.federation_commit_club(jsonb,uuid) to service_role;
create function public.finish_club_sync(p_job uuid,p_lease uuid,p_data jsonb,p_minutes int)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.club_sync_jobs; src public.club_federation_sources; item jsonb; old jsonb; k text; n int:=0; u int:=0; same int:=0; result jsonb;
begin
 select * into strict j from public.club_sync_jobs where id=p_job and status='running' and lease_token=p_lease and lease_until>now() for update;
 select * into strict src from public.club_federation_sources where id=j.source_id and access_verified for update;
 result:=public.federation_commit_club(p_data,src.id);
 -- Stable identities exclude dates/scores. Observation counters describe official resources,
 -- never number of attempted upserts or operator events.
 for item in select jsonb_build_object('key','team:'||(t->>'external_team_id'),'data',t-'roster') from jsonb_array_elements(p_data->'teams') t
 union all select jsonb_build_object('key','fixture:'||(m->>'fingerprint'),'data',m-'report_error') from jsonb_array_elements(p_data->'matches') m
 union all select jsonb_build_object('key','roster:'||(t->>'external_team_id')||':'||(r->>'role')||':'||coalesce(r->>'external_id',r->>'name'),'data',r) from jsonb_array_elements(p_data->'teams') t cross join lateral jsonb_array_elements(t->'roster') r
 union all select jsonb_build_object('key','standings','data',p_data->'standings') loop
  k:=item->>'key';select official_data into old from public.club_sync_observations where source_id=src.id and resource_key=k;
  if not found then n:=n+1;elsif old is distinct from item->'data' then u:=u+1;else same:=same+1;end if;
  insert into public.club_sync_observations values(src.id,k,item->'data',now()) on conflict(source_id,resource_key) do update set official_data=excluded.official_data,verified_at=excluded.verified_at;
 end loop;
 update public.club_sync_jobs set status='success',finished_at=now(),lease_token=null,source_url=p_data->>'source_url',records_new=n,records_updated=u,records_unchanged=same where id=j.id;
 update public.club_federation_sources set last_verified_at=now(),next_due_at=now()+make_interval(mins=>greatest(src.min_interval_minutes,p_minutes)) where id=src.id;
 return result||jsonb_build_object('new',n,'updated',u,'unchanged',same);
end $$;
revoke all on function public.finish_club_sync(uuid,uuid,jsonb,int) from public,anon,authenticated;
grant execute on function public.finish_club_sync(uuid,uuid,jsonb,int) to service_role;
-- Configuration checks protect even service provisioning from cross-club relationships.
create function app_private.validate_club_source() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.seasons where id=new.season_id and club_id=new.club_id) or not exists(select 1 from public.federation_competitions where id=new.competition_id and club_id=new.club_id and season_id=new.season_id and federation=new.federation) then raise exception 'Cross-club federation source';end if;
 if cardinality(new.verified_team_ids)=0 then raise exception 'Verified team identifiers required';end if;
 return new;
end $$;
create trigger validate_club_source before insert or update on public.club_federation_sources for each row execute function app_private.validate_club_source();
create function app_private.validate_club_settings() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if new.active_season_id is not null and not exists(select 1 from public.seasons where id=new.active_season_id and club_id=new.club_id) then raise exception 'Foreign active season';end if;return new;end $$;
create trigger validate_club_settings before insert or update on public.club_settings for each row execute function app_private.validate_club_settings();
revoke all on function app_private.validate_club_source(),app_private.validate_club_settings() from public,anon,authenticated;
