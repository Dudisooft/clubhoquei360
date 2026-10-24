-- Scoped DATA repair. Requires explicit production publication authorization.
-- Reuses the existing pilot and canonical imported calendar; creates no matches,
-- players, accounts, memberships, assignments or official/statistical events.
-- For a smoke test replace the final COMMIT with ROLLBACK and run in one call.
begin;
do $$
declare
 fixture record; home_entry record; away_entry record;
 pilot uuid:='18fa0a6e-e5c6-487e-8315-5bc371e22cb1';
 canonical uuid:='51894d05-c323-f3e1-8534-fa79e062c448';
 snapshot jsonb; linked public.federation_match_sources;
begin
 perform pg_advisory_xact_lock(hashtextextended('RFEP:41:3575:JORNADA 5:3697:3727',0));
 select m.*,c.club_id,c.season_id,c.federation,c.external_competition_id,s.label season_label
 into strict fixture from public.federation_matches m
 join public.federation_groups g on g.id=m.group_id
 join public.federation_competitions c on c.id=g.competition_id
 join public.seasons s on s.id=c.season_id where m.id=canonical;
 if fixture.federation is distinct from 'RFEP' or fixture.external_competition_id is distinct from '3575'
 or coalesce(fixture.season_label,'') not in('2026/27','2026/2027')
 or fixture.match_fingerprint is distinct from 'RFEP:41:3575:3575:JORNADA 5:3697:3727'
 or fixture.raw_data->>'home_team_id' is distinct from '3697' or fixture.raw_data->>'away_team_id' is distinct from '3727'
 or fixture.raw_data->>'data_layer' is distinct from 'public_federation'
 or fixture.raw_data->>'source_url' is distinct from 'https://hockeypatines.fep.es/league/3575'
 or fixture.federation_start_at is distinct from '2026-10-24 20:30:00 Europe/Madrid'::timestamptz
 then raise exception 'Verified RFEP calendar identity changed; review source before repair';end if;
 if not exists(select 1 from public.pilot_matches p where p.id=pilot and p.home_team=fixture.home_team
 and p.away_team=fixture.away_team and p.starts_at=fixture.federation_start_at) then
  raise exception 'Existing pilot does not match verified calendar';end if;
 if (select count(*) from public.pilot_matches where home_team=fixture.home_team and away_team=fixture.away_team and starts_at=fixture.federation_start_at)<>1 then
  raise exception 'Ambiguous pilot identity; no duplicate may be created';end if;
 if exists(select 1 from public.federation_match_sources where match_id<>pilot and federation='RFEP'
 and ((fixture.external_match_id is not null and federation_match_id=fixture.external_match_id)
 or official_data->>'calendar_match_id'=canonical::text)) then raise exception 'Calendar already linked to another internal match';end if;
 select e.* into strict home_entry from public.federation_team_entries e
 join public.federation_competitions c on c.id=e.competition_id
 join public.teams t on t.id=e.club_team_id and t.club_id=c.club_id and t.season_id=c.season_id
 where c.club_id=fixture.club_id and c.season_id=fixture.season_id and c.federation='RFEP'
 and c.external_competition_id='3575' and e.external_team_id='3697'
 and e.raw_data->>'season_id'='41' and e.raw_data->>'verification'='official';
 select e.* into away_entry from public.federation_team_entries e
 join public.federation_competitions c on c.id=e.competition_id
 join public.teams t on t.id=e.club_team_id and t.club_id=c.club_id and t.season_id=c.season_id
 where c.club_id=fixture.club_id and c.season_id=fixture.season_id and c.federation='RFEP'
 and c.external_competition_id='3575' and e.external_team_id='3727';
 snapshot:=fixture.raw_data||jsonb_build_object('source_kind','verified_calendar',
 'calendar_match_id',canonical,'calendar_fingerprint',fixture.match_fingerprint,
 'calendar_checked_at',fixture.fetched_at,'roster_status','not_verified',
 'home_score',fixture.home_score,'away_score',fixture.away_score);
 insert into public.federation_match_sources(match_id,federation,federation_match_id,federation_url,
 competition_id,season_id,home_name,away_name,home_crest_url,away_crest_url,
 import_status,last_checked_at,last_imported_at,official_data,automatic_enabled,notes)
 values(pilot,'RFEP',fixture.external_match_id,fixture.raw_data->>'source_url','3575','41',
 fixture.home_team,fixture.away_team,fixture.raw_data->>'home_crest',fixture.raw_data->>'away_crest',
 'pending',fixture.fetched_at,now(),snapshot,false,
 'Calendari RFEP verificat. Fitxa i alineacions del partit pendents; cap identificador inventat.')
 on conflict(match_id) do nothing;
 select * into strict linked from public.federation_match_sources where match_id=pilot;
 if linked.federation is distinct from 'RFEP' or linked.competition_id is distinct from '3575' or linked.season_id is distinct from '41'
 or linked.official_data->>'calendar_match_id' is distinct from canonical::text then
  raise exception 'Existing source is incompatible; refusing to overwrite';end if;
 -- If RFEP later publishes the official ID, reconcile this SAME internal row.
 if fixture.external_match_id is not null and linked.federation_match_id is null then
  update public.federation_match_sources set federation_match_id=fixture.external_match_id where match_id=pilot;
 elsif fixture.external_match_id is not null and linked.federation_match_id<>fixture.external_match_id then
  raise exception 'Official ID conflict; review instead of overwriting';end if;
 insert into public.stats_matches(match_id,club_id,season_id,home_team_id,away_team_id,home_external_team_id,away_external_team_id)
 values(pilot,fixture.club_id,fixture.season_id,home_entry.club_team_id,away_entry.club_team_id,'3697','3727') on conflict(match_id) do nothing;
 if not exists(select 1 from public.stats_matches where match_id=pilot and club_id=fixture.club_id
 and season_id=fixture.season_id and home_team_id=home_entry.club_team_id
 and home_external_team_id='3697' and away_external_team_id='3727') then
  raise exception 'Statistics identity conflict; refusing to overwrite';end if;
