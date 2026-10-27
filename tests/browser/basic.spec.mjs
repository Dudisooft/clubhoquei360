import {test,expect} from '@playwright/test';
import path from 'node:path';
const fixtureId='20000000-0000-4000-8000-000000000001';
async function setup(page,query=''){
 await page.route('**/app-client.js',r=>r.fulfill({path:path.resolve('tests/helpers/basic-browser-client.js'),contentType:'text/javascript'}));
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('https://sidgad.cloud/**',r=>r.fulfill({body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path fill="#194b9b" d="M5 5h30v25L20 40 5 30z"/></svg>',contentType:'image/svg+xml'}));
 await page.goto('/clubhoquei360/base.html'+(query||'?match='+fixtureId));
 if(query.includes('practice=')||query.includes('catalogue=')){await expect(page.locator('#activateContext')).toBeVisible();await page.locator('#activateContext').click();}
 await expect(page.locator('#status')).toContainText('Preparant convocatòries');
}
async function prepare(page,ids=['p1','p2','a1','a2']){
 for(const id of ids){const input=page.locator(`[data-player="${id}"]`);if(!await input.isVisible()){const panel=await input.evaluate(el=>el.closest('[id^="reinforcements-"]').id);await page.locator(`[aria-controls="${panel}"]`).click();}await input.check();}
 await page.locator('#confirmRosters').click();
 await expect(page.locator('#recording')).toBeVisible();
}
async function incident(page,player,label){
 await page.locator('.player-row').filter({hasText:player}).click();
 await page.locator('#actionSheet').getByRole('button',{name:label,exact:true}).click();
 await expect(page.locator('#actionSheet')).not.toBeVisible();
}
async function stored(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('synthetic-basic-pilot_events')||'[]'));}

test('two-team preparation, tab navigation, shirts, original crests and one-handed action sheet',async({page})=>{
 await page.setViewportSize({width:390,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
 await page.screenshot({path:'work/base-preparation.png',fullPage:true});
 await expect(page.locator('#teamTabs')).toBeHidden();await expect(page.locator('#rosterGrid')).toContainText('Jugador visitant fictici');
 await expect(page.locator('#homeCrest')).toHaveAttribute('src',/252_1/);await expect(page.locator('#awayCrest')).toHaveAttribute('src',/318_1/);
 await prepare(page);await expect(page.locator('#teamList')).toContainText('Jugador local fictici');await expect(page.locator('#teamList')).not.toContainText('Jugador visitant');
 await expect(page.locator('#kitNotice')).toContainText('provisional');await expect(page.locator('[data-person=p1] .jersey')).toHaveText('7');
 await page.locator('#tabAway').click();await expect(page.locator('#teamList')).toContainText('Jugador visitant fictici');await expect(page.locator('#teamList')).not.toContainText('Jugador local');
 await page.locator('.player-row').filter({hasText:'Jugador visitant'}).click();await page.screenshot({path:'work/base-action-sheet.png'});await page.locator('#actionSheet [data-action=gol]').click();await expect(page.locator('#score')).toHaveText('0 – 1');
 await page.locator('#tabHome').click();await incident(page,'Jugador local','Gol');await expect(page.locator('#score')).toHaveText('1 – 1');
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'work/base-redesign-mobile.png',fullPage:true});
});

test('all player card types and both benches remain distinct and never increment the score',async({page})=>{
 await setup(page);await prepare(page);
 for(const label of ['Targeta groga','Targeta blava','Targeta vermella'])await incident(page,'Jugador local',label);
 await expect(page.locator('#score')).toHaveText('0 – 0');await expect(page.locator('#teamList')).toContainText('1 groga · 1 blava · 1 vermella');
 for(const side of ['Home','Away']){await page.locator('#tab'+side).click();await page.locator('#bench').click();await expect(page.locator('#actionSheet [data-action=gol]')).toBeHidden();await page.locator('#actionSheet [data-action=blava]').click();}
 const rows=await stored(page);expect(rows.filter(r=>r.payload?.details?.bench)).toHaveLength(2);expect(rows.filter(r=>r.payload?.details?.bench).map(r=>r.team).sort()).toEqual(['away','home']);
 await expect(page.locator('#score')).toHaveText('0 – 0');
});

test('verified reinforcement can be selected and imported once; unknown eligibility stays blocked',async({page})=>{
 await setup(page);await expect(page.locator('#rosterGrid')).not.toContainText('Altre infantil exclòs fictici');await expect(page.locator('[data-player="catalog:home:CP4"]')).toBeDisabled();
 await expect(page.locator('#rosterGrid')).toContainText('Elegibilitat de reforç no verificable');
 await prepare(page,['p1','a1','catalog:home:CP3']);await expect(page.locator('#teamList')).toContainText('Reforç verificat fictici');
 await incident(page,'Reforç verificat','Gol');await expect(page.locator('#score')).toHaveText('1 – 0');
 expect(await page.evaluate(()=>window.basicFixture.playerWrites)).toBe(1);
 await page.reload();await expect(page.locator('#recording')).toBeVisible();await expect(page.locator('#teamList')).toContainText('Reforç verificat fictici');
 await page.locator('#editRosters').click();await page.locator('#confirmRosters').click();expect(await page.evaluate(()=>window.basicFixture.playerWrites)).toBe(0);
});

test('later roster changes preserve player attribution, score and audit trail',async({page})=>{
 await setup(page);await prepare(page);await incident(page,'Jugador local','Gol');
 await page.locator('#editRosters').click();await page.locator('[data-player=p1]').uncheck();await page.locator('#confirmRosters').click();
 await expect(page.locator('#teamList')).not.toContainText('Jugador local fictici');await expect(page.locator('#score')).toHaveText('1 – 0');await expect(page.locator('#events')).toContainText('Jugador local fictici');
 await page.evaluate(()=>localStorage.setItem('synthetic-retired-player','p1'));await page.reload();await expect(page.locator('#score')).toHaveText('1 – 0');await expect(page.locator('#events')).toContainText('Jugador local fictici');
 await page.locator('#events [data-edit]').click();await page.locator('#actionSheet [data-action=blava]').click();await expect(page.locator('#score')).toHaveText('0 – 0');
 await expect(page.locator('#events')).toContainText('Blava');await expect(page.locator('#events')).toContainText('Jugador local fictici');await page.locator('#events [data-cancel]').click();await expect(page.locator('#events')).not.toContainText('Blava');
 const rows=await stored(page);expect(rows.filter(r=>r.event_type==='correction')).toHaveLength(2);expect(rows.filter(r=>r.payload?.kind==='gol')).toHaveLength(1);
});

test('offline queue survives reload, refuses premature finalization and retries without duplicates',async({page})=>{
 await setup(page);await prepare(page);await page.evaluate(()=>window.basicFixture.fail=true);await incident(page,'Jugador local','Gol');await expect(page.locator('#status')).toContainText('pendents');
 await page.locator('#finish').click();await expect(page.locator('#status')).toContainText('reconnecta abans de finalitzar');
 await page.reload();await expect(page.locator('#recording')).toBeVisible();await expect(page.locator('#score')).toHaveText('1 – 0');await expect(page.locator('#status')).toContainText('pendents');
 await page.locator('#retry').click();await expect(page.locator('#status')).toContainText('Dades confirmades al servidor');await page.locator('#retry').click();
 expect((await stored(page)).filter(r=>r.payload?.kind==='gol')).toHaveLength(1);
});

test('repeated action taps during network delay register one incident',async({page})=>{
 await setup(page);await prepare(page);await page.evaluate(()=>window.basicFixture.delay=150);
 await page.locator('[data-person=p1]').click();await page.locator('#actionSheet [data-action=gol]').evaluate(b=>{b.click();b.click();});
 await expect(page.locator('#status')).toContainText('Dades confirmades al servidor');expect((await stored(page)).filter(r=>r.payload?.kind==='gol')).toHaveLength(1);
});

test('manual FECAPA refresh, failure, summary for both teams, and local reopening',async({page})=>{
 await setup(page);await prepare(page);await incident(page,'Jugador local','Gol');await page.locator('#tabAway').click();await incident(page,'Jugador visitant','Targeta vermella');
 expect(await page.evaluate(()=>window.basicFixture.syncCalls)).toBe(0);await page.locator('#sync').click();await expect(page.locator('#federation')).toContainText('memòria cau');await expect(page.locator('#comparison')).toContainText('Diferència');
 await page.evaluate(()=>window.basicFixture.syncFail=true);await page.locator('#sync').click();await expect(page.locator('#federation')).toContainText('Consulta fallida');await expect(page.locator('#score')).toHaveText('1 – 0');
 await page.locator('#finish').click();await expect(page.locator('#finalSummary')).toBeVisible();await expect(page.locator('#playerSummary')).toContainText('Jugador local fictici');await expect(page.locator('#playerSummary')).toContainText('1 gol');await expect(page.locator('#playerSummary')).toContainText('1 vermella');await expect(page.locator('#benchSummary')).toContainText('Banqueta visitant');
 await expect(page.locator('#bench')).toBeDisabled();await expect(page.locator('#federation')).toContainText('no disponible');await page.locator('#reopen').click();await expect(page.locator('#bench')).toBeEnabled();
});

test('Salt rehearsal persists to a separate shared context and leaves the historical match untouched',async({page})=>{
 await setup(page,'?practice='+fixtureId);await expect(page.locator('#modeLabel')).toContainText('PROVA COMPARTIDA');await expect(page.locator('#comparison')).toContainText('8 – 0');
 await prepare(page,['CP1','CA1']);await incident(page,'Jugador local','Gol');await page.reload();await expect(page.locator('#score')).toHaveText('1 – 0');
 await page.locator('#sync').click();await expect(page.locator('#federation')).toContainText('no fa una extracció nova');await page.locator('#finish').click();await expect(page.locator('#finalSummary')).toBeVisible();
 const rows=await stored(page);expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.match_id==='20000000-0000-4000-8000-000000000009')).toBe(true);expect(rows.some(r=>r.match_id===fixtureId)).toBe(false);expect(await page.evaluate(()=>window.basicFixture.syncCalls)).toBe(0);
});
for(const [name,width,height] of [['mobile',390,844],['tablet',820,1180],['desktop',1440,1000]])test('responsive '+name+' without horizontal overflow or advanced controls',async({page})=>{
 await page.setViewportSize({width,height});await setup(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await prepare(page);
 const box=await page.locator('.player-row').first().boundingBox();expect(box.height).toBeGreaterThanOrEqual(60);await page.locator('.player-row').first().click();expect((await page.locator('[data-action=gol]').boundingBox()).height).toBeGreaterThanOrEqual(48);
 await page.locator('#closeSheet').click();expect(await page.locator('#clock,#statsRoot,[data-substitution]').count()).toBe(0);await page.screenshot({path:'work/base-redesign-'+name+'.png',fullPage:true});
});

test('Alpicat-like catalogue fixture opens without an acta code, keeps unknown opponents empty and blocks historical reinforcements',async({page})=>{
 const live='20000000-0000-4000-8000-000000000002';await setup(page,'?catalogue='+live);
 await expect(page.locator('#rosterGrid')).toContainText('No hi ha jugadors disponibles');await expect(page.locator('[data-player="catalog:home:CP3"]')).toBeDisabled();
 await prepare(page,['catalog:home:CP1']);await incident(page,'Jugador local','Gol');await expect(page.locator('#score')).toHaveText('1 – 0');
 await page.locator('#tabAway').click();await expect(page.locator('#teamList')).toContainText('Cap jugador convocat');await page.locator('#unidentifiedGoal').click();await expect(page.locator('#score')).toHaveText('1 – 1');
 await expect(page.locator('#federation')).toContainText('Estat de l’acta desconegut');await expect(page.locator('#comparison')).toContainText('No verificable');
 expect((await stored(page)).every(r=>r.match_id===live)).toBe(true);
});

test('saved out-of-scope infant selection requires review while keeping its goal',async({page})=>{
 await setup(page,'?catalogue=20000000-0000-4000-8000-000000000002');await prepare(page,['catalog:home:CP1']);await incident(page,'Jugador local','Gol');
 await page.evaluate(()=>localStorage.setItem('synthetic-retired-player','p1'));await page.reload();
 await expect(page.locator('#recording')).toBeVisible();await expect(page.locator('#status')).toContainText('preservada');await expect(page.locator('#score')).toHaveText('1 – 0');
 await page.locator('#editRosters').click();await page.locator('#confirmRosters').click();await expect(page.locator('#status')).toContainText('sense canvis');await page.locator('#editRosters').click();
 await page.locator('#rosterGrid input:checked').uncheck();await page.locator('#confirmRosters').click();await expect(page.locator('#recording')).toBeVisible();await expect(page.locator('#score')).toHaveText('1 – 0');
});

test('FEM11 mobile: own players first, no whole-club list, blocked lower candidates and selection survives reload',async({page})=>{await page.setViewportSize({width:390,height:844});await setup(page,'?match='+fixtureId+'&fixture=fem11');await expect(page.locator('#rosterGrid')).toContainText('Jugadors de l’equip');await expect(page.locator('#rosterGrid')).toContainText('Possibles reforços');await expect(page.locator('#rosterGrid')).not.toContainText('Mateixa categoria exclosa');await expect(page.locator('[data-player="catalog:home:CP4"]')).toBeDisabled();await page.locator('[data-reinforcements=home]').click();await expect(page.locator('#rosterGrid')).toContainText('any de naixement');await page.locator('[data-player=p1]').check();await page.locator('[data-player=p1]').uncheck();await expect(page.locator('[data-player=p1]')).not.toBeChecked();await prepare(page,['p1']);await page.reload();await page.locator('#editRosters').click();await expect(page.locator('[data-player=p1]')).toBeChecked();});


test('reinforcement disclosure supports touch, keyboard, multiple or no selections, collapse and persistence',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page,'?match='+fixtureId+'&fixture=reinforcement-toggle');
 const toggle=page.locator('[data-reinforcements=home]'),panel=page.locator('#reinforcements-home');
 await expect(toggle).toContainText('Possibles reforços (3)');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(panel).toBeHidden();
 expect((await toggle.boundingBox()).height).toBeGreaterThanOrEqual(48);await expect(page.locator('[data-player=p1]')).toBeVisible();
 await toggle.focus();await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(panel).toBeVisible();
 const first=page.locator('[data-player="catalog:home:CP3"]'),second=page.locator('[data-player="catalog:home:CP6"]');await first.check();await second.check();await expect(toggle).toContainText('2 seleccionats');
 await expect(page.locator('[data-player="catalog:home:CP4"]')).toBeDisabled();await page.locator('[data-reinforcements=away]').click();await expect(panel).toBeVisible();
 await toggle.click();await expect(panel).toBeHidden();await expect(toggle).toContainText('2 seleccionats');await toggle.click();await expect(first).toBeChecked();await expect(second).toBeChecked();
 await first.uncheck();await second.uncheck();await expect(toggle).not.toContainText('seleccionats');await first.check();await second.check();await toggle.click();await page.locator('[data-player=p1]').check();
 await page.locator('#confirmRosters').click();await expect(page.locator('#recording')).toBeVisible();await page.reload();await page.locator('#editRosters').click();
 await expect(panel).toBeHidden();await expect(toggle).toContainText('2 seleccionats');await toggle.click();await expect(panel.locator('input:checked')).toHaveCount(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'work/reinforcement-toggle-mobile.png',fullPage:true});
});

