import test from 'node:test';import assert from 'node:assert/strict';import {readCatalogueFixture} from '../basic-practice.js';import {mergeRoster} from '../basic-roster.js';
function client(external){return {from(table){const q={select(){return q;},eq(){return q;},order(){return q;},maybeSingle(){return q;},then(resolve){return Promise.resolve({data:table==='federation_matches'?{id:'fictional-match',raw_data:{source_url:'https://www.hoqueipatins.fecapa.cat/league/4786',report_status:'verified'}}:[{id:'saved-lineup',player_id:'catalogue-person',side:'away',display_name:'PERSONA FICTÍCIA',shirt_number:'7',raw_data:{external_id:external}}]}).then(resolve);}};return q;}};}
test('catalogue lineup and saved match player merge once by the retained federation identity',async()=>{
 const data=await readCatalogueFixture(client('912001'),'fictional-match'),saved={id:'saved-match-player',team:'away',full_name:'PERSONA FICTÍCIA',federation_player_id:'912001',dorsal:'7'};
 const merged=mergeRoster([saved],data.players.map(p=>({...p,needsImport:true})));assert.equal(merged.length,1,'The same official person must not become two selectable call-up rows');assert.equal(merged[0].id,saved.id);assert.equal(data.players[0].federation_player_id,'912001');assert.equal(data.players[0].catalog_lineup_id,'saved-lineup');
});
test('missing, zero, malformed and name-like identifiers remain unknown; positive numeric source values stay stable',async()=>{
 for(const value of [undefined,null,'0','001','unknown','PERSONA FICTÍCIA']){const data=await readCatalogueFixture(client(value),'fictional-match');assert.ok(!data.players[0].federation_player_id);assert.equal(data.players[0].catalog_lineup_id,'saved-lineup');assert.equal(data.players[0].matchVerified,true);}
 const data=await readCatalogueFixture(client(912001),'fictional-match');assert.equal(data.players[0].federation_player_id,'912001');
});
