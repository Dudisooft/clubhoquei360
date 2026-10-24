import test from 'node:test';import assert from 'node:assert/strict';import {createDatabase,ID,asOwner,asUser} from './helpers/stats-db.mjs';import {PREP,seedPreparation} from './helpers/preparation-db.mjs';
let db;
const rpc=async(name,values,user='manager')=>(await asUser(db,user,`select public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) value`,values.map(v=>v&&typeof v==='object'?JSON.stringify(v):v))).rows[0].value;
const catalogue=async()=>(await rpc('pilot_roster_catalogue',[PREP.match])).candidates;
const prepare=(players,mutation=crypto.randomUUID(),user='manager')=>rpc('pilot_prepare_players',[PREP.match,mutation,players],user);
const confirm=(state,revision=0,mutation=crypto.randomUUID(),user='manager')=>rpc('pilot_confirm_lineup',[PREP.match,mutation,revision,state],user);
async function bothTeams(){const rows=await catalogue();const home=await prepare(rows.map(r=>({team:r.team,roster_id:r.roster_id,dorsal:r.dorsal,position:r.position})));const away=await prepare(Array.from({length:5},(_,i)=>({team:'away',manual:true,full_name:'Rival FICTICI '+(i+1),dorsal:String(i+1),position:i===0?'goalkeeper':'field'})));return {home,away,state:{starterSelections:{home:home.map(p=>p.id),away:away.map(p=>p.id)},kits:{home:{player:'first',goalie:'second'},away:{player:'second',goalie:'first'}}}};}
test.before(async()=>{db=await createDatabase();await seedPreparation(db);});test.after(async()=>db.close());
test.beforeEach(async()=>{await db.exec('reset role');await db.query('delete from pilot_preparation_audit where match_id=$1',[PREP.match]);await db.query('delete from pilot_prepared_lineups where match_id=$1',[PREP.match]);await db.query('delete from pilot_events where match_id=$1',[PREP.match]);await db.query('delete from pilot_operator_state where match_id=$1',[PREP.match]);await db.query('delete from pilot_players where match_id=$1',[PREP.match]);await db.query("update federation_matches set raw_data=jsonb_build_object('data_layer','public_federation','home_team_id','3697','away_team_id','3727') where id=$1",[PREP.calendar]);});
test('catalogue is match/team scoped; coach, unrelated operator and statistical operator cannot prepare',async()=>{
 const rows=await catalogue();assert.equal(rows.length,5);assert.ok(rows.every(r=>r.team==='home'&&r.federation_player_id));assert.equal(rows.filter(r=>r.position==='goalkeeper').length,1);
 for(const user of ['coach','delegate','external'])await assert.rejects(rpc('pilot_roster_catalogue',[PREP.match],user),/Match operator/);
 await assert.rejects(prepare([{team:'away',roster_id:rows[0].roster_id,position:'field'}]),/outside verified/);
 await assert.rejects(rpc('pilot_roster_catalogue',[ID.match]),/verified calendar/);
});
test('catalogue and explicit manual entries persist stable IDs and provenance without claiming a federation report',async()=>{
 const {home,away}=await bothTeams();assert.ok(home.every(p=>p.federation_player_id&&p.official_source.includes('#season-roster=')));assert.ok(away.every(p=>p.federation_player_id===null&&p.official_source==='operator:'+ID.manager));
 assert.equal((await asOwner(db,'select count(*)::int n from pilot_players where match_id=$1',[PREP.match])).rows[0].n,10);
 const src=(await asOwner(db,'select * from federation_match_sources where match_id=$1',[PREP.match])).rows[0];assert.equal(src.import_status,'pending');assert.equal(src.federation_match_id,null);
});
test('player retry is idempotent and conflicting shirts, unknown identity and duplicate batch fail atomically',async()=>{
 const row=(await catalogue())[0],input=[{team:'home',roster_id:row.roster_id,dorsal:'01',position:'goalkeeper'}],mutation=crypto.randomUUID();const one=await prepare(input,mutation);assert.deepEqual(await prepare(input,mutation),one);
 await assert.rejects(prepare([{team:'home',manual:true,full_name:'Una altra persona FICTÍCIA',dorsal:'1',position:'field'}]),/Shirt belongs/);
 await assert.rejects(prepare([...input,...input]),/Duplicate player/);await assert.rejects(prepare([{team:'home',full_name:'No explicit',position:'field'}]),/Explicit manual/);
 await assert.rejects(prepare([{...input[0],dorsal:'2'}],mutation),/Mutation identity/);assert.equal((await asOwner(db,'select count(*)::int n from pilot_players where match_id=$1',[PREP.match])).rows[0].n,1);
});
test('five per side and one goalkeeper are checked against actual match players, not client claims',async()=>{
 const {home,away,state}=await bothTeams();await assert.rejects(confirm({...state,starterSelections:{home:home.slice(0,4).map(p=>p.id),away:state.starterSelections.away}}),/Exactly five/);
 await assert.rejects(confirm({...state,starterSelections:{home:[...state.starterSelections.home.slice(0,4),away[0].id],away:state.starterSelections.away}}),/distinct players|outside active/);
 await asOwner(db,"update pilot_players set position='field' where id=$1",[home[0].id]);await assert.rejects(confirm({...state,players:home.map(p=>({...p,goalie:true}))}),/One goalkeeper/);
 assert.equal((await asOwner(db,'select count(*)::int n from pilot_events where match_id=$1',[PREP.match])).rows[0].n,0);
});
test('confirmation is atomic/idempotent and canonicalizes identity, clock and lineup event',async()=>{
 const {state}=await bothTeams(),mutation=crypto.randomUUID();const spoof={...state,sec:999,running:true,players:[{name:'SPOOF'}],events:[{kind:'gol'}]};const r=await confirm(spoof,0,mutation);assert.equal(r.revision,1);assert.equal(r.state.sec,0);assert.equal(r.state.running,false);assert.equal(r.state.players.length,10);assert.equal(r.state.events,undefined);assert.equal(r.state.startersConfirmed,true);assert.ok(r.state.players.every(p=>p.name!=='SPOOF'));
 assert.deepEqual(await confirm(spoof,0,mutation),r);assert.equal((await asOwner(db,'select count(*)::int n from pilot_events where match_id=$1',[PREP.match])).rows[0].n,1);
 await assert.rejects(confirm(state,0),/revision conflict/);await assert.rejects(confirm(state,null),/Valid state/);
});
test('manual official recording opens only after confirmed preparation; statistics remain independent',async()=>{
 const {state}=await bothTeams();const sql="insert into pilot_events(id,match_id,user_id,event_type,team,delta,match_second,payload) values(gen_random_uuid(),$1,$2,'goal','home',1,10,'{\"kind\":\"gol\"}')";
 await assert.rejects(asUser(db,'manager',sql,[PREP.match,ID.manager]),/row-level security/);await confirm(state);await asUser(db,'manager',sql,[PREP.match,ID.manager]);
 await assert.rejects(asUser(db,'external',sql,[PREP.match,ID.external]),/row-level security/);assert.equal((await asOwner(db,'select count(*)::int n from stats_events where match_id=$1',[PREP.match])).rows[0].n,0);
 await asOwner(db,"update federation_matches set raw_data=raw_data-'data_layer' where id=$1",[PREP.calendar]);await assert.rejects(asUser(db,'manager',sql,[PREP.match,ID.manager]),/row-level security/);
});
test('preparation and audit have no direct DML; anonymous execution is denied',async()=>{
 await assert.rejects(asUser(db,'manager','delete from pilot_preparation_audit'),/permission denied/);await assert.rejects(asUser(db,'manager','delete from pilot_prepared_lineups'),/permission denied/);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select pilot_roster_catalogue($1)',[PREP.match]),/permission denied/);
 const functions=(await asOwner(db,"select prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('pilot_roster_catalogue','pilot_prepare_players','pilot_confirm_lineup')")).rows;assert.equal(functions.length,3);assert.ok(functions.every(f=>!f.prosecdef));
});
test('roster changes require fresh confirmation and started matches cannot change the initial selection',async()=>{
 const {state}=await bothTeams();await confirm(state);
 await prepare([{team:'away',manual:true,full_name:'Banqueta FICTÍCIA',dorsal:'10',position:'field'}]);
 const snapshot=(await asOwner(db,'select * from pilot_operator_state where match_id=$1',[PREP.match])).rows[0];assert.equal(snapshot.state.startersConfirmed,false);assert.equal(snapshot.revision,2);
 assert.equal((await asUser(db,'manager','select app_private.pilot_calendar_ready($1) ready',[PREP.match])).rows[0].ready,false);
 await confirm(state,2);await asOwner(db,"update pilot_operator_state set state=state||'{\"matchStarted\":true,\"sec\":1}' where match_id=$1",[PREP.match]);
 await assert.rejects(confirm(state,3),/after match start/);await assert.rejects(prepare([{team:'away',manual:true,full_name:'Tard FICTICI',dorsal:'11',position:'field'}]),/after match start/);
});
test('correcting a saved shirt or goalkeeper keeps identity and provenance and rejects foreign player IDs',async()=>{
 const {home,away}=await bothTeams();const p=away[0];
 const [updated]=await prepare([{team:'away',player_id:p.id,dorsal:'12',position:'field',full_name:'SPOOF',federation_player_id:'SPOOF'}]);
 assert.equal(updated.id,p.id);assert.equal(updated.full_name,p.full_name);assert.equal(updated.federation_player_id,null);assert.equal(updated.official_source,p.official_source);assert.equal(updated.dorsal,'12');assert.equal(updated.position,'field');
 await assert.rejects(prepare([{team:'home',player_id:p.id,dorsal:'12',position:'field'}]),/outside active match/);
 await assert.rejects(prepare([{team:'home',player_id:ID.player,dorsal:'12',position:'field'}]),/outside active match/);
 const [federal]=await prepare([{team:'home',player_id:home[0].id,dorsal:'13',position:'goalkeeper'}]);assert.equal(federal.id,home[0].id);assert.equal(federal.federation_player_id,home[0].federation_player_id);assert.equal(federal.official_source,home[0].official_source);
});
