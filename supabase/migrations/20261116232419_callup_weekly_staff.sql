alter table app_private.club_callups add column staff jsonb not null default '{}';
alter table app_private.club_callup_history add column staff jsonb not null default '{}';

create function app_private.normalize_callup_staff(p_staff jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare kind text; names jsonb; name jsonb; value text; normalized text[]; result jsonb:='{}';
begin
 if p_staff is null then return null; end if;
 if jsonb_typeof(p_staff)<>'object' or octet_length(p_staff::text)>4500
  or (p_staff-'coaches'-'delegates')<>'{}'::jsonb then
  raise exception 'Responsables de partit no vàlids.' using errcode='22023';
 end if;
 foreach kind in array array['coaches','delegates'] loop
  names:=coalesce(p_staff->kind,'[]'::jsonb);
  normalized:='{}';
  if jsonb_typeof(names)<>'array' or jsonb_array_length(names)>8 then
   raise exception 'Indica un màxim de vuit responsables per rol.' using errcode='22023';
  end if;
  for name in select x from jsonb_array_elements(names) x loop
   value:=btrim(regexp_replace(name#>>'{}','[[:space:]]+',' ','g'));
   if jsonb_typeof(name)<>'string' or length(value) not between 1 and 120 then
    raise exception 'Revisa el nom del responsable de partit.' using errcode='22023';
   end if;
   if not exists(select 1 from unnest(normalized) n where lower(n)=lower(value)) then
    normalized:=array_append(normalized,value);
   end if;
  end loop;
  if cardinality(normalized)>0 then result:=result||jsonb_build_object(kind,normalized); end if;
 end loop;
 return result;
end
$$;

create function app_private.save_club_callup_with_staff(p_fixture uuid,p_team uuid,p_revision integer,p_players uuid[],
 p_publish boolean,p_acknowledged uuid[],p_staff jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f app_private.callup_fixtures; c app_private.club_callups; players jsonb; conflicts uuid[]; next_revision integer; storage_id uuid; staff_snapshot jsonb;
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
 staff_snapshot:=coalesce(app_private.normalize_callup_staff(p_staff),c.staff,'{}'::jsonb);
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
 if c.players=players and c.published=p_publish and c.staff=staff_snapshot then
  return jsonb_build_object('revision',c.revision,'overlaps',conflicts);
 end if;
 next_revision:=p_revision+1;
 insert into app_private.club_callups(fixture_id,team_id,revision,published,players,updated_at,staff)
 values(storage_id,p_team,next_revision,p_publish,players,now(),staff_snapshot)
 on conflict(fixture_id,team_id) do update
 set revision=excluded.revision,published=excluded.published,players=excluded.players,updated_at=excluded.updated_at,staff=excluded.staff;
 if p_publish then
  insert into app_private.club_callup_history(fixture_id,team_id,revision,players,published_by,staff)
  values(storage_id,p_team,next_revision,players,auth.uid(),staff_snapshot);
 end if;
 return jsonb_build_object('revision',next_revision,'overlaps',conflicts);
end
$$;

create or replace function app_private.save_club_callup(p_fixture uuid,p_team uuid,p_revision integer,
 p_players uuid[],p_publish boolean,p_acknowledged uuid[])
returns jsonb language sql security definer set search_path='' as $$
 select app_private.save_club_callup_with_staff(p_fixture,p_team,p_revision,p_players,p_publish,p_acknowledged,null)
$$;

create function public.save_club_callup_with_staff(p_fixture uuid,p_team uuid,p_revision integer,
 p_players uuid[],p_publish boolean,p_staff jsonb,p_acknowledged uuid[] default '{}')
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.save_club_callup_with_staff(p_fixture,p_team,p_revision,p_players,p_publish,p_acknowledged,p_staff)
$$;

create function public.read_club_callup_detail(p_fixture uuid,p_team uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.read_club_callups(p_fixture,p_team)||jsonb_build_object('staff_supported',true)
$$;

create function app_private.read_club_callup_week(p_monday date,p_club uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Cal iniciar sessió.' using errcode='42501'; end if;
 if p_monday is null or extract(isodow from p_monday)<>1 then
  raise exception 'Indica el dilluns de la setmana.' using errcode='22023';
 end if;
 return coalesce((
  select jsonb_agg(to_jsonb(q) order by starts_at,team_name,fixture_id,team_id) from (
   select x.*,cl.name club_name,
    app_private.callup_can_edit(x.club_id,x.team_id) can_edit,
    saved.published,saved.revision,
    saved.published and saved.revision>1 and exists(select 1 from app_private.club_callup_history h
      where h.fixture_id=saved.fixture_id and h.team_id=x.team_id and h.revision<saved.revision) modified,
    case when saved.published then saved.players end published_players,
    case when saved.published then saved.staff end published_staff
   from app_private.callup_fixtures x
   join public.clubs cl on cl.id=x.club_id
   left join lateral (
    select c.* from app_private.club_callups c where c.team_id=x.team_id
    and c.fixture_id in (x.fixture_id,x.base_match_id)
    and (c.published or app_private.callup_can_edit(x.club_id,x.team_id))
    order by (c.fixture_id=x.fixture_id) desc limit 1
   ) saved on true
   where x.starts_at>=p_monday::timestamp at time zone 'Europe/Madrid'
    and x.starts_at<(p_monday+7)::timestamp at time zone 'Europe/Madrid'
    and (p_club is null or x.club_id=p_club)
    and (app_private.callup_can_edit(x.club_id,x.team_id)
     or app_private.has_team_role(x.team_id,array['coach','delegate']))
  ) q
 ),'[]'::jsonb);
end
$$;

create function public.read_club_callup_week(p_monday date,p_club uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.read_club_callup_week(p_monday,p_club)
$$;

revoke execute on function app_private.normalize_callup_staff(jsonb),
 app_private.save_club_callup_with_staff(uuid,uuid,integer,uuid[],boolean,uuid[],jsonb),
 public.save_club_callup_with_staff(uuid,uuid,integer,uuid[],boolean,jsonb,uuid[]),
 public.read_club_callup_detail(uuid,uuid),
 app_private.read_club_callup_week(date,uuid),public.read_club_callup_week(date,uuid)
 from public,anon,authenticated;
grant execute on function app_private.save_club_callup_with_staff(uuid,uuid,integer,uuid[],boolean,uuid[],jsonb),
 public.save_club_callup_with_staff(uuid,uuid,integer,uuid[],boolean,jsonb,uuid[]),
 public.read_club_callup_detail(uuid,uuid),
 app_private.read_club_callup_week(date,uuid),public.read_club_callup_week(date,uuid)
 to authenticated;
