import {test,expect} from '@playwright/test';import path from 'node:path';import {ID} from '../helpers/stats-db.mjs';
const endpoint='https://oevprbchlhyglhvopnvy.supabase.co',vic='18fa0a6e-e5c6-487e-8315-5bc371e22cb1';
async function setup(context,user='manager'){
 const uid=ID[user];
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:path.resolve('node_modules/@supabase/supabase-js/dist/umd/supabase.js'),contentType:'text/javascript'}));
 await context.route(endpoint+'/**',async r=>{const url=new URL(r.request().url());const response=await r.fetch({url:'http://127.0.0.1:4173/api'+url.pathname+url.search});await r.fulfill({response});});
 await context.routeWebSocket(/supabase\.co/,socket=>{});
 const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',exp:4070908800})).toString('base64url')+'.local-test-only';
 await context.addInitScript(({token,id})=>localStorage.setItem('sb-oevprbchlhyglhvopnvy-auth-token',JSON.stringify({access_token:token,refresh_token:'local-fixture',expires_in:3600,expires_at:4070908800,token_type:'bearer',user:{id,email:'manager@example.test',app_metadata:{},user_metadata:{},aud:'authenticated',role:'authenticated'}})),{token,id:uid});
}
const snapshot=async request=>(await request.get('/__test/snapshot')).json();
test.beforeEach(async({request})=>{await request.get('/__test/reset');await request.get('/__test/rfep-vic');});
test('RFEP selector opens calendar-linked existing fixture, records live team statistics and survives reload',async({page,context,request})=>{
 await setup(context);const errors=[];page.on('pageerror',e=>errors.push(e.message));const before=await snapshot(request);
 await page.goto('/clubhoquei360/avancat.html?match='+ID.match);await expect(page.locator('#federationCompetition')).toHaveValue('FECAPA:4802');await expect(page.locator('#federationStatus')).toContainText('FECAPA');
 await page.locator('#federationCompetition').selectOption('RFEP:3575');await expect(page.locator('#federationMatch')).toHaveValue(vic);await expect(page.locator('#federationMatch option[value="'+vic+'"]')).toHaveCount(1);await expect(page.locator('#federationMatch option[value="'+vic+'"]')).toContainText('20:30');
 await expect(page.locator('#federationStatus')).toContainText('alineacions del partit pendents');await expect(page.locator('#profile')).toHaveValue('main');await page.locator('#profile').selectOption('stats');await expect(page.locator('#profile')).toHaveValue('stats');await expect(page.locator('#statsIdentity')).toContainText('Vic');await expect(page.locator('#statsOwnStart')).toBeVisible();await page.locator('#statsOwnStart').click();await expect(page.locator('#statsMessage')).toContainText('Registre propi activat');
 await page.locator('#statsMode').selectOption('live');await page.locator('#statsPlay').click();await page.locator('[data-stats-action=pass_complete]').click();await page.locator('#statsCategory').selectOption('shot');await page.locator('[data-stats-action=shot_target]').click();await page.locator('#statsCategory').selectOption('goal');await page.locator('[data-stats-action=goal]').click();await page.locator('#statsPlay').click();
 await expect.poll(async()=>((await snapshot(request)).events.filter(e=>e.match_id===vic).length)).toBe(3);await page.reload();await expect(page.locator('#statsContent')).toBeVisible();await expect(page.locator('#statsMode')).toHaveValue('live');
 const after=await snapshot(request);expect(after.events.filter(e=>e.match_id===vic).every(e=>e.origin==='live')).toBe(true);expect(after.official).toEqual(before.official);expect(after.clock).toEqual(before.clock);expect(after.authUsers).toBe(before.authUsers);expect(errors).toEqual([]);
});
test('pending report stays explicit on mobile with no invented roster or horizontal overflow',async({page,context})=>{
 await setup(context);await page.setViewportSize({width:390,height:844});await page.goto('/clubhoquei360/avancat.html?match='+vic+'&view=stats');
 await expect(page.locator('#statsOwnStart')).toBeVisible();await expect(page.locator('#federationPending')).toContainText('1 partit');await expect(page.locator('#federationMatch option[value^="pending:"]')).toHaveAttribute('disabled','');await expect(page.locator('#syncFederation')).toBeDisabled();await expect(page.locator('#profile')).toHaveValue('stats');
 await page.locator('#profile').selectOption('main');await expect(page.locator('#profile')).toHaveValue('main');await expect(page.locator('#play')).toBeDisabled();await page.locator('#profile').selectOption('stats');
 await page.locator('#statsOwnStart').click();await page.locator('#statsScope').selectOption('player');await expect(page.locator('#statsPlayers [data-stats-player]')).toHaveCount(0);await expect(page.locator('#statsSelection')).toContainText('jugador');
 await expect(page.locator('#ch360-base-sync')).toBeHidden();expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}))).toEqual({width:390,viewport:390});await page.screenshot({path:'work/rfep-vic-mobile.png',fullPage:true});
});
test('existing operator can open Principal from the statistics link and retain it after reload without official writes',async({page,context,request})=>{
 await setup(context);const before=await snapshot(request);let officialWrites=0;const errors=[];
 page.on('request',r=>{if(new URL(r.url()).pathname==='/rest/v1/rpc/pilot_save_operator_state')officialWrites++;});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/clubhoquei360/avancat.html?match='+vic+'&view=stats');await expect(page.locator('#statsContent')).toBeVisible();
 await page.locator('#profile').selectOption('main');await expect(page.locator('#profile')).toHaveValue('main');await expect(page.locator('#mainView')).toBeVisible();
 await expect(page.locator('#federationStatus')).toContainText('registre oficial');await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('#confirmStarters')).toBeDisabled();await expect(page.locator('#kitHomePlayer')).toBeEnabled();
 // Let the actual 800 ms operator autosave window elapse: opening this pending
 // view must not create a blank official snapshot or attempt its write RPC.
 await page.waitForTimeout(1100);await page.reload();await expect(page.locator('#profile')).toHaveValue('main');await expect(page.locator('#mainView')).toBeVisible();await page.waitForTimeout(1100);
 const after=await snapshot(request);expect(officialWrites).toBe(0);expect(after.clock).toEqual(before.clock);expect(after.official).toEqual(before.official);expect(after.events).toEqual(before.events);expect(errors).toEqual([]);
});

