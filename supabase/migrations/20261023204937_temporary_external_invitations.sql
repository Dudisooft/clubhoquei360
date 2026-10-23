-- External invitations are capabilities to request email verification, not login
-- credentials. Only hashes persist; acceptance also requires a confirmed Auth user.
create table public.temporary_invitations (
 id uuid primary key default gen_random_uuid(), email text not null,
 club_id uuid not null references public.clubs(id), team_id uuid references public.teams(id),
 permission text not null check(permission in('analyst','viewer','recorder')),
 match_ids uuid[] not null default '{}', categories text[] not null default '{}',
 expires_at timestamptz not null, token_expires_at timestamptz not null, token_hash text not null unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id), accepted_by uuid references auth.users(id),
 consumed_at timestamptz, revoked_at timestamptz, last_access_at timestamptz, revision int not null default 1,
 check(email=lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(email)<=254)
);
create index temporary_invitation_email_idx on public.temporary_invitations(email,club_id) where revoked_at is null;
create index temporary_invitation_user_idx on public.temporary_invitations(accepted_by) where revoked_at is null;
create table public.temporary_invitation_audit (
 id uuid primary key default gen_random_uuid(), invitation_id uuid not null references public.temporary_invitations(id),
 actor_id uuid, action text not null, at timestamptz not null default now(), previous jsonb, current jsonb
);
create index temporary_invitation_audit_idx on public.temporary_invitation_audit(invitation_id,at);
create table app_private.temporary_email_limits (bucket text primary key, started_at timestamptz not null, attempts int not null);
create index temporary_email_limit_age_idx on app_private.temporary_email_limits(started_at);
alter table public.temporary_invitations enable row level security;
alter table public.temporary_invitation_audit enable row level security;
alter table app_private.temporary_email_limits enable row level security;
create policy temporary_superoperator_read on public.temporary_invitations for select to authenticated using((select app_private.is_platform_superadmin()));
create policy temporary_audit_superoperator_read on public.temporary_invitation_audit for select to authenticated using((select app_private.is_platform_superadmin()));
revoke all on public.temporary_invitations,public.temporary_invitation_audit,app_private.temporary_email_limits from public,anon,authenticated;
-- No direct SELECT exposes token hashes. Sanitized, checked RPCs are the API.
alter table public.stats_assignments add column invitation_id uuid references public.temporary_invitations(id);
create index stats_assignment_invitation_idx on public.stats_assignments(invitation_id) where invitation_id is not null;
create function app_private.temporary_hash(p_token text) returns text language sql immutable set search_path='' as $$select encode(sha256(convert_to(p_token,'UTF8')),'hex')$$;
create function app_private.temporary_snapshot(i public.temporary_invitations) returns jsonb language sql stable set search_path='' as $$
 select (to_jsonb(i)-'token_hash')||jsonb_build_object('status',case when i.revoked_at is not null then 'revoked' when i.expires_at<=now() then 'expired' when i.consumed_at is not null then 'active' else 'pending' end)
$$;
create function app_private.temporary_audit(i public.temporary_invitations,p_action text,p_old jsonb default null) returns void language sql security definer set search_path='' as $$
 insert into public.temporary_invitation_audit(invitation_id,actor_id,action,previous,current) values(i.id,auth.uid(),p_action,p_old,app_private.temporary_snapshot(i))
$$;
create function app_private.temporary_require_superoperator() returns void language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not app_private.is_platform_superadmin() then raise exception 'Global superoperator required' using errcode='42501';end if;
end$$;
create function public.temporary_admin_access() returns boolean language sql stable security invoker set search_path='' as $$select auth.uid() is not null and app_private.is_platform_superadmin()$$;
create function app_private.temporary_admin() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform app_private.temporary_require_superoperator();
 return jsonb_build_object('clubs',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]') from public.clubs),
 'teams',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'club_id',club_id,'name',name) order by name),'[]') from public.teams),
 'matches',(select coalesce(jsonb_agg(jsonb_build_object('id',s.match_id,'club_id',s.club_id,'home_team_id',s.home_team_id,'away_team_id',s.away_team_id,'title',m.title) order by m.starts_at),'[]') from public.stats_matches s join public.pilot_matches m on m.id=s.match_id),
 'invitations',(select coalesce(jsonb_agg(app_private.temporary_snapshot(i) order by i.created_at desc),'[]') from public.temporary_invitations i));
