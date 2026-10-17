-- Deployment smoke test against the EXISTING database, never a bootstrap script.
-- Uses one existing administrator inside a transaction; creates no Auth accounts.
-- Every event, assignment and temporary role change is ROLLED BACK.
-- Run the entire file in one connection as the database owner. Do not split it.
begin;
do $$
declare
 actor uuid; mid uuid; other_mid uuid; player uuid; club uuid; team uuid;
 eid uuid:=gen_random_uuid(); payload jsonb; result public.stats_events;
 assignment public.stats_assignments; session public.stats_sessions;
 membership uuid:=gen_random_uuid(); denied boolean;
begin
 select a.user_id into strict actor from public.platform_admins a
 join auth.users u on u.id=a.user_id where a.enabled and a.role='platform_superadmin' limit 1;
 select m.match_id,m.club_id,m.home_team_id,p.id into strict mid,club,team,player
 from public.stats_matches m join public.pilot_players p on p.match_id=m.match_id and p.team='home'
 where m.home_team_id is not null and (m.home_external_team_id='12419' or m.away_external_team_id='12419')
 order by m.match_id,p.id limit 1;
 select m.match_id into strict other_mid from public.stats_matches m
 where m.match_id<>mid and m.home_team_id is distinct from team and m.away_team_id is distinct from team limit 1;
 if exists(select 1 from public.club_memberships where user_id=actor) then
  raise exception 'Smoke test expects administrator without club memberships; adapt explicitly before running';
 end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 if not (public.stats_access(mid)->>'manage')::boolean then raise exception 'Manager access failed';end if;
 assignment:=public.stats_grant(jsonb_build_object('match_id',mid,'user_id',actor,'role','primary','sides',jsonb_build_array('home','away','disputed'),'expires_at',now()+interval '1 hour'));
 payload:=jsonb_build_object('id',eid,'mutation_id',gen_random_uuid(),'match_id',mid,'period',1,'match_ms',12000,'side','home','player_id',player,'action','pass_complete','origin','video','validation','recorded','note','FICTICI: prova transaccional revertida');
 result:=public.stats_write_event(payload,0);
 if result.operator_id<>actor or result.club_id<>club or result.team_id<>team then raise exception 'Derived identity failed';end if;
 result:=public.stats_write_event(payload,0);
 if (select count(*) from public.stats_event_audit where event_id=eid)<>1 then raise exception 'Idempotent retry duplicated audit';end if;
 payload:=payload||jsonb_build_object('mutation_id',gen_random_uuid(),'action','pass_failed');
 result:=public.stats_write_event(payload,1);
 if result.revision<>2 or result.action<>'pass_failed' then raise exception 'Correction failed';end if;
 denied:=false;begin
  perform public.stats_write_event(payload||jsonb_build_object('mutation_id',gen_random_uuid()),1);
 exception when serialization_failure then denied:=true;end;
 if not denied then raise exception 'Stale event revision accepted';end if;
 payload:=payload||jsonb_build_object('mutation_id',gen_random_uuid(),'validation','void');
 result:=public.stats_write_event(payload,2);
 if result.validation<>'void' then raise exception 'Undo failed';end if;
 payload:=payload||jsonb_build_object('mutation_id',gen_random_uuid(),'validation','recorded');
 result:=public.stats_write_event(payload,3);
 if result.revision<>4 or (select count(*) from public.stats_event_audit where event_id=eid)<>4 then raise exception 'Recovery or audit failed';end if;
 denied:=false;begin update public.stats_events set action='goal' where id=eid;
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Direct event UPDATE allowed';end if;
 denied:=false;begin delete from public.stats_event_audit where event_id=eid;
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Audit DELETE allowed';end if;
 session:=public.stats_save_session(mid,'{"period":2,"ms":123000,"mode":"video","running":true}'::jsonb,0);
 if session.state ? 'running' or (session.state->>'ms')::int<>123000 then raise exception 'Paused session recovery failed';end if;
 denied:=false;begin perform public.stats_save_session(mid,'{"period":2,"ms":124000,"mode":"video"}'::jsonb,0);
 exception when serialization_failure then denied:=true;end;
 if not denied then raise exception 'Stale session revision accepted';end if;
 perform public.stats_revoke(assignment.id);
 assignment:=public.stats_grant(jsonb_build_object('match_id',mid,'user_id',actor,'role','operator','categories',jsonb_build_array('pass'),'sides',jsonb_build_array('home'),'player_ids',jsonb_build_array(player),'expires_at',now()+interval '1 hour'));
 -- Temporarily remove global authority only in this uncommitted transaction.
 perform set_config('role','none',true);
 update public.platform_admins set enabled=false where user_id=actor;
 perform set_config('role','authenticated',true);
 if not (public.stats_access(mid)->>'read')::boolean or (public.stats_access(mid)->>'manage')::boolean then raise exception 'Scoped operator access failed';end if;
 if exists(select 1 from public.stats_matches where match_id=other_mid) then raise exception 'Other match visible to operator';end if;
 payload:=payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid(),'action','pass_complete');
 result:=public.stats_write_event(payload,0);
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid(),'action','shot_off'),0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unassigned category accepted';end if;
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid(),'player_id',null),0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unassigned player accepted';end if;
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid(),'side','away'),0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unassigned side accepted';end if;
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid(),'match_id',other_mid),0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unassigned match accepted';end if;
 perform set_config('role','none',true);
 update public.stats_assignments set expires_at=now()-interval '1 second' where id=assignment.id;
 perform set_config('role','authenticated',true);
 if (public.stats_access(mid)->>'read')::boolean or exists(select 1 from public.stats_events) then raise exception 'Expired assignment still reads';end if;
 perform set_config('role','none',true);
 update public.platform_admins set enabled=true where user_id=actor;
 perform set_config('role','authenticated',true);
 perform public.stats_revoke(assignment.id);
 perform set_config('role','none',true);
 update public.platform_admins set enabled=false where user_id=actor;
 insert into public.club_memberships(id,club_id,user_id,role,team_id) values(membership,club,actor,'coach',team);
 perform set_config('role','authenticated',true);
 if not (public.stats_access(mid)->>'read')::boolean or exists(select 1 from public.stats_matches where match_id=other_mid) then raise exception 'Team coach read scope failed';end if;
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid()),0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Coach without assignment recorded';end if;
 perform set_config('role','none',true);
 update public.club_memberships set role='delegate' where id=membership;
 perform set_config('role','authenticated',true);
 if (public.stats_access(mid)->>'read')::boolean or exists(select 1 from public.stats_events) then raise exception 'Delegate gained advanced access';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 if (public.stats_access(mid)->>'read')::boolean or exists(select 1 from public.stats_matches) then raise exception 'Unrelated identity reads';end if;
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid()),0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unrelated identity recorded';end if;
 perform set_config('role','none',true);
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 perform set_config('role','anon',true);
 denied:=false;begin perform public.stats_access(mid);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous RPC execution allowed';end if;
 denied:=false;begin perform count(*) from public.stats_events;
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous analytics SELECT allowed';end if;
 perform set_config('role','none',true);
end $$;
rollback;
select 'PASS: real PostgreSQL commands, RLS, scopes, revisions, idempotency, audit, sessions and expiry; all test writes rolled back' as verification;
