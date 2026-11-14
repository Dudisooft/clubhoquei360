import fs from 'node:fs';
import {parseVicRoster,buildVicImportSQL,VIC} from './vic-roster.mjs';
// Run with: node --use-env-proxy scripts/import-vic-roster.mjs --fetch
// Uses the configured proxy/network policy; never a third-party fetch service.
if(process.argv[2]!=='--fetch')throw Error('Use --fetch after allowing www.server2.sidgad.es in the Codex environment');
const response=await fetch(VIC.endpoint,{method:'POST',headers:{Origin:'https://hockeypatines.fep.es',Referer:VIC.source_url,'X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams({idc:VIC.competition,site_lang:'es',tipo_stats:'plantillas'}),redirect:'error',signal:AbortSignal.timeout(25000)});
if(!response.ok)throw Error('RFEP roster HTTP '+response.status);
const html=await response.text(),data=parseVicRoster(html,{fetched_at:new Date().toISOString(),endpoint:response.url});
fs.mkdirSync('work',{recursive:true});
for(const [name,body] of [['vic-roster-source.html',html],['vic-roster-data.json',JSON.stringify(data,null,2)],['vic-roster-import.sql',buildVicImportSQL(data)]])fs.writeFileSync('work/'+name,body,{mode:0o600});
console.log(JSON.stringify({team:VIC.team,competition:VIC.competition,season:VIC.season,players:data.players.length,source_sha256:data.source_sha256,sql:'work/vic-roster-import.sql',status:'prepared_not_applied'}));
