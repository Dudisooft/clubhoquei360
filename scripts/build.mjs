import fs from 'node:fs';import path from 'node:path';
const target=path.resolve('work/site');fs.mkdirSync(target,{recursive:true});
for(const name of fs.readdirSync(target))fs.unlinkSync(path.join(target,name));
// The loopback-only functional lab must never enter a production static bundle.
const files=fs.readdirSync('.').filter(p=>/\.(html|js|css)$/.test(p)&&!p.startsWith('pilot-demo.')&&p!=='pilot-journal.js');for(const file of files)fs.copyFileSync(file,path.join(target,file));
fs.writeFileSync(path.join(target,'.nojekyll'),'');
console.log('Static GitHub Pages artifact: work/site ('+files.length+' application files). No tests, SQL, credentials or node_modules included.');
