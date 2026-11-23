-- Synthetic predecessor schema for local PostgreSQL + real Supabase Auth.
-- auth.users, auth.uid(), anon/authenticated are supplied by Supabase, never mocked.
do $$begin if current_setting('ch360.staging_project',true) is distinct from 'clubhoquei360-3a3-local' then raise exception 'Isolated staging marker required';end if;end$$;
 create schema app_private;
 create table public.platform_admins(user_id uuid primary key references auth.users(id),role text not null,enabled boolean not null);
 alter table public.platform_admins enable row level security;
 revoke all on public.platform_admins from anon,authenticated;create table public.clubs(id uuid primary key,name text);create table public.seasons(id uuid primary key,club_id uuid,label text);
 create table public.teams(id uuid primary key,club_id uuid,season_id uuid,name text,category text);
 create table public.club_memberships(user_id uuid,club_id uuid,team_id uuid,role text);
 create function app_private.has_club_role(p_club uuid,p_roles text[]) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.club_memberships where user_id=auth.uid() and club_id=p_club and role=any(p_roles))$$;
 create function app_private.has_team_role(p_team uuid,p_roles text[]) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.club_memberships where user_id=auth.uid() and team_id=p_team and role=any(p_roles))$$;
 create function app_private.is_platform_superadmin() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.platform_admins p where p.user_id=auth.uid() and p.enabled and p.role='platform_superadmin')$$;
 create table public.pilot_matches(id uuid primary key,title text,home_team text,away_team text,starts_at timestamptz,status text);
 create table public.pilot_members(match_id uuid,user_id uuid,role text,primary key(match_id,user_id));
 create table public.pilot_players(id uuid primary key default gen_random_uuid(),match_id uuid,team text,dorsal text,full_name text,position text,federation_player_id text,federation_active boolean default true,official_source text);
 create table public.pilot_events(id uuid primary key,match_id uuid,user_id uuid,event_type text,team text,player_id uuid,delta int,match_second int,created_at timestamptz default now(),payload jsonb,related_event_id uuid,player_label text,details text);
 create table public.pilot_operator_state(match_id uuid primary key,revision int,state jsonb,updated_at timestamptz default now(),updated_by uuid);
 create table public.federation_match_sources(match_id uuid primary key,federation text,competition_id text,season_id text,official_data jsonb,import_status text,home_name text,away_name text,last_checked_at timestamptz,last_imported_at timestamptz,federation_match_id text,federation_url text,home_crest_url text default 'https://sidgad.cloud/fecapa/images/logos_clubes/252.png',away_crest_url text,automatic_enabled boolean default false,notes text);
 create table public.federation_competitions(id uuid primary key,club_id uuid,season_id uuid,federation text,external_competition_id text);
 create table public.federation_groups(id uuid primary key,competition_id uuid);
 create table public.federation_matches(id uuid primary key,group_id uuid,external_match_id text,home_team text,away_team text,federation_start_at timestamptz,home_score int,away_score int,raw_data jsonb,match_fingerprint text,fetched_at timestamptz);
 create table public.federation_match_teams(match_id uuid,entry_id uuid,side text,primary key(match_id,entry_id));
 create table public.federation_team_entries(id uuid primary key,club_team_id uuid,competition_id uuid,external_team_id text,raw_data jsonb,source_url text);
 create table public.federation_players(id uuid primary key,federation text,external_player_id text,display_name text);
 create table public.federation_team_roster(id uuid primary key,entry_id uuid,player_id uuid,display_name text,role text,shirt_number text,fetched_at timestamptz,raw_data jsonb);
