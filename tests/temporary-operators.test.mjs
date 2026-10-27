import test from 'node:test';import assert from 'node:assert/strict';
import {createDatabase,ID,asUser,asOwner,event,write} from './helpers/stats-db.mjs';
let db;
const foreign={club:'81000000-0000-4000-8000-000000000001',season:'81000000-0000-4000-8000-000000000002',team:'81000000-0000-4000-8000-000000000003',match:'81000000-0000-4000-8000-000000000004'};
test.before(async()=>{
 db=await createDatabase();await asOwner(db,'select 1');await db.exec(`create table platform_admins(user_id uuid primary key,enabled boolean,role text);insert into platform_admins values('${ID.secondary}',true,'platform_superadmin');create or replace function app_private.is_platform_superadmin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.platform_admins where user_id=auth.uid() and enabled and role='platform_superadmin')$$;`);
 await asOwner(db,"update teams set age_group='youth',age_group_source='FEM15 FICTICI' where id=$1",[ID.team]);
 await asOwner(db,"insert into club_memberships values($1,$2,null,'general_coordinator')",[ID.principal,ID.club]);
 await asOwner(db,"insert into clubs values($1,'ALTRE CLUB FICTICI')",[foreign.club]);await asOwner(db,"insert into seasons values($1,$2,'2026/27')",[foreign.season,foreign.club]);
 await asOwner(db,"insert into teams(id,club_id,season_id,name,age_group,age_group_source) values($1,$2,$3,'ALTRE FEM15 FICTICI','youth','FICTICI')",[foreign.team,foreign.club,foreign.season]);
 await asOwner(db,"insert into pilot_matches(id,title) values($1,'ALTRE PARTIT FICTICI')",[foreign.match]);await asOwner(db,'insert into stats_matches(match_id,club_id,season_id,home_team_id) values($1,$2,$3,$4)',[foreign.match,foreign.club,foreign.season,foreign.team]);
});
test.after(async()=>await db.close());
test.beforeEach(async()=>{const rows=(await asOwner(db,'select id from match_temporary_operators where revoked_at is null')).rows;for(const a of rows)await asUser(db,'secondary','select match_temporary_revoke($1)',[a.id]);});
const payload=overrides=>({request_id:crypto.randomUUID(),match_id:ID.match,club_id:ID.club,team_id:ID.team,user_id:ID.external,actions:['pass_complete','goal','shot_target'],sides:['home'],...overrides});
const grant=async(user='secondary',p=payload())=>(await asUser(db,user,'select * from match_temporary_grant($1)',[JSON.stringify(p)])).rows[0];
const access=async(user='external',mid=ID.match)=>(await asUser(db,user,'select stats_access($1) a',[mid])).rows[0].a;