end$$;
create function public.temporary_admin() returns jsonb language sql stable security invoker set search_path='' as $$select app_private.temporary_admin()$$;
create function app_private.temporary_attach(i public.temporary_invitations,mid uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended('stats:'||mid::text,0));
 if i.permission<>'viewer' and exists(select 1 from public.stats_assignments a where a.match_id=mid and a.role='operator' and a.revoked_at is null and a.expires_at>now() and a.categories&&i.categories) then
  raise exception 'Recording scopes overlap: review existing operators for this match' using errcode='23P01';end if;
 insert into public.stats_assignments(match_id,user_id,role,categories,sides,player_ids,expires_at,granted_by,invitation_id)
 values(mid,i.accepted_by,case when i.permission='viewer' then 'viewer' else 'operator' end,i.categories,array['home','away','disputed'],'{}',i.expires_at,i.created_by,i.id);
end$$;
create function app_private.temporary_sync(i public.temporary_invitations) returns void language plpgsql security definer set search_path='' as $$declare mid uuid;begin
 update public.stats_assignments set revoked_at=now() where invitation_id=i.id and revoked_at is null;
 if i.revoked_at is not null or i.expires_at<=now() or i.accepted_by is null then return;end if;
 for mid in select s.match_id from public.stats_matches s where s.club_id=i.club_id and (i.team_id is null or i.team_id in(s.home_team_id,s.away_team_id)) and (cardinality(i.match_ids)=0 or s.match_id=any(i.match_ids)) order by s.match_id loop
  perform app_private.temporary_attach(i,mid);
 end loop;
