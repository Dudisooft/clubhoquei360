import fs from 'node:fs';import path from 'node:path';
await import('./remediation-site.mjs');
const dir=path.resolve('work/staging-3a8/site');for(const f of fs.readdirSync(dir).filter(n=>n.endsWith('.html'))){const p=path.join(dir,f);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/<body([^>]*)>/i,'<body$1><aside id="localTestBanner" role="note" style="padding:12px;background:#ffd54f;color:#111;font-weight:bold">PROVA LOCAL 3A.10 · DADES FICTÍCIES · SENSE ENVIAMENTS</aside>'));}