test('enabled superadmin grants default 24h; request retry is idempotent and creates no membership/assignment',async()=>{
 const before=(await asOwner(db,'select (select count(*) from pilot_members)::int members,(select count(*) from stats_assignments)::int assignments')).rows;
 const p=payload(),a=await grant('secondary',p),again=await grant('secondary',p);assert.equal(a.id,again.id);assert.equal(new Date(a.expires_at)-new Date(a.starts_at),86400000);
 assert.deepEqual((await asOwner(db,'select (select count(*) from pilot_members)::int members,(select count(*) from stats_assignments)::int assignments')).rows,before);
 assert.equal((await asOwner(db,'select count(*)::int n from match_temporary_operator_audit where grant_id=$1',[a.id])).rows[0].n,1);
 await asOwner(db,'update platform_admins set enabled=false');await assert.rejects(grant('secondary',payload({user_id:ID.coach})),/denied/);await asOwner(db,'update platform_admins set enabled=true');
});
test('club-wide general coordinator grants configurable finite period; admin/coach/delegate/section cannot grant',async()=>{
 const start=new Date().toISOString(),end=new Date(Date.now()+2*3600000).toISOString();const a=await grant('principal',payload({starts_at:start,expires_at:end}));assert.equal(a.granted_by,ID.principal);
 for(const user of ['coach','delegate','manager'])await assert.rejects(grant(user,payload({user_id:ID.coach})),/denied/);
 await asOwner(db,"insert into club_memberships values($1,$2,$3,'section_coordinator')",[ID.alien,ID.club,ID.team]);await assert.rejects(grant('alien',payload()),/denied/);
});
test('mismatched club/team and another club coordinator are denied',async()=>{
 await assert.rejects(grant('principal',payload({club_id:foreign.club})),/mismatch/);
 await assert.rejects(grant('principal',payload({team_id:foreign.team})),/mismatch/);
 await assert.rejects(grant('principal',payload({match_id:foreign.match,club_id:foreign.club,team_id:foreign.team})),/denied/);
});
test('active grant gives only exact-match Advanced and statistics, not Base or any activation',async()=>{
 await grant();const a=await access();assert.equal(a.read,true);assert.equal(a.manage,false);assert.equal(a.club_manager,false);assert.equal(a.temporary_manage,false);assert.equal(a.temporary.active,true);
 const caps=(await asUser(db,'external','select match_mode_access(null,$1) a',[ID.match])).rows[0].a;assert.equal(caps.advanced,true);assert.equal(caps.base,false);assert.equal(caps.activate_advanced,false);assert.equal(caps.activate_base,false);
 for(const mid of [ID.otherMatch,foreign.match]){assert.equal((await access('external',mid)).read,false);assert.equal((await asUser(db,'external','select match_mode_access(null,$1) a',[mid])).rows[0].a.advanced,false);await assert.rejects(write(db,'external',event({match_id:mid})),/denied/);}
 assert.deepEqual((await asUser(db,'external','select id from pilot_matches')).rows.map(r=>r.id),[ID.match]);
 const list=(await asUser(db,'external','select match_temporary_list(null) a')).rows[0].a;assert.ok(list.every(g=>g.match_id===ID.match&&g.user_id===ID.external));
});
test('individual/team scope is exact; other actions, sides and players fail at write RPC',async()=>{
 await grant('secondary',payload({actions:['pass_complete'],player_ids:[ID.player]}));
 await write(db,'external',event({player_id:ID.player}));
 for(const changes of [{action:'pass_failed',player_id:ID.player},{side:'away',player_id:ID.rival},{player_id:null},{player_id:ID.goalie}])await assert.rejects(write(db,'external',event(changes)),/scope/);
});
test('team and individual observations are idempotent and session resumes without changing official rows',async()=>{
 const before=(await asOwner(db,"select jsonb_build_object('official',(select jsonb_agg(e) from pilot_events e),'clock',(select jsonb_agg(s) from pilot_operator_state s),'assignments',(select jsonb_agg(a) from stats_assignments a),'teams',(select jsonb_agg(t) from teams t)) a")).rows[0].a;
 await grant();const team=event(),individual=event({action:'goal',player_id:ID.player});await write(db,'external',team);await write(db,'external',team);await write(db,'external',individual);
 assert.equal((await asUser(db,'external','select count(*)::int n from stats_events where id=any($1::uuid[])',[[team.id,individual.id]])).rows[0].n,2);
 await asUser(db,'external','select stats_save_session($1,$2,0)',[ID.match,JSON.stringify({period:1,ms:13000,mode:'video'})]);
 const recovered=(await asUser(db,'external','select * from stats_sessions where match_id=$1',[ID.match])).rows[0];assert.equal(recovered.state.ms,13000);assert.equal(recovered.state.mode,'video');
 await asUser(db,'external','select stats_save_session($1,$2,$3)',[ID.match,JSON.stringify({period:1,ms:14000,mode:'video'}),recovered.revision]);
 const after=(await asOwner(db,"select jsonb_build_object('official',(select jsonb_agg(e) from pilot_events e),'clock',(select jsonb_agg(s) from pilot_operator_state s),'assignments',(select jsonb_agg(a) from stats_assignments a),'teams',(select jsonb_agg(t) from teams t)) a")).rows[0].a;assert.deepEqual(after,before);
});
test('official goals/cards/rosters/players/clocks and delegation remain denied',async()=>{
 await grant();
 await assert.rejects(asUser(db,'external',"insert into pilot_events(id,match_id,user_id,event_type,payload) values(gen_random_uuid(),$1,$2,'goal',$3)",[ID.match,ID.external,JSON.stringify({kind:'gol',details:{origin:'basic'}})]),/row-level security/);
 await assert.rejects(asUser(db,'external','select pilot_roster_catalogue($1)',[ID.match]),/denied|operator|preparation|access/i);
 await assert.rejects(asUser(db,'external',"insert into pilot_players(id,match_id,team,full_name) values(gen_random_uuid(),$1,'home','FORBIDDEN')",[ID.match]),/permission denied|row-level security/);
 await assert.rejects(asUser(db,'external',"select pilot_save_operator_state($1,0,'{}')",[ID.match]),/row-level security/);
 await assert.rejects(asUser(db,'external','select stats_grant($1)',[JSON.stringify({match_id:ID.match})]),/denied/);
 await assert.rejects(grant('external',payload({user_id:ID.alien})),/denied/);
 await assert.rejects(write(db,'external',event({action:'goal',source_event_id:ID.officialGoal,origin:'official_reference'})),/observations only/);
 await assert.rejects(write(db,'external',event({validation:'validated'})),/Validation/);
 await assert.rejects(write(db,'external',event({action:'goal',player_id:ID.player,assist_player_id:ID.goalie})),/scope/);
});
test('revocation is immediate, idempotent, audited and preserves legitimate statistics',async()=>{
 const a=await grant(),e=event();await write(db,'external',e);const before=(await asOwner(db,'select * from stats_events where id=$1',[e.id])).rows;
 await asUser(db,'principal','select match_temporary_revoke($1)',[a.id]);await asUser(db,'principal','select match_temporary_revoke($1)',[a.id]);
 assert.equal((await access()).read,false);assert.equal((await access()).temporary.status,'revoked');await assert.rejects(write(db,'external',event()),/denied/);await assert.rejects(write(db,'external',e),/denied/);
 await assert.rejects(asUser(db,'external','select stats_save_session($1,$2,0)',[ID.match,JSON.stringify({period:1,ms:0,mode:'video'})]),/denied/);
 assert.deepEqual((await asOwner(db,'select * from stats_events where id=$1',[e.id])).rows,before);assert.equal((await asOwner(db,"select count(*)::int n from match_temporary_operator_audit where grant_id=$1 and operation='revoked'",[a.id])).rows[0].n,1);
});
test('expiry and future start are checked at the server on every request',async()=>{
 const a=await grant();await asOwner(db,"update match_temporary_operators set starts_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where id=$1",[a.id]);
 assert.equal((await access()).read,false);assert.equal((await access()).temporary.status,'expired');await assert.rejects(write(db,'external',event()),/denied/);
 const b=await grant('secondary',payload({starts_at:new Date(Date.now()+3600000).toISOString()}));assert.equal((await access()).read,false);assert.equal((await access()).temporary.status,'scheduled');assert.equal(new Date(b.expires_at)-new Date(b.starts_at),86400000);
});
test('indefinite/oversized/empty/unknown or client-escalated permissions are rejected',async()=>{
 for(const changes of [{expires_at:'infinity'},{expires_at:new Date(Date.now()+8*86400000).toISOString()},{actions:[]},{actions:['unknown_action']},{mode:'base'},{permissions:['admin']},{granted_by:ID.external},{user_id:crypto.randomUUID()}])await assert.rejects(grant('secondary',payload(changes)));
 await db.exec("set timezone='Europe/Madrid'");try{await assert.rejects(grant('secondary',payload({starts_at:'2027-10-30T10:00:00Z',expires_at:'2027-11-06T11:00:00Z'})),/168 hours/);}finally{await db.exec("set timezone='UTC'");}
 await grant();await assert.rejects(asUser(db,'external',"update match_temporary_operators set expires_at=expires_at+interval '1 day'"),/permission denied/);await assert.rejects(asUser(db,'external','delete from match_temporary_operator_audit'),/permission denied/);
});
test('overlapping scopes are prevented without modifying existing assignments',async()=>{
 await grant();await assert.rejects(grant('secondary',payload({user_id:ID.coach})),/overlap/);
 await assert.rejects(asUser(db,'principal','select stats_grant($1)',[JSON.stringify({match_id:ID.match,user_id:ID.coach,role:'operator',categories:['pass'],sides:['home'],player_ids:[],expires_at:new Date(Date.now()+3600000).toISOString()})]),/overlap/);
 const disjoint=await grant('secondary',payload({user_id:ID.coach,actions:['shot_off']}));assert.ok(disjoint.id);
});
test('a pre-existing Base operator receives no additional official rights through the statistical exception',async()=>{
 const before=(await asUser(db,'delegate','select match_mode_access(null,$1) a',[ID.match])).rows[0].a;assert.equal(before.base,true);assert.equal(before.advanced,false);
 await grant('secondary',payload({user_id:ID.delegate}));const after=(await asUser(db,'delegate','select match_mode_access(null,$1) a',[ID.match])).rows[0].a;assert.equal(after.base,true);assert.equal(after.advanced,true);assert.equal(after.temporary_stats_only,true);
 await assert.rejects(asUser(db,'delegate',"select pilot_save_operator_state($1,0,'{}')",[ID.match]),/row-level security/);
});
test('ordinary senior/junior and explicit-future activation policy stay unchanged',async()=>{
 await grant();
 await asOwner(db,"update teams set age_group='senior' where id=$1",[ID.team]);assert.equal((await asUser(db,'delegate','select match_mode_access(null,$1) a',[ID.match])).rows[0].a.advanced,true);
 await assert.rejects(write(db,'external',event({action:'goal',player_id:ID.player,assist_player_id:ID.goalie})),/scope/);
 await asOwner(db,"update teams set age_group='junior' where id=$1",[ID.team]);assert.equal((await asUser(db,'delegate','select match_mode_access(null,$1) a',[ID.match])).rows[0].a.advanced,true);
 await asOwner(db,"update teams set age_group='youth' where id=$1",[ID.team]);const before=(await asOwner(db,'select count(*)::int n from basic_match_contexts')).rows;
 await assert.rejects(asUser(db,'external',"select match_activate_catalogue($1,'advanced',false)",[crypto.randomUUID()]),/denied/);assert.deepEqual((await asOwner(db,'select count(*)::int n from basic_match_contexts')).rows,before);
});
test('new tables have RLS and no direct DML; invoker RPCs and private aliases have no anonymous bypass',async()=>{
 const policies=(await asOwner(db,"select relrowsecurity from pg_class where oid in('match_temporary_operators'::regclass,'match_temporary_operator_audit'::regclass)")).rows;assert.equal(policies.length,2);assert.ok(policies.every(r=>r.relrowsecurity));
 const funcs=(await asOwner(db,"select p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('match_temporary_grant','match_temporary_revoke','match_temporary_list')")).rows;assert.equal(funcs.length,3);assert.ok(funcs.every(f=>!f.prosecdef&&!f.anon));
 for(const fn of ['app_private.stats_write_event_before_temporary(jsonb,integer)','app_private.stats_grant_before_temporary(jsonb)','app_private.match_mode_access_before_temporary(uuid,uuid)'])assert.equal((await asOwner(db,"select has_function_privilege('authenticated',$1,'EXECUTE') a",[fn])).rows[0].a,false);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select match_temporary_list(null)'),/permission denied/);
});
