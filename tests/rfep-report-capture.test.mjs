// Synthetic responses only. Real names/raw HAR stay outside the repository.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {normalizeReport,readRfepSnapshot,canonicalRfepReport,officialReportUrl} from '../scripts/lib/public-federation.mjs';import {officialPlayers} from '../official-lineups.js';
import {normalizeCapturedReport,referenceSummary} from '../scripts/lib/rfep-report-capture.mjs';
const fixture={id:'RFEP:41:3575:FICTICI',federation:'RFEP',official_match_id:'35559',competition_id:'3575',season:'41',home_id:'3697',away_id:'3727',home_team:'LOCAL FICTICI',away_team:'VISITANT FICTICI',score:[1,1],source_url:'https://www.hockeypatines.fep.es/league/3575'};
function raw(){return {game_data:{game_id:'35559',season_id:'41',home_team_id:'3697',away_team_id:'3727',...Object.fromEntries(['home','away'].map((s,j)=>[s+'_roster',Array.from({length:10},(_,i)=>({player_id:String(1000+j*100+i),player_name:'PERSONA FICTÍCIA '+j+' '+i,player_number:String(i+1).padStart(2,'0'),player_role:i===0||i===9?'P':'J','5i':i<5,ignored_license:'DO-NOT-COPY-THIS'}))]))}};}
const reference=data=>({source:'SYNTHETIC TEST REFERENCE',fixture,expected:referenceSummary(normalizeReport(data,fixture))});
function har(data,{status=200,path='/rfep/v1/hp/report/',base64=false}={}){return {log:{entries:[{startedDateTime:'2026-11-05T00:00:00Z',request:{method:'GET',url:'https://api.sidgad.com'+path+'?id=35559&jwt=PRIVATE-FIXTURE-TOKEN'},response:{status,content:{mimeType:'application/json',text:base64?Buffer.from(JSON.stringify(data)).toString('base64'):JSON.stringify(data),...(base64?{encoding:'base64'}:{})}}}]}};}
test('official report uses the verified match permalink while calendar provenance stays intact',()=>{
 const report=normalizeReport(raw(),fixture);assert.equal(report.source_url,'https://www.hockeypatines.fep.es/?liga=3575&partido=35559');assert.equal(report.calendar_source_url,fixture.source_url);assert.equal(fixture.source_url,'https://www.hockeypatines.fep.es/league/3575');assert.equal(officialPlayers(fixture,report)[0].official_source,report.source_url);assert.throws(()=>officialReportUrl({...fixture,official_match_id:'35559&other=1'}));
});
test('public player IDs, textual dorsals, two keepers and starting fives do not become license numbers',()=>{
 const report=normalizeReport(raw(),fixture);for(const side of ['home','away']){assert.equal(report.sides[side].length,10);assert.equal(report.sides[side].filter(p=>p.position==='goalkeeper').length,2);assert.equal(report.sides[side].filter(p=>p.starter===true).length,5);assert.equal(report.sides[side][0].number,'01');for(const p of report.sides[side]){assert.equal(p.public_player_id,p.id);assert.equal(p.license_number,null);}}assert.ok(!JSON.stringify(report).includes('DO-NOT-COPY-THIS'));
});
test('unknown initial-five flags remain unknown rather than certifying bench participation',()=>{
 const data=raw();delete data.game_data.home_roster[0]['5i'];data.game_data.home_roster[1]['5i']='UNDOCUMENTED';const report=normalizeReport(data,fixture);assert.equal(report.sides.home[0].starter,null);assert.equal(report.sides.home[1].starter,null);assert.equal(report.sides.home[9].starter,false);
});
test('existing v6 and canonical contracts retain both provenance URLs without adding event chronology',async()=>{
 const data=raw();delete data.game_data.home_roster[9]['5i'];data.game_data.events=[{unknown_payload:'NOT A VERIFIED TIMELINE'}];const report=normalizeReport(data,fixture);
 const {snapshot}=await readRfepSnapshot({federation:'RFEP',competition_id:'3575',season_id:'41',federation_match_id:'35559'},{calendar:async()=>({fixtures:[fixture]}),report:async()=>report});const canonical=canonicalRfepReport(snapshot);
 assert.equal(Object.hasOwn(snapshot.players[0],'license_number'),false);assert.equal(Object.hasOwn(snapshot.players[9],'starter'),false);assert.equal(snapshot.source_url,report.source_url);assert.equal(snapshot.calendar_source_url,fixture.source_url);assert.equal(canonical.source_url,report.source_url);assert.equal(canonical.calendar_source_url,fixture.source_url);assert.equal(report.events_count,1);assert.equal(report.event_timeline_status,'not_retrieved');assert.equal(canonical.event_timeline_status,'not_retrieved');assert.deepEqual(canonical.incidents,[]);
});
for(const base64 of [false,true])test('supplied HAR normalizes a complete synthetic response without exposing tokens, base64='+base64,()=>{
 const data=raw(),out=normalizeCapturedReport(har(data,{base64}),reference(data));assert.equal(out.proof.counts.home.goalkeepers,2);assert.equal(out.proof.counts.away.starters,5);assert.equal(out.proof.network_replayed,false);assert.equal(out.proof.connector_path_matches,true);assert.ok(!JSON.stringify(out.proof).includes('PRIVATE-FIXTURE-TOKEN'));assert.ok(!JSON.stringify(out.proof).includes('PERSONA FICTÍCIA'));
});
test('capture preserves evidence of a no-slash browser route without silently changing connector transport',()=>{
 const data=raw(),out=normalizeCapturedReport(har(data,{path:'/rfep/v1/hp/report'}),reference(data));assert.equal(out.proof.connector_path_matches,false);assert.equal(out.proof.request_url,'https://api.sidgad.com/rfep/v1/hp/report?id=35559');
});
test('manual transcription, missing response, wrong host, HTTP errors and ambiguous versions are refused',()=>{
 const data=raw(),ref=reference(data);assert.throws(()=>normalizeCapturedReport({game_data:data.game_data},ref),/HAR/);assert.throws(()=>normalizeCapturedReport(har(data,{status:403}),ref));
 const foreign=har(data);foreign.log.entries[0].request.url='https://evil.invalid/rfep/v1/hp/report/?id=35559';assert.throws(()=>normalizeCapturedReport(foreign,ref));
 const ambiguous=har(data);const other=raw();other.game_data.away_roster[0].player_name='ANOTHER FICTITIOUS NAME';ambiguous.log.entries.push(har(other).log.entries[0]);assert.throws(()=>normalizeCapturedReport(ambiguous,ref),/contradictòries/);
});
test('capture comparison rejects wrong IDs, goalkeepers, five flags and missing names',()=>{
 const data=raw(),ref=reference(data);
 for(const mutate of [d=>d.game_data.home_roster[1].player_id='9999',d=>d.game_data.home_roster[9].player_role='J',d=>d.game_data.away_roster[5]['5i']=true,d=>delete d.game_data.home_roster[1].player_name]){const changed=raw();mutate(changed);assert.throws(()=>normalizeCapturedReport(har(changed),ref));}
});
test('the real visual reference cannot silently certify synthetic player identities',()=>{
 const ref=JSON.parse(fs.readFileSync('docs/evidence/rfep-35559-visual-reference-20261105.json'));assert.equal(ref.expected.counts.home.players,10);assert.equal(ref.expected.counts.away.goalkeepers,2);assert.throws(()=>normalizeCapturedReport(har(raw()),ref),/referència/);
});
test('capture CLI refuses transcription files and emits no player or token contents',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ch360-capture-'));const file=path.join(dir,'private.json');try{fs.writeFileSync(file,JSON.stringify({game_data:raw().game_data,token:'PRIVATE-FIXTURE-TOKEN'}),{mode:0o600});const result=spawnSync(process.execPath,['scripts/verify-rfep-report-capture.mjs',file],{encoding:'utf8'});assert.equal(result.status,1);assert.match(result.stderr,/HAR/);assert.ok(!result.stderr.includes('PRIVATE-FIXTURE-TOKEN'));assert.ok(!result.stderr.includes('PERSONA FICTÍCIA'));}finally{fs.rmSync(dir,{recursive:true});}
});
