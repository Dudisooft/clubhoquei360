import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs';
const origin=process.env.CLUB_URL||'http://127.0.0.1:4191';
const b=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await b.newPage({viewport:{width:1360,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');await page.locator('#season option').nth(1).waitFor({state:'attached'});
 for(const id of ['season','competition','team','fixture','navigationMode'])assert.equal(await page.locator('#'+id).inputValue(),'');
 await page.selectOption('#season',{label:'2026/27'});
 for(const [comp,team] of [['FEM 11','IGUALADA HC'],['FEM 15','Igualada HC'],['INFANTIL OR','IGUALADA HC D'],['JÚNIOR OR','IGUALADA HC A'],['RFEP · OK LIGA PLATA SUR','SIMAR']]){
  const options=await page.locator('#competition option').evaluateAll(els=>els.map(e=>({value:e.value,text:e.textContent})));
  const c=options.find(o=>o.text.toUpperCase().includes(comp));assert.ok(c,comp);await page.selectOption('#competition',c.value);
  const ts=await page.locator('#team option').evaluateAll(els=>els.map(e=>({value:e.value,text:e.textContent})));
  const t=ts.find(o=>o.text.includes(team));assert.ok(t,team);await page.selectOption('#team',t.value);
  console.log('SELECTOR PASS',comp,team,'fixtures',await page.locator('#fixture option').count()-1);
 }
 const fixtures=await page.locator('#fixture option').evaluateAll(els=>els.map(e=>({value:e.value,text:e.textContent})));
 const vic=fixtures.find(o=>o.text.includes('VIC')&&o.text.includes('SIMAR'));assert.ok(vic);await page.selectOption('#fixture',vic.value);
 await page.waitForFunction(()=>document.querySelector('#selectionStatus').textContent!=='Verificant modes i permisos al servidor…');
 await page.selectOption('#navigationMode','base');assert.match(await page.locator('#openMatch').getAttribute('href'),/base.html\?match=/);
 await page.screenshot({path:'work/club-selector.png',fullPage:true});
 await page.goto(origin+'/club.html');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('36 equips'));assert.equal(await page.locator('#teams article').count(),36);await page.screenshot({path:'work/club-catalogue.png',fullPage:true});
 const session=await fetch(origin+'/api/local-session',{method:'POST',body:'{}'}).then(r=>r.json()),headers={authorization:'Bearer '+session.access_token,'content-type':'application/json'};
 const health=await fetch(origin+'/health').then(r=>r.json());
 const roster=await fetch(origin+'/api/rest/v1/pilot_players?match_id=eq.'+health.ids.vic,{headers}).then(r=>r.json());assert.equal(roster.filter(p=>p.team==='home').length,10);assert.equal(roster.filter(p=>p.team==='away').length,10);
 const denied=await fetch(origin+'/api/rest/v1/teams',{method:'POST',headers,body:'{}'});assert.equal(denied.status,403);
 const outsider=await fetch(origin+'/api/rest/v1/rpc/match_mode_access',{method:'POST',headers,body:JSON.stringify({p_catalogue:'00000000-0000-0000-0000-000000000000'})}).then(r=>r.json());assert.equal(outsider.read,false);
 const evidence=await fetch(origin+'/evidence').then(r=>r.json());assert.equal(evidence.officialUnchanged,true);
 await page.goto(origin+'/vic');await page.waitForTimeout(1200);assert.match(await page.locator('body').innerText(),/VIC/i);await page.screenshot({path:'work/club-vic.png',fullPage:true});
 assert.deepEqual(errors,[]);fs.writeFileSync('work/club-browser-evidence.json',JSON.stringify({at:new Date().toISOString(),health,evidence,cases:['FEM11','FEM15','Infantil D','Júnior A','SIMAR'],pageErrors:errors},null,2));console.log('PASS catalogue, selectors, Vic 10+10, official integrity and local permission boundaries');
}finally{await b.close();}
