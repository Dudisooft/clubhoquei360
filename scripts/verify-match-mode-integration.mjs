// Local cross-PR integration, never production. Caller supplies reviewed local SQL.
import {spawn} from 'node:child_process';import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import path from 'node:path';
const migrations=process.argv.slice(2);if(!migrations.length)throw Error('Supply the local server migration path; no SQL is fetched automatically.');
const server=spawn(process.execPath,['tests/helpers/stats-server.mjs'],{cwd:process.cwd(),env:{...process.env,MATCH_MODE_SERVER_MIGRATION:JSON.stringify(migrations.map(p=>path.resolve(p)))},stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4173/health')).ok)break;}catch{}if(server.exitCode!==null)throw Error(output);await new Promise(r=>setTimeout(r,100));if(i===99)throw Error('Local server unavailable: '+output);}
 const api=async p=>(await fetch('http://127.0.0.1:4173'+p)).json();
 await api('/__test/reset');await api('/__test/rfep-vic');const {id}=await api('/__test/mode-future');assert.ok(id);
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_BUNDLED?undefined:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const uid='40000000-0000-4000-8000-000000000006';
 const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:4070908800})).toString('base64url')+'.local-test-only';
 await context.addInitScript(({token,uid})=>localStorage.setItem('sb-oevprbchlhyglhvopnvy-auth-token',JSON.stringify({access_token:token,refresh_token:'FICTITIOUS',expires_at:4070908800,user:{id:uid}})),{token,uid});
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:path.resolve('node_modules/@supabase/supabase-js/dist/umd/supabase.js'),contentType:'text/javascript'}));
 await context.route('https://oevprbchlhyglhvopnvy.supabase.co/**',async r=>{const u=new URL(r.request().url());const response=await r.fetch({url:'http://127.0.0.1:4173/api'+u.pathname+u.search});await r.fulfill({response});});
 await context.routeWebSocket(/supabase\.co/,()=>{});
 await context.route(/https:\/\/(?:www\.)?sidgad\./,r=>r.fulfill({body:'',status:200}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/clubhoquei360/partit-consulta.html?catalogue='+id+'&mode=advanced');
 await page.locator('#activateMatch').waitFor({state:'visible',timeout:10000}).catch(async()=>{throw Error(await page.locator('#previewStatus').textContent());});assert.equal((await api('/__test/mode-counts')).contexts,0);
 await page.locator('#activateMatch').click();await page.waitForURL('**/avancat.html?match='+id);
 await page.locator('#openTeamRecording').waitFor({state:'visible'});await page.locator('#openTeamRecording').click();await page.locator('#statsOwnStart').click();
 await page.locator('#statsPlay').click();await page.locator('[data-stats-action=pass_complete]').click();await page.locator('#statsPlay').click();
 for(let i=0;i<50&&(await api('/__test/mode-counts')).events!==1;i++)await new Promise(r=>setTimeout(r,100));
 const after=await api('/__test/mode-counts');assert.equal(after.contexts,1);assert.equal(after.members,1);assert.equal(after.events,1);assert.equal(after.official,0);
 await page.reload();await page.locator('#statsContent').waitFor({state:'visible'});assert.equal((await api('/__test/mode-counts')).events,1);assert.deepEqual(errors,[]);
 await page.screenshot({path:'work/match-mode-integration-future.png',fullPage:true});
 console.log(JSON.stringify({result:'PASS',environment:'local PostgreSQL/PGlite + Chromium, fictitious accounts',scenario:'RFEP senior future -> read-only preview -> explicit activation -> live team statistics -> reload',counts:after,productionWrites:0}));
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
