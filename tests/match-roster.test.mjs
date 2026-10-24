import test from 'node:test';import assert from 'node:assert/strict';
import {createDatabase,ID,asOwner,asUser,event,write} from './helpers/stats-db.mjs';
import {PREP,seedPreparation} from './helpers/preparation-db.mjs';
let db;
const rpc=async(name,args,user='manager')=>(await asUser(db,user,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args.map(v=>typeof v==='object'?JSON.stringify(v):v))).rows[0].value;
const roster=(user='manager',mid=PREP.match)=>rpc('match_roster',[mid],user);
const manual=(overrides={})=>({id:crypto.randomUUID(),revision:0,manual:true,team:'away',dorsal:'9',full_name:'Visitant PROVISIONAL FICTICI',position:'field',...overrides});
const save=(p,mutation=crypto.randomUUID(),user='manager',mid=PREP.match)=>rpc('match_roster_save',[mid,mutation,p],user);
test.before(async()=>{db=await createDatabase();await seedPreparation(db);});test.after(async()=>db.close());
test.beforeEach(async()=>{await db.exec('reset role;delete from match_roster_audit;delete from pilot_prepared_lineups;');await asOwner(db,'delete from pilot_players where match_id=$1',[PREP.match]);});
test('empty/partial visitor roster: provisional identity persists and retry does not duplicate',async()=>{
 assert.equal((await roster()).players.length,0);assert.deepEqual((await roster()).write_sides,['home','away']);
 const input=manual(),mutation=crypto.randomUUID(),p=await save(input,mutation);assert.equal(p.identity_status,'provisional');assert.equal(p.federation_player_id,null);assert.equal(p.official_source,'operator:'+ID.manager);assert.equal(p.id,input.id);
 assert.deepEqual(await save(input,mutation),p);await save(manual({dorsal:'10'}));assert.equal((await roster()).players.length,2);
 await assert.rejects(save({...input,full_name:'Changed'},mutation),/Mutation identity/);
 await assert.rejects(save(manual({dorsal:'009'})),/Shirt belongs/);
});
test('in-game correction preserves UUID, event payloads, score, clock and analysis; stale edits rejected',async()=>{
 const p=await save(manual());await asOwner(db,"insert into pilot_events(id,match_id,user_id,event_type,team,payload) values(gen_random_uuid(),$1,$2,'goal','away',$3)",[PREP.match,ID.manager,JSON.stringify({kind:'gol',actor:p.id})]);
 await asOwner(db,"insert into pilot_operator_state(match_id,revision,state) values($1,4,$2) on conflict(match_id) do update set state=excluded.state,revision=4",[PREP.match,JSON.stringify({matchStarted:true,sec:743,players:[{id:p.id,on:true,secs:56,red:false}],startersConfirmed:true})]);
 const snapshot=async()=>(await asOwner(db,"select jsonb_build_object('events',(select jsonb_agg(to_jsonb(e)) from pilot_events e),'clock',(select jsonb_agg(to_jsonb(s)) from pilot_operator_state s),'analysis',(select jsonb_agg(to_jsonb(a)) from stats_events a)) data")).rows[0].data;
 const before=await snapshot();const changed=await save({...manual(),id:p.id,revision:p.roster_revision,full_name:'Nom corregit FICTICI',dorsal:'12'});
 assert.equal(changed.id,p.id);assert.equal(changed.roster_revision,2);assert.deepEqual(await snapshot(),before);
 await assert.rejects(save({...manual(),id:p.id,revision:1}),/revision conflict/);
 const audit=(await asOwner(db,'select before_data,after_data from match_roster_audit where after_data->>\'roster_revision\'=\'2\'')).rows[0];assert.equal(audit.before_data.full_name,p.full_name);assert.equal(audit.after_data.full_name,changed.full_name);
});
test('later official catalogue reconciliation keeps UUID and every incident; repeated sync uses the same identity',async()=>{
 const p=await save(manual({team:'home',dorsal:'99'})),candidate=(await roster()).candidates[0];
 const linked=await save({...manual(),id:p.id,revision:p.roster_revision,team:'home',dorsal:p.dorsal,candidate_id:candidate.candidate_id});
 assert.equal(linked.id,p.id);assert.equal(linked.federation_player_id,candidate.federation_player_id);assert.equal(linked.identity_status,'federation');assert.equal(linked.dorsal,'99');
 const again=await save({...manual(),team:'home',dorsal:'99',candidate_id:candidate.candidate_id});assert.equal(again.id,p.id);assert.equal((await roster()).players.length,1);
 await assert.rejects(save({...manual(),id:p.id,revision:linked.roster_revision,team:'home',candidate_id:(await roster()).candidates[1].candidate_id}),/cannot be replaced/);
});
test('manual roster access is limited by match, side, player assignment, expiry and role; direct writes denied',async()=>{
 for(const user of ['alien','coach','delegate','external'])await assert.rejects(save(manual(),crypto.randomUUID(),user),/access denied/);
 await asOwner(db,"insert into stats_assignments(match_id,user_id,role,categories,sides,expires_at,granted_by) values($1,$2,'operator','{passing}','{away}',now()+interval '1 hour',$3)",[PREP.match,ID.external,ID.manager]);
 const p=await save(manual(),crypto.randomUUID(),'external');await assert.rejects(save(manual({team:'home'}),crypto.randomUUID(),'external'),/access denied/);
 await assert.rejects(save({...manual(),id:p.id,revision:1,team:'home'}),/outside match team/);
 await assert.rejects(save({...manual(),id:ID.player,revision:1}),/outside match team/);
 await asOwner(db,'update stats_assignments set player_ids=$1 where match_id=$2 and user_id=$3',[[p.id],PREP.match,ID.external]);
 assert.deepEqual((await roster('external')).write_sides,[]);await assert.rejects(save(manual({dorsal:'11'}),crypto.randomUUID(),'external'),/access denied/);
 await asOwner(db,"update stats_assignments set revoked_at=now() where match_id=$1 and user_id=$2",[PREP.match,ID.external]);await assert.rejects(roster('external'),/access denied/);
 await assert.rejects(asUser(db,'manager',"update pilot_players set full_name='UNSAFE' where id=$1",[p.id]),/permission denied/);
 await assert.rejects(asUser(db,'manager',"insert into pilot_players(id,match_id,team,full_name) values(gen_random_uuid(),$1,'away','UNSAFE')",[PREP.match]),/permission denied/);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select match_roster($1)',[PREP.match]),/permission denied/);
});
test('official candidates require exact team and scope; conflicting existing identities are preserved for review',async()=>{
 const c=(await roster()).candidates[0];await assert.rejects(save({...manual(),candidate_id:c.candidate_id}),/outside verified/);
 const a=await save({...manual(),team:'home',dorsal:'21',candidate_id:c.candidate_id}),b=await save(manual({team:'home',dorsal:'22'}));
 await assert.rejects(save({...manual(),id:b.id,revision:1,team:'home',dorsal:'22',candidate_id:c.candidate_id}),/already has a match record/);
 const rows=(await roster()).players;assert.equal(rows.length,2);assert.equal(rows.find(x=>x.id===a.id).federation_player_id,c.federation_player_id);assert.equal(rows.find(x=>x.id===b.id).identity_status,'provisional');
});
