import test from 'node:test';import assert from 'node:assert/strict';
import {createDatabase,ID,asUser,asOwner,event,write} from './helpers/stats-db.mjs';
const foreign={club:crypto.randomUUID(),team:crypto.randomUUID(),season:crypto.randomUUID(),match:crypto.randomUUID()};
let db;const future=()=>new Date(Date.now()+86400000).toISOString();
const manage=async(command,value,user='superoperator')=>(await asUser(db,user,'select temporary_manage($1,$2::jsonb) value',[command,JSON.stringify(value)])).rows[0].value;
const create=(value={})=>manage('create',{email:'external@example.test',club_id:ID.club,team_id:ID.team,permission:'analyst',expires_at:future(),match_ids:[],...value});
const accept=async(token,user='external')=>(await asUser(db,user,'select temporary_accept($1) value',[token])).rows[0].value;
const read=async(user,mid=ID.match)=>(await asUser(db,user,'select stats_access($1) value',[mid])).rows[0].value;
const service=async(email,token)=>(await (async()=>{await db.exec("reset role;set role service_role;select set_config('request.jwt.claim.sub','',false)");return db.query('select temporary_reserve_email($1,$2,$3) value',[email,token,'FICTITIOUS-IP-HASH']);})()).rows[0].value;
test.before(async()=>{db=await createDatabase();await asOwner(db,'insert into clubs values($1,$2)',[foreign.club,'Other FICTITIOUS club']);await asOwner(db,'insert into seasons values($1,$2,$3)',[foreign.season,foreign.club,'2026/27']);await asOwner(db,'insert into teams values($1,$2,$3,$4)',[foreign.team,foreign.club,foreign.season,'Other club FICTITIOUS team']);await asOwner(db,'insert into pilot_matches(id,title) values($1,$2)',[foreign.match,'Other club FICTITIOUS match']);await asOwner(db,'insert into stats_matches(match_id,club_id,season_id,home_team_id) values($1,$2,$3,$4)',[foreign.match,foreign.club,foreign.season,foreign.team]);});test.after(async()=>db.close());
test.beforeEach(async()=>{await db.exec("reset role;delete from stats_event_audit;delete from stats_events;delete from stats_assignments where invitation_id is not null;delete from temporary_invitation_audit;delete from temporary_invitations;delete from app_private.temporary_email_limits;update auth.users set email_confirmed_at=now();");});
test('only the existing enabled global superoperator can list or create invitations; club admin is denied',async()=>{
 for(const user of ['principal','manager','coach','external']){assert.equal((await asUser(db,user,'select temporary_admin_access() value')).rows[0].value,false);await assert.rejects(manage('create',{},user),/Global superoperator/);await assert.rejects(asUser(db,user,'select temporary_admin()'),/Global superoperator/);}
 assert.equal((await asUser(db,'superoperator','select temporary_admin_access() value')).rows[0].value,true);
 const catalog=(await asUser(db,'superoperator','select temporary_admin() value')).rows[0].value;assert.equal(catalog.clubs.length,2);assert.equal(catalog.teams.length,3);
});
test('only a hash persists; token, table and administrative RPC privileges cannot leak to unauthorised users',async()=>{
 const i=await create();assert.match(i.token,/^[a-f0-9]{64}$/);assert.equal(i.token_hash,undefined);
 const row=(await asOwner(db,'select * from temporary_invitations where id=$1',[i.id])).rows[0];assert.equal(row.token_hash.length,64);assert.notEqual(row.token_hash,i.token);
 const audit=JSON.stringify((await asOwner(db,'select * from temporary_invitation_audit')).rows);assert.ok(!audit.includes(i.token));assert.ok(!audit.includes(row.token_hash));
 await assert.rejects(asUser(db,'external','select * from temporary_invitations'),/permission denied/);
 const flags=(await asOwner(db,"select relrowsecurity from pg_class where oid in('temporary_invitations'::regclass,'temporary_invitation_audit'::regclass)")).rows;assert.ok(flags.every(r=>r.relrowsecurity));
 await db.exec("reset role;set role anon");await assert.rejects(db.query('select temporary_accept($1)',[i.token]),/permission denied/);
});
test('recipient Auth email must be confirmed and match; successful acceptance is atomic and single use',async()=>{
 const i=await create();await assert.rejects(accept(i.token,'alien'),/recipient mismatch/);
 await asOwner(db,'update auth.users set email_confirmed_at=null where id=$1',[ID.external]);await assert.rejects(accept(i.token),/recipient mismatch/);
 await asOwner(db,'update auth.users set email_confirmed_at=now() where id=$1',[ID.external]);const active=await accept(i.token);assert.equal(active.status,'active');assert.equal(active.accepted_by,ID.external);
 await assert.rejects(accept(i.token),/unavailable/);assert.equal((await asOwner(db,"select count(*)::int n from temporary_invitation_audit where action='accept'")).rows[0].n,1);
});
test('accepted analyst is isolated by team and match and can correct own observations without touching official data',async()=>{
 const before=(await asOwner(db,'select * from pilot_events order by id')).rows;const i=await create();await accept(i.token);
 assert.equal((await read('external')).read,true);assert.equal((await read('external',ID.otherMatch)).read,false);assert.equal((await read('external',foreign.match)).read,false);
 assert.equal((await asUser(db,'external','select * from pilot_matches')).rows.length,1);
 const e=event();await write(db,'external',e);assert.equal((await write(db,'external',{...e,mutation_id:crypto.randomUUID(),action:'pass_failed'},1)).rows[0].revision,2);
 await assert.rejects(write(db,'external',event({match_id:ID.otherMatch})),/access denied/);
 await assert.rejects(asUser(db,'external',"insert into pilot_events(id,match_id,user_id,event_type) values($1,$2,$3,'goal')",[crypto.randomUUID(),ID.match,ID.external]),/row-level security/);
 assert.deepEqual((await asOwner(db,'select * from pilot_events order by id')).rows,before);
});
test('viewer has data access but no writes or shared clock; revocation takes effect with the same user session',async()=>{
 const i=await create({permission:'viewer'});await accept(i.token);assert.equal((await read('external')).read,true);
 await assert.rejects(write(db,'external',event()),/outside assigned scope/);await assert.rejects(asUser(db,'external','select stats_save_session($1,$2,0)',[ID.match,JSON.stringify({period:1,ms:0,mode:'video'})]),/session access denied/);
 await manage('revoke',{id:i.id});assert.equal((await read('external')).read,false);assert.equal((await asUser(db,'external','select * from stats_events')).rows.length,0);await assert.rejects(write(db,'external',event()),/access denied/);
});
test('limited registration requires explicit matches/categories and cannot record another category or manage permissions',async()=>{
 await assert.rejects(create({permission:'recorder'}),/requires matches/);
 const i=await create({permission:'recorder',match_ids:[ID.match],categories:['pass']});await accept(i.token);await write(db,'external',event());await assert.rejects(write(db,'external',event({action:'shot_target'})),/outside assigned scope/);
 await assert.rejects(asUser(db,'external','select stats_grant($1)',[JSON.stringify({match_id:ID.match,user_id:ID.secondary,role:'viewer',expires_at:future()})]),/management denied/);
});
test('scope validation rejects foreign club/team/matches, duplicate recipient invitations and overlapping operators',async()=>{
 await assert.rejects(create({team_id:foreign.team}),/scope mismatch/);await assert.rejects(create({match_ids:[foreign.match]}),/outside invitation scope/);await assert.rejects(create({match_ids:[ID.otherMatch]}),/outside invitation scope/);
 const i=await create({email:'  EXTERNAL@EXAMPLE.TEST '});await assert.rejects(create(),/already exists/);await accept(i.token);
 const other=await create({email:'secondary@example.test'});await assert.rejects(accept(other.token,'secondary'),/scopes overlap/);
 assert.equal((await asOwner(db,'select consumed_at from temporary_invitations where id=$1',[other.id])).rows[0].consumed_at,null);
});
test('permission/expiry edits are server-side and audited; legacy commands cannot bypass invitation management',async()=>{
 const i=await create();await accept(i.token);
 const a=(await asUser(db,'superoperator','select * from stats_assignments where invitation_id=$1 and revoked_at is null',[i.id])).rows[0];
 await assert.rejects(asUser(db,'manager','select stats_revoke($1)',[a.id]),/temporary invitations/);
 await assert.rejects(asUser(db,'manager','select stats_grant($1)',[JSON.stringify({match_id:ID.match,user_id:ID.external,role:'viewer',expires_at:future()})]),/temporary invitations/);
 await manage('update',{id:i.id,permission:'viewer',expires_at:future(),match_ids:[]});await assert.rejects(write(db,'external',event()),/outside assigned scope/);
 const until=new Date(Date.now()+600).toISOString();await manage('update',{id:i.id,permission:'viewer',expires_at:until,match_ids:[]});await new Promise(r=>setTimeout(r,700));assert.equal((await read('external')).read,false);
 const actions=(await asOwner(db,'select action from temporary_invitation_audit where invitation_id=$1 order by at',[i.id])).rows.map(r=>r.action);assert.deepEqual(actions,['create','accept','update','update']);
});
test('rotating a pending link invalidates the old link; a timed-out acceptance token grants no access',async()=>{
 const i=await create();const next=await manage('rotate',{id:i.id});assert.notEqual(next.token,i.token);await assert.rejects(accept(i.token),/unavailable/);
 await asOwner(db,"update temporary_invitations set token_expires_at=now()-interval '1 second' where id=$1",[i.id]);await assert.rejects(accept(next.token),/unavailable/);assert.equal((await read('external')).read,false);
});
test('email reservation is service-only, validates the invitation and commits counters that limit repeated attempts',async()=>{
 const i=await create();await assert.rejects(asUser(db,'external','select temporary_reserve_email($1,$2,$3)',['external@example.test',i.token,'x']),/permission denied/);
 assert.equal((await service('alien@example.test',i.token)).allowed,false);
 for(let n=0;n<6;n++)assert.equal((await service('external@example.test',i.token)).allowed,true);
 assert.equal((await service('external@example.test',i.token)).allowed,false);assert.equal((await asOwner(db,"select attempts from app_private.temporary_email_limits where bucket like 'email:%' order by attempts desc limit 1")).rows[0].attempts,7);
});
test('internal memberships survive an invitation lifecycle; future scoped matches receive read-only assignments',async()=>{
 const i=await create({email:'coach@example.test',permission:'viewer'});await accept(i.token,'coach');await manage('revoke',{id:i.id});assert.equal((await read('coach')).read,true);
 const v=await create({permission:'viewer'});await accept(v.token);const mid=crypto.randomUUID();await asOwner(db,"insert into pilot_matches(id,title) values($1,'FICTITIOUS future match')",[mid]);await asOwner(db,'insert into stats_matches(match_id,club_id,season_id,home_team_id) values($1,$2,$3,$4)',[mid,ID.club,ID.season,ID.team]);assert.equal((await read('external',mid)).read,true);
 assert.equal((await asUser(db,'external','select temporary_touch() value')).rows[0].value,true);
});
