import fs from 'node:fs';import path from 'node:path';
const target=path.resolve('work/site');fs.mkdirSync(target,{recursive:true});
for(const name of fs.readdirSync(target))fs.unlinkSync(path.join(target,name));
const files=fs.readdirSync('.').filter(p=>/\.(html|js|css)$/.test(p));for(const file of files)fs.copyFileSync(file,path.join(target,file));
fs.writeFileSync(path.join(target,'.nojekyll'),'');
console.log('Static GitHub Pages artifact: work/site ('+files.length+' application files). No tests, SQL, credentials or node_modules included.');
