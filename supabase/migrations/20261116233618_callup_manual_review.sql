create table app_private.club_callup_draft_history (
 fixture_id uuid not null,
 team_id uuid not null,
 revision integer not null,
 players jsonb not null,
 staff jsonb not null,
 saved_at timestamptz not null,
 saved_by uuid not null references auth.users(id),
 primary key(fixture_id,team_id,revision),
 foreign key(fixture_id,team_id) references app_private.club_callups(fixture_id,team_id) on delete cascade
);
alter table app_private.club_callup_draft_history enable row level security;
revoke all on app_private.club_callup_draft_history from public,anon,authenticated;

create function app_private.record_callup_draft()
returns trigger language plpgsql set search_path='' as $$
begin
 insert into app_private.club_callup_draft_history
  (fixture_id,team_id,revision,players,staff,saved_at,saved_by)
 values(new.fixture_id,new.team_id,new.revision,new.players,new.staff,new.updated_at,auth.uid());
 return new;
end
$$;
revoke execute on function app_private.record_callup_draft() from public,anon,authenticated;
create trigger record_callup_draft
 after insert or update on app_private.club_callups
 for each row when (not new.published) execute function app_private.record_callup_draft();

create function app_private.read_callup_manual_review(p_fixture uuid,p_team uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; catalogue_id uuid; storage_id uuid; lineup jsonb;
begin
 if p_fixture is null or p_team is null then
  raise exception 'Cal indicar el partit i l’equip.' using errcode='22023';
 end if;
 result:=app_private.read_club_callups(p_fixture,p_team)||jsonb_build_object('staff_supported',true);
 if not coalesce((result->>'can_edit')::boolean,false) then return result; end if;
 storage_id:=(result#>>'{callup,fixture_id}')::uuid;
 catalogue_id:=(result#>>'{fixture,fixture_id}')::uuid;

 -- Only a verified, separate catalogue acta for the requested side is comparable.
 if result#>>'{fixture,kind}'='catalogue' and exists (
  select 1 from public.federation_matches m where m.id=catalogue_id and m.raw_data->>'report_status'='verified'
 ) then
  select jsonb_agg(jsonb_build_object('catalogue_player_id',l.player_id,'name',l.display_name,'dorsal',l.shirt_number)
   order by l.display_name,l.id) into lineup
  from public.federation_match_lineups l
  where l.match_id=catalogue_id and l.side=result#>>'{fixture,side}';
 end if;
 return result||jsonb_build_object(
  'official_lineup',lineup,
  'draft_history',coalesce((
   select jsonb_agg(to_jsonb(d)-'saved_by' order by d.revision desc)
   from app_private.club_callup_draft_history d where d.fixture_id=storage_id and d.team_id=p_team
  ),'[]'::jsonb)
 );
end
$$;

create or replace function public.read_club_callup_detail(p_fixture uuid,p_team uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.read_callup_manual_review(p_fixture,p_team)
$$;
revoke execute on function app_private.read_callup_manual_review(uuid,uuid) from public,anon,authenticated;
grant execute on function app_private.read_callup_manual_review(uuid,uuid) to authenticated;
