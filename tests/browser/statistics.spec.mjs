import {test,expect} from '@playwright/test';
import {ID} from '../helpers/stats-db.mjs';
import path from 'node:path';
const endpoint='https://oevprbchlhyglhvopnvy.supabase.co';
function session(user){const id=ID[user],token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:4070908800})).toString('base64url')+'.local-test-only';return {access_token:token,refresh_token:'local-fixture',expires_in:3600,expires_at:4070908800,token_type:'bearer',user:{id,email:user+'@example.test',app_metadata:{},user_metadata:{},aud:'authenticated',role:'authenticated'}};}
async function setup(context,user='principal',connection={}){
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:path.resolve('node_modules/@supabase/supabase-js/dist/umd/supabase.js'),contentType:'text/javascript'}));
 await context.route(endpoint+'/**',async r=>{const url=new URL(r.request().url());if(connection.failWrites&&url.pathname.includes('/rpc/stats_write_event'))return r.abort('failed');const response=await r.fetch({url:'http://127.0.0.1:4173/api'+url.pathname+url.search});await r.fulfill({response});});
 await context.route(/https:\/\/(?:www\.)?(?:sidgad\.cloud|sidgad\.es)\//,r=>r.fulfill({body:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text y="25">TEST</text></svg>',contentType:'image/svg+xml'}));
 await context.routeWebSocket(/supabase\.co/,()=>{});
 if(user)await context.addInitScript(data=>{if(!localStorage.getItem('sb-oevprbchlhyglhvopnvy-auth-token'))localStorage.setItem('sb-oevprbchlhyglhvopnvy-auth-token',JSON.stringify(data));},session(user));
}
async function open(page){await page.goto('/clubhoquei360/avancat.html?match='+ID.match+'&view=stats');await expect(page.locator('#statsContent')).toBeVisible();await expect(page.locator('#statsMessage')).toContainText('Estadístiques connectades');}
async function snapshot(request){return (await request.get('/__test/snapshot')).json();}
test.beforeEach(async({request})=>{await request.get('/__test/reset');});
test('FEM15 fictici: clocks, both input paths, correction, undo, recovery, reports and official isolation',async({page,context,request})=>{
 await setup(context);const errors=[];page.on('pageerror',e=>errors.push(e.message));const before=await snapshot(request);await open(page);
 await page.locator('#statsPlay').click();await expect(page.locator('#statsPlay')).toContainText('Pausa');await expect.poll(()=>page.locator('#statsClock').textContent()).not.toBe('00:00');
 await page.locator('#statsPlay').click();await expect(page.locator('#statsPlay')).toContainText('Inicia');const paused=await page.locator('#statsClock').textContent();await page.waitForTimeout(350);expect(await page.locator('#statsClock').textContent()).toBe(paused);
 await page.locator('#statsPlay').click();await expect(page.locator('#statsPlay')).toContainText('Pausa');await page.locator('#statsPlay').click();
 await page.locator('[data-stats-action=pass_complete]').click();await expect(page.locator('#statsSync')).toHaveText('Accions confirmades al servidor');
 await page.locator('#statsCategory').selectOption('shot');await page.locator('[data-stats-action=shot_target]').click();
 await page.locator('#statsCategory').selectOption('goal');await page.locator('[data-stats-action=goal]').click();
 await page.locator('#statsScope').selectOption('player');await page.locator('#statsCategory').selectOption('recovery');await page.locator('[data-stats-player="'+ID.player+'"]').click();await page.locator('[data-stats-action=recovery]').click();
 await page.locator('#statsOrder').selectOption('action_first');await page.locator('#statsCategory').selectOption('loss');await page.locator('[data-stats-action=loss]').click();await expect(page.locator('#statsSelection')).toContainText('toca un jugador');await page.locator('[data-stats-player="'+ID.player+'"]').click();
 await expect.poll(async()=>((await snapshot(request)).events.filter(e=>e.action==='loss').length)).toBe(1);
 const pass=(await snapshot(request)).events.find(e=>e.action==='pass_complete');await page.locator('[data-stats-edit="'+pass.id+'"]').click();await page.locator('#statsEditAction').selectOption('pass_failed');await page.locator('#statsEditPlayer').selectOption(ID.player);await page.locator('#statsEditForm button[type=submit]').click();
 await expect.poll(async()=>((await snapshot(request)).events.find(e=>e.id===pass.id).revision)).toBe(2);
 await page.locator('#statsUndo').click();await expect.poll(async()=>((await snapshot(request)).events.find(e=>e.id===pass.id).validation)).toBe('void');await page.locator('#statsShowVoided').check();await page.locator('[data-stats-restore="'+pass.id+'"]').click();await expect.poll(async()=>((await snapshot(request)).events.find(e=>e.id===pass.id).validation)).toBe('recorded');
 await page.locator('#statsTime').fill('02:15');await page.locator('#statsAdjust').click();await page.locator('#statsSave').click();await expect.poll(async()=>((await snapshot(request)).sessions[0]?.state.ms)).toBe(135000);
 await page.reload();await expect(page.locator('#statsClock')).toHaveText('02:15');await expect(page.locator('#statsPlay')).toContainText('Inicia');await expect(page.locator('#statsHistory')).toContainText('Recuperació');
 await page.locator('[data-stats-view=report]').click();await expect(page.locator('#statsTeamReport')).toContainText('Xuts totals');await expect(page.locator('#statsPlayerReport')).toContainText('Jugadora fictícia 3');
 const after=await snapshot(request);expect(after.official).toEqual(before.official);expect(after.clock).toEqual(before.clock);expect(errors).toEqual([]);
});
for(const [name,width,height] of [['mòbil',390,844],['tauleta',820,1180],['ordinador',1440,1000]])test('responsive '+name+' and no horizontal overflow',async({page,context})=>{
 await setup(context);await page.setViewportSize({width,height});await open(page);await page.locator('#statsRoot').scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const box=await page.locator('[data-stats-action=pass_complete]').boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);
 await page.screenshot({path:'work/statistics-'+name+'.png',fullPage:true});
});
test('legacy statistics URL preserves match and opens integrated module',async({page,context})=>{await setup(context);await page.goto('/clubhoquei360/estadistiques.html?match='+ID.match);await expect(page).toHaveURL(new RegExp('avancat.html.*view=stats'));await expect(page.locator('#statsRoot')).toBeVisible();await expect(page.locator('iframe')).toHaveCount(0);});
test('coach can consult, delegate has no automatic analysis access',async({browser,request})=>{
 for(const user of ['coach','delegate']){const context=await browser.newContext();await setup(context,user);const page=await context.newPage();await page.goto('/clubhoquei360/avancat.html?match='+ID.match+'&view=stats');if(user==='coach'){await expect(page.locator('#statsContent')).toBeVisible();await expect(page.locator('#statsReport')).toBeVisible();await expect(page.locator('[data-stats-view=record]')).toBeHidden();}else{await expect(page.locator('#statsMessage')).toContainText('No tens permisos');await expect(page.locator('#statsContent')).toBeHidden();}await context.close();}
});
test('explicit login form restores access without embedding credentials',async({page,context})=>{await setup(context,null);await page.goto('/clubhoquei360/dashboard.html');await page.locator('#authEmail').fill('principal@example.test');await page.locator('#authPassword').fill('FICTITIOUS-LOCAL-ONLY');await page.locator('#authSubmit').click();await expect(page.locator('#authState')).toContainText('Sessió iniciada');await expect(page.locator('#authForm')).toBeHidden();await expect(page.locator('#authPassword')).toHaveValue('');await page.locator('#authSignOut').click();await expect(page.locator('#authForm')).toBeVisible();});

