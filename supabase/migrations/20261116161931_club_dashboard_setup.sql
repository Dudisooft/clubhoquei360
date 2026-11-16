create function app_private.club_setup_access()
returns jsonb language sql stable security definer set search_path='' as $$
 with access as (select auth.uid() uid, app_private.is_platform_superadmin() global_admin),
 teams as (
  select t.id,t.club_id,t.season_id,t.name team_name,s.label season_name,c.name club_name,
   app_private.callup_can_edit(t.club_id,t.id)
    or app_private.has_team_role(t.id,array['coach','delegate']) operational,
   a.global_admin or app_private.has_club_role(t.club_id,array['admin','general_coordinator'])
    or app_private.has_team_role(t.id,array['section_coordinator']) roster_import
  from public.teams t join public.seasons s on s.id=t.season_id and s.club_id=t.club_id
  join public.clubs c on c.id=t.club_id cross join access a where a.uid is not null
 ),
 clubs as (
  select c.id,c.name from public.clubs c cross join access a where a.uid is not null
   and (a.global_admin or app_private.has_club_role(c.id,array['admin','general_coordinator']))
 )
 select jsonb_build_object(
  'global_admin',coalesce(a.global_admin,false) and a.uid is not null,
  'clubs',coalesce((select jsonb_agg(to_jsonb(c) order by c.name,c.id) from clubs c),'[]'::jsonb),
  'seasons',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'club_id',s.club_id,'label',s.label)
    order by s.label desc,s.id) from public.seasons s join clubs c on c.id=s.club_id),'[]'::jsonb),
  'teams',coalesce((select jsonb_agg(to_jsonb(t) order by t.club_name,t.season_name desc,t.team_name,t.id)
    from teams t where t.operational or t.roster_import),'[]'::jsonb)
 ) from access a;
$$;

-- Compare names conservatively. Existing records, including inactive players, are never overwritten.
create function app_private.club_import_key(p_name text)
returns text language sql immutable set search_path='' as $$
 select lower(btrim(regexp_replace(p_name,'[[:space:]]+',' ','g')))
$$;