end$$;
create function app_private.temporary_manage(p_command text,p_value jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.temporary_invitations;old jsonb;token text;begin
 perform app_private.temporary_require_superoperator();perform pg_advisory_xact_lock(hashtextextended('temporary-invitations',0));
 if p_command='create' then
  i.id:=gen_random_uuid();i.email:=lower(btrim(p_value->>'email'));i.created_by:=auth.uid();i.created_at:=now();i.revision:=1;
 else
  select * into strict i from public.temporary_invitations where id=(p_value->>'id')::uuid for update;old:=app_private.temporary_snapshot(i);
  if i.revoked_at is not null then raise exception 'Invitation already revoked';end if;
 end if;
 if p_command in('create','update') then
  if p_command='create' then i.club_id:=(p_value->>'club_id')::uuid;i.team_id:=nullif(p_value->>'team_id','')::uuid;end if;
  i.permission:=p_value->>'permission';i.expires_at:=(p_value->>'expires_at')::timestamptz;
  select coalesce(array_agg(distinct value::uuid),'{}') into i.match_ids from jsonb_array_elements_text(coalesce(p_value->'match_ids','[]'));
  if i.permission='analyst' then select array_agg(distinct category) into i.categories from public.stats_actions;
  elsif i.permission='viewer' then i.categories:='{}';
  else select coalesce(array_agg(distinct value),'{}') into i.categories from jsonb_array_elements_text(coalesce(p_value->'categories','[]'));end if;
  if i.email is null or i.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(i.email)>254 then raise exception 'Valid recipient email required';end if;
  if not exists(select 1 from public.clubs where id=i.club_id) or (i.team_id is not null and not exists(select 1 from public.teams where id=i.team_id and club_id=i.club_id)) then raise exception 'Club/team scope mismatch';end if;
  if i.permission is null or i.permission not in('analyst','viewer','recorder') or i.expires_at is null or i.expires_at<=now() then raise exception 'Valid permission and future expiry required';end if;
  if i.permission='recorder' and (cardinality(i.match_ids)=0 or cardinality(i.categories)=0) then raise exception 'Limited registration requires matches and categories';end if;
  if exists(select 1 from unnest(i.categories)c where not exists(select 1 from public.stats_actions where category=c)) then raise exception 'Unknown category';end if;
  if exists(select 1 from unnest(i.match_ids)m where not exists(select 1 from public.stats_matches s where s.match_id=m and s.club_id=i.club_id and (i.team_id is null or i.team_id in(s.home_team_id,s.away_team_id)))) then raise exception 'Match outside invitation scope';end if;
  if exists(select 1 from public.temporary_invitations x where x.email=i.email and x.club_id=i.club_id and x.id<>i.id and x.revoked_at is null and x.expires_at>now()) then raise exception 'An unexpired invitation already exists for this email and club';end if;
 elsif p_command='revoke' then i.revoked_at:=now();
 elsif p_command<>'rotate' then raise exception 'Unknown invitation command';end if;
 if p_command in('create','rotate') then
  if i.consumed_at is not null or i.expires_at<=now() then raise exception 'Only pending unexpired invitations can receive a new acceptance link';end if;
  token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');i.token_hash:=app_private.temporary_hash(token);i.token_expires_at:=least(i.expires_at,now()+interval '30 minutes');
 end if;
 i.updated_at:=now();if p_command<>'create' then i.revision:=i.revision+1;end if;
 if p_command='create' then insert into public.temporary_invitations select i.*;
 else update public.temporary_invitations set permission=i.permission,match_ids=i.match_ids,categories=i.categories,expires_at=i.expires_at,token_hash=i.token_hash,token_expires_at=i.token_expires_at,revoked_at=i.revoked_at,updated_at=i.updated_at,revision=i.revision where id=i.id;end if;
 perform app_private.temporary_sync(i);perform app_private.temporary_audit(i,p_command,old);
 return app_private.temporary_snapshot(i)||case when token is not null then jsonb_build_object('token',token) else '{}'::jsonb end;
end$$;
create function public.temporary_manage(p_command text,p_value jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.temporary_manage(p_command,p_value)$$;
create function app_private.temporary_accept(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.temporary_invitations;mail text;confirmed timestamptz;begin
 if auth.uid() is null then raise exception 'Verified email session required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('temporary-invitations',0));
 select email,email_confirmed_at into mail,confirmed from auth.users where id=auth.uid();
 select * into i from public.temporary_invitations where token_hash=app_private.temporary_hash(p_token) for update;
 if i.id is null or i.revoked_at is not null or i.expires_at<=now() or i.token_expires_at<=now() or i.consumed_at is not null or confirmed is null or lower(mail) is distinct from i.email then raise exception 'Invitation unavailable or verified recipient mismatch' using errcode='42501';end if;
 update public.temporary_invitations set accepted_by=auth.uid(),consumed_at=now(),last_access_at=now(),updated_at=now(),revision=revision+1 where id=i.id returning * into i;
 perform app_private.temporary_sync(i);perform app_private.temporary_audit(i,'accept');return app_private.temporary_snapshot(i);
end$$;
create function public.temporary_accept(p_token text) returns jsonb language sql security invoker set search_path='' as $$select app_private.temporary_accept(p_token)$$;
create function app_private.temporary_touch() returns boolean language plpgsql security definer set search_path='' as $$declare affected int;begin
 if auth.uid() is null then return false;end if;
 update public.temporary_invitations set last_access_at=now() where accepted_by=auth.uid() and revoked_at is null and expires_at>now();get diagnostics affected = row_count;return affected>0;
end$$;
create function public.temporary_touch() returns boolean language sql security invoker set search_path='' as $$select app_private.temporary_touch()$$;
-- Service-only reservation for the email endpoint: commit rate counters even for
-- invalid requests. Public responses must not reveal whether an account exists.
create function app_private.temporary_rate(p_bucket text,p_max int) returns boolean language plpgsql security definer set search_path='' as $$declare attempts_now int;begin
 insert into app_private.temporary_email_limits values(p_bucket,now(),1) on conflict(bucket) do update set
 attempts=case when temporary_email_limits.started_at<now()-interval '1 hour' then 1 else temporary_email_limits.attempts+1 end,
 started_at=case when temporary_email_limits.started_at<now()-interval '1 hour' then now() else temporary_email_limits.started_at end returning attempts into attempts_now;
 return attempts_now<=p_max;
end$$;
create function app_private.temporary_reserve_email(p_email text,p_token text,p_address_hash text) returns jsonb language plpgsql security definer set search_path='' as $$declare i public.temporary_invitations;begin
 delete from app_private.temporary_email_limits where started_at<now()-interval '2 days';
 if not app_private.temporary_rate('global',200) then return jsonb_build_object('allowed',false);end if;
 if not app_private.temporary_rate('ip:'||coalesce(p_address_hash,''),30) then return jsonb_build_object('allowed',false);end if;
 if not app_private.temporary_rate('email:'||app_private.temporary_hash(lower(btrim(p_email))),6) then return jsonb_build_object('allowed',false);end if;
 select * into i from public.temporary_invitations where email=lower(btrim(p_email)) and revoked_at is null and expires_at>now() and
 ((p_token is not null and token_hash=app_private.temporary_hash(p_token) and consumed_at is null and token_expires_at>now()) or (p_token is null and consumed_at is not null)) order by created_at desc limit 1;
 if i.id is null then return jsonb_build_object('allowed',false);end if;
 return jsonb_build_object('allowed',true,'email',i.email,'needs_identity',not exists(select 1 from auth.users where lower(email)=i.email));
end$$;
create function public.temporary_reserve_email(p_email text,p_token text,p_address_hash text) returns jsonb language sql security invoker set search_path='' as $$select app_private.temporary_reserve_email(p_email,p_token,p_address_hash)$$;
create function app_private.temporary_email_target(p_id uuid,p_token text) returns text language plpgsql security definer set search_path='' as $$declare mail text;begin
 perform app_private.temporary_require_superoperator();
 select email into mail from public.temporary_invitations where id=p_id and token_hash=app_private.temporary_hash(p_token) and consumed_at is null and revoked_at is null and expires_at>now() and token_expires_at>now();
 if mail is null then raise exception 'Pending invitation link unavailable';end if;
 if not app_private.temporary_rate('invitation-send:'||p_id::text,3) then return null;end if;return mail;
end$$;
create function public.temporary_email_target(p_id uuid,p_token text) returns text language sql security invoker set search_path='' as $$select app_private.temporary_email_target(p_id,p_token)$$;
create function app_private.temporary_new_match() returns trigger language plpgsql security definer set search_path='' as $$declare i public.temporary_invitations;begin
 for i in select * from public.temporary_invitations where club_id=new.club_id and (team_id is null or team_id in(new.home_team_id,new.away_team_id)) and (cardinality(match_ids)=0 or new.match_id=any(match_ids)) and accepted_by is not null and revoked_at is null and expires_at>now() order by id loop
  begin perform app_private.temporary_attach(i,new.match_id);
  exception when exclusion_violation then perform app_private.temporary_audit(i,'new_match_scope_conflict');end;
 end loop;return new;
end$$;
create trigger temporary_access_new_match after insert on public.stats_matches for each row execute function app_private.temporary_new_match();
-- Internal membership/assignment behavior is preserved. Invitation-backed rows
-- can only be changed through the invitation lifecycle, never the legacy form.
create or replace function app_private.stats_grant(p_grant jsonb) returns public.stats_assignments language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();mid uuid:=(p_grant->>'match_id')::uuid;result public.stats_assignments;old public.stats_assignments;cats text[];sides_list text[];players uuid[];target uuid:=(p_grant->>'user_id')::uuid;role_label text:=p_grant->>'role';expiry timestamptz:=(p_grant->>'expires_at')::timestamptz;begin
 if exists(select 1 from public.temporary_invitations where accepted_by=target) and not exists(select 1 from public.club_memberships m join public.stats_matches s on s.club_id=m.club_id where s.match_id=mid and m.user_id=target) and not exists(select 1 from public.platform_admins p where p.user_id=target and p.enabled and p.role='platform_superadmin') and not exists(select 1 from public.pilot_members p where p.match_id=mid and p.user_id=target) then raise exception 'Use temporary invitations for external users' using errcode='42501';end if;
 if uid is null or not app_private.stats_can_manage(mid) then raise exception 'Assignment management denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stats:'||mid::text,0));
 select array_agg(value) into cats from jsonb_array_elements_text(coalesce(p_grant->'categories','[]'));select array_agg(value) into sides_list from jsonb_array_elements_text(coalesce(p_grant->'sides','[]'));select array_agg(value::uuid) into players from jsonb_array_elements_text(coalesce(p_grant->'player_ids','[]'));
 cats:=coalesce(cats,'{}');sides_list:=coalesce(sides_list,'{}');players:=coalesce(players,'{}');
 if role_label='primary' and not app_private.stats_club_manager(mid) then raise exception 'Only club management can appoint a principal';end if;
 if role_label='primary' and exists(select 1 from public.stats_assignments a where a.match_id=mid and a.role='primary' and a.revoked_at is null and a.expires_at>now() and a.id is distinct from nullif(p_grant->>'id','')::uuid) then raise exception 'Revoke the active principal before appointing another';end if;
 if expiry is null or expiry<=now() then raise exception 'Future expiry required';end if;
 if exists(select 1 from unnest(cats) c where not exists(select 1 from public.stats_actions a where a.category=c)) then raise exception 'Unknown category';end if;
 if exists(select 1 from unnest(players) p where not exists(select 1 from public.pilot_players x where x.id=p and x.match_id=mid and x.team=any(sides_list))) then raise exception 'Player scope mismatch';end if;
 if role_label='operator' and exists(select 1 from public.stats_assignments a where a.match_id=mid and a.role='operator' and a.revoked_at is null and a.expires_at>now() and a.categories&&cats and a.sides&&sides_list and (cardinality(a.player_ids)=0 or cardinality(players)=0 or a.player_ids&&players) and a.id is distinct from nullif(p_grant->>'id','')::uuid) then raise exception 'Recording scopes overlap; split categories, sides or players';end if;
 if nullif(p_grant->>'id','') is not null then
  select * into strict old from public.stats_assignments where id=(p_grant->>'id')::uuid and match_id=mid;
  if old.invitation_id is not null then raise exception 'Manage this access through temporary invitations' using errcode='42501';end if;
  if old.role='primary' and not app_private.stats_club_manager(mid) then raise exception 'Cannot modify a principal';end if;
  update public.stats_assignments set revoked_at=now() where id=old.id;
 end if;
 insert into public.stats_assignments(match_id,user_id,role,categories,sides,player_ids,expires_at,granted_by) values(mid,target,role_label,cats,sides_list,players,expiry,uid) returning * into result;
 insert into public.stats_access_audit(match_id,actor_id,previous,current) values(mid,uid,case when old.id is not null then to_jsonb(old) end,to_jsonb(result));return result;
end $$;
create or replace function app_private.stats_revoke(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare old public.stats_assignments;uid uuid:=auth.uid();begin
 select * into strict old from public.stats_assignments where id=p_id;
 if old.invitation_id is not null then raise exception 'Manage this access through temporary invitations' using errcode='42501';end if;
 if uid is null or not app_private.stats_can_manage(old.match_id) or (old.role='primary' and not app_private.stats_club_manager(old.match_id)) then raise exception 'Revocation denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stats:'||old.match_id::text,0));
 update public.stats_assignments set revoked_at=now() where id=p_id;
 insert into public.stats_access_audit(match_id,actor_id,previous,current) values(old.match_id,uid,to_jsonb(old),to_jsonb(old)||jsonb_build_object('revoked_at',now()));
