import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
export const ID={club:'10000000-0000-4000-8000-000000000001',season:'10000000-0000-4000-8000-000000000002',team:'10000000-0000-4000-8000-000000000003',otherTeam:'10000000-0000-4000-8000-000000000004',match:'20000000-0000-4000-8000-000000000001',otherMatch:'20000000-0000-4000-8000-000000000002',player:'30000000-0000-4000-8000-000000000001',goalie:'30000000-0000-4000-8000-000000000002',rival:'30000000-0000-4000-8000-000000000003',principal:'40000000-0000-4000-8000-000000000001',external:'40000000-0000-4000-8000-000000000002',coach:'40000000-0000-4000-8000-000000000003',delegate:'40000000-0000-4000-8000-000000000004',alien:'40000000-0000-4000-8000-000000000005',manager:'40000000-0000-4000-8000-000000000006',secondary:'40000000-0000-4000-8000-000000000007',officialGoal:'50000000-0000-4000-8000-000000000001'};
export async function createDatabase(){
 const db=new PGlite();
 await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create schema app_private;create table public.clubs(id uuid primary key,name text);create table public.seasons(id uuid primary key,club_id uuid,label text);
 create table public.teams(id uuid primary key,club_id uuid,season_id uuid,name text);
 create table public.club_memberships(user_id uuid,club_id uuid,team_id uuid,role text);
 create function app_private.has_club_role(p_club uuid,p_roles text[]) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.club_memberships where user_id=auth.uid() and club_id=p_club and role=any(p_roles))$$;
 create function app_private.has_team_role(p_team uuid,p_roles text[]) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.club_memberships where user_id=auth.uid() and team_id=p_team and role=any(p_roles))$$;
 create function app_private.is_platform_superadmin() returns boolean language sql stable security definer as $$select false$$;
 create table public.pilot_matches(id uuid primary key,title text,home_team text,away_team text,starts_at timestamptz,status text);
 create table public.pilot_members(match_id uuid,user_id uuid,role text);
 create table public.pilot_players(id uuid primary key,match_id uuid,team text,dorsal text,full_name text,position text,federation_player_id text,federation_active boolean default true);
 create table public.pilot_events(id uuid primary key,match_id uuid,user_id uuid,event_type text,team text,player_id uuid,delta int,match_second int,created_at timestamptz default now(),payload jsonb,related_event_id uuid);
 create table public.pilot_operator_state(match_id uuid primary key,revision int,state jsonb,updated_at timestamptz default now());
 create table public.federation_match_sources(match_id uuid primary key,federation text,competition_id text,season_id text,official_data jsonb,import_status text,home_name text,away_name text,last_checked_at timestamptz,last_imported_at timestamptz,federation_match_id text);
 create table public.federation_competitions(id uuid primary key,club_id uuid,season_id uuid,federation text,external_competition_id text);
 create table public.federation_team_entries(id uuid primary key,club_team_id uuid,competition_id uuid,external_team_id text,raw_data jsonb);
 `);
 for(const table of ['pilot_matches','pilot_events','pilot_players','pilot_operator_state','federation_match_sources'])await db.exec(`alter table public.${table} enable row level security;grant select on public.${table} to authenticated;`);
 for(const table of ['pilot_matches','pilot_events','pilot_players','pilot_operator_state','federation_match_sources'])await db.exec(`create policy legacy_member_read on public.${table} for select to authenticated using(exists(select 1 from public.pilot_members m where m.user_id=auth.uid() and m.match_id=${table==='pilot_matches'?table+'.id':table+'.match_id'}));`);
 await db.exec('alter table pilot_members enable row level security;create policy legacy_members_self on pilot_members for select to authenticated using(user_id=auth.uid());');
 await db.exec(`create policy legacy_official_operator on public.pilot_events for insert to authenticated with check(exists(select 1 from public.pilot_members m where m.user_id=auth.uid() and m.match_id=pilot_events.match_id and m.role='operator'));grant insert on public.pilot_events to authenticated;grant select on public.pilot_members to authenticated;`);
 for(const user of ['principal','external','coach','delegate','alien','manager','secondary'])await db.query('insert into auth.users values ($1)',[ID[user]]);
 await db.query('insert into public.clubs values ($1,$2)',[ID.club,'Club de prova fictici']);
 await db.query('insert into public.seasons values ($1,$2,$3)',[ID.season,ID.club,'2026/27']);
 for(const [id,name] of [[ID.team,'FEM15 · dades fictícies'],[ID.otherTeam,'Un altre equip · fictici']])await db.query('insert into public.teams values ($1,$2,$3,$4)',[id,ID.club,ID.season,name]);
 for(const [id,title] of [[ID.match,'FEM15 IHC – Rival · PROVA FICTÍCIA'],[ID.otherMatch,'Un altre partit · PROVA FICTÍCIA']])await db.query("insert into public.pilot_matches values ($1,$2,'FEM15 fictici','Rival fictici','2026-10-17 12:00Z','finished')",[id,title]);
 for(const [id,team,num,name,pos] of [[ID.player,'home','3','Jugadora fictícia 3','field'],[ID.goalie,'home','1','Portera fictícia 1','goalkeeper'],[ID.rival,'away','7','Rival fictícia 7','field'],...Array.from({length:5},(_,i)=>['30000000-0000-4000-8000-'+String(10+i).padStart(12,'0'),'home',String(4+i),'Jugadora fictícia '+(4+i),'field']),['30000000-0000-4000-8000-000000000020','away','1','Portera rival fictícia 1','goalkeeper'],...Array.from({length:5},(_,i)=>['30000000-0000-4000-8000-'+String(21+i).padStart(12,'0'),'away',String(2+i),'Rival fictícia '+(2+i),'field'])])await db.query('insert into public.pilot_players(id,match_id,team,dorsal,full_name,position,federation_player_id) values ($1,$2,$3,$4,$5,$6,$7)',[id,ID.match,team,num,name,pos,'synthetic-'+team+'-'+num]);
 await db.query('insert into public.pilot_members values ($1,$2,$3)',[ID.match,ID.delegate,'operator']);
 await db.query('insert into public.club_memberships values ($1,$2,$3,$4)',[ID.coach,ID.club,ID.team,'coach']);
 await db.query('insert into public.club_memberships values ($1,$2,$3,$4)',[ID.delegate,ID.club,ID.team,'delegate']);
 await db.query('insert into public.club_memberships values ($1,$2,null,$3)',[ID.manager,ID.club,'admin']);
 await db.query("insert into public.pilot_events(id,match_id,user_id,event_type,team,delta,match_second,payload) values($1,$2,$3,'goal','home',1,10,$4)",[ID.officialGoal,ID.match,ID.delegate,JSON.stringify({kind:'gol',actor:ID.player,half:1,details:{}})]);
 await db.query("insert into public.pilot_operator_state values($1,1,$2,now())",[ID.match,JSON.stringify({sec:50,half:1,finished:true,players:[]})]);
 for(const match of [ID.match,ID.otherMatch])await db.query("insert into public.federation_match_sources(match_id,federation,competition_id,season_id,official_data,import_status,home_name,away_name,last_checked_at,federation_match_id) values($1,'FECAPA','4802','41',$2,'verified','FEM15 fictici','Rival fictici',now(),'FICTICI')",[match,JSON.stringify({home_team_id:'12419',away_team_id:'fictici',home_score:1,away_score:0})]);
 const migrations=new URL('../../supabase/migrations/',import.meta.url);for(const file of fs.readdirSync(migrations).filter(n=>n.endsWith('.sql')).sort())await db.exec(fs.readFileSync(new URL(file,migrations),'utf8'));
 for(const [match,team] of [[ID.match,ID.team],[ID.otherMatch,ID.otherTeam]])await db.query('insert into public.stats_matches(match_id,club_id,season_id,home_team_id,home_external_team_id,away_external_team_id) values($1,$2,$3,$4,$5,$6)',[match,ID.club,ID.season,team,'12419','fictici']);
 await db.query("insert into public.stats_assignments(match_id,user_id,role,categories,expires_at,granted_by) values($1,$2,'primary','{}',now()+interval '30 days',$3)",[ID.match,ID.principal,ID.manager]);
 return db;
}
export async function asUser(db,user,sql,params=[]){await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${ID[user]||user}',false);`);return db.query(sql,params);}
export async function asOwner(db,sql,params=[]){await db.exec('reset role');return db.query(sql,params);}
export function event(overrides={}){return {id:crypto.randomUUID(),mutation_id:crypto.randomUUID(),match_id:ID.match,period:1,match_ms:20000,side:'home',player_id:null,assist_player_id:null,action:'pass_complete',duration_ms:null,origin:'video',validation:'recorded',source_event_id:null,...overrides};}
export const write=(db,user,e,revision=0)=>asUser(db,user,'select * from public.stats_write_event($1::jsonb,$2)',[JSON.stringify(e),revision]);