create function app_private.import_club_csv(p_kind text,p_scope uuid,p_rows jsonb,p_preview jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 club uuid;
 item jsonb;
 pos integer:=0;
 name text;
 category text;
 dorsal text;
 player_position text;
 starts date;
 ends date;
 identity_key text;
 seen text[]:='{}';
 duplicates integer;
 decision text;
 plan jsonb:='[]';
begin
 if auth.uid() is null then raise exception 'Cal iniciar sessió.' using errcode='42501'; end if;
 case p_kind
  when 'clubs' then
   if p_scope is not null or not coalesce(app_private.is_platform_superadmin(),false) then
    raise exception 'Cal permís de superadministració.' using errcode='42501';
   end if;
  when 'seasons' then select c.id into club from public.clubs c where c.id=p_scope;
  when 'teams' then select s.club_id into club from public.seasons s where s.id=p_scope;
  when 'roster' then select t.club_id into club from public.teams t where t.id=p_scope;
  else raise exception 'Tipus d’importació desconegut.' using errcode='22023';
 end case;
 if p_kind<>'clubs' and (club is null or not coalesce(
  app_private.is_platform_superadmin() or app_private.has_club_role(club,array['admin','general_coordinator'])
   or (p_kind='roster' and app_private.has_team_role(p_scope,array['section_coordinator'])),false)) then
  raise exception 'No tens permís per importar en aquest àmbit.' using errcode='42501';
 end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or octet_length(p_rows::text)>300000 then
  raise exception 'Fitxer CSV no vàlid o massa gran.' using errcode='22023';
 end if;
 if jsonb_array_length(p_rows) not between 1 and 500 then
  raise exception 'El CSV ha de contenir entre 1 i 500 files de dades.' using errcode='22023';
 end if;
 if p_preview is not null then
  perform pg_advisory_xact_lock(hashtextextended('club-csv:'||coalesce(club::text,'clubs'),0));
 end if;
 for item in select value from jsonb_array_elements(p_rows) loop
  pos:=pos+1;
  name:=btrim(regexp_replace(coalesce(item->>'nom',''),'[[:space:]]+',' ','g'));
  category:=nullif(btrim(item->>'categoria'),'');
  dorsal:=nullif(btrim(item->>'dorsal'),'');
  player_position:=item->>'posicio';
  identity_key:=app_private.club_import_key(name);
  if jsonb_typeof(item)<>'object' or length(name) not between 1 and 120 then
   raise exception 'Fila %: el nom ha de tenir entre 1 i 120 caràcters.',pos+1 using errcode='22023';
  end if;
  case p_kind
   when 'clubs' then
    select count(*) into duplicates from public.clubs c where app_private.club_import_key(c.name)=identity_key;
   when 'seasons' then
    if coalesce(item->>'inici','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or coalesce(item->>'fi','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
     raise exception 'Fila %: les dates han de seguir el format AAAA-MM-DD.',pos+1 using errcode='22023';
    end if;
    starts:=(item->>'inici')::date;
    ends:=(item->>'fi')::date;
    if starts>=ends then raise exception 'Fila %: la data final ha de ser posterior a la inicial.',pos+1 using errcode='22023'; end if;
    select count(*) into duplicates from public.seasons s where s.club_id=club and app_private.club_import_key(s.label)=identity_key;
   when 'teams' then
    if length(category)>120 then raise exception 'Fila %: categoria massa llarga.',pos+1 using errcode='22023'; end if;
    select count(*) into duplicates from public.teams t where t.season_id=p_scope and app_private.club_import_key(t.name)=identity_key;
   when 'roster' then
    if (dorsal is not null and dorsal !~ '^[0-9]{1,3}$')
     or coalesce(player_position,'') not in ('pista','porteria') then
     raise exception 'Fila %: revisa el dorsal i la posició (pista o porteria).',pos+1 using errcode='22023';
    end if;
    select count(*) into duplicates from app_private.callup_roster r where r.team_id=p_scope and app_private.club_import_key(r.full_name)=identity_key;
  end case;
  decision:=case when identity_key=any(seen) then 'repeated'
   when duplicates>1 then 'ambiguous' when duplicates=1 then 'existing' else 'new' end;
  seen:=array_append(seen,identity_key);
  plan:=plan||jsonb_build_array(jsonb_build_object('row',pos+1,'name',name,'status',decision,
   'category',category,'dorsal',dorsal,'position',player_position,
   'starts_on',case when p_kind='seasons' then starts end,
   'ends_on',case when p_kind='seasons' then ends end));
  if p_preview is not null and decision='new' then
   case p_kind
    when 'clubs' then insert into public.clubs(name) values(name);
    when 'seasons' then insert into public.seasons(club_id,label,starts_on,ends_on) values(club,name,starts,ends);
    when 'teams' then insert into public.teams(club_id,season_id,name,category) values(club,p_scope,name,category);
    when 'roster' then insert into app_private.callup_roster(team_id,full_name,dorsal,position)
     values(p_scope,name,dorsal,case player_position when 'porteria' then 'goalkeeper' else 'field' end);
   end case;
  end if;
 end loop;
 if p_preview is not null and p_preview is distinct from plan then
  raise exception 'Les dades han canviat. Torna a previsualitzar el fitxer.' using errcode='40001';
 end if;
 return plan;
end
$$;

create function public.club_setup_access()
returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.club_setup_access()
$$;

create function public.import_club_csv(p_kind text,p_scope uuid,p_rows jsonb,p_preview jsonb default null)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.import_club_csv(p_kind,p_scope,p_rows,p_preview)
$$;

revoke execute on function app_private.club_import_key(text),
 app_private.club_setup_access(),public.club_setup_access(),
 app_private.import_club_csv(text,uuid,jsonb,jsonb),public.import_club_csv(text,uuid,jsonb,jsonb)
 from public,anon,authenticated;
grant execute on function app_private.club_setup_access(),public.club_setup_access(),
 app_private.import_club_csv(text,uuid,jsonb,jsonb),public.import_club_csv(text,uuid,jsonb,jsonb)
 to authenticated;
