// Serve the existing application with a local-only client configuration.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {root,secrets} from './runtime.mjs';import {assertLocalStaging} from './safety.mjs';
assertLocalStaging(secrets);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:57380'),name=url.pathname.split('/').pop()||'dashboard.html';
 if(!/^[\w.-]+\.(?:html|js|css)$/.test(name)){res.writeHead(404);return res.end();}
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');
 if(name==='app-client.js')return res.end(`export const db=window.supabase.createClient(${JSON.stringify(secrets.apiUrl)},${JSON.stringify(secrets.anonKey)});`);
 if(name==='__supabase-test-sdk.js')return res.end(fs.readFileSync(path.join(root,'node_modules/@supabase/supabase-js/dist/umd/supabase.js')));
 const file=path.join(root,name);if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 let text=fs.readFileSync(file,'utf8');
 if(name.endsWith('.html'))text=text.replace(/https:\/\/cdn.jsdelivr.net\/npm\/@supabase\/supabase-js[^"']+/g,'./__supabase-test-sdk.js').replace('<body>','<body><p role="status">STAGING AÏLLAT · DADES FICTÍCIES · AUTH REAL LOCAL</p>');
 res.end(text);
});
server.listen(57380,'127.0.0.1',()=>console.log('Existing app served locally with staging-only credentials; no production file changed.'));
