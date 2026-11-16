import test from 'node:test';
import assert from 'node:assert/strict';
import {asOwner,asUser,createDatabase,ID} from './helpers/stats-db.mjs';
import {callupIds,seedCallups} from './helpers/callup-db.mjs';
import {compareCallup} from '../callup-review.js';

test('official comparison uses stable IDs and flags unlinked records',()=>{
 const official=[{catalogue_player_id:'a',name:'A',dorsal:'7'}];
 const players=[{catalogue_player_id:'a',full_name:'A',dorsal:'8'}];
 assert.deepEqual(compareCallup(official,players).differentShirts,players);
 assert.equal(compareCallup(official,[{full_name:'A',dorsal:'7'}]).uncertain,true);
 assert.deepEqual(compareCallup(official,[]).onlyOfficial,official);
});

test('draft revisions are private, and editing a verified fixture leaves its acta intact',async t=>{
 const db=await createDatabase();
 t.after(()=>db.close());
 await seedCallups(db);
 const {catalogueMatch,starter,reserve}=callupIds;
 await asOwner(db,"update federation_matches set raw_data='{\"report_status\":\"verified\"}' where id=$1",[catalogueMatch]);
 await asOwner(db,"insert into federation_match_lineups(match_id,side,player_id,display_name,shirt_number) values ($1,'away',$2,'Jugadora oficial fictícia','9'),($1,'home',null,'Rival fictici','10')",[catalogueMatch,ID.player]);
 await asOwner(db,'update app_private.callup_roster set catalogue_player_id=null where id=$1',[starter]);
 const args=[catalogueMatch,ID.team];
 const save=(revision,players)=>asUser(db,'secondary','select public.save_club_callup($1,$2,$3,$4,false)',[...args,revision,players]);
 const read=async user=>(await asUser(db,user,'select public.read_club_callup_detail($1,$2) result',args)).rows[0].result;
 await save(0,[starter]);
 await save(1,[reserve]);
 const result=await read('secondary');
 assert.deepEqual(result.draft_history.map(v=>v.revision),[2,1]);
 assert.equal(result.draft_history[0].players[0].id,reserve);
 assert.equal(result.draft_history[1].players[0].id,starter);
 assert.equal(result.official_lineup.length,1);
 assert.equal(result.official_lineup[0].dorsal,'9');
 assert.equal((await read('coach')).draft_history,undefined);
 assert.equal((await read('coach')).official_lineup,undefined);
 assert.equal((await asOwner(db,'select count(*)::int n from federation_match_lineups where match_id=$1',[catalogueMatch])).rows[0].n,2);
});
