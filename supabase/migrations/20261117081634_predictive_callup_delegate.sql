-- Private workflow data; federation tables remain read-only.
create table app_private.callup_receipts (
 fixture_id uuid not null,team_id uuid not null,revision integer not null,
 reader_id uuid not null references auth.users(id),read_at timestamptz not null default now(),
 primary key(fixture_id,team_id,revision,reader_id),
 foreign key(fixture_id,team_id) references app_private.club_callups(fixture_id,team_id)
);
create table app_private.callup_preferences (
 team_id uuid primary key references public.teams(id),preferences jsonb not null,
 revision integer not null,updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now()
);
create table app_private.callup_proposal_reviews (
 team_id uuid not null references public.teams(id),player_id uuid not null references public.federation_players(id),
 reviewed_by uuid not null references auth.users(id),reviewed_at timestamptz not null default now(),evidence jsonb not null,
 primary key(team_id,player_id)
);
alter table app_private.callup_receipts enable row level security;
alter table app_private.callup_preferences enable row level security;
alter table app_private.callup_proposal_reviews enable row level security;
revoke all on app_private.callup_receipts,app_private.callup_preferences,app_private.callup_proposal_reviews from public,anon,authenticated;

create function app_private.callup_roster_evidence(p_fixture uuid,p_team uuid,p_side text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare f app_private.callup_fixtures; e public.federation_team_entries; m public.federation_matches;
 c public.federation_competitions; target_side text; scope jsonb; appearances jsonb; official jsonb; entries integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_side is not null and p_side not in ('home','away') then raise exception 'Invalid side' using errcode='22023'; end if;
 select * into f from app_private.callup_fixtures x where p_fixture in(x.fixture_id,x.base_match_id)
  and (p_team is null or x.team_id=p_team)
  and (app_private.callup_can_edit(x.club_id,x.team_id) or app_private.has_team_role(x.team_id,array['coach','delegate'])
   or (p_side is not null and (app_private.stats_can_read(x.base_match_id) or exists(
    select 1 from public.pilot_members pm where pm.match_id=x.base_match_id and pm.user_id=auth.uid()))))
  order by (x.fixture_id=p_fixture) desc,x.team_id limit 1;
 if f.fixture_id is null then raise exception 'Fixture access denied' using errcode='42501'; end if;
 target_side:=coalesce(p_side,f.side);
 if f.kind<>'catalogue' then return jsonb_build_object('scope',null,'reason','Sense vinculació inequívoca al catàleg.'); end if;
 select * into m from public.federation_matches where id=f.fixture_id;
 select fc.* into c from public.federation_groups g join public.federation_competitions fc on fc.id=g.competition_id where g.id=m.group_id;
 select count(*) into entries from public.federation_match_teams mt join public.federation_team_entries en on en.id=mt.entry_id
  where mt.match_id=m.id and mt.side=target_side and en.competition_id=c.id;
 if entries<>1 then return jsonb_build_object('scope',null,'reason','Identitat d’equip absent o ambigua.'); end if;
 select en.* into e from public.federation_match_teams mt join public.federation_team_entries en on en.id=mt.entry_id
  where mt.match_id=m.id and mt.side=target_side and en.competition_id=c.id;
 if e.external_team_id is null or m.federation_start_at is null or m.raw_data->>(target_side||'_team_id') is distinct from e.external_team_id or
  (p_side is null and e.club_team_id is distinct from f.team_id) then
  return jsonb_build_object('scope',null,'reason','Identitat o data insuficient.');
 end if;
 scope:=jsonb_build_object('entry_id',e.id,'season_id',c.season_id,'competition_id',c.id,'federation',c.federation,
  'match_id',m.id,'cutoff',m.federation_start_at,'side',target_side);
 -- Bound work to twelve previous verified reports of the exact registration.
 with prior as (
  select pm.*,mt.side prior_side from public.federation_match_teams mt
  join public.federation_matches pm on pm.id=mt.match_id
  join public.federation_groups g on g.id=pm.group_id and g.competition_id=c.id
  where mt.entry_id=e.id and mt.side in('home','away') and pm.id<>m.id
   and pm.raw_data->>'report_status'='verified' and pm.federation_start_at<m.federation_start_at
   and pm.raw_data->>(mt.side||'_team_id')=e.external_team_id
   and not exists(select 1 from public.federation_match_teams other where other.match_id=mt.match_id and other.entry_id=e.id and other.side<>mt.side)
  order by pm.federation_start_at desc,pm.id limit 12
 ), rows as (
  select jsonb_build_object('player_id',l.player_id,'external_player_id',(select fp.external_player_id from public.federation_players fp where fp.id=l.player_id and fp.federation=c.federation),'full_name',l.display_name,'dorsal',l.shirt_number,
   'position',case when to_jsonb(l)->>'is_goalkeeper'='true' then 'goalkeeper' when to_jsonb(l)->>'is_goalkeeper'='false' then 'field' end,
   'entry_id',e.id,'season_id',c.season_id,'competition_id',c.id,'match_id',p.id,'at',p.federation_start_at,
   'verified',true,'source_url',coalesce(p.raw_data#>>'{report,source_url}',p.raw_data->>'source_url')) item
  from prior p join public.federation_match_lineups l on l.match_id=p.id and l.side=p.prior_side
  join public.federation_players fp on fp.id=l.player_id and fp.federation=c.federation
  where nullif(btrim(l.display_name),'') is not null order by p.federation_start_at desc,l.id limit 500
 ) select coalesce(jsonb_agg(item),'[]') into appearances from rows;
 select coalesce(jsonb_agg(jsonb_build_object('player_id',l.player_id,'external_player_id',(select fp.external_player_id from public.federation_players fp where fp.id=l.player_id and fp.federation=c.federation),'full_name',l.display_name,'dorsal',l.shirt_number,
  'position',case when to_jsonb(l)->>'is_goalkeeper'='true' then 'goalkeeper' when to_jsonb(l)->>'is_goalkeeper'='false' then 'field' end,
  'entry_id',e.id,'season_id',c.season_id,'competition_id',c.id,'match_id',m.id,'at',m.federation_start_at,
  'verified',true,'source_url',coalesce(m.raw_data#>>'{report,source_url}',m.raw_data->>'source_url')) order by l.id),'[]') into official
 from public.federation_match_lineups l where l.match_id=m.id and l.side=target_side and m.raw_data->>'report_status'='verified';
 return jsonb_build_object('scope',scope,'appearances',appearances,'official',official,
  'official_verified',coalesce(m.raw_data->>'report_status'='verified',false));
end $$;

create function app_private.read_callup_workflow(p_fixture uuid,p_team uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; f jsonb; saved jsonb; receipts jsonb; pref app_private.callup_preferences; meta jsonb; evidence jsonb; internal_rows jsonb;
begin
 result:=app_private.read_callup_manual_review(p_fixture,p_team); f:=result->'fixture'; saved:=result->'callup';
 select * into pref from app_private.callup_preferences where team_id=p_team;
 select coalesce(jsonb_agg(jsonb_build_object('reader_id',r.reader_id,'read_at',r.read_at) order by r.read_at),'[]') into receipts
 from app_private.callup_receipts r where r.fixture_id=(saved->>'fixture_id')::uuid and r.team_id=p_team
  and r.revision=(saved->>'revision')::int and coalesce((saved->>'published')::boolean,false);
 select jsonb_build_object('competition_name',coalesce(to_jsonb(c)->>'name',to_jsonb(c)->>'display_name'),
  'round',m.raw_data->>'round','venue',m.raw_data->>'venue','maps_url',m.raw_data->>'maps_url',
  'maps_verified',m.raw_data->>'maps_verified'='true','address',m.raw_data->>'address',
  'address_verified',m.raw_data->>'address_verified'='true','provisional',m.raw_data->>'provisional'='true') into meta
 from public.federation_matches m join public.federation_groups g on g.id=m.group_id
 join public.federation_competitions c on c.id=g.competition_id where m.id=(f->>'fixture_id')::uuid;
 evidence:=case when coalesce((result->>'can_edit')::boolean,false) then app_private.callup_roster_evidence(p_fixture,p_team,null) else null end;
 if evidence->'scope' is not null and evidence->'scope'<>'null' then
  with latest as (
   select distinct on (h.fixture_id) h.*,past.starts_at from app_private.club_callup_history h
   join app_private.callup_fixtures past on past.fixture_id=h.fixture_id and past.team_id=h.team_id
   join public.federation_matches pm on pm.id=past.fixture_id
   join public.federation_groups pg on pg.id=pm.group_id and pg.competition_id=(evidence#>>'{scope,competition_id}')::uuid
   where h.team_id=p_team and past.club_id=(f->>'club_id')::uuid and past.season_id=(f->>'season_id')::uuid
    and past.starts_at<(f->>'starts_at')::timestamptz and h.fixture_id not in ((f->>'fixture_id')::uuid,coalesce((f->>'base_match_id')::uuid,(f->>'fixture_id')::uuid))
   order by h.fixture_id,h.revision desc
  ), prior as (select * from latest order by starts_at desc,fixture_id limit 12) select coalesce(jsonb_agg(jsonb_build_object('player_id',coalesce(p.value->>'catalogue_player_id',p.value->>'id'),
    'full_name',p.value->>'full_name','dorsal',p.value->>'dorsal','position',p.value->>'position',
    'entry_id',evidence#>>'{scope,entry_id}','competition_id',evidence#>>'{scope,competition_id}',
    'season_id',evidence#>>'{scope,season_id}','match_id',prior.fixture_id,'at',prior.starts_at,'verified',true,
    'source_kind','internal_published_callup')),'[]') into internal_rows from prior
    cross join lateral jsonb_array_elements(prior.players) p(value);
  evidence:=evidence||jsonb_build_object('appearances',coalesce(evidence->'appearances','[]')||internal_rows);
 end if;
 return result||jsonb_build_object('workflow_supported',true,'receipt_supported',true,
  'can_acknowledge',app_private.has_team_role(p_team,array['delegate']) and coalesce((saved->>'published')::boolean,false),
  'receipts',receipts,'preferences',coalesce(pref.preferences,'{}'),'preferences_revision',coalesce(pref.revision,0),
  'message_fields',coalesce(meta,'{}'),
  'evidence',evidence);
end $$;

create function app_private.acknowledge_callup(p_fixture uuid,p_team uuid,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; f jsonb; saved jsonb; r app_private.callup_receipts;
begin
 if auth.uid() is null or not app_private.has_team_role(p_team,array['delegate']) then raise exception 'Delegate required' using errcode='42501'; end if;
 result:=app_private.read_club_callups(p_fixture,p_team); f:=result->'fixture';
 perform pg_advisory_xact_lock(hashtextextended('club-callup:'||(f->>'club_id'),0));
 result:=app_private.read_club_callups(p_fixture,p_team); saved:=result->'callup';
 if saved is null or not coalesce((saved->>'published')::boolean,false) or (saved->>'revision')::int is distinct from p_revision then
  raise exception 'La convocatòria ha canviat o no està publicada. Recarrega-la.' using errcode='40001'; end if;
 insert into app_private.callup_receipts(fixture_id,team_id,revision,reader_id)
 values((saved->>'fixture_id')::uuid,p_team,p_revision,auth.uid()) on conflict do nothing;
 select * into r from app_private.callup_receipts where fixture_id=(saved->>'fixture_id')::uuid and team_id=p_team and revision=p_revision and reader_id=auth.uid();
 return to_jsonb(r);
end $$;

create function app_private.save_callup_preferences(p_team uuid,p_revision integer,p_preferences jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare club uuid; r app_private.callup_preferences;
begin
 select club_id into club from public.teams where id=p_team;
 if not coalesce(app_private.callup_can_edit(club,p_team),false) then raise exception 'Coordinator required' using errcode='42501'; end if;
 if jsonb_typeof(p_preferences) is distinct from 'object' or octet_length(p_preferences::text)>3000
  or (p_preferences-'kit'-'street'-'margin_minutes')<>'{}' or
  (p_preferences?'kit' and (jsonb_typeof(p_preferences->'kit')<>'string' or length(p_preferences->>'kit')>300)) or
  (p_preferences?'street' and (jsonb_typeof(p_preferences->'street')<>'string' or length(p_preferences->>'street')>300)) or
  (p_preferences?'margin_minutes' and (jsonb_typeof(p_preferences->'margin_minutes')<>'number' or
   (p_preferences->>'margin_minutes')!~'^[0-9]+$' or (p_preferences->>'margin_minutes')::numeric not between 0 and 240)) then
  raise exception 'Invalid preferences' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('callup-pref:'||p_team::text,0));
 select * into r from app_private.callup_preferences where team_id=p_team;
 if p_revision is distinct from coalesce(r.revision,0) then raise exception 'Preferences changed' using errcode='40001'; end if;
 insert into app_private.callup_preferences(team_id,preferences,revision,updated_by) values(p_team,p_preferences,p_revision+1,auth.uid())
 on conflict(team_id) do update set preferences=excluded.preferences,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning * into r;
 return jsonb_build_object('preferences',r.preferences,'revision',r.revision);
end $$;

create function app_private.accept_callup_proposal(p_fixture uuid,p_team uuid,p_player uuid,p_confirmed boolean,p_position text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare club uuid; evidence jsonb; row jsonb; reviewed_position text; existing app_private.callup_roster; new_id uuid;
begin
 select club_id into club from public.teams where id=p_team;
 if p_confirmed is distinct from true or auth.uid() is null or not coalesce(
  app_private.is_platform_superadmin() or app_private.has_club_role(club,array['admin','general_coordinator']) or
  app_private.has_team_role(p_team,array['section_coordinator']),false) then raise exception 'Roster review permission required' using errcode='42501'; end if;
 evidence:=app_private.callup_roster_evidence(p_fixture,p_team,null);
 select value into row from jsonb_array_elements(case when evidence->>'official_verified'='true' then evidence->'official' else evidence->'appearances' end)
  where value->>'player_id'=p_player::text order by value->>'at' desc limit 1;
 if row is null then raise exception 'No verified own-team evidence' using errcode='22023'; end if;
 reviewed_position:=coalesce(row->>'position',p_position);
 if reviewed_position is null or reviewed_position not in ('field','goalkeeper') then raise exception 'Review player position before incorporation' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('club-csv:'||club::text,0));
 select * into existing from app_private.callup_roster where team_id=p_team and catalogue_player_id=p_player and active;
 if existing.id is not null then return existing.id; end if;
 if exists(select 1 from app_private.callup_roster where team_id=p_team and catalogue_player_id=p_player) then raise exception 'Existing inactive identity: review internal roster' using errcode='22023'; end if;
 if exists(select 1 from app_private.callup_roster r join public.teams t on t.id=r.team_id
  where r.active and ((r.catalogue_player_id=p_player and t.club_id=club and t.season_id=(select season_id from public.teams where id=p_team))
   or (r.team_id=p_team and lower(btrim(r.full_name))=lower(btrim(row->>'full_name'))))) then
  raise exception 'Possible duplicate or reinforcement: review internal identity and eligibility' using errcode='22023'; end if;
 insert into app_private.callup_roster(team_id,full_name,dorsal,position,catalogue_player_id)
 values(p_team,row->>'full_name',case when row->>'dorsal'~'^[0-9]{1,3}$' then row->>'dorsal' end,reviewed_position,p_player) returning id into new_id;
 insert into app_private.callup_proposal_reviews(team_id,player_id,reviewed_by,evidence) values(p_team,p_player,auth.uid(),row||jsonb_build_object('reviewed_position',reviewed_position))
 on conflict(team_id,player_id) do update set reviewed_by=excluded.reviewed_by,reviewed_at=now(),evidence=excluded.evidence;
 return new_id;
end $$;

create function public.read_callup_workflow(p_fixture uuid,p_team uuid) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.read_callup_workflow(p_fixture,p_team)$$;
revoke execute on function public.read_callup_workflow(uuid,uuid), app_private.read_callup_workflow(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_callup_workflow(uuid,uuid), app_private.read_callup_workflow(uuid,uuid) to authenticated;

create function public.read_roster_evidence(p_fixture uuid,p_team uuid default null,p_side text default null) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.callup_roster_evidence(p_fixture,p_team,p_side)$$;
revoke execute on function public.read_roster_evidence(uuid,uuid,text), app_private.callup_roster_evidence(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.read_roster_evidence(uuid,uuid,text), app_private.callup_roster_evidence(uuid,uuid,text) to authenticated;

create function public.acknowledge_callup(p_fixture uuid,p_team uuid,p_revision integer) returns jsonb language sql security invoker set search_path='' as $$select app_private.acknowledge_callup(p_fixture,p_team,p_revision)$$;
revoke execute on function public.acknowledge_callup(uuid,uuid,integer), app_private.acknowledge_callup(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.acknowledge_callup(uuid,uuid,integer), app_private.acknowledge_callup(uuid,uuid,integer) to authenticated;

create function public.save_callup_preferences(p_team uuid,p_revision integer,p_preferences jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.save_callup_preferences(p_team,p_revision,p_preferences)$$;
revoke execute on function public.save_callup_preferences(uuid,integer,jsonb), app_private.save_callup_preferences(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_callup_preferences(uuid,integer,jsonb), app_private.save_callup_preferences(uuid,integer,jsonb) to authenticated;

create function public.accept_callup_proposal(p_fixture uuid,p_team uuid,p_player uuid,p_confirmed boolean,p_position text default null) returns uuid language sql security invoker set search_path='' as $$select app_private.accept_callup_proposal(p_fixture,p_team,p_player,p_confirmed,p_position)$$;
revoke execute on function public.accept_callup_proposal(uuid,uuid,uuid,boolean,text), app_private.accept_callup_proposal(uuid,uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.accept_callup_proposal(uuid,uuid,uuid,boolean,text), app_private.accept_callup_proposal(uuid,uuid,uuid,boolean,text) to authenticated;

-- Extend the existing operator preparation catalogue, not an alternative importer.
create or replace function app_private.pilot_roster_catalogue(p_match uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare season jsonb; evidence jsonb; item jsonb; target_side text; begin
 if not app_private.pilot_can_prepare(p_match) then raise exception 'Match operator and verified calendar required' using errcode='42501';end if;
 season:=(select coalesce(jsonb_agg(jsonb_build_object('roster_id',r.id,'team',side.value,'full_name',r.display_name,
 'dorsal',r.shirt_number,'position',case when r.raw_data->>'position'='goalkeeper' or r.raw_data->>'is_goalkeeper'='true' then 'goalkeeper' else 'field' end,
 'federation_player_id',p.external_player_id,'source_url',e.source_url,'fetched_at',r.fetched_at) order by side.value,r.display_name),'[]')
 from public.stats_matches sm join public.federation_match_sources src on src.match_id=sm.match_id
 join public.federation_competitions c on c.club_id=sm.club_id and c.season_id=sm.season_id and c.federation=src.federation and c.external_competition_id=src.competition_id
 cross join lateral (values('home'),('away'))side(value)
 join public.federation_team_entries e on e.competition_id=c.id and e.raw_data->>'verification'='official' and e.external_team_id=case side.value when 'home' then sm.home_external_team_id else sm.away_external_team_id end
 join public.federation_team_roster r on r.entry_id=e.id and r.role='player' and coalesce(r.raw_data->>'active_in_latest_roster','true')<>'false'
 join public.federation_players p on p.id=r.player_id and p.federation=src.federation and p.external_player_id~'^[1-9][0-9]*$'
 where sm.match_id=p_match);
 for target_side in select value from (values('home'),('away')) sides(value) where not exists(
  select 1 from public.stats_matches sm join public.teams t on t.id=case sides.value when 'home' then sm.home_team_id else sm.away_team_id end and t.club_id=sm.club_id where sm.match_id=p_match
 ) loop
  evidence:=app_private.callup_roster_evidence(p_match,null,target_side);
  if evidence->'scope' is null or evidence->'scope'='null' then continue; end if;
  if evidence->>'official_verified'='true' then
   select coalesce(jsonb_agg(x),'[]') into season from jsonb_array_elements(season) x where x->>'team'<>target_side;
   continue; -- Current official reports use the existing official import path.
  end if;
  for item in select distinct on (x->>'player_id') x from jsonb_array_elements(evidence->'appearances') x
    where x->>'external_player_id'~'^[1-9][0-9]*$' order by x->>'player_id',x->>'at' desc loop
   if exists(select 1 from jsonb_array_elements(season)x where x->>'team'=target_side and x->>'federation_player_id'=item->>'external_player_id') then
    select coalesce(jsonb_agg(x),'[]') into season from jsonb_array_elements(season)x where not(x->>'team'=target_side and x->>'federation_player_id'=item->>'external_player_id');
   end if;
   season:=season||jsonb_build_array(jsonb_build_object('roster_id','history:'||target_side||':'||(item->>'player_id'),
    'team',target_side,'full_name',item->>'full_name','dorsal',item->>'dorsal','position',item->>'position',
    'federation_player_id',item->>'external_player_id','source_url',coalesce(item->>'source_url','')||'#provisional-history='||(item->>'match_id'),
    'prediction',true,'evidence',jsonb_build_object('scope',evidence->'scope','report_count',(select count(distinct x->>'match_id') from jsonb_array_elements(evidence->'appearances') x),'appearances',(select jsonb_agg(x) from jsonb_array_elements(evidence->'appearances') x where x->>'player_id'=item->>'player_id'))));
  end loop;
 end loop;
 return season;
end $$;

create function app_private.read_callup_week_workflow(p_monday date,p_club uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare matches jsonb;
begin
 matches:=app_private.read_club_callup_week(p_monday,p_club);
 return coalesce((select jsonb_agg(item.value||jsonb_build_object(
  'competition_name',coalesce(to_jsonb(comp)->>'name',to_jsonb(comp)->>'display_name'),
  'round',m.raw_data->>'round','provisional',m.raw_data->>'provisional'='true',
  'receipt_state',case when saved.published then case when exists(select 1 from app_private.callup_receipts r
   where r.fixture_id=saved.fixture_id and r.team_id=saved.team_id and r.revision=saved.revision)
   then 'read' else 'pending' end end) order by item.value->>'starts_at',item.value->>'team_name')
 from jsonb_array_elements(matches) item(value)
 left join public.federation_matches m on m.id=(item.value->>'fixture_id')::uuid
 left join public.federation_groups g on g.id=m.group_id
 left join public.federation_competitions comp on comp.id=g.competition_id
 left join lateral(select cc.* from app_private.club_callups cc
  where cc.team_id=(item.value->>'team_id')::uuid
   and cc.fixture_id in((item.value->>'fixture_id')::uuid,(item.value->>'base_match_id')::uuid)
   and cc.published order by (cc.fixture_id=(item.value->>'fixture_id')::uuid) desc limit 1) saved on true),'[]');
end $$;
create function public.read_callup_week_workflow(p_monday date,p_club uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$ select app_private.read_callup_week_workflow(p_monday,p_club) $$;
revoke execute on function app_private.read_callup_week_workflow(date,uuid),public.read_callup_week_workflow(date,uuid) from public,anon,authenticated;
grant execute on function app_private.read_callup_week_workflow(date,uuid),public.read_callup_week_workflow(date,uuid) to authenticated;

create index callup_receipt_reader_idx on app_private.callup_receipts(reader_id);
create index callup_preferences_author_idx on app_private.callup_preferences(updated_by);
create index callup_proposal_player_idx on app_private.callup_proposal_reviews(player_id);
create index callup_proposal_author_idx on app_private.callup_proposal_reviews(reviewed_by);