test('club manager activates own match registration for eight hours without creating another account',async({page,context,request})=>{
 await setup(context,'manager');const before=await snapshot(request);await open(page);
 // An existing principal must be explicitly revoked, never silently replaced.
 await expect(page.locator('#statsOwnStart')).toBeHidden();await page.locator('[data-stats-view=access]').click();page.once('dialog',d=>d.accept());await page.locator('[data-stats-revoke]').first().click();
 await expect(page.locator('#statsOwnStart')).toBeVisible();await page.locator('#statsOwnStart').click();await expect(page.locator('#statsMessage')).toContainText('Registre propi activat');await expect(page.locator('#statsRecord')).toBeVisible();await expect(page.locator('#statsOwnStart')).toBeHidden();
 const assigned=(await snapshot(request)).assignments.find(a=>a.user_id===ID.manager&&a.role==='primary'&&!a.revoked_at);expect(assigned.match_id).toBe(ID.match);expect(assigned.sides).toEqual(['home','away','disputed']);expect(Date.parse(assigned.expires_at)-Date.now()).toBeGreaterThan(7.9*60*60*1000);expect(Date.parse(assigned.expires_at)-Date.now()).toBeLessThanOrEqual(8*60*60*1000);
 await page.locator('[data-stats-action=pass_complete]').click();await expect.poll(async()=>((await snapshot(request)).events.filter(e=>e.operator_id===ID.manager).length)).toBe(1);await page.reload();await expect(page.locator('#statsRecord')).toBeVisible();
 const after=await snapshot(request);expect(after.official).toEqual(before.official);expect(after.clock).toEqual(before.clock);expect(after.authUsers).toBe(before.authUsers);
});

