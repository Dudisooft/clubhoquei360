-- Reject nullable CAS inputs before any session write. Existing permissions and
-- valid save/recovery behavior are preserved. No sports rows are changed.
create or replace function app_private.stats_save_session(p_match uuid,p_state jsonb,p_expected int) returns public.stats_sessions language plpgsql security definer set search_path='' as $$
declare result public.stats_sessions; uid uuid:=auth.uid();begin
 if uid is null or not app_private.stats_can_read(p_match) or not exists(select 1 from public.stats_assignments where match_id=p_match and user_id=uid and role in('primary','operator') and revoked_at is null and expires_at>now()) then raise exception 'Analysis session access denied' using errcode='42501';end if;
 if p_expected is null or p_expected<0 then raise exception 'Expected session revision required' using errcode='22023';end if;
 if p_state->>'period' is null or p_state->>'ms' is null or p_state->>'mode' is null then raise exception 'Analysis clock fields required';end if;
 if coalesce(p_state->>'videoUrl','')<>'' and (p_state->>'videoUrl' !~ '^https?://' or length(p_state->>'videoUrl')>2000) then raise exception 'Invalid video URL';end if;
 if jsonb_typeof(p_state) is distinct from 'object' or (p_state->>'period')::int not between 1 and 8 or (p_state->>'ms')::int not between 0 and 21600000 or p_state->>'mode' not in('live','video') then raise exception 'Invalid analysis clock';end if;
 perform pg_advisory_xact_lock(hashtextextended('stats-session:'||p_match::text||uid::text,0));
 select * into result from public.stats_sessions where match_id=p_match and user_id=uid for update;
 if coalesce(result.revision,0)<>p_expected then raise exception 'Session revision conflict' using errcode='40001';end if;
 insert into public.stats_sessions(match_id,user_id,state,revision) values(p_match,uid,p_state-'running',1)
 on conflict(match_id,user_id) do update set state=excluded.state,revision=public.stats_sessions.revision+1,updated_at=clock_timestamp() returning * into result;return result;
end $$;
