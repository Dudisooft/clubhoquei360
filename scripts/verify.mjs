import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {parseHTML} from 'linkedom';
const files=fs.readdirSync('.').filter(p=>/\.(html|js|css)$/.test(p));let checked=0;
for(const file of files){
 const source=fs.readFileSync(file,'utf8');if(file.endsWith('.js'))execFileSync(process.execPath,['--check',file]);
 if(file.endsWith('.html')){
  const {document}=parseHTML(source);const ids=new Set();for(const e of document.querySelectorAll('[id]')){if(ids.has(e.id))throw Error(file+': duplicate ID '+e.id);ids.add(e.id);}
  for(const script of document.querySelectorAll('script:not([src])'))if(script.textContent.trim())new vm.Script(script.textContent,{filename:file});
  for(const e of document.querySelectorAll('[href],[src]')){const url=e.getAttribute('href')??e.getAttribute('src');if(!url||/^(?:[a-z]+:|\/\/|#)/i.test(url))continue;const local=url.split(/[?#]/)[0];if(!local)continue;if(local.startsWith('/'))throw Error(file+': root-relative URL breaks subdirectory hosting: '+url);if(!fs.existsSync(path.resolve(local)))throw Error(file+': missing local target '+url);}
 }
 if(/sb_secret_|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source))throw Error(file+': secret-shaped material');checked++;
}
console.log('Static verification passed: '+checked+' HTML/JS/CSS files; JS syntax, inline scripts, IDs and relative links checked.');