end $$;

-- All new definers stay private, with explicit per-entry authorization.
revoke all on function app_private.temporary_hash(text),app_private.temporary_snapshot(public.temporary_invitations),app_private.temporary_audit(public.temporary_invitations,text,jsonb),app_private.temporary_require_superoperator(),app_private.temporary_admin(),app_private.temporary_attach(public.temporary_invitations,uuid),app_private.temporary_sync(public.temporary_invitations),app_private.temporary_manage(text,jsonb),app_private.temporary_accept(text),app_private.temporary_touch(),app_private.temporary_rate(text,int),app_private.temporary_reserve_email(text,text,text),app_private.temporary_email_target(uuid,text),app_private.temporary_new_match() from public,anon,authenticated;
grant execute on function app_private.temporary_admin(),app_private.temporary_manage(text,jsonb),app_private.temporary_accept(text),app_private.temporary_touch(),app_private.temporary_email_target(uuid,text) to authenticated;
grant execute on function app_private.temporary_reserve_email(text,text,text) to service_role;
revoke all on function public.temporary_admin_access(),public.temporary_admin(),public.temporary_manage(text,jsonb),public.temporary_accept(text),public.temporary_touch(),public.temporary_reserve_email(text,text,text),public.temporary_email_target(uuid,text) from public,anon,authenticated;
grant execute on function public.temporary_admin_access(),public.temporary_admin(),public.temporary_manage(text,jsonb),public.temporary_accept(text),public.temporary_touch(),public.temporary_email_target(uuid,text) to authenticated;
grant execute on function public.temporary_reserve_email(text,text,text) to service_role;

grant usage on schema app_private to service_role;
