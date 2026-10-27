import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogueRoster} from '../basic-roster.js';
import {categoryKey,lowerCategory} from '../basic-eligibility.js';
import {ownRosterFixture} from './helpers/own-roster-fixture.mjs';

// Team descriptors from the read-only 2026/27 catalogue; every player/act is synthetic.
const teams=JSON.parse(fs.readFileSync(new URL('./helpers/base-catalogue-teams.json',import.meta.url),'utf8'));
for(const team of teams)test(`${team.category} ${team.name}: generic team scoping with fictitious player evidence`,async()=>{
 const f=ownRosterFixture(team.category);
 const lower=teams.find(t=>lowerCategory(t.category,team.category));
 const own=f.data.teams.find(t=>t.id==='own');own.id=team.id;own.name=team.name;
 f.data.federation_team_entries.find(e=>e.id==='own').club_team_id=team.id;
 const sibling=teams.find(t=>t.id!==team.id&&categoryKey(t.category)===categoryKey(team.category));
 if(sibling){const same=f.data.teams.find(t=>t.id==='same');same.id=sibling.id;same.name=sibling.name;f.data.federation_team_entries.find(e=>e.id==='same').club_team_id=sibling.id;}

 f.data.teams.find(t=>t.id==='lower').category=lower?.category||team.category;
 f.data.teams.find(t=>t.id==='upper').category=team.category;
 // A punctual player from a different team must stay a reinforcement/excluded, never habitual.
 const before=JSON.stringify(f.data);
 const out=await catalogueRoster(f.db,{players:[],fixture:f.game});
 const regular=out.players.filter(p=>!p.reinforcement);
 assert.deepEqual(regular.map(p=>p.federation_player_id).sort(),['1','6']);
 assert.equal(out.players.some(p=>['3','4','5'].includes(p.federation_player_id)),false);
 const proposal=out.players.find(p=>p.federation_player_id==='2');
 assert.equal(!!proposal,!!lower);
 if(proposal){assert.equal(proposal.reinforcement,true);assert.equal(proposal.selectable,false);}
 assert.equal(new Set(out.players.map(p=>p.federation_player_id)).size,out.players.length);
 assert.equal(JSON.stringify(f.data),before);
});
