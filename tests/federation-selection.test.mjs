import test from 'node:test';import assert from 'node:assert/strict';
import {competitionOptions,isCalendarOnlySource} from '../federation-selection.js';
const vic={round:'JORNADA 5',date:'24/10/2026',time:'20:30',home_name:'SIMAR IGUALADA HC',away_name:'AUTO VIGATANA PATÍ VIC',home_team_id:'3697',away_team_id:'3727',match_id:null};
const source={match_id:'existing-pilot',federation:'RFEP',competition_id:'3575',federation_match_id:null,import_status:'pending',official_data:{...vic,source_kind:'verified_calendar'}};
const match={id:source.match_id,title:'Pilot 24/10 · Simar Igualada – Patí Vic',home_team:vic.home_name,away_team:vic.away_name,starts_at:'2026-10-24T18:30:00Z',status:'scheduled'};
test('future RFEP calendar row without published report ID remains visible and explicitly pending',()=>{
 const out=competitionOptions([],[],[vic],'RFEP:3575');assert.equal(out.options.length,1);assert.equal(out.options[0].kind,'pending');assert.equal(out.options[0].disabled,true);assert.match(out.options[0].label,/24\/10\/2026.*20:30.*VIC.*pendent/);assert.equal(out.pending,1);
});
test('calendar-linked existing pilot is selectable once, with the Madrid time and without inventing RFEP ID',()=>{
 const out=competitionOptions([match],[source],[vic,vic],'RFEP:3575');assert.equal(out.options.length,1);assert.equal(out.options[0].value,'existing-pilot');assert.equal(out.options[0].disabled,false);assert.match(out.options[0].label,/20:30/);assert.equal(source.federation_match_id,null);assert.equal(isCalendarOnlySource(source),true);
});
test('finished historical and future fixtures remain in the selected competition and team',()=>{
 const historical={...match,id:'historic',title:'Historical',status:'closed'};const old={...source,match_id:'historic',federation_match_id:'35529',import_status:'verified',official_data:{}};
 const other={...match,id:'other'};const foreign={...source,match_id:'other',federation:'FECAPA'};
 const out=competitionOptions([historical,match,other],[old,source,foreign],[vic],'RFEP:3575','SIMAR IGUALADA HC');assert.deepEqual(out.visible.map(m=>m.id),['historic','existing-pilot']);assert.equal(out.options.length,2);assert.equal(competitionOptions([match],[source],[vic],'RFEP:3575','Unknown').selectedTeam,'');
});
test('published calendar IDs are deduplicated without confusing local UUID and official ID',()=>{
 const old={...source,import_status:'verified',official_data:{},federation_match_id:'35529'};
 const rows=[{...vic,match_id:'35529'},{...vic,round:'JORNADA 6',match_id:'35560'},{...vic,round:'JORNADA 6',match_id:'35560'}];
 const out=competitionOptions([match],[old],rows,'RFEP:3575');assert.equal(out.options.length,2);assert.equal(out.options[1].value,'external:35560');assert.equal(out.options[1].disabled,false);
});
test('a verified report supersedes the calendar-only presentation',()=>{
 assert.equal(isCalendarOnlySource({...source,import_status:'verified'}),false);assert.equal(isCalendarOnlySource({...source,official_data:{}}),false);assert.equal(isCalendarOnlySource(null),false);
});
