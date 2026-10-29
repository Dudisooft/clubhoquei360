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
 `);
 for(const table of ['pilot_matches','pilot_events','pilot_players','pilot_operator_state','federation_match_sources'])await db.exec(`alter table public.${table} enable row level security;grant select on public.${table} to authenticated;`);
 for(const table of ['pilot_matches','pilot_events','pilot_players','pilot_operator_state','federation_match_sources'])await db.exec(`create policy legacy_member_read on public.${table} for select to authenticated using(exists(select 1 from public.pilot_members m where m.user_id=auth.uid() and m.match_id=${table==='pilot_matches'?table+'.id':table+'.match_id'}));`);
 await db.exec('alter table pilot_members enable row level security;create policy legacy_members_self on pilot_members for select to authenticated using(user_id=auth.uid());');
 await db.exec(`create policy legacy_official_operator on public.pilot_events for insert to authenticated with check(exists(select 1 from public.pilot_members m where m.user_id=auth.uid() and m.match_id=pilot_events.match_id and m.role='operator'));grant insert on public.pilot_events to authenticated;grant select on public.pilot_members to authenticated;`);
 await db.exec(`create policy pilot_events_direct_club_fixture on pilot_events as restrictive for insert to authenticated with check(
 not exists(select 1 from federation_match_sources s where s.match_id=pilot_events.match_id)
 or exists(select 1 from federation_match_sources s where s.match_id=pilot_events.match_id and s.import_status='verified' and ((s.federation='FECAPA' and s.home_crest_url like '%/252.png') or (s.federation='RFEP' and s.home_crest_url like '%/69_1.png'))));
 create policy legacy_state_insert on pilot_operator_state for insert to authenticated with check(updated_by=auth.uid() and exists(select 1 from pilot_members where match_id=pilot_operator_state.match_id and user_id=auth.uid() and role='operator'));
 create policy legacy_state_update on pilot_operator_state for update to authenticated using(exists(select 1 from pilot_members where match_id=pilot_operator_state.match_id and user_id=auth.uid() and role='operator')) with check(updated_by=auth.uid());
 grant insert,update on pilot_operator_state to authenticated;
 create function public.pilot_save_operator_state(p_match uuid,p_revision bigint,p_state jsonb) returns setof public.pilot_operator_state language plpgsql security invoker set search_path='' as $$begin
 if p_revision=0 then insert into public.pilot_operator_state(match_id,revision,state,updated_by) values(p_match,1,p_state,auth.uid()) on conflict(match_id) do nothing;return query select * from public.pilot_operator_state where match_id=p_match and revision=1 and updated_by=auth.uid() and state=p_state;
 else return query update public.pilot_operator_state set revision=revision+1,state=p_state,updated_by=auth.uid(),updated_at=now() where match_id=p_match and revision=p_revision returning *;end if;end$$;
 grant execute on function public.pilot_save_operator_state(uuid,bigint,jsonb) to authenticated;`);
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
 await db.query("insert into public.pilot_operator_state(match_id,revision,state,updated_at) values($1,1,$2,now())",[ID.match,JSON.stringify({sec:50,half:1,finished:true,players:[]})]);
 for(const match of [ID.match,ID.otherMatch])await db.query("insert into public.federation_match_sources(match_id,federation,competition_id,season_id,official_data,import_status,home_name,away_name,last_checked_at,federation_match_id) values($1,'FECAPA','4802','41',$2,'verified','FEM15 fictici','Rival fictici',now(),'FICTICI')",[match,JSON.stringify({home_team_id:'12419',away_team_id:'fictici',home_score:1,away_score:0})]);
 const migrations=new URL('../../supabase/migrations/',import.meta.url);for(const file of fs.readdirSync(migrations).filter(n=>n.endsWith('.sql')).sort())await db.exec(fs.readFileSync(new URL(file,migrations),'utf8'));
 // Optional local cross-PR verification; no server SQL is vendored into this branch.
 if(process.env.MATCH_MODE_SERVER_MIGRATION){const files=process.env.MATCH_MODE_SERVER_MIGRATION.startsWith('[')?JSON.parse(process.env.MATCH_MODE_SERVER_MIGRATION):[process.env.MATCH_MODE_SERVER_MIGRATION];for(const file of files)if(!fs.existsSync(new URL('../../supabase/migrations/'+file.split('/').at(-1),import.meta.url)))await db.exec(fs.readFileSync(file,'utf8'));await db.exec("update teams set age_group='junior',age_group_source='Synthetic cross-PR fixture'");}
 for(const [match,team] of [[ID.match,ID.team],[ID.otherMatch,ID.otherTeam]])await db.query('insert into public.stats_matches(match_id,club_id,season_id,home_team_id,home_external_team_id,away_external_team_id) values($1,$2,$3,$4,$5,$6)',[match,ID.club,ID.season,team,'12419','fictici']);
 await db.query("insert into public.stats_assignments(match_id,user_id,role,categories,expires_at,granted_by) values($1,$2,'primary','{}',now()+interval '30 days',$3)",[ID.match,ID.principal,ID.manager]);
 return db;
}
export async function asUser(db,user,sql,params=[]){await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${ID[user]||user}',false);`);return db.query(sql,params);}
export async function asOwner(db,sql,params=[]){await db.exec('reset role');return db.query(sql,params);}
export function event(overrides={}){return {id:crypto.randomUUID(),mutation_id:crypto.randomUUID(),match_id:ID.match,period:1,match_ms:20000,side:'home',player_id:null,assist_player_id:null,action:'pass_complete',duration_ms:null,origin:'video',validation:'recorded',source_event_id:null,...overrides};}
export const write=(db,user,e,revision=0)=>asUser(db,user,'select * from public.stats_write_event($1::jsonb,$2)',[JSON.stringify(e),revision]);
