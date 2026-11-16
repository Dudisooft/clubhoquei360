import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcileCalendarIdentity as resolve} from '../scripts/federation-catalogue-reconciliation.mjs';

const fixture = {official_match_id:'155522',round_label:'JORNADA 2',home_id:'12428',away_id:'12270',group:'Barcelona 5'};
const saved = {code:null,round:'Jornada  2',home:'12428',away:'12270',groupId:'4957',group:'Barcelona 5'};

test('a published code can refer to one existing provisional match without creating a group',()=>{
 assert.deepEqual(resolve(fixture,[saved]),{status:'existing_provisional',groupId:'4957'});
 assert.deepEqual(resolve({...fixture,home_id:fixture.away_id,away_id:fixture.home_id},[saved]),{status:'unmatched'});
});

test('duplicates, wrong groups and conflicting published identities do not reconcile',()=>{
 assert.equal(resolve(fixture,[saved,saved]).status,'ambiguous');
 assert.equal(resolve(fixture,[{...saved,group:'Barcelona 4'}]).status,'unmatched');
 assert.equal(resolve(fixture,[{...saved,code:'111'}]).status,'conflicting_code');
 assert.equal(resolve(fixture,[{...saved,code:'155522',home:'999'}]).status,'conflicting_code');
 assert.equal(resolve(fixture,[{...saved,code:'155522'}]).status,'already_linked');
 assert.equal(resolve(fixture,[{...saved,groupId:null}]).status,'missing_numeric_group');
 assert.equal(resolve({...fixture,official_match_id:null},[saved]).status,'incomplete_identity');
});
