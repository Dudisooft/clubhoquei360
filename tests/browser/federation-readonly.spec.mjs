// Actual UI and Supabase SDK; Auth/official responses below are fictitious.
import {test,expect} from '@playwright/test';import {ID} from '../helpers/stats-db.mjs';import path from 'node:path';
const endpoint='https://oevprbchlhyglhvopnvy.supabase.co';
async function setup(context){
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:path.resolve('node_modules/@supabase/supabase-js/dist/umd/supabase.js'),contentType:'text/javascript'}));
 await context.route(endpoint+'/**',async r=>{const url=new URL(r.request().url());const response=await r.fetch({url:'http://127.0.0.1:4173/api'+url.pathname+url.search});await r.fulfill({response});});
 await context.routeWebSocket(/supabase\.co/,()=>{});
 const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:ID.principal,aud:'authenticated',role:'authenticated',exp:4070908800})).toString('base64url')+'.local-test-only';
 await context.addInitScript(data=>localStorage.setItem('sb-oevprbchlhyglhvopnvy-auth-token',JSON.stringify(data)),{access_token:token,refresh_token:'local-fixture',expires_in:3600,expires_at:4070908800,token_type:'bearer',user:{id:ID.principal,email:'principal@example.test',app_metadata:{},user_metadata:{},aud:'authenticated',role:'authenticated'}});
}
const response={mode:'read_only',persistence:'none',state:'available',fixture:{score:[1,1]},message:'Acta consultada; no desada',cache:{report_verified_at:'2026-11-04T00:00:00Z'},report:{sides:{home:[{id:'100',name:'PORTER FICTICI LOCAL',number:'1',position:'goalkeeper'}],away:[{id:'200',name:'PORTER FICTICI VISITANT',number:'10',position:'goalkeeper'}]}}};
test.beforeEach(async({request})=>{await request.get('/__test/reset');});
for(const [label,width] of [['mòbil',390],['tauleta',820],['ordinador',1440]])test('official consultation on '+label+' is explicit GET, shows keepers and never writes saved sporting state',async({page,context,request})=>{
 await setup(context);await page.setViewportSize({width,height:900});let calls=0;
 await context.route(endpoint+'/functions/v1/federation-sync**',async r=>{calls++;expect(r.request().method()).toBe('GET');expect(new URL(r.request().url()).searchParams.get('match_id')).toBe(ID.match);await r.fulfill({json:response});});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/clubhoquei360/avancat.html?match='+ID.match+'&view=stats&analysis=video');await expect(page.locator('#statsContent')).toBeVisible();
 expect(calls).toBe(0);const before=await (await request.get('/__test/snapshot')).json();await page.locator('[data-official-read]').click();await expect(page.locator('[data-official-preview]')).toContainText('PORTER FICTICI VISITANT');await expect(page.locator('[data-official-preview]')).toContainText('Porter');await expect(page.locator('[data-official-preview]')).toContainText('1–1');expect(calls).toBe(1);expect(await (await request.get('/__test/snapshot')).json()).toEqual(before);expect(errors).toEqual([]);
 await page.reload();await expect(page.locator('#statsContent')).toBeVisible();await expect(page.locator('[data-official-preview]')).toBeEmpty();expect(calls).toBe(1);
});
test('old backend rejects GET safely and UI does not retry with a mutating POST',async({page,context})=>{
 await setup(context);const methods=[];await context.route(endpoint+'/functions/v1/federation-sync**',r=>{methods.push(r.request().method());return r.fulfill({status:405,json:{error:'POST required'}})});
 await page.goto('/clubhoquei360/avancat.html?match='+ID.match+'&view=stats');await expect(page.locator('#statsContent')).toBeVisible();await page.locator('[data-official-read]').click();await expect(page.locator('[data-official-preview]')).toContainText('No s’ha iniciat cap importació');expect(methods).toEqual(['GET']);await expect(page.locator('#statsContent')).toBeVisible();
});
test('failed source is visible without clearing the recording or fabricating players',async({page,context})=>{
 await setup(context);await context.route(endpoint+'/functions/v1/federation-sync**',r=>r.fulfill({json:{mode:'read_only',persistence:'none',state:'unavailable',message:'Font no disponible; dades desades conservades'}}));
 await page.goto('/clubhoquei360/avancat.html?match='+ID.match+'&view=stats');await expect(page.locator('#statsContent')).toBeVisible();await page.locator('[data-official-read]').click();await expect(page.locator('[data-official-preview]')).toContainText('conservades');await expect(page.locator('[data-official-preview] li')).toHaveCount(0);await expect(page.locator('#statsContent')).toBeVisible();
});
test('calendar-only match has read-only consultation before explicit activation, with no pilot created',async({page,context})=>{
 await setup(context);const catalogue='60000000-0000-4000-8000-000000000001';const calls=[];
 await context.route(endpoint+'/rest/v1/rpc/match_mode_access',r=>{calls.push('access');return r.fulfill({json:{read:true,base:true,advanced:true,catalogue_id:catalogue,operational:null,operational_read:false,activate_base:false,activate_advanced:false}})});
 await context.route(endpoint+'/rest/v1/federation_matches**',r=>r.fulfill({json:{id:catalogue,home_team:'LOCAL FICTICI',away_team:'VISITANT FICTICI',external_match_id:'35559',federation_start_at:'2026-10-24T18:30:00Z',home_score:1,away_score:1,raw_data:{report_status:'verified'}}}));
 await context.route(endpoint+'/rest/v1/federation_match_lineups**',r=>r.fulfill({json:[]}));
 await context.route(endpoint+'/functions/v1/federation-sync**',r=>{calls.push(r.request().method());expect(new URL(r.request().url()).searchParams.get('catalogue')).toBe(catalogue);return r.fulfill({json:response})});
 await page.goto('/clubhoquei360/partit-consulta.html?catalogue='+catalogue+'&mode=advanced');await expect(page.locator('#fixtureTitle')).toContainText('LOCAL FICTICI');await expect(page.locator('#activateMatch')).toBeHidden();expect(calls).toEqual(['access']);await page.locator('[data-official-read]').click();await expect(page.locator('[data-official-preview]')).toContainText('VISITANT');expect(calls).toEqual(['access','GET']);
});
test('two device contexts recover own statistics through HTTP fallback even when federation consultation fails',async({browser,request})=>{
 const a=await browser.newContext(),b=await browser.newContext();await setup(a);await setup(b);
 try{
  await a.route(endpoint+'/functions/v1/federation-sync**',r=>r.fulfill({json:{mode:'read_only',persistence:'none',state:'unavailable',message:'Font pendent; registre propi disponible'}}));
  const first=await a.newPage(),second=await b.newPage();
  for(const page of [first,second]){await page.goto('/clubhoquei360/avancat.html?match='+ID.match+'&view=stats&analysis=live');await expect(page.locator('#statsContent')).toBeVisible();}
  const before=await (await request.get('/__test/snapshot')).json();await first.locator('[data-official-read]').click();await expect(first.locator('[data-official-preview]')).toContainText('registre propi disponible');
  await first.locator('[data-stats-action=pass_complete]').click();await expect(first.locator('#statsSync')).toContainText('confirmades');
  await expect(second.locator('#statsHistory')).toContainText('Passada completada',{timeout:22000});
  await second.reload();await expect(second.locator('#statsHistory')).toContainText('Passada completada');
  const after=await (await request.get('/__test/snapshot')).json();expect(after.events).toHaveLength(1);expect(after.official).toEqual(before.official);expect(after.clock).toEqual(before.clock);
 }finally{await a.close();await b.close();}
});
test('RFEP report links to the match, retains calendar provenance and labels initial five without creating a timeline',async({page,context})=>{
 await setup(context);const data=structuredClone(response);data.report.source_url='https://www.hockeypatines.fep.es/?liga=3575&partido=35559';data.report.calendar_source_url='https://www.hockeypatines.fep.es/league/3575';data.report.sides.home[0].starter=true;
 await context.route(endpoint+'/functions/v1/federation-sync**',r=>r.fulfill({json:data}));await page.goto('/clubhoquei360/avancat.html?match='+ID.match+'&view=stats');await expect(page.locator('#statsContent')).toBeVisible();await page.locator('[data-official-read]').click();
 await expect(page.getByRole('link',{name:'Obre l’acta al portal oficial'})).toHaveAttribute('href',data.report.source_url);await expect(page.getByRole('link',{name:'Calendari de procedència'})).toHaveAttribute('href',data.report.calendar_source_url);await expect(page.locator('[data-official-preview]')).toContainText('Cinc inicial');await expect(page.locator('[data-official-preview]')).toContainText('Incidències oficials: pendents');
});
test('a supplied unsafe provenance URL never becomes a clickable report link',async({page,context})=>{
 await setup(context);const data=structuredClone(response);data.report.source_url='javascript:alert(1)';data.report.calendar_source_url='https://evil.invalid/calendar';await context.route(endpoint+'/functions/v1/federation-sync**',r=>r.fulfill({json:data}));await page.goto('/clubhoquei360/avancat.html?match='+ID.match+'&view=stats');await expect(page.locator('#statsContent')).toBeVisible();await page.locator('[data-official-read]').click();await expect(page.locator('[data-official-preview]')).toContainText('PORTER FICTICI');await expect(page.locator('[data-official-preview] a')).toHaveCount(0);
});
