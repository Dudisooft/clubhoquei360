import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {navigationTeams} from '../match-navigation.js';
import {PublicFederation,normalizeReport,readRfepSnapshot,canonicalRfepReport} from '../scripts/lib/public-federation.mjs';
import {readCatalogueFixture} from '../basic-practice.js';
import {sourceRoster} from '../basic-roster.js';
import {copyText} from '../callup-model.js';

test('all 36 catalogued teams stay selectable via 38 entries even without calendars',()=>{
 const inventory=JSON.parse(fs.readFileSync('docs/match-age-group-review-20261027.json')).teams;
 const data={teams:inventory,competitions:[...new Map(inventory.flatMap(t=>t.competitions.map(c=>[c.id,{...c,season_id:t.season_id}]))).values()],entries:inventory.flatMap(t=>t.competitions.map(c=>({competition_id:c.id,club_team_id:t.id}))),fixtures:[]};
 assert.equal(data.teams.length,36);assert.equal(data.entries.length,38);
 const visible=new Set();for(const c of data.competitions){const expected=data.entries.filter(e=>e.competition_id===c.id).map(e=>e.club_team_id).sort();const actual=navigationTeams(data,{season:c.season_id,competition:c.id}).map(t=>t.id).sort();assert.deepEqual(actual,expected);actual.forEach(id=>visible.add(id));assert.deepEqual(navigationTeams(data,{season:'other-season',competition:c.id}),[]);}
 assert.equal(visible.size,36);
});
const fixture={id:'RFEP:41:3575:FICTICI',federation:'RFEP',official_match_id:'35559',season:'41',competition_id:'3575',home_id:'3697',away_id:'3727',home_team:'LOCAL FICTICI',away_team:'VISITANT FICTICI',date:'24/10/2026',time:'20:30',round_label:'JORNADA FICTÍCIA',score:[1,1],source_url:'https://www.hockeypatines.fep.es/league/3575'};
const players=offset=>Array.from({length:10},(_,i)=>({player_id:String(offset+i),player_name:'PERSONA FICTÍCIA '+(offset+i),player_number:String(i+1),player_role:i===0?'P':'J'}));
const raw={game_data:{game_id:'35559',season_id:'41',home_team_id:'3697',away_team_id:'3727',home_roster:players(100),away_roster:players(200)}};
const source={federation:'RFEP',competition_id:'3575',season_id:'41',federation_match_id:'35559',official_data:{staff:[{name:'TÈCNIC FICTICI'}],incidents:[{text:'INCIDÈNCIA FICTÍCIA'}]}};
test('recovered RFEP adapter translates 10+10 synthetic identities to the existing v6 and canonical RPC contracts',async()=>{
 const api={calendar:async()=>({fixtures:[fixture],verifiedAt:'2026-11-02T12:00:00Z'}),report:async f=>normalizeReport(raw,f)};
 const {snapshot,calendar}=await readRfepSnapshot(source,api),report=canonicalRfepReport(snapshot);
 assert.equal(snapshot.players.length,20);assert.equal(report.players.filter(p=>p.side==='home').length,10);assert.equal(report.players.filter(p=>p.side==='away').length,10);assert.equal(report.report_score_available,false);assert.equal(report.event_timeline_status,'not_retrieved');assert.equal(calendar[0].match_id,'35559');assert.deepEqual(snapshot.staff,source.official_data.staff);assert.equal(snapshot.sections.staff,'not_refreshed');assert.equal(snapshot.events,undefined);
 await assert.rejects(readRfepSnapshot({...source,federation_match_id:'35574'},api),/absent/);
 await assert.rejects(readRfepSnapshot(source,{...api,report:async f=>normalizeReport({game_data:{...raw.game_data,away_team_id:'999'}},f)}),/partit/);
});
test('a cached report cannot cross season or team boundaries when an internal fixture ID is reused',async()=>{
 const report=normalizeReport(raw,fixture),api=new PublicFederation({reportSnapshots:[report]});api.rfep=async()=>{throw Error('unavailable');};
 assert.equal((await api.report(fixture)).stale,true);
 await assert.rejects(api.report({...fixture,season:'42'}));await assert.rejects(api.report({...fixture,away_id:'999'}));
});
test('Base reads RFEP catalogue lineups without federation writes or name-based identity',async()=>{
 const f={id:'FICTICI',raw_data:{source_url:fixture.source_url,report_status:'verified'},home_team:'A',away_team:'B'};let reads=0;
 const db={from(table){reads++;const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:f}),order:async()=>({data:[{id:'lineup',player_id:'stable',side:'away',display_name:'PERSONA FICTÍCIA',shirt_number:'7',raw_data:{external_id:'200'}}]})};return q;}};
 const result=await readCatalogueFixture(db,'FICTICI',true);assert.equal(result.source.federation,'RFEP');assert.equal(result.players[0].id,'stable');assert.equal(result.players[0].team,'away');assert.equal(reads,2);
});
test('pending clipboard permission falls back with exact approved text and cleans its temporary input',async()=>{
 let copied='',removed=false;const document={createElement(){return{value:'',setAttribute(){},style:{},focus(){},select(){copied=this.value;},setSelectionRange(){},remove(){removed=true;}}},body:{append(){}},execCommand:()=>true};
 await copyText('CONVOCATÒRIA\nFICTÍCIA',{clipboard:{writeText:()=>new Promise(()=>{})},document,timeoutMs:5});assert.equal(copied,'CONVOCATÒRIA\nFICTÍCIA');assert.equal(removed,true);
});

test('the existing v6 external_id contract is recognized by Base without matching names or widening future eligibility',()=>{
 const player={id:'LOCAL-FICTICI',team:'away',federation_player_id:'200',matchVerified:false,selectable:false};
 const source={federation:'RFEP',import_status:'verified',official_data:{report_verified:true,players:[{external_id:'200',team:'away',matchVerified:true}]}};
 assert.equal(sourceRoster([player],source)[0].matchVerified,true);
 assert.equal(sourceRoster([player],{...source,import_status:'pending'})[0].selectable,false);
 assert.equal(sourceRoster([player],{...source,official_data:{...source.official_data,players:[{external_id:'999',team:'away',matchVerified:true}]}})[0].matchVerified,false);
});
