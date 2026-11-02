import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {clubCatalogue,catalogueQuery} from '../scripts/lib/local-club-catalogue.mjs';
import {navigationRows} from '../match-navigation.js';
const seed=JSON.parse(fs.readFileSync('demo/public-calendar-snapshot.json'));
const bundle={calendar:seed[0],vic:seed[0].fixtures.find(f=>f.official_match_id==='35559'),noia:seed[0].fixtures.find(f=>f.official_match_id==='35574')};
const ids={vic:'vic-replay',noia:'noia-replay'};
test('full inventory survives unavailable federation calendars',()=>{
 const c=clubCatalogue(bundle,ids,{snapshots:[]});assert.equal(c.teams.length,36);assert.equal(c.federation_team_entries.length,38);assert.equal(c.federation_competitions.length,22);
 for(const [category,name] of [['FEM 11','IGUALADA HC'],['FEM15','Igualada HC · FEM15'],['INFANTIL','IGUALADA HC D'],['JÚNIOR','IGUALADA HC A']])assert.ok(c.teams.find(t=>t.category===category&&t.name===name),category+' '+name);
 assert.ok(c.federation_matches.find(f=>f.id===ids.vic));assert.ok(c.federation_matches.find(f=>f.id===ids.noia));
 assert.equal(c.federation_matches.length,3); // two RFEP and the preserved FEM15 fixture; never manufacture fixtures.
});
test('catalogue queries apply scope, ordering, pagination and single-row filters',()=>{
 const rows=[{id:'b',team:'one'},{id:'a',team:'two'},{id:'c',team:'one'}];
 assert.deepEqual(catalogueQuery(rows,new URLSearchParams({team:'eq.one',order:'id.desc',limit:'1',offset:'1'})),[rows[0]]);
 assert.deepEqual(catalogueQuery(rows,new URLSearchParams({id:'in.(a,c)'})),[rows[1],rows[2]]);
});
test('all available fixtures link to their own team and competition without cross-team leakage',()=>{
 const c=clubCatalogue(bundle,ids,{snapshots:[]}),rows=navigationRows({fixtures:c.federation_matches,groups:c.federation_groups,competitions:c.federation_competitions,entries:c.federation_team_entries,links:c.federation_match_teams});
 assert.equal(rows.length,3);for(const r of rows){assert.equal(r.teams.length,1);const entry=c.federation_team_entries.find(e=>e.club_team_id===r.teams[0]&&e.competition_id===r.competition);assert.ok(entry);assert.ok([r.raw_data.home_team_id,r.raw_data.away_team_id].includes(entry.external_team_id));}
});
