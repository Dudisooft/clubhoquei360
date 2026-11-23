import {test,expect} from '@playwright/test';

test('legacy call-up links preserve team and fixture in the shared dashboard',async({page})=>{
 await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({body:''}));
 await page.route('**/app-client.js',route=>route.fulfill({
  contentType:'text/javascript',
  body:'export const db={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}};'
 }));
 await page.goto('/clubhoquei360/convocatoria.html?team=team-a&catalogue=fixture-a');
 await expect(page).toHaveURL(/dashboard\.html\?vista=convocatories&equip=team-a&partit=fixture-a$/);
});
