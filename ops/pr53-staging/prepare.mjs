// Reuses the earlier staging runtime: all identities come from real local GoTrue.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {root,work,secrets,sql} from './runtime.mjs';
import {assertLocalStaging,LOCAL_PROJECT} from './safety.mjs';
assertLocalStaging(secrets);
export async function api(endpoint,{method='GET',body,token}={}){
 const response=await fetch(secrets.apiUrl+endpoint,{method,headers:{apikey:secrets.anonKey,Authorization:'Bearer '+(token||secrets.anonKey),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 let data;try{data=await response.json();}catch{data=null;}return {status:response.status,data};
}
const accountPath=path.join(work,'accounts-private.json');
const accounts=fs.existsSync(accountPath)?JSON.parse(fs.readFileSync(accountPath)):{};
for(const role of ['coordinator','coach','delegate','ordinary','otherclub','root']){
 if(!accounts[role])accounts[role]={email:role+'@pr53.invalid',password:crypto.randomBytes(24).toString('base64url')};
 fs.writeFileSync(accountPath,JSON.stringify(accounts),{mode:0o600});
 const a=accounts[role];let response=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:a.email,password:a.password}});
 if(response.status!==200)response=await api('/auth/v1/signup',{method:'POST',body:{email:a.email,password:a.password}});
 if(response.status!==200||!response.data.user?.id)throw Error('Local Auth failed for '+role+' HTTP '+response.status);
 a.id=response.data.user.id;
 fs.writeFileSync(accountPath,JSON.stringify(accounts),{mode:0o600});
}
if(sql("select to_regclass('app_private.pr53_identity') is not null")!=='t'){
 const baseline=fs.readFileSync(new URL('./baseline.synthetic.sql',import.meta.url),'utf8');
 const policies=fs.readFileSync(new URL('./policies.synthetic.sql',import.meta.url),'utf8');
 const names=fs.readdirSync(path.join(root,'supabase/migrations')).filter(n=>n.endsWith('.sql')).sort();
 const migrations=names.map(n=>fs.readFileSync(path.join(root,'supabase/migrations',n),'utf8'));
 sql(`begin;set ch360.staging_project='${LOCAL_PROJECT}';`+baseline+policies+migrations.join('\n')+`\ncreate table app_private.pr53_identity(project_id text primary key);insert into app_private.pr53_identity values('${LOCAL_PROJECT}');commit;`);
 fs.writeFileSync(path.join(work,'migrations-applied.json'),JSON.stringify(names.map(n=>({name:n,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'supabase/migrations',n))).digest('hex')})),null,2));
}
if(sql('select project_id from app_private.pr53_identity')!==LOCAL_PROJECT)throw Error('Wrong staging database');
const fixtureFile=path.join(work,'fixture.json');
if(!fs.existsSync(fixtureFile)){
 const uid=()=>crypto.randomUUID(),club=uid(),other=uid(),season=uid(),foreignSeason=uid();
 const q=s=>"'"+String(s).replaceAll("'","''")+"'",j=s=>q(JSON.stringify(s))+'::jsonb';
 const teams=['FEM15','Infantil D','FEM11','Altre club'].map((name,i)=>({id:uid(),name:name+' FICTICI',club_id:i===3?other:club,season_id:i===3?foreignSeason:season,comp:uid(),group:uid(),entry:uid(),rivalEntry:uid(),future:uid(),past:uid(),player:uid(),rival:uid()}));
 const statements=[`insert into clubs(id,name) values('${club}','Club A FICTICI'),('${other}','Club B FICTICI');insert into seasons(id,club_id,label) values('${season}','${club}','2026/27'),('${foreignSeason}','${other}','2026/27');`];
 statements.push(`insert into club_memberships values('${accounts.coordinator.id}','${club}',null,'general_coordinator');insert into platform_admins values('${accounts.root.id}','platform_superadmin',true);`);
 for(const [i,t] of teams.entries()){
  statements.push(`insert into teams(id,club_id,season_id,name,category) values('${t.id}','${t.club_id}','${t.season_id}',${q(t.name)},${q(t.name)});
   insert into federation_competitions(id,club_id,season_id,federation,external_competition_id) values('${t.comp}','${t.club_id}','${t.season_id}','FECAPA','LOCAL-COMP-${i}');
   insert into federation_groups values('${t.group}','${t.comp}');
   insert into federation_team_entries(id,club_team_id,competition_id,external_team_id) values('${t.entry}','${t.id}','${t.comp}','LOCAL-${i}'),('${t.rivalEntry}',null,'${t.comp}','RIVAL-${i}');`);
  for(const [match,days,status] of [[t.future,1,'pending'],[t.past,-1,'verified']])statements.push(`insert into federation_matches(id,group_id,home_team,away_team,federation_start_at,raw_data) values('${match}','${t.group}',${q(t.name)},'Rival FICTICI',date_trunc('day',now())+interval '${days} day 10 hours',${j({home_team_id:'LOCAL-'+i,away_team_id:'RIVAL-'+i,report_status:status,round:'8',venue:'Pavelló FICTICI',maps_url:'https://maps.app.goo.gl/fixture-only',maps_verified:true})});insert into federation_match_teams values('${match}','${t.entry}','home'),('${match}','${t.rivalEntry}','away');`);
  statements.push(`insert into federation_players values('${t.player}','FECAPA','${10001+i}',${q('Jugador FICTICI '+i)}),('${t.rival}','FECAPA','${20001+i}',${q('Rival FICTICI '+i)});
   insert into federation_match_lineups(match_id,side,player_id,display_name,shirt_number,is_goalkeeper) values('${t.past}','home','${t.player}',${q('Jugador FICTICI '+i)},'1',true),('${t.past}','away','${t.rival}',${q('Rival FICTICI '+i)},'7',false);`);
 }
 statements.push(`insert into club_memberships values('${accounts.coach.id}','${club}','${teams[0].id}','coach'),('${accounts.delegate.id}','${club}','${teams[0].id}','delegate'),('${accounts.otherclub.id}','${other}','${teams[3].id}','delegate');`);
 sql('begin;'+statements.join('\n')+'commit;');
 fs.writeFileSync(fixtureFile,JSON.stringify({club,other,season,teams},null,2),{mode:0o600});
}
sql("notify pgrst,'reload schema'");
console.log('Prepared six real local Auth accounts, ordered migrations and four synthetic teams. No user JWTs fabricated, no credentials logged.');
