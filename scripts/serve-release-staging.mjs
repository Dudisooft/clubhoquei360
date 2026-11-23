// Private artifact of this application. No production configuration is changed.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
const root=path.resolve(new URL('..',import.meta.url).pathname),backend=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw Error('Explicit isolated backend path required');
const runtime=await import(path.join(backend,'scripts/remediation-runtime.mjs'));runtime.assertIsolation();
const config=runtime.secrets,output=path.join(root,'work/release-staging/site');fs.mkdirSync(output,{recursive:true});
for(const name of fs.readdirSync(root).filter(n=>/\.(html|js|css)$/.test(n))){let content=fs.readFileSync(path.join(root,name),'utf8');
 if(name==='app-client.js')content=`export const db=window.supabase.createClient(${JSON.stringify(config.apiUrl)},${JSON.stringify(config.anonKey)});`;
 if(name==='historial.js')content=content.replace(/^const db=supabase\.createClient\([^\n]+$/m,`const db=supabase.createClient(${JSON.stringify(config.apiUrl)},${JSON.stringify(config.anonKey)});`);
 if(name.endsWith('.html')){content=content.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"'\s<]*/g,'/vendor/supabase.js');content=content.replace(/<body([^>]*)>/i,'<body$1><aside style="padding:12px;background:#ffd54f;color:#111;font-weight:bold">ENTORN DE PROVA · DADES FICTÍCIES · NO PRODUCCIÓ</aside>');}
 if(content.includes('oevprbchlhyglhvopnvy'))throw Error('Production identifier detected');fs.writeFileSync(path.join(output,name),content);
}
const sdk=path.join(root,'node_modules/@supabase/supabase-js/dist/umd/supabase.js');
http.createServer((req,res)=>{const p=new URL(req.url,'http://127.0.0.1:56490').pathname,target=p==='/vendor/supabase.js'?sdk:path.resolve(output,'.'+p.replace(/^\/clubhoquei360/,''));if(target!==sdk&&!target.startsWith(output+path.sep)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(target));}).listen(56490,'127.0.0.1',()=>console.log('Release staging artifact on guarded loopback only.'));
