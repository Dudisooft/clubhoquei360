-- Entirely synthetic importer predecessor; no production records.
create role anon;create role authenticated;create role service_role;
create table seasons(id uuid primary key,club_id uuid,label text);
create table teams(id uuid primary key,club_id uuid,season_id uuid,name text,category text,short_name text,verification_status text,source_url text);
create table federation_competitions(id uuid primary key,club_id uuid,season_id uuid,federation text,external_competition_id text,name text,category text,unique(club_id,federation,external_competition_id));
create table federation_groups(id uuid primary key,competition_id uuid,external_group_id text,name text,unique(competition_id,external_group_id));
create table federation_team_entries(id uuid primary key,competition_id uuid,group_id uuid,external_team_id text,display_name text,club_team_id uuid,source_url text,fetched_at timestamptz,raw_data jsonb,unique(competition_id,external_team_id));
create table federation_players(id uuid primary key,federation text,external_player_id text,display_name text,unique(federation,external_player_id));
create table club_staff_people(id uuid primary key,club_id uuid,federation text,external_person_id text,display_name text,source_url text,fetched_at timestamptz);
create table federation_team_roster(id uuid primary key,entry_id uuid,player_id uuid,staff_person_id uuid,external_person_id text,display_name text,role text,shirt_number text,fetched_at timestamptz,raw_data jsonb);
create table federation_matches(id uuid primary key,group_id uuid,external_match_id text,match_fingerprint text,round_label text,home_team text,away_team text,federation_start_at timestamptz,venue text,home_score int,away_score int,fetched_at timestamptz,raw_data jsonb);
create unique index fixture on federation_matches(group_id,match_fingerprint) where match_fingerprint is not null;
create table federation_match_teams(match_id uuid,entry_id uuid,side text,primary key(match_id,entry_id));
create table federation_match_events(id uuid primary key,match_id uuid,event_order int,event_type text,period_label text,clock_label text,side text,player_id uuid,player_name text,attribution text,raw_data jsonb);
create table federation_match_lineups(id uuid primary key,match_id uuid,player_id uuid,side text,display_name text,shirt_number text,is_goalkeeper boolean,is_captain boolean,reported_goals int,reported_assists int,raw_data jsonb);
create table federation_match_staff(id uuid primary key,match_id uuid,side text,display_name text,role text,yellow_cards int,blue_cards int,red_cards int,raw_data jsonb);
create table preserved_official(id int,data jsonb);insert into preserved_official values(1,'{"goal":1,"card":1,"statistic":1,"session":1,"lineup":1}');
insert into seasons values('10000000-0000-4000-8000-000000000002',md5('clubhoquei360:fecapa:club:252')::uuid,'2026/27');
