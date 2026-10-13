create or replace function public.federation_prepare_match(p_reference uuid,p_external text,p_user uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare src public.federation_match_sources; item jsonb; target uuid; begin
 select * into strict src from public.federation_match_sources where match_id=p_reference;
 if not exists(select 1 from public.pilot_members where match_id=p_reference and user_id=p_user and role='operator') then raise exception 'Operator access required'; end if;
 select item_entry.value into item from public.federation_calendar_cache c cross join lateral jsonb_array_elements(c.data) item_entry(value)
 where c.federation=src.federation and c.competition_id=src.competition_id and c.season_id=src.season_id and item_entry.value->>'match_id'=p_external limit 1;
 if item is null or p_external !~ '^[1-9][0-9]*$' then raise exception 'Unverified calendar match'; end if;
 perform pg_advisory_xact_lock(hashtextextended(src.federation||':'||p_external,0));
 select match_id into target from public.federation_match_sources where federation=src.federation and federation_match_id=p_external;
 if target is null then
 insert into public.pilot_matches(title,home_team,away_team,starts_at,venue,status) values((item->>'home_name')||' – '||(item->>'away_name'),item->>'home_name',item->>'away_name',(to_date(item->>'date','DD/MM/YYYY')+coalesce(nullif(item->>'time',''),'00:00')::time) at time zone 'Europe/Madrid',item->>'venue','scheduled') returning id into target;
 insert into public.federation_match_sources(match_id,federation,federation_match_id,federation_url,competition_id,season_id,import_status) values(target,src.federation,p_external,src.federation_url,src.competition_id,src.season_id,'pending');
 end if;
 insert into public.pilot_members(match_id,user_id,role) values(target,p_user,'operator') on conflict(match_id,user_id) do nothing;
 return target;
end $$;
revoke all on function public.federation_prepare_match(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.federation_prepare_match(uuid,text,uuid) to service_role;
grant select,insert on public.pilot_matches to service_role;
grant insert on public.pilot_members to service_role;
