import test from 'node:test';
import assert from 'node:assert/strict';
import {asOwner,asUser,createDatabase,ID} from './helpers/stats-db.mjs';
import {callupIds,seedCallups} from './helpers/callup-db.mjs';
import {groupWeek,mondayOf} from '../callup-week.js';

test('weekly grouping follows midnight in Madrid across the clock change',()=>{
 const sunday={starts_at:'2026-03-29T21:59:00Z',team_name:'A'};
 const monday={starts_at:'2026-03-29T22:01:00Z',team_name:'B'};
 assert.equal(mondayOf(sunday.starts_at),'2026-03-23');
 assert.equal(mondayOf(monday.starts_at),'2026-03-30');
 assert.deepEqual(groupWeek([monday,sunday],'2026-03-30')[0].matches,[monday]);
});

test('the week respects access and staff edits use the same publication revision and history',async t=>{
 const db=await createDatabase();
 t.after(()=>db.close());
 await seedCallups(db);
 await asOwner(db,"update pilot_matches set starts_at=null where id=$1",[callupIds.lateMatch]);
 await asOwner(db,"update federation_matches set federation_start_at='2026-12-01T09:00:00Z' where id=$1",[callupIds.catalogueMatch]);
 await asOwner(db,"update pilot_matches set starts_at='2026-11-21T09:00:00Z' where id in ($1,$2)",[ID.match,ID.otherMatch]);
 const week=async user=>(await asUser(db,user,"select public.read_club_callup_week('2026-11-16',$1) result",[ID.club])).rows[0].result;
 const save=async (user,revision,publish,staff)=>(await asUser(db,user,
  'select public.save_club_callup_with_staff($1,$2,$3,$4,$5,$6) result',
  [ID.match,ID.team,revision,[callupIds.starter],publish,JSON.stringify(staff)])).rows[0].result;
 const staff={coaches:[' Tècnica fictícia ','tècnica fictícia'],delegates:['Delegat fictici']};
 assert.equal((await week('secondary')).length,2);
 assert.equal((await week('coach')).length,1);
 assert.deepEqual(await week('alien'),[]);
 await assert.rejects(save('coach',0,false,staff),{code:'42501'});
 await assert.rejects(save('secondary',0,false,{coaches:[{}]}),{code:'22023'});
 await save('secondary',0,false,staff);
 assert.equal((await week('coach'))[0].published_staff,null);
 assert.equal((await week('secondary')).find(f=>f.fixture_id===ID.match).published_players,null);
 await save('secondary',1,true,staff);
 assert.deepEqual((await week('coach'))[0].published_staff,{coaches:['Tècnica fictícia'],delegates:['Delegat fictici']});
 assert.equal((await week('coach'))[0].published_players[0].id,callupIds.starter);
 assert.equal((await save('secondary',2,true,{delegates:['Una altra persona fictícia']})).revision,3);
 const detail=(await asUser(db,'coach','select public.read_club_callup_detail($1,$2) result',[ID.match,ID.team])).rows[0].result;
 assert.equal(detail.staff_supported,true);
 assert.equal(detail.history[0].staff.delegates[0],'Una altra persona fictícia');
 assert.equal(detail.history[1].staff.delegates[0],'Delegat fictici');
 const oldSave=(await asUser(db,'secondary','select public.save_club_callup($1,$2,3,$3,true) result',
  [ID.match,ID.team,[callupIds.starter]])).rows[0].result;
 assert.equal(oldSave.revision,3);
});
