-- Run as database owner against the audited, migrated production schema.
-- One existing, verified global administrator; no Auth users or emails created.
-- JWT claims below exercise PostgreSQL authorization, NOT real OTP delivery.
-- Every test invitation, role change, assignment and observation is rolled back.
begin;
do $$
declare
 actor uuid; mail text; mid uuid; other_mid uuid; club uuid; team uuid;
 invitation jsonb; rotated jsonb; active jsonb; token text; iid uuid;
 membership uuid:=gen_random_uuid(); linked uuid; denied boolean; n int;
 payload jsonb; result public.stats_events; assignment public.stats_assignments;
begin
 select a.user_id,u.email into strict actor,mail from public.platform_admins a
 join auth.users u on u.id=a.user_id where a.enabled and a.role='platform_superadmin'
 and u.email_confirmed_at is not null limit 1;
 if exists(select 1 from public.club_memberships where user_id=actor) then
  raise exception 'Expected owner without club memberships: adapt smoke explicitly';end if;
 if exists(select 1 from public.temporary_invitations) then
  raise exception 'First-install smoke expects no existing invitations';end if;
 select match_id,club_id,coalesce(home_team_id,away_team_id) into strict mid,club,team
 from public.stats_matches order by match_id limit 1;
 select match_id into strict other_mid from public.stats_matches where match_id<>mid limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 if not public.temporary_admin_access() then raise exception 'Global permission failed';end if;
 if public.temporary_admin()->'invitations'<>'[]'::jsonb then raise exception 'Unexpected invitation catalog';end if;
 denied:=false;begin perform count(*) from public.temporary_invitations;
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Direct token table SELECT allowed';end if;
 denied:=false;begin perform public.temporary_reserve_email(mail,null,'test');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Authenticated email reservation allowed';end if;
 invitation:=public.temporary_manage('create',jsonb_build_object('email',mail,'club_id',club,'team_id',team,
 'permission','viewer','match_ids',jsonb_build_array(mid),'expires_at',now()+interval '1 day'));
 iid:=(invitation->>'id')::uuid;token:=invitation->>'token';
 if length(token)<>64 or invitation ? 'token_hash' then raise exception 'Token response invalid';end if;
 perform set_config('role','none',true);
 if not exists(select 1 from public.temporary_invitations where id=iid and token_hash=app_private.temporary_hash(token) and token_hash<>token) then raise exception 'Token hash invalid';end if;
 if exists(select 1 from public.temporary_invitation_audit where invitation_id=iid and (current ? 'token_hash' or current::text like '%'||token||'%')) then raise exception 'Secret leaked to audit';end if;
 perform set_config('role','service_role',true);
 if not (public.temporary_reserve_email(mail,token,'transactional-smoke')->>'allowed')::boolean then raise exception 'Valid email reservation rejected';end if;
 if (public.temporary_reserve_email('unassigned@example.invalid',token,'transactional-smoke')->>'allowed')::boolean then raise exception 'Wrong recipient reserved';end if;
 for n in 1..5 loop
  if not (public.temporary_reserve_email(mail,token,'transactional-smoke')->>'allowed')::boolean then raise exception 'Premature email limit';end if;
 end loop;
 if (public.temporary_reserve_email(mail,token,'transactional-smoke')->>'allowed')::boolean then raise exception 'Email rate limit bypassed';end if;
 perform set_config('role','none',true);
 update auth.users set email_confirmed_at=null where id=actor;
 perform set_config('role','authenticated',true);
 denied:=false;begin perform public.temporary_accept(token);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unconfirmed email accepted';end if;
 perform set_config('role','none',true);
 update auth.users set email_confirmed_at=now() where id=actor;
 perform set_config('role','authenticated',true);
 rotated:=public.temporary_manage('rotate',jsonb_build_object('id',iid));
 denied:=false;begin perform public.temporary_accept(token);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Old rotated token accepted';end if;
 token:=rotated->>'token';active:=public.temporary_accept(token);
 if active->>'status'<>'active' or (active->>'accepted_by')::uuid<>actor then raise exception 'Acceptance failed';end if;
 denied:=false;begin perform public.temporary_accept(token);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Single-use token reused';end if;
 if not public.temporary_touch() then raise exception 'Verified access stamp failed';end if;
 select id into strict linked from public.stats_assignments where invitation_id=iid and revoked_at is null;
 denied:=false;begin perform public.stats_revoke(linked);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Legacy command revoked invitation assignment';end if;
 -- Existing global self-activation must remain possible after accepting an invite.
 assignment:=public.stats_grant(jsonb_build_object('match_id',other_mid,'user_id',actor,'role','primary','sides',jsonb_build_array('home','away','disputed'),'expires_at',now()+interval '1 hour'));
 perform public.stats_revoke(assignment.id);
 perform set_config('role','none',true);
 -- Remove independent advanced rights ONLY within this rolled-back transaction.
 update public.stats_assignments set revoked_at=now() where user_id=actor and invitation_id is null;
 update public.platform_admins set enabled=false where user_id=actor;
 perform set_config('role','authenticated',true);
 if public.temporary_admin_access() or not (public.stats_access(mid)->>'read')::boolean or (public.stats_access(mid)->>'manage')::boolean then raise exception 'Viewer permissions invalid';end if;
 if exists(select 1 from public.stats_matches where match_id=other_mid) then raise exception 'Out-of-scope match visible';end if;
 denied:=false;begin perform public.temporary_admin();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-global invitation catalog allowed';end if;
 denied:=false;begin perform public.temporary_manage('revoke',jsonb_build_object('id',iid));exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-global management allowed';end if;
 payload:=jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid(),'match_id',mid,'period',1,'match_ms',12000,'side','home','action','pass_complete','origin','video','validation','recorded','note','FICTICI: prova transaccional revertida');
 denied:=false;begin perform public.stats_write_event(payload,0);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Viewer recorded';end if;
 denied:=false;begin perform public.stats_save_session(mid,'{"period":1,"ms":0,"mode":"video"}'::jsonb,0);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Viewer wrote shared clock';end if;
 perform set_config('role','none',true);
 insert into public.club_memberships(id,club_id,user_id,role) values(membership,club,actor,'admin');
 perform set_config('role','authenticated',true);
 if public.temporary_admin_access() then raise exception 'Club admin became global';end if;
 denied:=false;begin perform public.temporary_manage('revoke',jsonb_build_object('id',iid));exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Club admin managed invitations';end if;
 perform set_config('role','none',true);
 delete from public.club_memberships where id=membership;
 update public.platform_admins set enabled=true where user_id=actor;
 perform set_config('role','authenticated',true);
 perform public.temporary_manage('update',jsonb_build_object('id',iid,'permission','recorder','match_ids',jsonb_build_array(mid),'categories',jsonb_build_array('pass'),'expires_at',now()+interval '1 day'));
 perform set_config('role','none',true);
 update public.platform_admins set enabled=false where user_id=actor;
 perform set_config('role','authenticated',true);
 result:=public.stats_write_event(payload,0);
 if result.operator_id<>actor or result.revision<>1 then raise exception 'Limited registration failed';end if;
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid(),'action','shot_target'),0);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unassigned category accepted';end if;
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid(),'match_id',other_mid),0);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unassigned match accepted';end if;
 perform set_config('role','none',true);
 update public.stats_assignments set expires_at=now()-interval '1 second' where invitation_id=iid;
 perform set_config('role','authenticated',true);
 if (public.stats_access(mid)->>'read')::boolean then raise exception 'Expired assignment still reads';end if;
 perform set_config('role','none',true);
 update public.platform_admins set enabled=true where user_id=actor;
 perform set_config('role','authenticated',true);
 perform public.temporary_manage('update',jsonb_build_object('id',iid,'permission','viewer','match_ids',jsonb_build_array(mid),'expires_at',now()+interval '1 day'));
 perform public.temporary_manage('revoke',jsonb_build_object('id',iid));
 perform set_config('role','none',true);
 update public.platform_admins set enabled=false where user_id=actor;
 perform set_config('role','authenticated',true);
 if (public.stats_access(mid)->>'read')::boolean or public.temporary_touch() then raise exception 'Revoked invitation still grants access';end if;
 denied:=false;begin perform public.stats_write_event(payload||jsonb_build_object('id',gen_random_uuid(),'mutation_id',gen_random_uuid()),0);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Revoked identity records';end if;
 perform set_config('role','none',true);
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 perform set_config('role','anon',true);
 denied:=false;begin perform public.temporary_accept(token);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous acceptance allowed';end if;
 perform set_config('role','none',true);
end $$;
rollback;
select 'PASS: production RPC/RLS, global versus club administration, hashed and rotated single-use tokens, confirmed recipient, rate limits, scoped viewer/recorder, category and match denial, expiry, revocation and preserved global self-activation. All writes rolled back; no SMTP/OTP delivery claimed.' as verification;
