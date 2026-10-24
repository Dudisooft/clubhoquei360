/* Public calendar identity is the audited fixture; accounts/club data are local
 * fictional fixtures. This never connects to or modifies production. */
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createDatabase,ID,asOwner,asUser,event,write} from './helpers/stats-db.mjs';
export const VIC={pilot:'18fa0a6e-e5c6-487e-8315-5bc371e22cb1',calendar:'51894d05-c323-f3e1-8534-fa79e062c448',competition:'60000000-0000-4000-8000-000000000001',group:'60000000-0000-4000-8000-000000000002',entry:'60000000-0000-4000-8000-000000000003'};
const repair=fs.readFileSync(new URL('../scripts/prepare-rfep-vic-20261024.sql',import.meta.url),'utf8');
const calendar={round:'JORNADA 5',date:'24/10/2026',time:'20:30',home_name:'SIMAR IGUALADA HC',away_name:'AUTO VIGATANA PATÍ VIC',home_team_id:'3697',away_team_id:'3727',source_url:'https://hockeypatines.fep.es/league/3575',data_layer:'public_federation',home_crest:'https://sidgad.cloud/rfep/images//logos_clubes/69_1.png',away_crest:'https://sidgad.cloud/rfep/images//logos_clubes/738.png'};
let db;
test.before(async()=>{
 db=await createDatabase();await db.exec(`reset role;
 alter table federation_match_sources add column if not exists federation_url text,add column if not exists home_crest_url text,add column if not exists away_crest_url text,add column if not exists automatic_enabled boolean,add column if not exists notes text;
 update federation_match_sources set federation_match_id=match_id::text;
 create unique index federation_source_external_unique on federation_match_sources(federation,federation_match_id) where federation_match_id is not null;
 alter table federation_matches add column if not exists match_fingerprint text,add column if not exists fetched_at timestamptz;
 `);
 await db.query("insert into federation_competitions values($1,$2,$3,'RFEP','3575')",[VIC.competition,ID.club,ID.season]);
 await db.query('insert into federation_groups values($1,$2)',[VIC.group,VIC.competition]);
 await db.query("insert into federation_team_entries(id,club_team_id,competition_id,external_team_id,raw_data) values($1,$2,$3,'3697',$4)",[VIC.entry,ID.team,VIC.competition,JSON.stringify({season_id:'41',verification:'official'})]);
 await db.query("insert into federation_matches(id,group_id,external_match_id,match_fingerprint,raw_data,federation_start_at,home_team,away_team,home_score,away_score,fetched_at) values($1,$2,null,'RFEP:41:3575:3575:JORNADA 5:3697:3727',$3,'2026-10-24 18:30Z','SIMAR IGUALADA HC','AUTO VIGATANA PATÍ VIC',null,null,'2026-10-23 23:17Z')",[VIC.calendar,VIC.group,JSON.stringify(calendar)]);
 await db.query("insert into pilot_matches values($1,'Igualada – Vic · fixture de prova','SIMAR IGUALADA HC','AUTO VIGATANA PATÍ VIC','2026-10-24 18:30Z','scheduled')",[VIC.pilot]);
});
test.after(async()=>db.close());
test('scoped repair links the existing match once, preserves historical data and invents no report or roster',async()=>{
 const before=(await asOwner(db,"select jsonb_build_object('matches',(select jsonb_agg(p) from pilot_matches p),'events',(select jsonb_agg(e) from pilot_events e),'clock',(select jsonb_agg(c) from pilot_operator_state c),'users',(select count(*) from auth.users)) value")).rows[0].value;
 await db.exec(repair);await db.exec(repair);
 const source=(await asOwner(db,'select * from federation_match_sources where match_id=$1',[VIC.pilot])).rows[0];assert.equal(source.federation_match_id,null);assert.equal(source.import_status,'pending');assert.equal(source.official_data.calendar_match_id,VIC.calendar);assert.equal(source.official_data.source_kind,'verified_calendar');assert.equal(source.official_data.home_score,null);
 assert.equal((await asOwner(db,'select count(*)::int n from stats_matches where match_id=$1',[VIC.pilot])).rows[0].n,1);
 assert.equal((await asOwner(db,'select count(*)::int n from pilot_players where match_id=$1',[VIC.pilot])).rows[0].n,0);
 const after=(await asOwner(db,"select jsonb_build_object('matches',(select jsonb_agg(p) from pilot_matches p),'events',(select jsonb_agg(e) from pilot_events e),'clock',(select jsonb_agg(c) from pilot_operator_state c),'users',(select count(*) from auth.users)) value")).rows[0].value;assert.deepEqual(after,before);
});
test('existing manager can activate and record team statistics live; unrelated account remains denied',async()=>{
 const grant={match_id:VIC.pilot,user_id:ID.manager,role:'primary',sides:['home','away','disputed'],categories:[],expires_at:'2099-01-01T00:00:00Z'};
 assert.equal((await asUser(db,'manager','select stats_access($1) a',[VIC.pilot])).rows[0].a.manage,true);
 await asUser(db,'manager','select stats_grant($1)',[JSON.stringify(grant)]);
 for(const action of ['pass_complete','shot_target','goal']){const r=await write(db,'manager',event({match_id:VIC.pilot,action,origin:'live'}));assert.equal(r.rows[0].origin,'live');}
 const clock=await asUser(db,'manager','select * from stats_save_session($1,$2,0)',[VIC.pilot,JSON.stringify({period:1,ms:12300,mode:'live'})]);assert.equal(clock.rows[0].state.mode,'live');
 assert.equal((await asUser(db,'alien','select stats_access($1) a',[VIC.pilot])).rows[0].a.read,false);
 await assert.rejects(write(db,'alien',event({match_id:VIC.pilot})),/access denied/);
});
test('later official ID reconciles the same source and repeat repair preserves statistical observations',async()=>{
 await asOwner(db,"update federation_matches set external_match_id='999999' where id=$1",[VIC.calendar]);
 await db.exec(repair);const source=(await asOwner(db,'select * from federation_match_sources where match_id=$1',[VIC.pilot])).rows[0];assert.equal(source.federation_match_id,'999999');
 assert.equal((await asOwner(db,'select count(*)::int n from stats_events where match_id=$1',[VIC.pilot])).rows[0].n,3);
 await asOwner(db,'update federation_matches set external_match_id=null where id=$1',[VIC.calendar]);
});
test('changed or missing verification metadata and ambiguous existing pilot fail closed',async()=>{
 await asOwner(db,"update federation_matches set raw_data=raw_data-'source_url' where id=$1",[VIC.calendar]);await assert.rejects(db.exec(repair),/identity changed/);await db.exec('rollback');
 await asOwner(db,'update federation_matches set raw_data=$2 where id=$1',[VIC.calendar,JSON.stringify(calendar)]);
 const duplicate=crypto.randomUUID();await asOwner(db,"insert into pilot_matches values($1,'FICTITIOUS duplicate','SIMAR IGUALADA HC','AUTO VIGATANA PATÍ VIC','2026-10-24 18:30Z','scheduled')",[duplicate]);await assert.rejects(db.exec(repair),/Ambiguous pilot/);await db.exec('rollback');await asOwner(db,'delete from pilot_matches where id=$1',[duplicate]);
});