end $$;

do $smoke$
declare actor uuid;mid uuid:='18fa0a6e-e5c6-487e-8315-5bc371e22cb1'; payload jsonb;result public.stats_events;session public.stats_sessions;denied boolean;
begin
 select user_id into strict actor from public.platform_admins where enabled and role='platform_superadmin' limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 if not exists(select 1 from public.pilot_matches where id=mid) or not exists(select 1 from public.federation_match_sources where match_id=mid and federation='RFEP' and import_status='pending') then raise exception 'Selector inputs inaccessible to existing owner';end if;
 if not (public.stats_access(mid)->>'manage')::boolean then raise exception 'Existing owner cannot activate statistics';end if;
 perform public.stats_grant(jsonb_build_object('match_id',mid,'user_id',actor,'role','primary','sides',jsonb_build_array('home','away','disputed'),'expires_at',now()+interval '8 hours'));
 payload:=jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid(),'match_id',mid,'period',1,'match_ms',12000,'side','home','action','pass_complete','origin','live','validation','recorded','note','FICTICI: prova transaccional revertida');
 result:=public.stats_write_event(payload,0);
 if result.origin<>'live' or result.operator_id<>actor then raise exception 'Live registration failed';end if;
 denied:=false;begin insert into public.pilot_events(id,match_id,user_id,event_type,team,delta,match_second,payload) values(gen_random_uuid(),mid,actor,'goal','home',1,12,'{"kind":"gol"}'::jsonb);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unverified report unexpectedly permits official event writes';end if;
 session:=public.stats_save_session(mid,'{"period":1,"ms":12000,"mode":"live"}'::jsonb,0);
 if session.state->>'mode'<>'live' then raise exception 'Live clock save failed';end if;
 perform set_config('role','none',true);
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 perform set_config('role','authenticated',true);
 if (public.stats_access(mid)->>'read')::boolean then raise exception 'Unrelated identity gained access';end if;
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid()),0);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unrelated identity recorded';end if;
 perform set_config('role','none',true);
end $smoke$;
rollback;
select 'PASS: scoped calendar bridge and stats context, existing owner selector data and live recording/session, pending official report write denied, unrelated identity denied; all writes rolled back, no real Auth login claimed' as verification;
