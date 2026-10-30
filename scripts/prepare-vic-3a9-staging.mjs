// Local fixtures only. This cannot accept a URL or a production project.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {root,work,sql,assertIsolation} from './remediation-runtime.mjs';
assertIsolation();const old=JSON.parse(fs.readFileSync(path.join(work,'federation-fixtures.json'))).B.id;
const mid='a3900000-0000-4000-8000-000000000001',file=path.join(root,'work/3a9/fixture-public.json');
fs.mkdirSync(path.dirname(file),{recursive:true});
if(sql(`select count(*) from pilot_matches where id='${mid}'`)==='0')sql(`begin;
insert into federation_matches select (jsonb_populate_record(null::federation_matches,to_jsonb(m)||jsonb_build_object('id','${mid}','external_match_id',null,'match_fingerprint','LOCAL-FICTICI-3A9-VIC','round_label','PROVA FICTÍCIA · referència 35559','home_team','SIMAR IGUALADA · FICTICI','away_team','VIC · FICTICI','federation_start_at','2026-10-24T18:30:00Z','home_score',1,'away_score',1,'raw_data',m.raw_data||jsonb_build_object('fixture_only',true,'reference_match','35559','match_id',null,'report_status','fictional_fixture','report_summary',jsonb_build_object('official_status','FINALITZAT · FICTICI','score_available',true)) ))).* from federation_matches m where id='${old}';
insert into federation_match_teams select '${mid}',entry_id,side from federation_match_teams where match_id='${old}';
insert into pilot_matches select (jsonb_populate_record(null::pilot_matches,to_jsonb(p)||jsonb_build_object('id','${mid}','title','PROVA LOCAL FICTÍCIA · SIMAR – VIC','home_team','SIMAR IGUALADA · FICTICI','away_team','VIC · FICTICI','starts_at','2026-10-24T18:30:00Z','status','review'))).* from pilot_matches p where id='${old}';
insert into federation_match_sources select (jsonb_populate_record(null::federation_match_sources,to_jsonb(s)||jsonb_build_object('match_id','${mid}','federation_match_id',null,'home_name','SIMAR IGUALADA · FICTICI','away_name','VIC · FICTICI','official_data',s.official_data||jsonb_build_object('calendar_match_id','${mid}','calendar_fingerprint','LOCAL-FICTICI-3A9-VIC','fixture_only',true,'home_score',1,'away_score',1)))).* from federation_match_sources s where match_id='${old}';
insert into basic_match_contexts select (jsonb_populate_record(null::basic_match_contexts,to_jsonb(b)||jsonb_build_object('id',gen_random_uuid(),'catalogue_match_id','${mid}','pilot_match_id','${mid}'))).* from basic_match_contexts b where pilot_match_id='${old}';
insert into stats_matches select (jsonb_populate_record(null::stats_matches,to_jsonb(s)||jsonb_build_object('match_id','${mid}'))).* from stats_matches s where match_id='${old}';
insert into pilot_players(id,match_id,team,dorsal,full_name,position,official_source,federation_active)
select gen_random_uuid(),'${mid}',side,n::text,'JUGADOR FICTICI '||side||' '||n,case when n=1 then 'goalkeeper' else 'field' end,'FIXTURE LOCAL 3A9 · NO FEDERATIU',true from unnest(array['home','away']) side cross join generate_series(1,5) n;
commit;`);
assert.equal(sql(`select count(*) from pilot_players where match_id='${mid}'`),'10');
fs.writeFileSync(file,JSON.stringify({fixtureOnly:true,notOfficialMatch35559:true,id:mid,referenceMatch:'35559',season:'81000000-0000-4000-8000-000000000001',competition:'064b22e1-c31f-1952-da26-1c221df66a5e',team:'49e183ba-8a55-7759-5497-d5be940dc2cf',playersPerSide:5,officialLineupsVerified:false,mode:'video',localUrl:'http://127.0.0.1:56490/clubhoquei360/dashboard.html'},null,2));
console.log('PASS local completed-match fixture prepared; 10 explicitly fictional participants, no official ID assigned.');
