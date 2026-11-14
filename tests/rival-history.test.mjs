import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueRoster,materializePlayers} from '../basic-roster.js';
import {ownRosterFixture} from './helpers/own-roster-fixture.mjs';

function fixture(federation='FECAPA',side='away'){
 const f=ownRosterFixture(), {data:d,game}=f;
 d.federation_competitions[0].federation=federation;
 d.federation_competitions[0].external_competition_id='4786';
 d.federation_team_entries.push({id:'rival',competition_id:'c',external_team_id:'99'},{id:'different',competition_id:'elsewhere',external_team_id:'99'});
 const matches=[['prior','home','99','verified'],['prior2','away','99','verified'],['future','home','99','verified'],['partial','home','99','partial'],['wrong','home','100','verified'],['other','home','99','verified']];
 d.federation_matches=matches.map(([id,s,idnum,status],i)=>({id,group_id:'g',external_match_id:String(i+10),federation_start_at:i===2?'2026-11-14T12:00:00Z':'2026-10-0'+(i+1)+'T12:00:00Z',raw_data:{[s+'_team_id']:idnum,report_status:status}}));
 d.federation_match_teams=[{match_id:game.id,entry_id:'rival',side},...matches.map(([id,s],i)=>({match_id:id,side:s,entry_id:i===5?'different':'rival'}))];
 d.federation_match_lineups=matches.map(([id,s],i)=>({id:'l'+i,match_id:id,side:s,display_name:'Jugador fictici '+i,shirt_number:i===1?'02':'7',raw_data:{external_id:i<2?'42':String(50+i)}}));
 d.federation_match_lineups.push({id:'opposite',match_id:'prior',side:'away',display_name:'Other side',raw_data:{external_id:'88'}},{id:'no-id',match_id:'prior',side:'home',display_name:'Not identified',raw_data:{}});
 return f;
}

for(const [fed,side] of [['FECAPA','away'],['RFEP','home']])test(fed+' rival history is provisional, scoped, and deduplicated by most recent report',async()=>{
 const f=fixture(fed,side),before=JSON.stringify(f.data);
 const out=await catalogueRoster(f.db,{players:[],fixture:f.game});
 assert.equal(out.players.length,1);
 assert.deepEqual(out.players.map(p=>[p.team,p.federation_player_id,p.dorsal,p.origin_reference,p.selectable,p.matchVerified]),[[side,'42','02','11',true,false]]);
 assert.equal(JSON.stringify(f.data),before);
 if(fed==='FECAPA')assert.match(out.rosterPortal,/liga=4786&vista=plantillas/);
});

test('current verified lineup has priority over history',async()=>{
 const f=fixture();
 f.game.raw_data.report_status='verified';
 f.data.federation_match_lineups.push({id:'official',match_id:f.game.id,side:'away',display_name:'Convocat'});
 const p={id:'official',team:'away',full_name:'Convocat',matchVerified:true,selectable:true};
 const out=await catalogueRoster(f.db,{players:[p],fixture:f.game});
 assert.deepEqual(out.players.map(p=>p.id),['official']);
});

test('missing history preserves the available rival roster',async()=>{
 const f=fixture();
 f.data.federation_match_teams=f.data.federation_match_teams.slice(0,1);
 const p={id:'previous',team:'away',full_name:'Desat'};
 const out=await catalogueRoster(f.db,{players:[p],fixture:f.game});
 assert.deepEqual(out.players.map(p=>p.id),['previous']);
});

test('materialization keeps historical participant separate from official source',async()=>{
 const f=fixture();
 const out=await catalogueRoster(f.db,{players:[],fixture:f.game});
 const saved=[];
 const db={from(table){assert.equal(table,'pilot_players');return {select(){return this;},eq(){return this;},order(){return this;},range(){return Promise.resolve({data:saved});},insert(row){saved.push(row);return {select:async()=>({data:[row]})};}}}};
 const [p]=await materializePlayers(db,'match',out.players);
 const [again]=await materializePlayers(db,'match',out.players);
 assert.equal(p.id,again.id);
 assert.equal(p.official_source,null);
 assert.equal(p.selection_basis,'rival_match_history');
 assert.equal(saved.length,1);
});
