import fs from 'node:fs';
import {stableId} from './local-replay-db.mjs';
import {federationStartAt} from '../../official-lineups.js';
import {ID} from '../../tests/helpers/stats-db.mjs';
export function clubCatalogue(bundle,ids,{inventory=JSON.parse(fs.readFileSync('docs/evidence/senior-catalogue-3a4-20261028.json')).catalogue,snapshots=null}={}){
 const cache=new Map(JSON.parse(fs.readFileSync('demo/public-calendar-snapshot.json')).map(s=>[s.key,s]));
 if(snapshots===null){snapshots=[];if(fs.existsSync('work/club-calendars'))for(const f of fs.readdirSync('work/club-calendars'))if(f.endsWith('.json')&&f!=='status.json')snapshots.push(JSON.parse(fs.readFileSync('work/club-calendars/'+f)));}
 for(const s of snapshots)cache.set(s.key,s);
 if(!cache.has(bundle.calendar.key)||Date.parse(bundle.calendar.verifiedAt)>Date.parse(cache.get(bundle.calendar.key).verifiedAt))cache.set(bundle.calendar.key,bundle.calendar);
 const teams=inventory.teams.map(t=>({...t,club_id:ID.club,season_id:ID.season}));
 const competitions=[...new Map(inventory.entries.map(e=>{const id=stableId('competition:'+e.federation+':'+e.competition_id);return [id,{id,club_id:ID.club,season_id:ID.season,federation:e.federation,external_competition_id:e.competition_id,name:e.competition}]})).values()];
 const entries=inventory.entries.map(e=>({...e,club_team_id:e.team_id,competition_id:stableId('competition:'+e.federation+':'+e.competition_id),raw_data:{source_url:e.source_url}}));
 const groups=[],fixtures=[],links=[];
 for(const c of competitions){const snapshot=cache.get(c.federation+':41:'+c.external_competition_id),own=entries.filter(e=>e.competition_id===c.id);if(!snapshot)continue;
  for(const f of snapshot.fixtures){const involved=own.filter(e=>[f.home_id,f.away_id].includes(e.external_team_id));if(!involved.length)continue;
   const group=stableId(c.id+':'+f.group);if(!groups.some(g=>g.id===group))groups.push({id:group,competition_id:c.id});
   const replay=f.id===bundle.vic.id?ids.vic:f.id===bundle.noia.id?ids.noia:null,id=replay||stableId('calendar:'+f.id);
   fixtures.push({id,group_id:group,external_match_id:f.official_match_id,home_team:f.home_team,away_team:f.away_team,federation_start_at:federationStartAt(f),home_score:f.score?.[0]??null,away_score:f.score?.[1]??null,match_fingerprint:f.id,fetched_at:snapshot.verifiedAt,raw_data:{home_team_id:f.home_id,away_team_id:f.away_id,source_url:f.source_url,round:f.round_label,stale:!!snapshot.error}});
   for(const e of involved)links.push({match_id:id,entry_id:e.id,side:e.external_team_id===f.home_id?'home':'away'});
  }
 }
 return {seasons:[{id:ID.season,club_id:ID.club,label:'2026/27'}],teams,federation_competitions:competitions,federation_team_entries:entries,federation_groups:groups,federation_matches:fixtures,federation_match_teams:links,...Object.fromEntries(['federation_team_roster','federation_players','federation_player_competition_stats','federation_match_lineups','federation_match_events','federation_match_staff'].map(k=>[k,[]]))};
}
export function catalogueQuery(rows,params){
 for(const [key,v] of params){if(v.startsWith('eq.'))rows=rows.filter(r=>String(r[key])===v.slice(3));else if(v.startsWith('in.(')){const allowed=v.slice(4,-1).split(',').map(x=>x.replace(/^"|"$/g,''));rows=rows.filter(r=>allowed.includes(String(r[key])));}}
 const order=params.get('order');if(order)rows=[...rows].sort((a,b)=>{for(const spec of order.split(',')){const [key,dir]=spec.split('.'),n=String(a[key]??'').localeCompare(String(b[key]??''));if(n)return dir==='desc'?-n:n;}return 0;});
 return rows.slice(Number(params.get('offset')||0),Number(params.get('offset')||0)+Number(params.get('limit')||1000));
}
