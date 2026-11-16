import test from 'node:test';
import assert from 'node:assert/strict';
import {scopeCallupFixtures} from '../callup-scope.js';

test('all-team and individual filters remain club-scoped, preserve home/away and remove only identical fixtures',()=>{
 const teams=new Map([['fem15',{club_id:'own'}],['infantil-d',{club_id:'own'}],['rival',{club_id:'other'}]]);
 const home={fixture_id:'same',team_id:'fem15',side:'home'};
 const away={fixture_id:'same',team_id:'infantil-d',side:'away'};
 const input=[home,away,home,{fixture_id:'foreign',team_id:'rival'},{fixture_id:'unknown',team_id:'absent'}];
 assert.deepEqual(scopeCallupFixtures(input,teams,'own'),[home,away]);
 assert.deepEqual(scopeCallupFixtures(input,teams,'own','infantil-d'),[away]);
 assert.deepEqual(scopeCallupFixtures(input,teams,'own','rival'),[]);
 assert.deepEqual(scopeCallupFixtures(input,new Map(),'own'),[]);
});
