// Local verification only. Full captures and player names must stay outside Git.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {normalizeCapturedReport,sha256} from './lib/rfep-report-capture.mjs';
try{
 if(process.argv.length!==3)throw Error('Ús: node scripts/verify-rfep-report-capture.mjs /ruta/privada/acta.har');
 const input=path.resolve(process.argv[2]),repo=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url))),stat=fs.lstatSync(input);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>20000000)throw Error('Fitxer de captura no admès');
 const real=fs.realpathSync(input);
 if(real===repo||real.startsWith(repo+path.sep))throw Error('La captura ha de ser fora del repositori');
 if(process.platform!=='win32'&&(stat.mode&0o077)!==0)throw Error('La captura ha de tenir permisos privats');
 const bytes=fs.readFileSync(real);let har;try{har=JSON.parse(bytes);}catch{throw Error('Fitxer HAR invàlid');}
 const reference=JSON.parse(fs.readFileSync(new URL('../docs/evidence/rfep-35559-visual-reference-20261105.json',import.meta.url)));
 const {proof}=normalizeCapturedReport(har,reference);
 console.log(JSON.stringify({result:'CAPTURE_MATCHES_VISUAL_REFERENCE',har_sha256:sha256(bytes),...proof},null,2));
}catch(error){console.error('Verificació no completada: '+error.message);process.exitCode=1;}
