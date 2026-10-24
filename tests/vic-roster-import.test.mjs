import test from 'node:test';import assert from 'node:assert/strict';
import {parseVicRoster,buildVicImportSQL,VIC} from '../scripts/vic-roster.mjs';
import {createDatabase,asOwner,asUser,ID} from './helpers/stats-db.mjs';
import {seedPreparation,PREP} from './helpers/preparation-db.mjs';
const row=(id='95001',name='VIC FICTICI',team='3727')=>`<tr class="teamid_${team}"><td></td><td></td><td></td><td></td><td><a id_player="${id}" team_id="${team}">${name}</a></td><td>12</td></tr>`;
const parse=html=>parseVicRoster('<table>'+html+'</table>',{fetched_at:'2026-10-24T18:00:00Z'});
test('Vic selection uses official team/person IDs and leaves shirt/goalkeeper unknown',()=>{const d=parse(row()+row('95002','UN ALTRE EQUIP FICTICI','3697'));assert.equal(d.players.length,1);assert.equal(d.players[0].external_id,'95001');assert.equal(d.players[0].dorsal,null);assert.equal(d.players[0].position,null);assert.equal(d.team,'3727');assert.equal(d.season,'41');assert.match(d.source_sha256,/^[a-f0-9]{64}$/);});
test('empty, foreign, conflicting, malformed and wrong-source responses fail before generating SQL',()=>{
 for(const html of ['',row('95001','FICTICI','3697'),row('95001')+row('95001','DIFFERENT'),row().replace('team_id="3727"','team_id="3697"'),row('not-a-number')])assert.throws(()=>parse(html));
 assert.equal(parse(row()+row()).players.length,1);assert.throws(()=>parseVicRoster(row(),{fetched_at:'invalid'}));assert.throws(()=>parseVicRoster(row(),{fetched_at:'2026-10-24',endpoint:'https://example.test'}));
 assert.throws(()=>buildVicImportSQL({...parse(row()),team:'3697'}),/scope/);
});
let db;
test.before(async()=>{
 db=await createDatabase();await seedPreparation(db);
 await db.exec(`reset role;alter table federation_team_entries add column group_id uuid,add column display_name text,add column fetched_at timestamptz;alter table federation_team_roster add column external_person_id text;create unique index test_entry_identity on federation_team_entries(competition_id,external_team_id);create unique index test_player_identity on federation_players(federation,external_player_id);
 create table federation_import_runs(id uuid primary key,federation text,resource_type text check(resource_type in('roster')),external_resource_id text,source_url text,status text,finished_at timestamptz,records_read int,records_written int,details jsonb);`);
});test.after(async()=>db.close());
test.beforeEach(async()=>{await asOwner(db,'begin');});test.afterEach(async()=>{await db.exec('rollback;reset role');});
// Production template includes BEGIN/COMMIT. Keep the test's outer rollback.
const run=async data=>{await db.exec(buildVicImportSQL(data).replace(/^begin;$/m,'').replace(/^commit;$/m,''));};
test('catalogue import is additive, idempotent, visible to the actual scoped RPC and creates no call-ups',async()=>{
 const data=parse(row()+row('95002','PORTER? FICTICI'));await run(data);
 const first=(await asOwner(db,"select r.id,r.player_id,r.shirt_number,r.raw_data from federation_team_roster r join federation_team_entries e on e.id=r.entry_id where e.external_team_id='3727' order by r.id")).rows;
 assert.equal(first.length,2);assert.ok(first.every(r=>r.shirt_number===null&&r.raw_data.position===null));await run(data);
 assert.deepEqual((await asOwner(db,"select r.id,r.player_id,r.shirt_number,r.raw_data from federation_team_roster r join federation_team_entries e on e.id=r.entry_id where e.external_team_id='3727' order by r.id")).rows,first);
 assert.equal((await asOwner(db,'select count(*)::int n from federation_import_runs')).rows[0].n,1);
 assert.equal((await asOwner(db,'select count(*)::int n from pilot_players where match_id=$1',[PREP.match])).rows[0].n,0);
 const catalogue=(await asUser(db,'manager','select pilot_roster_catalogue($1) data',[VIC.match])).rows[0].data;assert.equal(catalogue.candidates.filter(p=>p.team==='away').length,2);assert.equal(catalogue.candidates.filter(p=>p.team==='home').length,5);
 await assert.rejects(asUser(db,'external','select pilot_roster_catalogue($1)',[VIC.match]),/Match operator/);
});
test('existing federation identity is reused without changing another team or global player label',async()=>{
 const before=(await asOwner(db,"select * from federation_players where external_player_id='90001'")).rows[0];
 await run(parse(row('90001',"VIC FICTICI D'EXEMPLE")));
 const p=(await asOwner(db,"select * from federation_players where external_player_id='90001'")).rows;assert.equal(p.length,1);assert.deepEqual(p[0],before);
 assert.equal((await asOwner(db,"select r.player_id from federation_team_roster r join federation_team_entries e on e.id=r.entry_id where e.external_team_id='3727'")).rows[0].player_id,before.id);
});
test('a repeat source preserves previously verified shirt/position and a stale snapshot cannot overwrite a newer import',async()=>{
 const data=parse(row());await run(data);
 await asOwner(db,"update federation_team_roster set shirt_number='12',raw_data=raw_data||'{\"position\":\"goalkeeper\"}' where entry_id=(select id from federation_team_entries where external_team_id='3727')");
 await run(data);const p=(await asOwner(db,"select r.shirt_number,r.raw_data->>'position' position from federation_team_roster r join federation_team_entries e on e.id=r.entry_id where e.external_team_id='3727'")).rows[0];assert.equal(p.shirt_number,'12');assert.equal(p.position,'goalkeeper');
 await asOwner(db,"update federation_team_entries set fetched_at='2026-10-24 19:00Z' where external_team_id='3727'");await assert.rejects(run(data),/Stale roster/);
});
test('missing verification or a different fixture causes an atomic rejection',async()=>{
 await asOwner(db,"update federation_matches set raw_data=raw_data-'data_layer' where id=$1",[PREP.calendar]);await assert.rejects(run(parse(row())),/calendar identity/);
});
test('malicious delimiter is refused and quote-containing real-style names remain data',async()=>{
 assert.throws(()=>buildVicImportSQL(parse(row('95001','$CH360_VIC$'))),/delimiter/);
 await run(parse(row('95001',"FICTICI D'EXEMPLE; DROP TABLE pilot_events;")));
 assert.equal((await asOwner(db,'select count(*)::int n from pilot_events')).rows[0].n,1);
});