test('prepare real call-ups, select both starting fives, record official play and recover after reload',async({page,context,request})=>{
 await setup(context);const errors=[];page.on('pageerror',e=>errors.push(e.message));const before=await snapshot(request);
 await page.goto('/clubhoquei360/avancat.html?match='+vic);
 const home=page.locator('[data-roster-team=home]'),away=page.locator('[data-roster-team=away]');
 await expect(home).toContainText('5');await expect(page.locator('[data-starter]')).toHaveCount(0);
 await home.locator('details').first().locator('summary').click();await home.locator('[data-candidate]').evaluateAll(nodes=>nodes.forEach(n=>n.click()));
 await home.locator('[data-add-candidates]').click();await expect(page.locator('#starterGrid [data-starter]')).toHaveCount(5);
 for(let i=1;i<=5;i++){
  await away.locator('summary').filter({hasText:'Afegeix un jugador real'}).click();await away.locator('[data-manual-name]').fill('Rival FICTICI '+i);await away.locator('[data-manual-shirt]').fill(String(i));
  await away.locator('[data-manual-position]').selectOption(i===1?'goalkeeper':'field');await away.locator('[data-add-manual]').click();
  await expect(page.locator('#starterGrid [data-starter]')).toHaveCount(5+i);
 }
 for(const id of await page.locator('#starterGrid [data-starter]').evaluateAll(nodes=>nodes.map(n=>n.dataset.starter)))await page.locator('[data-starter="'+id+'"]').check();await page.locator('#kitHomePlayer').selectOption('second');
 // A provisional choice survives refresh without an official state or event.
 await page.reload();await expect(page.locator('#starterGrid [data-starter]:checked')).toHaveCount(10);await expect(page.locator('#kitHomePlayer')).toHaveValue('second');
 let current=await snapshot(request);expect(current.official).toEqual(before.official);expect(current.clock).toEqual(before.clock);
 await expect(page.locator('#confirmStarters')).toBeEnabled();await page.locator('#confirmStarters').click();await expect(page.locator('#play')).toBeEnabled();
 await expect(page.locator('#federationStatus')).toContainText('Cinc inicial confirmat');await page.locator('#play').click();await expect(page.locator('#play')).toContainText('Pausa');await expect(page.locator('#clock')).not.toHaveText('25:00');
 await page.locator('#play').click();await expect(page.locator('#play')).toContainText('Inicia');await page.locator('[data-goal-team=home][data-goal-delta="1"]').click();await expect(page.locator('#homeScore')).toHaveText('1');
 await expect.poll(async()=>((await snapshot(request)).official.filter(e=>e.match_id===vic&&e.event_type==='goal').length)).toBe(1);
 await expect.poll(async()=>((await snapshot(request)).clock.find(e=>e.match_id===vic)?.state.matchStarted)).toBe(true);
 await page.reload();await expect(page.locator('#homeScore')).toHaveText('1');await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#kitHomePlayer')).toHaveValue('second');
 const after=await snapshot(request),state=after.clock.find(r=>r.match_id===vic).state,official=after.official.filter(r=>r.match_id===vic);
 expect(state.players).toHaveLength(10);expect(state.players.filter(p=>p.on)).toHaveLength(10);expect(state.players.every(p=>/^[0-9a-f-]{36}$/i.test(p.id))).toBe(true);
 expect(official.filter(e=>e.event_type==='lineup')).toHaveLength(1);expect(official.every(e=>e.payload.details.origin==='operator_prepared')).toBe(true);expect(after.events).toEqual(before.events);expect(after.authUsers).toBe(before.authUsers);expect(errors).toEqual([]);
 for(const width of [390,820,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);}
});

