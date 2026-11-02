import fs from 'node:fs';import crypto from 'node:crypto';
import {createDatabase,ID,asOwner} from '../../tests/helpers/stats-db.mjs';
import {federationStartAt} from '../../official-lineups.js';
export const stableId=value=>{const h=crypto.createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
export async function replayDatabase(folder,bundle=JSON.parse(fs.readFileSync('work/replay-source/bundle.json','utf8'))){
 const db=await createDatabase({dataDir:folder});
 await asOwner(db,"create table if not exists local_official_snapshots(id text primary key,document jsonb not null,hash text not null)");
 await asOwner(db,"insert into local_official_snapshots values($1,$2,$3) on conflict do nothing",[bundle.vic.id,JSON.stringify(bundle.report),bundle.officialHash]);
 await asOwner(db,"update teams set name='SIMAR IGUALADA HC',age_group='senior',age_group_source='RFEP OK Lliga Plata Sud, competició 3575' where id=$1",[ID.team]);
 const ids={};
 for(const [key,f] of [['vic',bundle.vic],['noia',bundle.noia]]){
  const match=stableId('replay:'+f.id);ids[key]=match;
  const played=key==='vic',roster=played?bundle.players:['home','away'].flatMap(side=>bundle.candidates[side].map(p=>({...p,team:side})));
  const official={source_kind:played?'verified_report':'verified_calendar',report_verified:played,lineup_status:played?'published':'not_published',
   home_team_id:f.home_id,away_team_id:f.away_id,home_score:f.score?.[0]??null,away_score:f.score?.[1]??null,
   fetched_at:played?bundle.report.verifiedAt:bundle.calendar.verifiedAt,official_status:played?'FINALITZAT':'Pendent',
   round:f.round_label,round_label:f.round_label,home_team:f.home_team,away_team:f.away_team,home_name:f.home_team,away_name:f.away_team,date:f.date,time:f.time,venue:f.venue,
   players:roster.map(p=>({...p,id:stableId(match+':'+p.id),goals:played?p.goals:null,yellow:played?p.yellow:null,blue:played?p.blue:null,red:played?p.red:null}))};
  const start=federationStartAt(f);
  await asOwner(db,"insert into pilot_matches values($1,$2,$3,$4,$5,'scheduled') on conflict(id) do update set starts_at=excluded.starts_at",[match,f.home_team+' – '+f.away_team+' · DIFERIT LOCAL',f.home_team,f.away_team,start]);
  await asOwner(db,"insert into federation_match_sources(match_id,federation,competition_id,season_id,official_data,import_status,home_name,away_name,last_checked_at,last_imported_at,federation_match_id,federation_url,home_crest_url) values($1,'RFEP','3575','41',$2,$3,$4,$5,now(),now(),$6,$7,'https://sidgad.cloud/rfep/images/logos_clubes/69_1.png') on conflict(match_id) do update set official_data=excluded.official_data",[match,JSON.stringify(official),played?'verified':'pending',f.home_team,f.away_team,f.official_match_id,f.source_url]);
  for(const [user,role] of [[ID.manager,'operator'],[ID.coach,'viewer']])await asOwner(db,'insert into pilot_members values($1,$2,$3) on conflict do nothing',[match,user,role]);
  await asOwner(db,"insert into stats_matches(match_id,club_id,season_id,home_team_id,home_external_team_id,away_external_team_id) values($1,$2,$3,$4,$5,$6) on conflict do nothing",[match,ID.club,ID.season,ID.team,f.home_id,f.away_id]);
  for(const p of official.players)await asOwner(db,"insert into pilot_players(id,match_id,team,dorsal,full_name,position,federation_player_id,official_source) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do update set full_name=excluded.full_name,dorsal=excluded.dorsal",[p.id,match,p.team,p.dorsal,p.full_name,p.position,p.federation_player_id,p.official_source]);
 }
 return {db,bundle,ids};
}
