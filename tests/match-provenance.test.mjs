import test from 'node:test';import assert from 'node:assert/strict';import{lineupSummary,readLineupSummary}from'../match-provenance.js';
const fixture={id:'FICTICI',raw_data:{report_status:'verified'}};
test('verified result without saved lineups never certifies the participants',()=>{const s=lineupSummary(fixture,[]);assert.equal(s.verified,false);assert.match(s.text,/pendents/);assert.match(s.text,/candidates/);});
test('only two saved sides and a verified report allow a complete lineup label',()=>{const rows=Array.from({length:20},(_,i)=>({id:'FICTICI-'+i,side:i<10?'home':'away'}));assert.deepEqual(lineupSummary(fixture,rows).counts,{home:10,away:10});assert.equal(lineupSummary(fixture,rows).verified,true);assert.equal(lineupSummary(fixture,rows.slice(0,10)).verified,false);assert.equal(lineupSummary({...fixture,raw_data:{}},rows).verified,false);assert.equal(lineupSummary(fixture,[...rows,rows[0]]).verified,false);});
test('queries are scoped to the requested match and never read or write candidate rosters',async()=>{const calls=[];const q={select(s){calls.push(['select',s]);return q},eq(k,v){calls.push(['eq',k,v]);return Promise.resolve({data:[]})}};const db={from(t){calls.push(['from',t]);return q}};await readLineupSummary(db,fixture);assert.deepEqual(calls,[['from','federation_match_lineups'],['select','id,side'],['eq','match_id','FICTICI']]);});
test('permission/network failure is unavailable, not an empty or verified lineup',async()=>{const db={from(){return{select(){throw Error('permission denied')}}}};const r=await readLineupSummary(db,fixture);assert.equal(r.counts,null);assert.equal(r.verified,false);assert.match(r.text,/No s’han pogut/);});

test('multi-team and multi-club switches never reuse a previous match lineup after a pending or denied read',async()=>{
 // Synthetic identities only: these are not recovered federation participants.
 const cases=[['club-a/fem11',2],['club-a/fem15',4],['club-a/infantil-d',6],['club-a/junior-a',8],['club-a/simar',10],['club-b/senior',12]];
 const db={from(table){assert.equal(table,'federation_match_lineups');return{select(){return{async eq(key,id){assert.equal(key,'match_id');if(id==='denied')return{error:{message:'denied'}};const count=cases.find(c=>c[0]===id)?.[1]||0;return{data:Array.from({length:count},(_,i)=>({id:id+'/'+i,side:i<count/2?'home':'away'}))};}};}}}};
 for(const [id,count] of [...cases,...cases.toReversed()]){
  const current=await readLineupSummary(db,{id,raw_data:{report_status:'verified'}});assert.deepEqual(current.counts,{home:count/2,away:count/2});
  assert.equal((await readLineupSummary(db,{id:'denied'})).counts,null);
  assert.deepEqual((await readLineupSummary(db,{id:'pending'})).counts,{home:0,away:0});
 }
});

test('queried or cached players and future candidates cannot certify an unsaved official lineup',async()=>{
 const players=Array.from({length:20},(_,i)=>({id:'FICTICI-'+i}));
 const db={from(){return{select(){return{eq:async()=>({data:[]})}}}}};
 for(const extra of [{official_data:{players}},{raw_data:{report_status:'verified',players}},{candidate_players:players},{cache:{players}}]){
  const result=await readLineupSummary(db,{id:'FICTICI',...extra});assert.equal(result.verified,false);assert.deepEqual(result.counts,{home:0,away:0});
 }
});
