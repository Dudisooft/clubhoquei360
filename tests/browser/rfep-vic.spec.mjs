import {test,expect} from '@playwright/test';import path from 'node:path';import {ID} from '../helpers/stats-db.mjs';
const endpoint='https://oevprbchlhyglhvopnvy.supabase.co',vic='18fa0a6e-e5c6-487e-8315-5bc371e22cb1';
async function setup(context){
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:path.resolve('node_modules/@supabase/supabase-js/dist/umd/supabase.js'),contentType:'text/javascript'}));
 await context.route(endpoint+'/**',async r=>{const url=new URL(r.request().url());const response=await r.fetch({url:'http://127.0.0.1:4173/api'+url.pathname+url.search});await r.fulfill({response});});
 await context.routeWebSocket(/supabase\.co/,socket=>{});
 const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:ID.manager,aud:'authenticated',role:'authenticated',exp:4070908800})).toString('base64url')+'.local-test-only';
 await context.addInitScript(({token,id})=>localStorage.setItem('sb-oevprbchlhyglhvopnvy-auth-token',JSON.stringify({access_token:token,refresh_token:'local-fixture',expires_in:3600,expires_at:4070908800,token_type:'bearer',user:{id,email:'manager@example.test',app_metadata:{},user_metadata:{},aud:'authenticated',role:'authenticated'}})),{token,id:ID.manager});
}
const snapshot=async request=>(await request.get('/__test/snapshot')).json();
test.beforeEach(async({request})=>{await request.get('/__test/reset');await request.get('/__test/rfep-vic');});
test('RFEP selector opens calendar-linked existing fixture, records live team statistics and survives reload',async({page,context,request})=>{
 await setup(context);const errors=[];page.on('pageerror',e=>errors.push(e.message));const before=await snapshot(request);
 await page.goto('/clubhoquei360/avancat.html?match='+ID.match);await expect(page.locator('#federationCompetition')).toHaveValue('FECAPA:4802');await expect(page.locator('#federationStatus')).toContainText('FECAPA');
 await page.locator('#federationCompetition').selectOption('RFEP:3575');await expect(page.locator('#federationMatch')).toHaveValue(vic);await expect(page.locator('#federationMatch option[value="'+vic+'"]')).toHaveCount(1);await expect(page.locator('#federationMatch option[value="'+vic+'"]')).toContainText('20:30');
 await expect(page.locator('#federationStatus')).toContainText('alineacions del partit pendents');await expect(page.locator('#profile')).toHaveValue('stats');await expect(page.locator('#statsIdentity')).toContainText('Vic');await expect(page.locator('#statsOwnStart')).toBeVisible();await page.locator('#statsOwnStart').click();await expect(page.locator('#statsMessage')).toContainText('Registre propi activat');
 await page.locator('#statsMode').selectOption('live');await page.locator('#statsPlay').click();await page.locator('[data-stats-action=pass_complete]').click();await page.locator('#statsCategory').selectOption('shot');await page.locator('[data-stats-action=shot_target]').click();await page.locator('#statsCategory').selectOption('goal');await page.locator('[data-stats-action=goal]').click();await page.locator('#statsPlay').click();
 await expect.poll(async()=>((await snapshot(request)).events.filter(e=>e.match_id===vic).length)).toBe(3);await page.reload();await expect(page.locator('#statsContent')).toBeVisible();await expect(page.locator('#statsMode')).toHaveValue('live');
 const after=await snapshot(request);expect(after.events.filter(e=>e.match_id===vic).every(e=>e.origin==='live')).toBe(true);expect(after.official).toEqual(before.official);expect(after.clock).toEqual(before.clock);expect(after.authUsers).toBe(before.authUsers);expect(errors).toEqual([]);
});
test('pending report stays explicit on mobile with no invented roster or horizontal overflow',async({page,context})=>{
 await setup(context);await page.setViewportSize({width:390,height:844});await page.goto('/clubhoquei360/avancat.html?match='+vic);
 await expect(page.locator('#statsOwnStart')).toBeVisible();await expect(page.locator('#federationPending')).toContainText('1 partit');await expect(page.locator('#federationMatch option[value^="pending:"]')).toHaveAttribute('disabled','');await expect(page.locator('#syncFederation')).toBeDisabled();await expect(page.locator('#profile')).toHaveValue('stats');
 await page.locator('#statsOwnStart').click();await page.locator('#statsScope').selectOption('player');await expect(page.locator('#statsPlayers [data-stats-player]')).toHaveCount(0);await expect(page.locator('#statsSelection')).toContainText('jugador');
 await expect(page.locator('#ch360-base-sync')).toBeHidden();expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}))).toEqual({width:390,viewport:390});await page.screenshot({path:'work/rfep-vic-mobile.png',fullPage:true});
});
