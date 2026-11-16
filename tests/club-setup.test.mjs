import test from 'node:test';
import assert from 'node:assert/strict';
import {parseClubCsv} from '../club-csv.js';
import {asOwner,asUser,createDatabase,ID} from './helpers/stats-db.mjs';

test('CSV accepts quoted delimiters, BOM and CRLF and rejects malformed files',()=>{
 assert.deepEqual(parseClubCsv('\uFEFFnom;dorsal;posicio\r\n"Cognom; Nom";;porteria\r\n','roster'),
  [{nom:'Cognom; Nom',dorsal:'',posicio:'porteria'}]);
 assert.throws(()=>parseClubCsv('nom\n"Sense tancar','clubs'),/cometes/);
 assert.throws(()=>parseClubCsv('nom,categoria\nNom','teams'),/nombre de camps/);
});

test('CSV checks scope, previews without writes, commits once and rejects stale plans',async t=>{
 const db=await createDatabase();
 t.after(()=>db.close());
 await asOwner(db,`create or replace function app_private.is_platform_superadmin()
  returns boolean language sql stable security definer set search_path='' as
  $$ select auth.uid()='${ID.principal}'::uuid $$`);
 await asOwner(db,'insert into club_memberships values ($1,$2,$3,$4)',[ID.secondary,ID.club,ID.team,'section_coordinator']);
 const access=async user=>(await asUser(db,user,'select public.club_setup_access() as result')).rows[0].result;
 assert.equal((await access('principal')).global_admin,true);
 assert.equal((await access('principal')).teams.some(team=>team.operational),false);
 assert.deepEqual((await access('alien')).teams,[]);
 assert.deepEqual((await access('secondary')).teams.map(team=>team.id),[ID.team]);
 const load=async (user,kind,scope,rows,preview=null)=>(await asUser(db,user,
  'select public.import_club_csv($1,$2,$3,$4) as result',[kind,scope,JSON.stringify(rows),preview&&JSON.stringify(preview)])).rows[0].result;
 const rows=[{nom:'A B',dorsal:'15',posicio:'pista'},{nom:' a   b ',posicio:'porteria'}];
 await assert.rejects(load('coach','roster',ID.team,rows),{code:'42501'});
 await assert.rejects(load('secondary','roster',ID.otherTeam,rows),{code:'42501'});
 await assert.rejects(load('manager','clubs',null,[{nom:'Club CSV'}]),{code:'42501'});
 const plan=await load('secondary','roster',ID.team,rows);
 assert.deepEqual(plan.map(row=>row.status),['new','repeated']);
 assert.equal((await asOwner(db,'select count(*)::int n from app_private.callup_roster')).rows[0].n,0);
 await load('secondary','roster',ID.team,rows,plan);
 await assert.rejects(load('secondary','roster',ID.team,rows,plan),{code:'40001'});
 assert.equal((await asOwner(db,'select count(*)::int n from app_private.callup_roster')).rows[0].n,1);
 const teams=[{nom:'Sense partits',categoria:'FEM'},{nom:'Sense partits',categoria:'Aleví'}];
 const teamPlan=await load('manager','teams',ID.season,teams);
 assert.deepEqual(teamPlan.map(row=>row.status),['new','new']);
 await load('manager','teams',ID.season,teams,teamPlan);
 await asOwner(db,'insert into club_memberships values ($1,$2,null,$3)',[ID.manager,ID.club,'general_coordinator']);
 assert.ok((await access('manager')).teams.some(team=>team.team_name==='Sense partits'&&team.operational));
 const clubs=[{nom:'Club CSV'}];
 await load('principal','clubs',null,clubs,await load('principal','clubs',null,clubs));
 const club=(await access('principal')).clubs.find(entry=>entry.name==='Club CSV');
 const seasons=[{nom:'2026/27',inici:'2026-09-01',fi:'2027-06-30'}];
 await load('principal','seasons',club.id,seasons,await load('principal','seasons',club.id,seasons));
 assert.ok((await access('principal')).seasons.some(season=>season.club_id===club.id));
});
