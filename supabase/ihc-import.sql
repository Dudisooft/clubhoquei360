-- Additive IHC season import. Does not create users, memberships or operational matches.
alter table public.teams add column if not exists short_name text;
alter table public.teams add column if not exists verification_status text;
alter table public.teams add column if not exists source_url text;
create table if not exists public.club_staff_people(
 id uuid primary key,club_id uuid not null references public.clubs(id),federation text not null check(federation in ('FECAPA','RFEP')),
 external_person_id text,display_name text not null,source_url text not null,fetched_at timestamptz not null,
 unique(club_id,federation,external_person_id)
);
alter table public.club_staff_people enable row level security;
create policy staff_club_read on public.club_staff_people for select to authenticated using(exists(select 1 from public.federation_team_roster r join public.federation_team_entries e on e.id=r.entry_id join public.federation_competitions c on c.id=e.competition_id where r.external_person_id=club_staff_people.external_person_id and r.role='staff' and c.club_id=club_staff_people.club_id and c.federation=club_staff_people.federation));
alter table public.federation_team_roster add column if not exists staff_person_id uuid references public.club_staff_people(id);
create table if not exists public.federation_match_teams(
 match_id uuid not null references public.federation_matches(id),entry_id uuid not null references public.federation_team_entries(id),
 side text not null check(side in ('home','away')),primary key(match_id,entry_id)
);
alter table public.federation_match_teams enable row level security;
create policy match_teams_club_read on public.federation_match_teams for select to authenticated using(exists(select 1 from public.federation_team_entries e where e.id=federation_match_teams.entry_id));
-- No new client GRANTs: existing access remains unchanged. New data is server-only until existing club access is configured.
grant select,insert,update on public.club_staff_people,public.federation_match_teams to service_role;
create or replace function public.federation_commit_ihc(p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c uuid; s uuid; comp uuid; grp uuid; tid uuid; ent uuid; pid uuid; staffid uuid; mid uuid; ownentry uuid;
 personkey text; team jsonb; person jsonb; fixture jsonb; gid text; fed text; cid text; side_label text; stamp timestamptz;
 nteams int:=0; npeople int:=0; nmatches int:=0;
begin
 fed:=p_data->>'federation';cid:=p_data->>'id';
 if fed is null or fed not in ('FECAPA','RFEP') or cid is null or cid !~ '^[1-9][0-9]*$' or p_data->>'season_id' is distinct from '41' or p_data->>'club_external_id' is distinct from (case when fed='FECAPA' then '252' else '69' end) then raise exception 'IHC import scope mismatch';end if;
 if jsonb_typeof(p_data->'teams') is distinct from 'array' or jsonb_array_length(p_data->'teams')=0 or jsonb_typeof(p_data->'matches') is distinct from 'array' or jsonb_array_length(p_data->'matches')=0 then raise exception 'Empty import rejected';end if;
 if fed='FECAPA' and cid='4802' then return jsonb_build_object('status','preserved_fem15');end if;
 perform pg_advisory_xact_lock(hashtextextended('ihc:'||fed||':'||cid,0));
 c:=md5('clubhoquei360:fecapa:club:252')::uuid;select id into strict s from public.seasons where club_id=c and label='2026/27';stamp:=(p_data->>'fetched_at')::timestamptz;
 comp:=md5('clubhoquei360:'||lower(fed)||':41:competition:'||cid)::uuid;
 insert into public.federation_competitions(id,club_id,season_id,federation,external_competition_id,name,category) values(comp,c,s,fed,cid,p_data->>'name',p_data->>'name') on conflict(club_id,federation,external_competition_id) do nothing;
 select id into strict comp from public.federation_competitions where club_id=c and federation=fed and external_competition_id=cid;
 for fixture in select value from jsonb_array_elements(p_data->'matches') loop
  gid:=fixture->>'group_id';if gid !~ '^[1-9][0-9]*$' then raise exception 'Invalid group';end if;
  grp:=md5('clubhoquei360:'||lower(fed)||':41:group:'||gid)::uuid;
  insert into public.federation_groups(id,competition_id,external_group_id,name) values(grp,comp,gid,fixture->>'group_name') on conflict(competition_id,external_group_id) do nothing;
 end loop;
 for team in select value from jsonb_array_elements(p_data->'teams') loop
  if team->>'external_team_id' !~ '^[1-9][0-9]*$' or team->>'verification' is distinct from 'official' or team->>'name' not ilike '%IGUALADA%' or team->>'name' ilike '%FEMEN%' then raise exception 'Unverified IHC team';end if;
  tid:=md5('clubhoquei360:'||lower(fed)||':41:team:'||(team->>'external_team_id'))::uuid;
  -- Same first team verified across the official competition calendars and the club's municipal match report.
  if (fed='FECAPA' and team->>'external_team_id'='12074') or (fed='RFEP' and team->>'external_team_id'='3696') then tid:=md5('clubhoquei360:ihc:41:first-team')::uuid;end if;
  insert into public.teams(id,club_id,season_id,name,category,short_name,verification_status,source_url) values(tid,c,s,case when tid=md5('clubhoquei360:ihc:41:first-team')::uuid then 'IGUALADA RIGAT HC' else team->>'name' end,case when tid=md5('clubhoquei360:ihc:41:first-team')::uuid then 'SÈNIOR · primer equip' else team->>'category' end,team->>'short_name','verified',p_data->>'source_url') on conflict(id) do nothing;
  select id into strict grp from public.federation_groups where competition_id=comp and external_group_id=team->'group_ids'->>0;
  ent:=md5('clubhoquei360:'||lower(fed)||':41:'||cid||':team:'||(team->>'external_team_id'))::uuid;
  insert into public.federation_team_entries(id,competition_id,group_id,external_team_id,display_name,club_team_id,source_url,fetched_at,raw_data) values(ent,comp,grp,team->>'external_team_id',team->>'name',tid,p_data->>'source_url',stamp,(team-'roster')||jsonb_build_object('season_id','41','club_external_id',p_data->>'club_external_id','standings',p_data->'standings','standings_status',p_data->>'standings_status','importer','ihc-v1'))
  on conflict(competition_id,external_team_id) do update set fetched_at=excluded.fetched_at,raw_data=public.federation_team_entries.raw_data||excluded.raw_data;
  select id into strict ent from public.federation_team_entries where competition_id=comp and external_team_id=team->>'external_team_id';
  if jsonb_array_length(team->'roster')>0 then update public.federation_team_roster set raw_data=jsonb_set(raw_data,'{active_in_latest_roster}','false'::jsonb) where entry_id=ent;end if;
  for person in select value from jsonb_array_elements(team->'roster') loop
   pid:=null;staffid:=null;personkey:=coalesce(person->>'external_id','entry:'||ent::text||':'||(person->>'name')||':'||coalesce(person->>'staff_role','staff'));if nullif(person->>'name','') is null or (person->>'external_id' is not null and person->>'external_id' !~ '^[1-9][0-9]*$') or (person->>'external_id' is null and (person->>'role'<>'staff' or person->>'identity_status' is distinct from 'no_federative_identifier')) then raise exception 'Invalid person identity';end if;
   if person->>'role'='player' then
    if person->>'external_id' is null then raise exception 'Missing player identifier';end if;
    pid:=md5('clubhoquei360:'||lower(fed)||':player:'||(person->>'external_id'))::uuid;
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
  mid:=md5('clubhoquei360:ihc:match:'||(fixture->>'fingerprint'))::uuid;
  insert into public.federation_matches(id,group_id,external_match_id,match_fingerprint,round_label,home_team,away_team,federation_start_at,venue,home_score,away_score,fetched_at,raw_data)
  values(mid,grp,fixture->>'match_id',fixture->>'fingerprint',fixture->>'round',fixture->>'home_name',fixture->>'away_name',case when nullif(fixture->>'date','') is not null and nullif(fixture->>'time','') is not null then (to_date(fixture->>'date','DD/MM/YYYY')+coalesce(nullif(fixture->>'time',''),'00:00')::time) at time zone 'Europe/Madrid' else null end,nullif(fixture->>'venue',''),(fixture->>'home_score')::integer,(fixture->>'away_score')::integer,stamp,fixture||jsonb_build_object('source_url',p_data->>'source_url','data_layer','public_federation','external_id_status',case when fixture->>'match_id' is null then 'not_published' else 'verified' end))
  on conflict(group_id,match_fingerprint) where match_fingerprint is not null do update set external_match_id=coalesce(excluded.external_match_id,public.federation_matches.external_match_id),federation_start_at=coalesce(excluded.federation_start_at,public.federation_matches.federation_start_at),venue=coalesce(excluded.venue,public.federation_matches.venue),home_score=coalesce(excluded.home_score,public.federation_matches.home_score),away_score=coalesce(excluded.away_score,public.federation_matches.away_score),fetched_at=excluded.fetched_at,raw_data=public.federation_matches.raw_data||jsonb_strip_nulls(excluded.raw_data);
  select id into strict mid from public.federation_matches where group_id=grp and match_fingerprint=fixture->>'fingerprint';
  for side_label in select value#>>'{}' from jsonb_array_elements(fixture->'club_sides') loop
   if side_label not in ('home','away') then raise exception 'Invalid side';end if;
   select id into strict ownentry from public.federation_team_entries where competition_id=comp and external_team_id=fixture->>(side_label||'_team_id');
   insert into public.federation_match_teams(match_id,entry_id,side) values(mid,ownentry,side_label) on conflict do nothing;
  end loop;nmatches:=nmatches+1;
 end loop;
 return jsonb_build_object('status','verified','teams',nteams,'roster_entries',npeople,'matches',nmatches);
end $$;
revoke all on function public.federation_commit_ihc(jsonb) from public,anon,authenticated;
grant execute on function public.federation_commit_ihc(jsonb) to service_role;
-- Default privileges must not accidentally create new client access.
revoke all on public.club_staff_people,public.federation_match_teams from anon,authenticated;
-- Link the already verified FEM15 data without rewriting any existing FEM15 row.
insert into public.federation_match_teams(match_id,entry_id,side)
select m.id,e.id,case when m.raw_data->>'home_team_id'=e.external_team_id then 'home' else 'away' end
from public.federation_matches m join public.federation_groups g on g.id=m.group_id
join public.federation_team_entries e on e.competition_id=g.competition_id
join public.federation_competitions c on c.id=e.competition_id
where c.federation='FECAPA' and c.external_competition_id='4802' and e.external_team_id='12419'
and e.external_team_id in(m.raw_data->>'home_team_id',m.raw_data->>'away_team_id') on conflict do nothing;
insert into public.club_staff_people(id,club_id,federation,external_person_id,display_name,source_url,fetched_at)
select md5('clubhoquei360:staff:'||c.club_id::text||':'||c.federation||':'||r.external_person_id)::uuid,c.club_id,c.federation,r.external_person_id,r.display_name,e.source_url,r.fetched_at
from public.federation_team_roster r join public.federation_team_entries e on e.id=r.entry_id join public.federation_competitions c on c.id=e.competition_id
where r.role='staff' and r.external_person_id is not null and c.federation='FECAPA' and c.external_competition_id='4802' on conflict do nothing;
