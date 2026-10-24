-- Generated only from an observed official RFEP response. Review and execute
-- once with database-admin tooling. No DDL, new accounts or operational players.
begin;
set local lock_timeout='3s';
do $CH360_VIC$
declare data jsonb:=/*VERIFIED_PAYLOAD*/;fixture record;src public.federation_match_sources;
 v_entry uuid;v_person uuid;v_roster uuid;item jsonb;stamp timestamptz;
 protected_before text;protected_after text;read_count int:=0;new_count int:=0;
begin
 if data->>'federation' is distinct from 'RFEP' or data->>'competition' is distinct from '3575' or data->>'season' is distinct from '41' or data->>'team' is distinct from '3727'
 or data->>'endpoint' is distinct from 'https://www.server2.sidgad.es/rfep/rfep_stats_1_3575.php'
 or data->>'source_url' is distinct from 'https://hockeypatines.fep.es/league/3575' or coalesce(data->>'source_sha256','')!~'^[a-f0-9]{64}$'
 or jsonb_typeof(data->'players') is distinct from 'array' or jsonb_array_length(data->'players') not between 1 and 40 then raise exception 'Vic source scope mismatch';end if;
 stamp:=(data->>'fetched_at')::timestamptz;if stamp is null then raise exception 'Observation time required';end if;
 select m.*,g.competition_id,c.federation,c.external_competition_id,c.club_id,c.season_id
 into strict fixture from public.federation_matches m join public.federation_groups g on g.id=m.group_id join public.federation_competitions c on c.id=g.competition_id
 where m.id='51894d05-c323-f3e1-8534-fa79e062c448';
 select * into strict src from public.federation_match_sources where match_id='18fa0a6e-e5c6-487e-8315-5bc371e22cb1';
 if fixture.federation is distinct from 'RFEP' or fixture.external_competition_id is distinct from '3575'
 or fixture.match_fingerprint is distinct from 'RFEP:41:3575:3575:JORNADA 5:3697:3727'
 or fixture.raw_data->>'data_layer' is distinct from 'public_federation' or fixture.raw_data->>'away_team_id' is distinct from '3727'
 or src.official_data->>'calendar_match_id' is distinct from fixture.id::text
 or src.official_data->>'calendar_fingerprint' is distinct from fixture.match_fingerprint
 or not exists(select 1 from public.seasons where id=fixture.season_id and club_id=fixture.club_id and label in('2026/27','2026/2027'))
 then raise exception 'Verified calendar identity changed';end if;
 perform pg_advisory_xact_lock(hashtextextended('vic-roster:RFEP:41:3575:3727',0));
 -- Protect every existing official/analysis match record, not only this fixture.
 select md5(jsonb_build_object(
 'players',(select jsonb_agg(to_jsonb(t) order by id) from public.pilot_players t),
 'events',(select jsonb_agg(to_jsonb(t) order by id) from public.pilot_events t),
 'state',(select jsonb_agg(to_jsonb(t) order by match_id) from public.pilot_operator_state t),
 'sources',(select jsonb_agg(to_jsonb(t) order by match_id) from public.federation_match_sources t),
 'matches',(select jsonb_agg(to_jsonb(t) order by id) from public.federation_matches t),
 'analysis',(select jsonb_agg(to_jsonb(t) order by id) from public.stats_events t)
 )::text) into protected_before;
 select id into v_entry from public.federation_team_entries where competition_id=fixture.competition_id and external_team_id='3727';
 if v_entry is null then
  v_entry:=md5('clubhoquei360:rfep:41:3575:team:3727')::uuid;
  insert into public.federation_team_entries(id,competition_id,group_id,external_team_id,display_name,club_team_id,source_url,fetched_at,raw_data)
  values(v_entry,fixture.competition_id,fixture.group_id,'3727',fixture.away_team,null,data->>'source_url',stamp,
  jsonb_build_object('verification','official','season_id','41','importer','requested-opponent-roster-v1','roster_status','published','data_layer','public_federation','crest_url',fixture.raw_data->>'away_crest'));
 elsif exists(select 1 from public.federation_team_entries where id=v_entry and club_team_id is not null) then
  raise exception 'Opponent cannot be assigned as own club team';
 end if;
 if exists(select 1 from public.federation_team_entries where id=v_entry and fetched_at>stamp) then raise exception 'Stale roster response';end if;
 for item in select value from jsonb_array_elements(data->'players') loop
  if coalesce(item->>'external_id','')!~'^[1-9][0-9]*$' or coalesce(length(btrim(item->>'name')),0) not between 1 and 120
  or item->>'dorsal' is not null or item->>'position' is not null then raise exception 'Invalid or inferred roster identity';end if;
  if (select count(*) from jsonb_array_elements(data->'players') x where x->>'external_id'=item->>'external_id')<>1 then raise exception 'Duplicate source identity';end if;
  select id into v_person from public.federation_players where federation='RFEP' and external_player_id=item->>'external_id';
  if v_person is null then
   insert into public.federation_players(id,federation,external_player_id,display_name) values(md5('clubhoquei360:rfep:player:'||(item->>'external_id'))::uuid,'RFEP',item->>'external_id',item->>'name') on conflict do nothing;
   select id into strict v_person from public.federation_players where federation='RFEP' and external_player_id=item->>'external_id';new_count:=new_count+1;
  end if;
  if (select count(*) from public.federation_team_roster where entry_id=v_entry and player_id=v_person)>1 then raise exception 'Ambiguous existing roster identity';end if;
  select r.id into v_roster from public.federation_team_roster r where r.entry_id=v_entry and r.player_id=v_person;
  v_roster:=coalesce(v_roster,md5('clubhoquei360:opponent-roster:'||v_entry::text||':'||(item->>'external_id'))::uuid);
  insert into public.federation_team_roster(id,entry_id,player_id,external_person_id,display_name,role,shirt_number,fetched_at,raw_data)
  values(v_roster,v_entry,v_person,item->>'external_id',item->>'name','player',null,stamp,
  item||jsonb_build_object('source_url',data->>'source_url','source_endpoint',data->>'endpoint','source_sha256',data->>'source_sha256','verification','official_roster','active_in_latest_roster',true,'data_layer','public_federation'))
  on conflict(id) do update set display_name=excluded.display_name,fetched_at=excluded.fetched_at,raw_data=public.federation_team_roster.raw_data||jsonb_strip_nulls(excluded.raw_data);
  read_count:=read_count+1;
 end loop;
 update public.federation_team_entries set fetched_at=stamp,raw_data=raw_data||jsonb_build_object('verification','official','season_id','41','source_endpoint',data->>'endpoint','source_sha256',data->>'source_sha256','roster_status','published') where id=v_entry;
 select md5(jsonb_build_object(
 'players',(select jsonb_agg(to_jsonb(t) order by id) from public.pilot_players t),
 'events',(select jsonb_agg(to_jsonb(t) order by id) from public.pilot_events t),
 'state',(select jsonb_agg(to_jsonb(t) order by match_id) from public.pilot_operator_state t),
 'sources',(select jsonb_agg(to_jsonb(t) order by match_id) from public.federation_match_sources t),
 'matches',(select jsonb_agg(to_jsonb(t) order by id) from public.federation_matches t),
 'analysis',(select jsonb_agg(to_jsonb(t) order by id) from public.stats_events t)
 )::text) into protected_after;
 if protected_before is distinct from protected_after then raise exception 'Protected match data changed';end if;
 insert into public.federation_import_runs(id,federation,resource_type,external_resource_id,source_url,status,finished_at,records_read,records_written,details)
 values(md5('vic-roster:'||(data->>'source_sha256'))::uuid,'RFEP','roster','RFEP:41:3575:3727',data->>'source_url','success',stamp,read_count,read_count,
 jsonb_build_object('team_id','3727','competition_id','3575','season_id','41','source_endpoint',data->>'endpoint','source_sha256',data->>'source_sha256','protected_match_data_unchanged',true)) on conflict(id) do nothing;
 perform set_config('ch360.vic_import_result',jsonb_build_object('team_id','3727','players',read_count,'new_player_identities',new_count,'entry_id',v_entry,'protected_match_data_unchanged',true,'callups_created',0)::text,true);
end $CH360_VIC$;
select current_setting('ch360.vic_import_result')::jsonb as import_result;
commit;
