import test from 'node:test';import assert from 'node:assert/strict';
import {createDatabase,ID,asOwner,asUser,event,write} from './helpers/stats-db.mjs';
let db;test.before(async()=>{db=await createDatabase();await asOwner(db,'select 1');
 // Exact relevant production INSERT predicate, inspected read-only 2026-10-27.
 // The previous fixture allowed operators only, hiding the statistician branch.
 await db.exec(`drop policy legacy_official_operator on pilot_events;
 create policy pilot_events_authorized_insert on pilot_events for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from pilot_members m where m.match_id=pilot_events.match_id and m.user_id=auth.uid() and m.role in('operator','statistician')) and (event_type not in('goal','team_foul','clock','substitution','lineup','correction','card_blue','card_red') or exists(select 1 from pilot_members m where m.match_id=pilot_events.match_id and m.user_id=auth.uid() and m.role='operator')));
 insert into pilot_members values('${ID.match}','${ID.external}','statistician');
 insert into club_memberships values('${ID.principal}','${ID.club}',null,'general_coordinator');
 update teams set age_group='youth',age_group_source='FEM15 FICTICI' where id='${ID.team}';`);
});test.after(async()=>await db.close());
const grant=async mid=>(await asUser(db,'principal','select * from match_temporary_grant($1)',[JSON.stringify({request_id:crypto.randomUUID(),match_id:mid,club_id:ID.club,team_id:mid===ID.match?ID.team:ID.otherTeam,user_id:ID.external,actions:['pass_complete'],sides:['home']})])).rows[0];
const official=payload=>asUser(db,'external',"insert into pilot_events(id,match_id,user_id,event_type,team,payload) values(gen_random_uuid(),$1,$2,'note','home',$3)",[ID.match,ID.external,JSON.stringify(payload)]);
test('real legacy statistician INSERT policy cannot smuggle official Base markers through note events',async()=>{
 await grant(ID.match);
 for(const kind of ['basic_finished','basic_reopened','basic_participants','groga'])await assert.rejects(official({kind,details:{origin:'basic',ids:[ID.player]}}),/row-level security/);
});
test('sporting Advanced availability does not authorize disguised official goals in note payloads',async()=>{
 await asOwner(db,"update teams set age_group='senior' where id=$1",[ID.team]);
 for(const kind of ['gol','gol_resta','falta','groga','clock','partit_finalitzat'])await assert.rejects(official({kind,details:{}}),/row-level security/);
});
test('one account can hold independent exact-match grants; revoking one preserves the other and historical rows',async()=>{
 await grant(ID.otherMatch);const grants=(await asUser(db,'external','select match_temporary_list(null) a')).rows[0].a;assert.equal(grants.length,2);
 const a=grants.find(g=>g.match_id===ID.match),e=event({match_id:ID.otherMatch});await write(db,'external',e);
 await asUser(db,'principal','select match_temporary_revoke($1)',[a.id]);assert.equal((await asUser(db,'external','select stats_access($1) a',[ID.otherMatch])).rows[0].a.read,true);
 assert.equal((await asUser(db,'external','select count(*)::int n from stats_events where id=$1',[e.id])).rows[0].n,1);
 await assert.rejects(write(db,'external',event()),/denied/);
});
test('former authorizer cannot issue or revoke; existing finite audited delegation retains its explicit lifetime',async()=>{
 await asOwner(db,"delete from club_memberships where user_id=$1 and role='general_coordinator'",[ID.principal]);
 const current=(await asUser(db,'external','select match_temporary_list(null) a')).rows[0].a.find(g=>g.match_id===ID.otherMatch);
 await assert.rejects(asUser(db,'principal','select match_temporary_revoke($1)',[current.id]),/denied/);await assert.rejects(grant(ID.otherMatch),/denied/);
 assert.equal((await asUser(db,'external','select stats_access($1) a',[ID.otherMatch])).rows[0].a.temporary.active,true);
});
