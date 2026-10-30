// Serve a private review artifact. Never changes app-client.js in the repository.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
const root=path.resolve(new URL('..',import.meta.url).pathname),backend=path.resolve(process.argv[2]||'.');
const {assertLocalStaging}=await import(path.join(backend,'scripts/remediation-safety.mjs'));const config=JSON.parse(fs.readFileSync(path.join(backend,'work/staging-3a8/runtime-private.json'),'utf8'));assertLocalStaging(config);
const output=path.join(root,'work/staging-3a8/site');fs.mkdirSync(output,{recursive:true});
for(const name of fs.readdirSync(root).filter(n=>/\.(html|js|css)$/.test(n))){let text=fs.readFileSync(path.join(root,name),'utf8');if(name==='app-client.js')text=`export const db=window.supabase.createClient(${JSON.stringify(config.apiUrl)},${JSON.stringify(config.anonKey)});`;
 if(name==='historial.js')text=text.replace(/^const db=supabase\.createClient\([^\n]+$/m,`const db=supabase.createClient(${JSON.stringify(config.apiUrl)},${JSON.stringify(config.anonKey)});`);
 if(name.endsWith('.html'))text=text.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"'\s<]*/g,'/vendor/supabase.js');
 if(text.includes('oevprbchlhyglhvopnvy'))throw Error('Production identifier detected in the staging artifact.');fs.writeFileSync(path.join(output,name),text);
}
const sdk=path.join(root,'node_modules/@supabase/supabase-js/dist/umd/supabase.js');
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://127.0.0.1:56490').pathname;const target=pathname==='/vendor/supabase.js'?sdk:path.resolve(output,'.'+pathname.replace(/^\/clubhoquei360/,''));
 if(target!==sdk&&!target.startsWith(output+path.sep)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(target));});server.listen(56490,'127.0.0.1',()=>console.log('Staging artifact served on loopback, production configuration unchanged.'));
