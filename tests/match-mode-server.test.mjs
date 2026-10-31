import test from 'node:test';import assert from 'node:assert/strict';
import {createDatabase,ID,asUser,asOwner,event,write} from './helpers/stats-db.mjs';
const C={comp:'60000000-0000-4000-8000-000000000001',group:'60000000-0000-4000-8000-000000000002',entry:'60000000-0000-4000-8000-000000000003',future:'60000000-0000-4000-8000-000000000004'};
let db;test.before(async()=>{db=await createDatabase();await asOwner(db,'select 1');await db.exec(`create table public.platform_admins(user_id uuid primary key,enabled boolean,role text);insert into public.platform_admins values('${ID.secondary}',true,'platform_superadmin');create or replace function app_private.is_platform_superadmin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.platform_admins p where p.user_id=auth.uid() and p.enabled and p.role='platform_superadmin')$$`);});test.after(async()=>await db.close());
const access=async(user,args={p_match:ID.match})=>(await asUser(db,user,'select public.match_mode_access($1,$2) a',[args.p_catalogue||null,args.p_match||null])).rows[0].a;
const setAge=age=>asOwner(db,"update teams set age_group=$1,age_group_source='FICTITIOUS VERIFIED FIXTURE' where id=$2",[age,ID.team]);
for(const [label,age] of [['OK Lliga','senior'],['Tercera Catalana','senior'],['Female senior, unknown division','senior'],['Júnior Or','junior'],['Júnior other division','junior']])test(label+' has both modes from metadata, irrespective of division label',async()=>{await setAge(age);const a=await access('delegate');assert.equal(a.base,true);assert.equal(a.advanced,true);assert.equal(a.operational_read,true);});
test('lower category blocks ordinary operator, club admin and section coordinator despite forged metadata',async()=>{
 await setAge('youth');for(const user of ['delegate','manager','coach'])assert.equal((await access(user)).advanced,false);
 await asOwner(db,'insert into club_memberships values($1,$2,$3,$4)',[ID.external,ID.club,ID.team,'section_coordinator']);assert.equal((await access('external')).advanced,false);
 await asUser(db,'delegate',"select set_config('request.jwt.claims',$1,false)",[JSON.stringify({user_metadata:{role:'platform_superadmin'},role:'authenticated'})]);assert.equal((await access('delegate')).advanced,false);
 await assert.rejects(asUser(db,'manager','select * from stats_can_read_before_modes($1)',[ID.match]),/does not exist|permission denied/);
 await assert.rejects(asUser(db,'manager','select app_private.stats_can_read_before_modes($1)',[ID.match]),/permission denied/);
 assert.equal((await asUser(db,'coach','select * from stats_matches')).rows.length,0);
 await assert.rejects(write(db,'principal',event()),/denied/);
});
test('only enabled superadmin and club-wide general coordinator get the lower-category exception',async()=>{
 await setAge('youth');assert.equal((await access('secondary')).advanced,true);
 await asOwner(db,'update platform_admins set enabled=false');assert.equal((await access('secondary')).advanced,false);await asOwner(db,"update platform_admins set enabled=true,role='support'");assert.equal((await access('secondary')).advanced,false);await asOwner(db,"update platform_admins set role='platform_superadmin'");
 await asOwner(db,'insert into club_memberships values($1,$2,null,$3)',[ID.external,ID.club,'general_coordinator']);assert.equal((await access('external')).advanced,true);
 assert.equal((await access('manager')).advanced,false);assert.equal((await access('alien')).advanced,false);
});
test('unknown age metadata fails closed for an ordinary user; consultation does not write',async()=>{
 await setAge(null);const before=await asOwner(db,'select count(*)::int n from pilot_events');const a=await access('delegate');assert.equal(a.base,true);assert.equal(a.advanced,false);
 const after=await asOwner(db,'select count(*)::int n from pilot_events');assert.deepEqual(after.rows,before.rows);
});
test('Base events remain allowed for youth; Advanced state and disguised clock writes are denied',async()=>{
 await setAge('youth');
 await asUser(db,'delegate',"insert into pilot_events(id,match_id,user_id,event_type,team,payload) values(gen_random_uuid(),$1,$2,'goal','home',$3)",[ID.match,ID.delegate,JSON.stringify({kind:'gol',details:{origin:'basic'}})]);
 const goal=(await asOwner(db,"select id from pilot_events where match_id=$1 and payload#>>'{details,origin}'='basic' limit 1",[ID.match])).rows[0].id;
 await asUser(db,'delegate',"insert into pilot_events(id,match_id,user_id,event_type,related_event_id,payload) values(gen_random_uuid(),$1,$2,'correction',$3,$4)",[ID.match,ID.delegate,goal,JSON.stringify({kind:'correction',details:{origin:'basic'}})]);
 await assert.rejects(asUser(db,'delegate',"insert into pilot_events(id,match_id,user_id,event_type,related_event_id,payload) values(gen_random_uuid(),$1,$2,'correction',$3,$4)",[ID.match,ID.delegate,ID.officialGoal,JSON.stringify({kind:'correction',details:{origin:'basic'}})]),/row-level security/);
 await assert.rejects(asUser(db,'delegate',"insert into pilot_operator_state(match_id,revision,state,updated_by) values($1,1,'{}',$2) on conflict(match_id) do update set state='{}'",[ID.match,ID.delegate]),/row-level security/);
 await assert.rejects(asUser(db,'delegate',"insert into pilot_events(id,match_id,user_id,event_type,payload) values(gen_random_uuid(),$1,$2,'clock',$3)",[ID.match,ID.delegate,JSON.stringify({kind:'clock',details:{origin:'basic'}})]),/row-level security/);
});
test('RFEP future can be consulted without writes and explicitly activated once by authorized coordinator',async()=>{
 await setAge('senior');await asOwner(db,"insert into federation_competitions values($1,$2,$3,'RFEP','DIVISION-FICTICIA')",[C.comp,ID.club,ID.season]);await asOwner(db,'insert into federation_groups values($1,$2)',[C.group,C.comp]);
 await asOwner(db,"insert into federation_matches(id,group_id,home_team,away_team,federation_start_at,match_fingerprint,raw_data) values($1,$2,'Sènior FICTICI','Rival FICTICI','2027-01-01T12:00Z','RFEP:41:DIVISION-FICTICIA:round:10:20',$3)",[C.future,C.group,JSON.stringify({home_team_id:'10',away_team_id:'20',source_url:'https://hockeypatines.fep.es',data_layer:'public_federation'})]);
 await asOwner(db,"insert into federation_team_entries(id,club_team_id,competition_id,external_team_id) values($1,$2,$3,'10')",[C.entry,ID.team,C.comp]);await asOwner(db,"insert into federation_match_teams values($1,$2,'home')",[C.future,C.entry]);
 const before=(await asOwner(db,'select count(*)::int n from pilot_matches')).rows;
 for(let i=0;i<2;i++){const a=await access('external',{p_catalogue:C.future});assert.equal(a.advanced,true);assert.equal(a.operational,null);assert.equal(a.activate_advanced,true);}
 assert.deepEqual((await asOwner(db,'select count(*)::int n from pilot_matches')).rows,before);
 await assert.rejects(asUser(db,'coach',"select match_activate_catalogue($1,'advanced',false)",[C.future]),/denied/);
 const a=(await asUser(db,'external',"select match_activate_catalogue($1,'advanced',false) id",[C.future])).rows[0].id;
 assert.equal(a,C.future);assert.equal((await asUser(db,'external',"select match_activate_catalogue($1,'advanced',false) id",[C.future])).rows[0].id,a);
 assert.equal((await asOwner(db,'select count(*)::int n from basic_match_contexts where catalogue_match_id=$1',[C.future])).rows[0].n,1);
 assert.equal((await asOwner(db,'select count(*)::int n from pilot_events where match_id=$1',[a])).rows[0].n,0);
 assert.equal((await access('external',{p_match:a})).operational_read,true);
 assert.equal((await asOwner(db,'select federation_match_id from federation_match_sources where match_id=$1',[a])).rows[0].federation_match_id,null);
});
test('same future context supports ordinary youth Base without enabling Advanced or five-player preparation',async()=>{
 await setAge('youth');await asOwner(db,"insert into pilot_members values($1,$2,'operator') on conflict do nothing",[C.future,ID.delegate]);
 const a=await access('delegate',{p_match:C.future});assert.equal(a.base,true);assert.equal(a.advanced,false);
 await asUser(db,'delegate',"insert into pilot_events(id,match_id,user_id,event_type,team,payload) values(gen_random_uuid(),$1,$2,'goal','home',$3)",[C.future,ID.delegate,JSON.stringify({kind:'gol',details:{origin:'basic'}})]);
 await assert.rejects(asUser(db,'delegate','select public.pilot_roster_catalogue($1)',[C.future]),/denied|operator|preparation|access/i);
 await assert.rejects(asUser(db,'delegate',"select match_activate_catalogue($1,'advanced',false)",[C.future]),/denied/);
});
test('closed official report requires explicit separate analysis and never replaces live context',async()=>{
 await asOwner(db,"update federation_matches set raw_data=raw_data||$1::jsonb where id=$2",[JSON.stringify({report_status:'verified',report_data:{official_status:'FINALIZAT'}}),C.future]);
 await assert.rejects(asUser(db,'external',"select match_activate_catalogue($1,'advanced',false)",[C.future]),/Finalized/);
 const a=(await asUser(db,'external',"select match_activate_catalogue($1,'advanced',true) id",[C.future])).rows[0].id;assert.notEqual(a,C.future);
 assert.equal((await asUser(db,'external',"select match_activate_catalogue($1,'advanced',true) id",[C.future])).rows[0].id,a);
 assert.equal((await asOwner(db,'select count(*)::int n from basic_match_contexts where catalogue_match_id=$1',[C.future])).rows[0].n,2);
});
test('anonymous callers and forged private capability JSON cannot invoke activation',async()=>{
 await db.exec("reset role;set role anon");await assert.rejects(db.query('select public.match_mode_access(null,$1)',[ID.match]),/permission denied/);
 await asUser(db,'alien','select 1');await assert.rejects(db.query("select app_private.mode_operator_eligible('{\"read\":true,\"privileged\":true}')"),/permission denied/);
 await assert.rejects(asUser(db,'alien',"select match_activate_catalogue($1,'base',false)",[C.future]),/denied/);
});
test('an already authorized Base operator can explicitly complete the same senior context for Advanced, preserving incidents',async()=>{
 await setAge('senior');const id='60000000-0000-4000-8000-000000000010';
 await asOwner(db,"insert into federation_matches(id,group_id,home_team,away_team,match_fingerprint,raw_data) select $1,group_id,home_team,away_team,'RFEP:41:FICTICI:other',raw_data-'report_status'-'report_data' from federation_matches where id=$2",[id,C.future]);
 await asOwner(db,"insert into federation_match_teams values($1,$2,'home')",[id,C.entry]);await asOwner(db,"insert into pilot_matches(id,title) values($1,'Base existent FICTICI')",[id]);
 await asOwner(db,"insert into basic_match_contexts(catalogue_match_id,pilot_match_id,owner_id,practice) values($1,$1,$2,false)",[id,ID.delegate]);await asOwner(db,"insert into pilot_members values($1,$2,'operator')",[id,ID.delegate]);
 await asOwner(db,"insert into pilot_events(id,match_id,user_id,event_type,payload) values(gen_random_uuid(),$1,$2,'note',$3)",[id,ID.delegate,JSON.stringify({kind:'basic_participants',details:{origin:'basic',ids:[]}})]);
 const before=(await asOwner(db,'select * from pilot_events where match_id=$1',[id])).rows;
 const a=await access('delegate',{p_catalogue:id});assert.equal(a.advanced,true);assert.equal(a.operational_read,true);assert.equal(a.advanced_context_ready,false);assert.equal(a.activate_advanced,true);
 assert.equal((await asUser(db,'delegate',"select match_activate_catalogue($1,'advanced',false) id",[id])).rows[0].id,id);
 assert.equal((await access('delegate',{p_match:id})).advanced_context_ready,true);
 assert.deepEqual((await asOwner(db,'select * from pilot_events where match_id=$1',[id])).rows,before);
});