test('temporary external operator and coach share actual persisted observations; other teams and revoked access are denied',async({browser,page,context,request})=>{
 await setup(context);await open(page);await page.locator('[data-stats-view=access]').click();await page.locator('#statsGrantUser').fill(ID.external);await page.locator('#statsGrantExpiry').fill('2099-01-01T12:00');await page.locator('[name=grantCategory][value=pass]').check();await page.locator('#statsGrantSide').selectOption('home');await page.locator('#statsGrantForm button[type=submit]').click();await expect(page.locator('#statsMessage')).toContainText('Assignació temporal desada');
 const externalContext=await browser.newContext();await setup(externalContext,'external');const ext=await externalContext.newPage();await open(ext);await expect(ext.locator('#federationMatch option')).toHaveCount(1);await ext.locator('[data-stats-action=pass_complete]').click();await expect.poll(async()=>((await snapshot(request)).events.filter(e=>e.operator_id===ID.external).length)).toBe(1);
 await ext.locator('#statsCategory').selectOption('shot');await expect(ext.locator('[data-stats-action=shot_target]')).toBeDisabled();
 const coachContext=await browser.newContext();await setup(coachContext,'coach');const coach=await coachContext.newPage();await open(coach);await expect(coach.locator('#statsTeamReport tr').filter({hasText:'Passades totals'})).toContainText('1');
 await ext.goto('/clubhoquei360/avancat.html?match='+ID.otherMatch+'&view=stats');await expect(ext.locator('#federationStatus')).toContainText('No tens accés al partit');await expect(ext.locator('#statsContent')).toBeHidden();
 const assignment=await page.locator('[data-stats-revoke]').first().getAttribute('data-stats-revoke');page.once('dialog',d=>d.accept());await page.locator('[data-stats-revoke="'+assignment+'"]').click();await ext.goto('/clubhoquei360/avancat.html?match='+ID.match+'&view=stats');await expect(ext.locator('#statsContent')).toBeHidden();await expect(ext.locator('#federationStatus')).toContainText('No tens accés');
 await externalContext.close();await coachContext.close();
});
test('offline outbox survives reload and reconnect confirms one action',async({page,context,request})=>{
 const connection={failWrites:true};await setup(context,'principal',connection);await open(page);await page.locator('[data-stats-action=pass_complete]').click();await expect(page.locator('#statsSync')).toContainText('1 accions pendents');await page.reload();await expect(page.locator('#statsSync')).toContainText('1 accions pendents');expect((await snapshot(request)).events.length).toBe(0);connection.failWrites=false;await page.locator('#statsRetry').click();await expect(page.locator('#statsSync')).toHaveText('Accions confirmades al servidor');expect((await snapshot(request)).events.length).toBe(1);
});
test('possession, explicit zero coverage, evolution and exports use observed data',async({page,context,request})=>{
 await setup(context);await open(page);await page.locator('#statsPlay').click();await page.locator('[data-possession=home]').click();await page.waitForTimeout(1200);await page.locator('#statsPlay').click();await expect.poll(async()=>((await snapshot(request)).events.filter(e=>e.action==='possession').length)).toBe(1);await page.locator('#statsTime').fill('00:00');await page.locator('#statsAdjust').click();expect((await snapshot(request)).events.filter(e=>e.action==='possession').length).toBe(1);
 await page.locator('[data-stats-view=report]').click();const row=page.locator('#statsTeamReport tr').filter({hasText:'Passades totals'});await expect(row).toContainText('No registrat');page.once('dialog',d=>d.accept());await page.locator('#statsCoverageComplete').click();await expect(row).toContainText('0');
 await page.locator('[data-stats-view=evolution]').click();await page.locator('#statsLoadEvolution').click();await expect(page.locator('#statsMessage')).toContainText('Comparatives carregades');await page.locator('#statsEvolutionTeam').selectOption(ID.team);await expect(page.locator('#statsEvolutionReport')).toContainText('PROVA FICTÍCIA');
 const [csvFile]=await Promise.all([page.waitForEvent('download'),page.locator('#statsExport').click()]);expect(csvFile.suggestedFilename()).toContain('.csv');
 const [jsonFile]=await Promise.all([page.waitForEvent('download'),page.locator('#statsExportJson').click()]);expect(jsonFile.suggestedFilename()).toContain('.json');
});
test('an interrupted possession interval recovers once with paused analysis clock',async({page,context,request})=>{
 await setup(context);await open(page);await page.locator('#statsPlay').click();await page.locator('[data-possession=home]').click();await page.waitForTimeout(700);await page.reload();await expect(page.locator('#statsPlay')).toContainText('Inicia');await expect.poll(async()=>((await snapshot(request)).events.filter(e=>e.action==='possession').length)).toBe(1);await page.reload();await expect(page.locator('#statsContent')).toBeVisible();expect((await snapshot(request)).events.filter(e=>e.action==='possession').length).toBe(1);
});
test('two devices cannot silently overwrite a shared operator clock; local copy can be recovered explicitly',async({page,context,request})=>{
 await setup(context);await open(page);const second=await context.newPage();await open(second);await page.locator('#statsTime').fill('01:00');await page.locator('#statsAdjust').click();await expect.poll(async()=>((await snapshot(request)).sessions[0]?.state.ms)).toBe(60000);
 await second.locator('#statsTime').fill('02:00');await second.locator('#statsAdjust').click();await expect(second.locator('#statsMessage')).toContainText('Un altre dispositiu');await expect(second.locator('#statsRestore')).toBeVisible();expect((await snapshot(request)).sessions[0].state.ms).toBe(60000);second.once('dialog',d=>d.accept());await second.locator('#statsRestore').click();await expect.poll(async()=>((await snapshot(request)).sessions[0].state.ms)).toBe(120000);await expect(second.locator('#statsPlay')).toContainText('Inicia');
});
