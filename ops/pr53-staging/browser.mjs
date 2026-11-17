import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';import {work,secrets} from './runtime.mjs';import {assertLocalStaging} from './safety.mjs';
assertLocalStaging(secrets);
const accounts=JSON.parse(fs.readFileSync(path.join(work,'accounts-private.json'))),f=JSON.parse(fs.readFileSync(path.join(work,'fixture.json'))),caseFixture=JSON.parse(fs.readFileSync(path.join(work,'browser-fixture.json')));
const temp=fs.mkdtempSync('/dev/shm/c53-');fs.chmodSync(temp,0o700);process.env.TMPDIR=temp;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],contexts=[];let whatsappAttempts=[];
const url=(match,team)=>'http://127.0.0.1:57380/clubhoquei360/dashboard.html?'+new URLSearchParams({vista:'convocatories',partit:match,equip:team});
async function pageFor(role,match,team,width=1280){
 const context=await browser.newContext({viewport:{width,height:950},permissions:['clipboard-read','clipboard-write']});contexts.push(context);
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname==='wa.me'){whatsappAttempts.push(u.href);return route.abort();}return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto(url(match,team));await page.locator('#authEmail').fill(accounts[role].email);await page.locator('#authPassword').fill(accounts[role].password);await page.locator('#authSubmit').click();
 await page.waitForFunction(()=>document.getElementById('authState').textContent.includes('Sessió iniciada'));
 return page;
}
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS:',name);}
let coordinator,delegate;
try{
 await check('real coordinator reviews FEM11 suggestion, saves draft, reloads and publishes',async()=>{
  const t=f.teams[2];coordinator=await pageFor('coordinator',t.future,t.id);
  await coordinator.waitForSelector('#editor');coordinator.on('dialog',dialog=>dialog.accept());
  if(await coordinator.locator('[data-adopt]').count())await coordinator.locator('[data-adopt]').first().click();await coordinator.waitForFunction(()=>document.querySelectorAll('#editor input[type=checkbox]').length>=1);
  await coordinator.locator('#selectAll').click();if(await coordinator.locator('#saveDraft').count()){await coordinator.locator('#saveDraft').click();await coordinator.waitForFunction(()=>document.getElementById('workspaceStatus')?.textContent==='Esborrany desat.');}
  await coordinator.reload();await coordinator.waitForFunction(()=>document.querySelector('#editor input[type=checkbox]')?.checked);
  await coordinator.locator('#reviewPublication').click();await coordinator.locator('#publication button[value=publish]').click();await coordinator.waitForFunction(()=>document.getElementById('workspaceStatus')?.textContent==='Convocatòria publicada.');
 });
 await check('real coordinator modifies FEM15 and publishes a new version',async()=>{
  await coordinator.goto(url(caseFixture.match,caseFixture.team));await coordinator.getByLabel('Entrenadors assignats').fill('Tècnic navegador FICTICI '+Date.now());
  await coordinator.locator('#reviewPublication').click();await coordinator.locator('#publication button[value=publish]').click();await coordinator.waitForFunction(()=>document.getElementById('workspaceStatus')?.textContent==='Convocatòria publicada.');
 });
 await check('real delegate acknowledges, reloads and copies actual clipboard on mobile',async()=>{
  delegate=await pageFor('delegate',caseFixture.match,caseFixture.team,390);
  await delegate.getByRole('button',{name:'He llegit la convocatòria',exact:true}).click();await delegate.waitForFunction(()=>document.getElementById('callupWorkflow')?.textContent.includes('Llegida pel delegat'));
  await delegate.reload();await delegate.waitForFunction(()=>document.getElementById('callupWorkflow')?.textContent.includes('Llegida pel delegat'));
  await delegate.getByLabel('Competició',{exact:true}).fill('FEM15 FICTICI');await delegate.getByRole('button',{name:'Actualitza la previsualització',exact:true}).click();
  const text=await delegate.locator('[data-message]').inputValue();assert.ok(text.startsWith('‼️ CONVOCATÒRIA'));assert.ok(text.endsWith('EQUIP I FORÇA!!🔴🔵💪🤟'));assert.ok(!text.includes('Jugador FICTICI'));
  await delegate.getByRole('button',{name:'Copiar i obrir WhatsApp',exact:true}).click();await delegate.waitForFunction(()=>document.querySelector('[data-copy-status]').textContent.startsWith('Text copiat'));
  await delegate.bringToFront();assert.equal(await delegate.evaluate(()=>navigator.clipboard.readText()),text);
  await new Promise(r=>setTimeout(r,200));assert.ok(whatsappAttempts.some(u=>u==='https://wa.me/?text='+encodeURIComponent(text)));
  assert.equal(await delegate.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await delegate.screenshot({path:path.join(work,'auth-real-mobile.png'),fullPage:true});
 });
 await check('publication after reading is pending again; desktop has no overflow',async()=>{
  await coordinator.getByLabel('Entrenadors assignats').fill('Tècnic FICTICI revisat després de lectura');await coordinator.locator('#reviewPublication').click();await coordinator.locator('#publication button[value=publish]').click();await coordinator.waitForFunction(()=>document.getElementById('workspaceStatus')?.textContent==='Convocatòria publicada.');
  await delegate.setViewportSize({width:1280,height:950});await delegate.reload();await delegate.waitForFunction(()=>document.getElementById('callupWorkflow')?.textContent.includes('Pendent de lectura'));
  assert.equal(await delegate.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await delegate.screenshot({path:path.join(work,'auth-real-desktop.png'),fullPage:true});
 });
 await check('real coach is read-only and denied an unassigned team',async()=>{
  const coach=await pageFor('coach',caseFixture.match,caseFixture.team);await coach.waitForSelector('[data-message]');assert.equal(await coach.locator('#editor').count(),0);
  await coach.goto(url(f.teams[2].future,f.teams[2].id));await coach.waitForFunction(()=>document.getElementById('workspaceStatus')?.textContent.includes('access')||document.getElementById('workspaceStatus')?.textContent.includes('accés'));
  assert.equal(await coach.locator('#detail').isVisible(),false);
 });
 await check('real foreign-club account denied the own-club match',async()=>{
  const foreign=await pageFor('otherclub',caseFixture.match,caseFixture.team);await foreign.waitForFunction(()=>document.getElementById('workspaceStatus')?.textContent.includes('access')||document.getElementById('workspaceStatus')?.textContent.includes('accés'));
  assert.equal(await foreign.locator('#detail').isVisible(),false);
 });
 fs.writeFileSync(path.join(work,'browser-results.json'),JSON.stringify({auth:'real GoTrue sessions; no RPC mocks',checks:results,whatsapp:'real browser popup attempted; external navigation aborted to prevent any send',clipboard:'actual Chromium clipboard',production_requests:0},null,2),{mode:0o600});
}finally{for(const c of contexts)await c.close();await browser.close();fs.rmSync(temp,{recursive:true});}
