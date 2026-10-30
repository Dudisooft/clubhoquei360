// Visible test identification only in the private local artifact, never repository HTML.
import fs from 'node:fs';import path from 'node:path';
await import('./remediation-site.mjs');
const dir=path.resolve('work/staging-3a8/site');
for(const f of fs.readdirSync(dir).filter(n=>n.endsWith('.html'))){const p=path.join(dir,f);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/<body([^>]*)>/i,'<body$1><aside role="note" id="localTestBanner" style="padding:12px;background:#ffd54f;color:#111;font-weight:bold">ENTORN LOCAL DE PROVA · DADES FICTÍCIES · NO ÉS PRODUCCIÓ NI L’ACTA 35559</aside>'));}