test('a lost roster acknowledgement survives reload and retries the original mutation once',async({page,context,request})=>{
 await setup(context);let drop=true;const mutations=[];
 await page.route(endpoint+'/rest/v1/rpc/pilot_prepare_players',async route=>{
  mutations.push(route.request().postDataJSON().p_mutation);const response=await route.fetch({url:'http://127.0.0.1:4173/api/rest/v1/rpc/pilot_prepare_players'});
  if(drop){drop=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'ACK perdut · PROVA LOCAL'})});}else await route.fulfill({response});
 });
 await page.setViewportSize({width:390,height:844});await page.goto('/clubhoquei360/avancat.html?match='+vic);const home=page.locator('[data-roster-team=home]');
 await home.locator('details').first().locator('summary').click();await home.locator('[data-candidate]').evaluateAll(nodes=>nodes.forEach(n=>n.click()));await home.locator('[data-add-candidates]').click();
 await expect(page.locator('[data-roster-message]')).toContainText('ACK perdut');await page.reload();await expect(page.locator('#starterGrid [data-starter]')).toHaveCount(5);
 await page.locator('[data-roster-retry]').click();await expect(page.locator('[data-roster-message]')).toContainText('Convocats desats');expect(mutations).toHaveLength(2);expect(mutations[1]).toBe(mutations[0]);await expect(page.locator('#starterGrid [data-starter]')).toHaveCount(5);
 await home.locator('[data-edit-callups] summary').click();await home.locator('[data-edit-player]').first().locator('[data-position]').selectOption('field');await home.locator('[data-save-callups]').click();await expect(page.locator('[data-roster-message]')).toContainText('Convocats desats');await expect(page.locator('#starterGrid [data-starter]')).toHaveCount(5);
 expect((await snapshot(request)).official.filter(r=>r.match_id===vic)).toHaveLength(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.screenshot({path:'work/starting-five-mobile.png',fullPage:true});
});


