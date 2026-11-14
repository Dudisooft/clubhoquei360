// Synthetic Auth/catalogue/PostgREST transport. Never contacts production.
const match='20000000-0000-4000-8000-000000000001',uid='40000000-0000-4000-8000-000000000004';
const key=table=>'synthetic-basic-'+table;
const load=table=>JSON.parse(localStorage.getItem(key(table))||'null');
const save=(table,rows)=>localStorage.setItem(key(table),JSON.stringify(rows));
const url='https://www.hoqueipatins.fecapa.cat/league/4786';
const source={match_id:match,federation:'FECAPA',federation_match_id:'FICTICI',competition_id:'4786',home_name:'Igualada fictici',away_name:'Salt fictici',home_crest_url:'https://sidgad.cloud/fecapa/images/logos_clubes/252_1.png',away_crest_url:'https://sidgad.cloud/fecapa/images/logos_clubes/318_1.png',official_data:{home_score:0,away_score:0,official_status:'Pendent',fetched_at:'2026-10-23T10:00:00Z'}};
const people=[['p1','CP1','E1','home','7','Jugador local fictici'],['p2','CP2','E2','home','1','Porter local fictici'],['a1','CA1','A1','away','9','Jugador visitant fictici'],['a2','CA2','A2','away','1','Porter visitant fictici']];
const rosters=people.map(([id,player_id,external_id,team,shirt_number,display_name])=>({id:'r'+id,entry_id:team==='home'?'EH':'EA',player_id,external_person_id:external_id,role:'player',shirt_number,display_name,raw_data:{active_in_latest_roster:true,observed_match_id:'FICTICI'}}));
rosters.push({id:'r3',entry_id:'EY',player_id:'CP3',role:'player',shirt_number:'5',display_name:'Reforç verificat fictici',raw_data:{}},{id:'r4',entry_id:'EY',player_id:'CP4',role:'player',shirt_number:null,display_name:'Reforç no verificat fictici',raw_data:{}});
const lineups=people.map(([id,player_id,external_id,side,shirt_number,display_name])=>({id:'l'+id,match_id:match,player_id,side,shirt_number,display_name,reported_goals:side==='home'?4:null,raw_data:{blue:null,yellow:null,red:null}}));
lineups.push({id:'l3',match_id:match,player_id:'CP3',side:'home',shirt_number:'5',display_name:'Reforç verificat fictici',reported_goals:null,raw_data:{blue:null}});
const data={pilot_matches:[{id:match,title:'Igualada – Salt · FICTICI',starts_at:'2026-10-10T14:45:00Z'}],pilot_members:[{match_id:match,user_id:uid,role:'operator'}],pilot_operator_state:[],federation_match_sources:[source],pilot_players:people.map(([id,cat,ext,team,dorsal,full_name])=>({id,match_id:match,team,dorsal,full_name,federation_player_id:ext,federation_active:true})),federation_matches:[{id:match,external_match_id:'FICTICI',home_team:'Igualada fictici',away_team:'Salt fictici',home_score:8,away_score:0,raw_data:{source_url:url,report_status:'verified',home_crest:source.home_crest_url,away_crest:source.away_crest_url,report_data:{official_status:'FINALIZAT',fetched_at:'2026-10-23T09:17:04Z'}}}],federation_match_teams:[{id:'lh',match_id:match,entry_id:'EH',side:'home'},{id:'la',match_id:match,entry_id:'EA',side:'away'}],federation_team_entries:[{id:'EH',club_team_id:'TH',display_name:'Local fictici'},{id:'EA',club_team_id:'TA',display_name:'Visitant fictici'},{id:'EY',club_team_id:'TY',display_name:'Equip de reforços fictici'}],teams:[{id:'TH',category:'INFANTIL',club_id:'a48efe2f-c218-633e-6be6-4ce26e61f5cd',season_id:'S'},{id:'TY',category:'ALEVÍ',club_id:'a48efe2f-c218-633e-6be6-4ce26e61f5cd',season_id:'S'},{id:'TA',club_id:'CA',season_id:'S'}],federation_team_roster:rosters,federation_match_lineups:lineups,basic_match_contexts:[],federation_players:[...people.map(([id,cat,ext])=>({id:cat,federation:'FECAPA',external_player_id:ext})),{id:'CP3',federation:'FECAPA',external_player_id:'E3'},{id:'CP4',federation:'FECAPA',external_player_id:'E4'}]};
// Competition-wide entries must never become the selected infant team's roster.
data.teams.push({id:'TO',category:'INFANTIL',club_id:'a48efe2f-c218-633e-6be6-4ce26e61f5cd',season_id:'S'});
data.federation_team_entries.push({id:'EO',club_team_id:'TO',display_name:'Altre infantil fictici'});
data.federation_players.push({id:'CP5',federation:'FECAPA',external_player_id:'E5'});
data.federation_team_roster.push({id:'r5',entry_id:'EH',player_id:'CP5',role:'player',display_name:'Altre infantil exclòs fictici',raw_data:{active_in_latest_roster:true}},{id:'r5other',entry_id:'EO',player_id:'CP5',role:'player',display_name:'Altre infantil exclòs fictici',raw_data:{active_in_latest_roster:true,observed_match_id:'OTHER'}});
data.federation_groups=[{id:'G',competition_id:'C'}];data.federation_competitions=[{id:'C',federation:'FECAPA',club_id:'a48efe2f-c218-633e-6be6-4ce26e61f5cd',season_id:'S'}];for(const e of data.federation_team_entries){e.competition_id='C';e.external_team_id=e.id==='EH'?'10':e.id==='EA'?'20':e.id;} for(const f of data.federation_matches){f.group_id='G';f.federation_start_at='2026-10-10T14:45:00Z';f.raw_data.home_team_id='10';f.raw_data.away_team_id='20';}
const live='20000000-0000-4000-8000-000000000002';
data.federation_matches.push({id:live,group_id:'G',external_match_id:null,home_team:'Igualada fictici',away_team:'Alpicat fictici',home_score:null,away_score:null,federation_start_at:'2026-10-24T16:15:00Z',raw_data:{source_url:url,home_crest:source.home_crest_url,away_crest:null,home_team_id:'10',away_team_id:'20'}});
data.federation_match_teams.push({id:'live-link',match_id:live,entry_id:'EH',side:'home'});
if(new URLSearchParams(location.search).get('fixture')==='fem11'||sessionStorage.getItem('synthetic-fem11')==='true'){sessionStorage.setItem('synthetic-fem11','true');data.teams.find(t=>t.id==='TH').category='FEM11';data.teams.find(t=>t.id==='TY').category='FEM9';source.home_name='FEM11 IHC FICTICI';source.away_name='Barberà FICTICI';data.federation_team_roster.push({id:'same',entry_id:'EO',player_id:'OTHER',role:'player',display_name:'Mateixa categoria exclosa FICTÍCIA',raw_data:{observed_match_id:'OTHER'}});data.teams.find(t=>t.id==='TO').category='FEM11';}
// Two selectable report-backed reinforcements, explicitly synthetic; no eligibility rule override.
if(new URLSearchParams(location.search).get('fixture')==='reinforcement-toggle'||sessionStorage.getItem('synthetic-reinforcement-toggle')==='true'){
 sessionStorage.setItem('synthetic-reinforcement-toggle','true');
 data.federation_players.push({id:'CP6',federation:'FECAPA',external_player_id:'E6'});
 data.federation_team_roster.push({id:'r6',entry_id:'EY',player_id:'CP6',role:'player',display_name:'Segon reforç FICTICI',raw_data:{}});
 data.federation_match_lineups.push({id:'l6',match_id:match,player_id:'CP6',side:'home',shirt_number:'6',display_name:'Segon reforç FICTICI',raw_data:{}});
}
// Synthetic RFEP opponent imported as a competition entry, not an IHC club team.
if(new URLSearchParams(location.search).get('fixture')==='rfep-opponent'){
 source.federation='RFEP';source.competition_id='3575';source.federation_url='https://hockeypatines.fep.es/league/3575';
 for(const c of data.federation_competitions)c.federation='RFEP';for(const p of data.federation_players)p.federation='RFEP';
 data.federation_team_entries.find(e=>e.id==='EA').club_team_id=null;
 for(const f of data.federation_matches)f.raw_data.source_url=source.federation_url;
 data.pilot_players=[];data.federation_match_lineups=[];
}
window.basicFixture={fail:false,syncFail:false,syncCalls:0,remoteWrites:0,playerWrites:0,delay:0};
export const db={rpc:async(name,args)=>{
 if(name!=='basic_open_catalogue_match')return {error:{message:'Unknown fixture RPC'}};
 const id=args.p_practice?'20000000-0000-4000-8000-000000000009':args.p_catalogue;
 const contexts=load('basic_match_contexts')||[];if(!contexts.length){save('basic_match_contexts',[{id:'context',catalogue_match_id:args.p_catalogue,pilot_match_id:id,owner_id:uid,practice:args.p_practice}]);save('pilot_members',[...data.pilot_members,{match_id:id,user_id:uid,role:'operator'}]);save('pilot_matches',[...data.pilot_matches,{id,title:'PROVA FICTÍCIA',starts_at:'2026-10-10T14:45:00Z'}]);}
 return {data:id,error:null};
},auth:{getUser:async()=>({data:{user:{id:uid}}})},functions:{invoke:async()=>{window.basicFixture.syncCalls++;return window.basicFixture.syncFail?{error:Error('FECAPA no disponible')}:{data:{results:[{match_id:match,status:'cached'}]}};}},from(table){
 let filters=[],single=false,inserted=null,offset=0,end=499;
 const query={select(){return query;},eq(k,v){filters.push(r=>r[k]===v);return query;},in(k,values){filters.push(r=>values.includes(r[k]));return query;},order(){return query;},range(a,b){offset=a;end=b;return query;},maybeSingle(){single=true;return query;},insert(batch){inserted=Array.isArray(batch)?batch:[batch];return query;},then(resolve,reject){return (async()=>{
  if(window.basicFixture.delay)await new Promise(r=>setTimeout(r,window.basicFixture.delay));
  let rows=load(table)||structuredClone(data[table]||[]);
  if(inserted){if(table==='pilot_events')window.basicFixture.remoteWrites++;if(table==='pilot_players')window.basicFixture.playerWrites++;if(window.basicFixture.fail)return {error:{message:'Connexió tallada'}};if(inserted.some(r=>rows.some(x=>x.id===r.id)))return {error:{code:'23505',message:'duplicate key'}};rows.push(...inserted);save(table,rows);return {data:inserted,error:null};}
  if(localStorage.getItem('synthetic-retired-player')==='p1'){if(table==='pilot_players')rows=rows.filter(r=>r.id!=='p1');if(['federation_team_roster','federation_match_lineups'].includes(table))rows=rows.filter(r=>r.player_id!=='CP1');}
  if(localStorage.getItem('synthetic-retired-reinforcement')==='CP3'){if(table==='pilot_players')rows=rows.filter(r=>r.federation_player_id!=='E3');if(['federation_team_roster','federation_match_lineups'].includes(table))rows=rows.filter(r=>r.player_id!=='CP3');}
  rows=rows.filter(r=>filters.every(f=>f(r))).slice(offset,end+1);
  return {data:single?rows[0]||null:rows,error:null};
 })().then(resolve,reject);}};return query;
}};
