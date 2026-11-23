// Optional, ephemeral PGlite fixture. Never part of the GitHub Pages build.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {PGlite} from '@electric-sql/pglite';
import {ID} from './stats-db.mjs';import {normalizeReport} from '../../scripts/lib/public-federation.mjs';import {normalizeCapturedReport,referenceSummary} from '../../scripts/lib/rfep-report-capture.mjs';
export async function seedRfepRehearsal(db,{har=null,workReference=null}={}){
 if(!har&&!workReference)return null;
 if(!(db instanceof PGlite)||!!har===!!workReference)throw Error('Només s’admet un assaig local PGlite amb una única procedència');
 const filename=path.resolve(har||workReference),repo=fs.realpathSync(fileURLToPath(new URL('../..',import.meta.url))),stat=fs.lstatSync(filename),real=fs.realpathSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||real.startsWith(repo+path.sep)||stat.size>20000000||(process.platform!=='win32'&&(stat.mode&0o077)))throw Error('L’entrada ha de ser privada i fora del repositori');
 let input;try{input=JSON.parse(fs.readFileSync(real));}catch{throw Error('Entrada de prova invàlida');}
 const reference=JSON.parse(fs.readFileSync(new URL('../../docs/evidence/rfep-35559-visual-reference-20261105.json',import.meta.url)));
 let report,mode;
 if(har){report=normalizeCapturedReport(input,reference).report;mode='supplied_HTTP_capture';}
 else{
  if(input.provenance!=='MANUAL_WORK_TRANSCRIPTION_NOT_HTTP_CAPTURE'||input.raw_http_response!==false)throw Error('La transcripció requereix procedència explícita');
  report=normalizeReport(input.data,reference.fixture);
  if(JSON.stringify(referenceSummary(report))!==JSON.stringify(reference.expected))throw Error('Transcripció incompatible amb la referència');
  mode='manual_Work_reference_NOT_HTTP_capture';
 }
 await db.exec('reset role');
 // The database was just created from synthetic fixtures, never a remote URL.
 await db.query('delete from pilot_players where match_id=$1',[ID.match]);
 let serial=100;const players=[];
 for(const side of ['home','away'])for(const p of report.sides[side]){
  const localId='30000000-0000-4000-8000-'+String(++serial).padStart(12,'0');players.push({...p,id:localId,public_player_id:p.id,team:side});
  await db.query('insert into pilot_players(id,match_id,team,dorsal,full_name,position,federation_player_id) values($1,$2,$3,$4,$5,$6,$7)',[localId,ID.match,side,p.number,p.name,p.position,p.id]);
 }
 const official={source_kind:'verified_calendar',data_origin:mode,report_verified:!!har,home_team_id:'3697',away_team_id:'3727',home_score:1,away_score:1,source_url:report.source_url,calendar_source_url:report.calendar_source_url,players:players.map(p=>({external_id:p.public_player_id,team:p.team,matchVerified:!!har})),official_status:'FINALIZAT'};
 await db.query("update federation_match_sources set federation='RFEP',federation_match_id='35559',competition_id='3575',season_id='41',federation_url=$2,import_status=$3,home_name='SIMAR IGUALADA HC',away_name='AUTO VIGATANA PATÍ VIC',official_data=$4 where match_id=$1",[ID.match,report.source_url,har?'verified':'pending',JSON.stringify(official)]);
 await db.query("update pilot_matches set title='SIMAR–Vic · ASSAIG AÏLLAT',starts_at='2026-10-24T18:30:00Z' where id=$1",[ID.match]);
 await db.query("update stats_matches set home_external_team_id='3697',away_external_team_id='3727' where match_id=$1",[ID.match]);
 const banner=har?'ASSAIG AÏLLAT · Captura HTTP aportada, sense consulta en viu ni connexió productiva':'ASSAIG AÏLLAT · Transcripció manual de Work, NO és una captura HTTP ni una importació automàtica';
 return {mode,banner,summary:referenceSummary(report),firstField:players.find(p=>p.position==='field').id,source_url:report.source_url,automatic_transport_verified:false};
}