test('visible Principal entry opens live team recording with zero call-ups and no official writes',async({page,context,request})=>{
 await setup(context);await page.setViewportSize({width:390,height:844});const before=await snapshot(request),errors=[];let officialWrites=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname==='/rest/v1/rpc/pilot_save_operator_state')officialWrites++;});
 await page.goto('/clubhoquei360/avancat.html?match='+vic);await expect(page.locator('#profile')).toHaveValue('main');await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('#starterGrid [data-starter]')).toHaveCount(0);
 await expect(page.locator('#teamRecordingEntry')).toBeVisible();await page.locator('#teamRecordingEntry').screenshot({path:'work/live-team-entry-cta.png'});await page.locator('#openTeamRecording').click();await expect(page.locator('#profile')).toHaveValue('stats');await expect(page.locator('#statsScope')).toHaveValue('team');await expect(page.locator('#statsMode')).toHaveValue('live');
 expect((await snapshot(request)).assignments).toEqual(before.assignments);await expect(page.locator('#statsPlay')).toBeDisabled();await page.locator('#statsOwnStart').click();await expect(page.locator('#statsPlay')).toBeEnabled();
 await page.locator('#statsPeriod').selectOption('2');await expect.poll(async()=>((await snapshot(request)).sessions.find(s=>s.match_id===vic)?.state.period)).toBe(2);
 await page.locator('#statsTime').fill('03:20');await page.locator('#statsAdjust').click();await expect(page.locator('#statsClock')).toHaveText('03:20');await expect.poll(async()=>((await snapshot(request)).sessions.find(s=>s.match_id===vic)?.state.ms)).toBe(200000);
 await page.locator('#statsPlay').click();await page.locator('[data-stats-action=pass_complete]').click();await expect.poll(async()=>((await snapshot(request)).events.filter(e=>e.match_id===vic).length)).toBe(1);await page.locator('#statsPlay').click();
 await page.reload();await expect(page.locator('#profile')).toHaveValue('stats');await expect(page.locator('#statsMode')).toHaveValue('live');await expect(page.locator('#statsPeriod')).toHaveValue('2');await expect(page.locator('#statsPlay')).toContainText('Inicia');
 const after=await snapshot(request),event=after.events.find(e=>e.match_id===vic);expect(event.player_id).toBeNull();expect(event.period).toBe(2);expect(event.match_ms).toBeGreaterThanOrEqual(200000);expect(event.origin).toBe('live');expect(after.official).toEqual(before.official);expect(after.clock).toEqual(before.clock);expect(after.authUsers).toBe(before.authUsers);expect(officialWrites).toBe(0);expect(errors).toEqual([]);
 // Opening this entry again must preserve a video analysis already saved.
 await page.locator('#statsMode').selectOption('video');await expect.poll(async()=>((await snapshot(request)).sessions.find(s=>s.match_id===vic)?.state.mode)).toBe('video');
 const saved=(await snapshot(request)).sessions.find(s=>s.match_id===vic).state;await page.locator('#profile').selectOption('main');await page.locator('#openTeamRecording').click();await expect(page.locator('#statsMode')).toHaveValue('video');await expect(page.locator('#statsPeriod')).toHaveValue(String(saved.period));expect(await page.locator('#statsClock').innerText()).not.toBe('00:00');expect(officialWrites).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.screenshot({path:'work/live-team-entry-mobile.png',fullPage:true});
});
test('official delegate without analysis access gets no team-recording entry or automatic statistical grant',async({page,context,request})=>{
 await setup(context,'delegate');const before=await snapshot(request);await page.goto('/clubhoquei360/avancat.html?match='+ID.match);await expect(page.locator('#profile')).toHaveValue('main');await expect(page.locator('#federationStatus')).toContainText('FECAPA');await expect(page.locator('#teamRecordingEntry')).toBeHidden();await expect(page.locator('#statsMessage')).toContainText('No tens permisos');expect((await snapshot(request)).assignments).toEqual(before.assignments);
});
