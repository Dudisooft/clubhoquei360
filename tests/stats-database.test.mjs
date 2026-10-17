import test from 'node:test';
import assert from 'node:assert/strict';
import {createDatabase,ID,asUser,asOwner,event,write} from './helpers/stats-db.mjs';
let db;test.before(async()=>db=await createDatabase());test.after(async()=>await db.close());
const grant=(user,scope={})=>asUser(db,'principal','select * from public.stats_grant($1::jsonb)',[JSON.stringify({match_id:ID.match,user_id:ID[user],role:'operator',categories:['pass'],sides:['home'],player_ids:[],expires_at:'2099-01-01T00:00:00Z',...scope})]);
test('database derives identity, actor and provenance; immutable audit records a real correction',async()=>{
 const e=event({operator_id:ID.alien,club_id:ID.otherTeam,player_id:ID.player});const before=JSON.stringify((await asOwner(db,'select * from pilot_events')).rows);
 const saved=(await write(db,'principal',e)).rows[0];assert.equal(saved.operator_id,ID.principal);assert.equal(saved.club_id,ID.club);assert.equal(saved.team_id,ID.team);
 const corrected={...e,mutation_id:crypto.randomUUID(),action:'pass_failed'};const update=(await write(db,'principal',corrected,1)).rows[0];assert.equal(update.revision,2);
 const audit=await asUser(db,'principal','select * from stats_event_audit where event_id=$1 order by revision',[e.id]);assert.equal(audit.rows.length,2);assert.equal(audit.rows[1].previous.action,'pass_complete');assert.equal(audit.rows[1].current.action,'pass_failed');
 assert.equal(JSON.stringify((await asOwner(db,'select * from pilot_events')).rows),before);
 await assert.rejects(asUser(db,'principal',"update stats_events set action='goal' where id=$1",[e.id]),/permission denied/);
 await assert.rejects(asUser(db,'principal','delete from stats_event_audit where event_id=$1',[e.id]),/permission denied/);
});
test('idempotent ACK retry and optimistic correction conflict never duplicate an event',async()=>{
 const e=event();await write(db,'principal',e);await write(db,'principal',e);assert.equal((await asOwner(db,'select count(*)::int n from stats_events where id=$1',[e.id])).rows[0].n,1);
 await assert.rejects(write(db,'principal',{...e,action:'pass_failed'}),/Idempotency key/);
 await write(db,'principal',{...e,mutation_id:crypto.randomUUID(),action:'pass_failed'},1);
 await assert.rejects(write(db,'principal',{...e,mutation_id:crypto.randomUUID(),action:'shot_off'},1),/Revision conflict/);
});
test('coach reads own team; delegate and unrelated user cannot read advanced data',async()=>{
 assert.ok((await asUser(db,'coach','select * from stats_events')).rows.length);
 for(const user of ['delegate','alien']){assert.equal((await asUser(db,user,'select * from stats_events')).rows.length,0);await assert.rejects(write(db,user,event()),/denied/);}
 assert.equal((await asUser(db,'coach','select * from stats_matches where match_id=$1',[ID.otherMatch])).rows.length,0);
});
test('temporary external operator receives only assigned match, side, category and player',async()=>{
 const a=(await grant('external',{player_ids:[ID.player]})).rows[0];
 await write(db,'external',event({player_id:ID.player}));
 await assert.rejects(write(db,'external',event({action:'shot_off',player_id:ID.player})),/scope/);
 await assert.rejects(write(db,'external',event({player_id:null})),/scope/);
 await assert.rejects(write(db,'external',event({player_id:ID.goalie})),/scope/);
 await assert.rejects(write(db,'external',event({side:'away',player_id:ID.rival})),/scope/);
 await assert.rejects(write(db,'external',event({match_id:ID.otherMatch})),/denied/);
 assert.equal((await asUser(db,'external','select * from pilot_matches')).rows.length,1);
 await assert.rejects(asUser(db,'external',"insert into pilot_events(id,match_id,user_id,event_type) values($1,$2,$3,'goal')",[crypto.randomUUID(),ID.match,ID.external]),/row-level security/);
 await asUser(db,'principal','select public.stats_revoke($1)',[a.id]);
 assert.equal((await asUser(db,'external','select * from stats_events')).rows.length,0);
 await assert.rejects(write(db,'external',event({player_id:ID.player})),/denied/);
});
test('expired grant loses reads and writes without requiring a refreshed JWT',async()=>{
 const a=(await grant('external')).rows[0];await asOwner(db,"update stats_assignments set expires_at=now()-interval '1 second' where id=$1",[a.id]);
 assert.equal((await asUser(db,'external','select * from stats_events')).rows.length,0);await assert.rejects(write(db,'external',event()),/denied/);
});
test('operator scopes cannot overlap; a principal cannot double-record an assigned category',async()=>{
 const a=(await grant('external')).rows[0];await assert.rejects(grant('secondary'),/overlap/);
 await assert.rejects(write(db,'principal',event()),/scope/);
 const b=(await grant('secondary',{categories:['shot']})).rows[0];
 await write(db,'external',event());await write(db,'secondary',event({action:'shot_target'}));
 await assert.rejects(asUser(db,'external','select public.stats_grant($1::jsonb)',[JSON.stringify({match_id:ID.match,user_id:ID.alien,role:'primary'})]),/denied/);
 await asUser(db,'principal','select public.stats_revoke($1)',[a.id]);await asUser(db,'principal','select public.stats_revoke($1)',[b.id]);
});
test('player identity, side and goalkeeper restrictions are enforced in PostgreSQL',async()=>{
 await assert.rejects(write(db,'principal',event({player_id:ID.rival})),/Player does not belong/);
 await assert.rejects(write(db,'principal',event({action:'save',player_id:ID.player})),/Goalkeeper/);
 await assert.rejects(write(db,'principal',event({action:'assist'})),/identity required/);
 await write(db,'principal',event({action:'save',player_id:ID.goalie}));
});
test('possession rejects overlap, invalid intervals and empty clocks; correction permits revisiting video',async()=>{
 const e=event({action:'possession',match_ms:10000,duration_ms:10000});await write(db,'principal',e);
 await assert.rejects(write(db,'principal',event({action:'possession',match_ms:15000,duration_ms:10000})),/overlaps/);
 await assert.rejects(write(db,'principal',event({action:'possession',duration_ms:null})),/check constraint/);
 await write(db,'principal',{...e,mutation_id:crypto.randomUUID(),validation:'void'},1);
 await write(db,'principal',event({action:'possession',side:'away',match_ms:10000,duration_ms:10000}));
 await assert.rejects(asUser(db,'principal','select public.stats_save_session($1,$2,0)',[ID.match,JSON.stringify({})]),/fields required/);
});
test('analysis session survives reopen paused and concurrent clock save rejects stale revision',async()=>{
 const state={period:2,ms:123000,mode:'video',running:true,videoUrl:'https://example.com/video'};
 await asUser(db,'principal','select * from public.stats_save_session($1,$2,0)',[ID.match,JSON.stringify(state)]);
 const r=await asUser(db,'principal','select * from stats_sessions where match_id=$1',[ID.match]);assert.equal(r.rows[0].state.ms,123000);assert.equal(r.rows[0].state.running,undefined);
 await assert.rejects(asUser(db,'principal','select public.stats_save_session($1,$2,0)',[ID.match,JSON.stringify(state)]),/revision conflict/);
 assert.equal((await asOwner(db,'select state from pilot_operator_state where match_id=$1',[ID.match])).rows[0].state.sec,50);
});
test('official reference is unique and analytic void leaves original official goal untouched',async()=>{
 const e=event({action:'goal',source_event_id:ID.officialGoal,player_id:ID.player});await write(db,'principal',e);
 await assert.rejects(write(db,'principal',event({action:'goal',source_event_id:ID.officialGoal})),/unique constraint/);
 await write(db,'principal',{...e,mutation_id:crypto.randomUUID(),validation:'void'},1);
 assert.equal((await asOwner(db,'select delta from pilot_events where id=$1',[ID.officialGoal])).rows[0].delta,1);
 await assert.rejects(write(db,'principal',{...e,mutation_id:crypto.randomUUID(),source_event_id:null},2),/immutable/);
});
test('anonymous callers cannot execute commands or read analytics',async()=>{
 await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false)");
 await assert.rejects(db.query('select * from stats_events'),/permission denied/);
 await assert.rejects(db.query('select public.stats_access($1)',[ID.match]),/permission denied/);
});
test('future verified federation import creates context by IDs and leaves all manual observations intact',async()=>{
 const competition='60000000-0000-4000-8000-000000000001',entry='60000000-0000-4000-8000-000000000002',match='60000000-0000-4000-8000-000000000003';
 await asOwner(db,'insert into federation_competitions values($1,$2,$3,$4,$5)',[competition,ID.club,ID.season,'FECAPA','4802']);
 await asOwner(db,'insert into federation_team_entries values($1,$2,$3,$4,$5)',[entry,ID.team,competition,'12419',JSON.stringify({season_id:'41'})]);
 await asOwner(db,"insert into pilot_matches(id,title) values($1,'Nou partit fictici')",[match]);
 const before=JSON.stringify((await asOwner(db,'select * from stats_events order by id')).rows);
 await asOwner(db,"insert into federation_match_sources(match_id,federation,competition_id,season_id,official_data,import_status) values($1,'FECAPA','4802','41',$2,'verified')",[match,JSON.stringify({home_team_id:'12419',away_team_id:'fictici',home_score:2})]);
 assert.equal((await asOwner(db,'select home_team_id from stats_matches where match_id=$1',[match])).rows[0].home_team_id,ID.team);
 await asOwner(db,"update federation_match_sources set official_data=official_data||'{\"home_score\":4}'::jsonb where match_id=$1",[match]);
 assert.equal(JSON.stringify((await asOwner(db,'select * from stats_events order by id')).rows),before);
 await assert.rejects(asUser(db,'external','select public.stats_register_match($1,$2)',[match,ID.team]),/management required/);
});
test('only one active principal can be appointed, through club management',async()=>{
 await assert.rejects(asUser(db,'manager','select public.stats_grant($1::jsonb)',[JSON.stringify({match_id:ID.match,user_id:ID.secondary,role:'primary',categories:[],sides:['home'],expires_at:'2099-01-01'})]),/active principal/);
});
test('every analytics table has RLS and no stats command is executable by anonymous callers',async()=>{
 const tables=await asOwner(db,"select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname like 'stats_%'");assert.equal(tables.rows.length,8);assert.ok(tables.rows.every(r=>r.relrowsecurity));
 const exposed=await asOwner(db,"select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','app_private') and p.proname like 'stats_%' and has_function_privilege('anon',p.oid,'execute')");assert.equal(exposed.rows.length,0);
});

test('a manual observation cannot claim official-reference provenance without a real source',async()=>{await assert.rejects(write(db,'principal',event({origin:'official_reference'})),/check constraint/);});