for(const legacy of [false,true])test('a saved historical reinforcement remains in the collapsed section when its current catalogue disappears; legacy='+legacy,async({page})=>{
 await setup(page);await prepare(page,['p1','catalog:home:CP3']);await incident(page,'Reforç verificat','Gol');
 if(legacy)await page.evaluate(()=>{const key='synthetic-basic-pilot_events',rows=JSON.parse(localStorage.getItem(key));for(const row of rows)for(const player of row.payload?.details?.players||[]){if(player.federation_player_id==='E3'){delete player.reinforcement;player.selection_basis=null;player.origin='Possible reforç · Equip fictici';}}localStorage.setItem(key,JSON.stringify(rows));});
 const before=await stored(page);await page.evaluate(()=>localStorage.setItem('synthetic-retired-reinforcement','CP3'));await page.reload();
 await expect(page.locator('#recording')).toBeVisible();await expect(page.locator('#score')).toHaveText('1 – 0');await page.locator('#editRosters').click();
 const toggle=page.locator('[data-reinforcements=home]');await expect(page.locator('#reinforcements-home')).toBeHidden();await expect(toggle).toContainText('1 seleccionat');await toggle.click();
 const checked=page.locator('#reinforcements-home input:checked');await expect(checked).toHaveCount(1);await expect(checked).toBeEnabled();
 await toggle.click();await page.locator('#confirmRosters').click();expect(await stored(page)).toEqual(before);await expect(page.locator('#events')).toContainText('Reforç verificat');
 await page.locator('#editRosters').click();await toggle.click();await checked.uncheck();await page.locator('#confirmRosters').click();await expect(page.locator('#score')).toHaveText('1 – 0');await expect(page.locator('#events')).toContainText('Reforç verificat');
});
