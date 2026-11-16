-- Load in the same isolated session that previews and rehearses the batch.
-- Existing tables, roles and RPCs require no installation for this procedure.
create or replace function pg_temp.reconcile_federation_codes(
 p_club uuid, p_season uuid, p_federation text, p_rows jsonb, p_apply boolean default false
) returns table (fixture uuid, official_code text, outcome text)
language plpgsql security invoker set search_path = ''
as $procedure$
declare
 entry jsonb;
 competition uuid;
 target uuid;
 previous_code text;
begin
 if p_club is null or p_season is null or p_apply is null or
    p_federation is null or p_federation not in ('FECAPA','RFEP') or
    jsonb_typeof(p_rows) is distinct from 'array' then
  raise exception 'Invalid federation batch scope';
 end if;
 if jsonb_array_length(p_rows) not between 1 and 100 then
  raise exception 'A batch must have between 1 and 100 entries';
 end if;
 if exists (
  select 1 from jsonb_array_elements(p_rows) as input(item)
  group by item->>'competition', item->>'report' having count(*)>1
 ) or exists (
  select 1 from jsonb_array_elements(p_rows) as input(item)
  group by item->>'competition',item->>'groupId',upper(regexp_replace(btrim(item->>'round'),'\s+',' ','g')),item->>'home',item->>'away'
  having count(*)>1
 ) then
  raise exception 'Conflicting official fixture identity in batch';
 end if;
 if p_apply then
  lock table public.federation_matches in share row exclusive mode;
 end if;
 for entry in select value from jsonb_array_elements(p_rows) loop
  if exists (
   select 1 from unnest(array['competition','groupId','report','home','away']) as field(name)
   where coalesce(entry->>field.name,'') !~ '^[1-9][0-9]{0,9}$'
  ) or coalesce(btrim(entry->>'round'),'')='' or entry->>'home'=entry->>'away' then
   raise exception 'Incomplete official fixture identity';
  end if;
  select c.id into strict competition from public.federation_competitions c
   where c.club_id=p_club and c.season_id=p_season and c.federation=p_federation
    and c.external_competition_id=entry->>'competition';
  select m.id,m.external_match_id into strict target,previous_code
   from public.federation_matches m
   join public.federation_groups g on g.id=m.group_id
   where g.competition_id=competition and g.external_group_id=entry->>'groupId'
    and upper(regexp_replace(btrim(m.round_label),'\s+',' ','g'))=upper(regexp_replace(btrim(entry->>'round'),'\s+',' ','g'))
    and m.raw_data->>'home_team_id'=entry->>'home' and m.raw_data->>'away_team_id'=entry->>'away'
    and exists (
     select 1 from public.federation_match_teams mt
     join public.federation_team_entries t on t.id=mt.entry_id
     join public.teams own on own.id=t.club_team_id
     where mt.match_id=m.id and t.competition_id=competition and own.club_id=p_club and own.season_id=p_season
      and ((mt.side='home' and t.external_team_id=entry->>'home') or (mt.side='away' and t.external_team_id=entry->>'away'))
    );
  if (previous_code is not null and previous_code<>entry->>'report') or exists (
   select 1 from public.federation_matches m join public.federation_groups g on g.id=m.group_id
   where g.competition_id=competition and m.external_match_id=entry->>'report' and m.id<>target
  ) then
   raise exception 'Conflicting official fixture identity';
  end if;
  fixture:=target;
  official_code:=entry->>'report';
  outcome:=case when previous_code is not null then 'already_linked' when p_apply then 'linked' else 'pending' end;
  if outcome='linked' then
   update public.federation_matches m set external_match_id=official_code where m.id=target;
  end if;
  return next;
 end loop;
end
$procedure$;
