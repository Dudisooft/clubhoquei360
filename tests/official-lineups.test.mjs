import test from 'node:test';import assert from 'node:assert/strict';
import {officialPlayers,historicalCandidates,fecapaReport,federationStartAt} from '../official-lineups.js';
import {sourceRoster} from '../basic-roster.js';
import {PublicFederation,normalizeReport} from '../scripts/lib/public-federation.mjs';
const f={id:'RFEP:41:3575:1:10:20',federation:'RFEP',official_match_id:'1',season:'41',competition_id:'3575',home_id:'10',away_id:'20',home_team:'A',away_team:'B',source_url:'https://hockeypatines.fep.es/league/3575'};
const raw={game_data:{game_id:'1',season_id:'41',home_team_id:'10',away_team_id:'20',home_roster:[{player_id:'11',player_name:'Nom públic A',player_number:'1',player_role:'P'}],away_roster:[{player_id:'22',player_name:'Nom públic B',player_number:'2',player_role:'P'}]}};
const report=normalizeReport(raw,f);
test('Madrid fixture hours survive summer/winter changes without adding an hour',()=>{
 assert.equal(federationStartAt({date:'24/10/2026',time:'20:30'}),'2026-10-24T18:30:00.000Z');
 assert.equal(federationStartAt({date:'14/11/2026',time:'20:30'}),'2026-11-14T19:30:00.000Z');
 assert.equal(federationStartAt({date:'14/11/2026'}),null);
 assert.throws(()=>federationStartAt({date:'25/10/2026',time:'02:30'}));
});
test('RFEP report retains names, stable provider IDs, goalkeeper position and exact sides',()=>{
 const p=officialPlayers(f,report);assert.equal(p.length,2);assert.equal(p[0].full_name,'Nom públic A');assert.equal(p[0].federation_player_id,'11');assert.equal(p[0].position,'goalkeeper');assert.equal(p[1].team,'away');assert.ok(p.every(p=>p.matchVerified));
 assert.throws(()=>officialPlayers({...f,id:'other'},report));
 assert.throws(()=>officialPlayers(f,{...report,sides:{home:report.sides.home,away:report.sides.home}}));
 assert.throws(()=>officialPlayers(f,{...report,sides:{...report.sides,home:[{...report.sides.home[0],name:null}]}}));
});
test('FECAPA parsed reports use the same player adapter and reject mismatched teams/season',()=>{
 const fixture={...f,federation:'FECAPA'},parsed={match_id:'1',competition_id:'3575',season_id:'41',home_name:'A',away_name:'B',players:[{external_id:'11',team:'home',name:'A',dorsal:'1',position:'goalkeeper'},{external_id:'22',team:'away',name:'B',dorsal:'2',position:'goalkeeper'}]};
 assert.equal(officialPlayers(fixture,fecapaReport(fixture,parsed)).length,2);
 assert.throws(()=>fecapaReport(fixture,{...parsed,away_name:'Other'}));assert.throws(()=>fecapaReport(fixture,{...parsed,season_id:'40'}));
});
test('future candidates retain provenance, deduplicate identities and never become official lineups',()=>{
 const p=historicalCandidates('10',[f,f],new Map([[f.id,report]]));assert.equal(p.length,1);assert.equal(p[0].matchVerified,false);assert.match(p[0].eligibility,/No acredita/);
 const source={federation:'RFEP',import_status:'pending',official_data:{players:p}};
 assert.equal(sourceRoster(p,source)[0].matchVerified,false);
 assert.equal(sourceRoster([{...p[0],selectable:false}],source)[0].selectable,false);
});
test('temporary failure and incomplete refresh preserve verified named players and timestamp',async()=>{
 const p=new PublicFederation({reportSnapshots:[report]});p.rfep=async()=>{throw Error('403');};
 const old=await p.report(f);assert.equal(old.stale,true);assert.deepEqual(old.sides,report.sides);assert.equal(old.verifiedAt,report.verifiedAt);
 p.rfep=async()=>({data:{game_data:{...raw.game_data,away_roster:[]}}});assert.deepEqual((await p.report(f)).sides,report.sides);
 await assert.rejects(p.report({...f,id:'different-match',official_match_id:'2'}));
});
