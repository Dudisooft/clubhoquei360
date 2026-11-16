import {test,expect} from '@playwright/test';

const fixture={
 fixture_id:'20000000-0000-4000-8000-000000000001',team_id:'10000000-0000-4000-8000-000000000001',
 side:'home',club_name:'Igualada Hoquei Club',team_name:'IHC fictici',home_team:'IHC fictici',away_team:'Rival fictici',
 starts_at:'2030-01-14T10:30:00Z',kind:'match',can_edit:true
};
const candidates=[
 {id:'p1',full_name:'Portera fictícia',dorsal:'1',position:'goalkeeper',reinforcement:false},
 {id:'p2',full_name:'Reforç fictici',dorsal:'7',position:'field',reinforcement:true,origin_team_id:'other',origin_team:'Equip d’origen fictici'}
];
test('mobile coordinator selects, reviews, acknowledges an overlap and republishes with visible history',async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('https://sidgad.cloud/**',r=>r.fulfill({status:404,body:''}));
 await page.route('**/app-client.js',r=>r.fulfill({contentType:'text/javascript',body:`
 const fixture=${JSON.stringify(fixture)},candidates=${JSON.stringify(candidates)};
 let callup=null,history=[];
 export const db={
  auth:{getUser:async()=>({data:{user:{id:'fictici',email:'coordinador@example.test'}}})},
  async rpc(name,args){
   if(name==='read_club_callups'){
    return {data:args.p_fixture?{fixture,callup,history,candidates,overlaps:['p2'],can_edit:true}:[fixture]};
   }
   callup={revision:(callup?.revision||0)+1,published:args.p_publish,players:candidates.filter(p=>args.p_players.includes(p.id))};
   if(args.p_publish)history=[{...callup,published_at:new Date().toISOString()},...history];
   return {data:{revision:callup.revision}};
  }
 };`}));
 await page.goto('/clubhoquei360/dashboard.html');
 await expect(page.locator('#teamPicker')).toBeVisible();
 await expect(page.locator('#tasks')).toContainText('Prepara la convocatòria');
 await expect(page.locator('#toggleNavigation')).toHaveAttribute('aria-expanded','false');
 await page.locator('#toggleNavigation').click();
 await expect(page.locator('#toggleNavigation')).toHaveAttribute('aria-expanded','true');
 await page.getByRole('link',{name:'Gestiona la convocatòria'}).click();
 await expect(page.locator('#editor')).toBeVisible();
 await page.locator('#toggleGuide').click();
 await expect(page.locator('#guide')).toContainText('Pas 2');
 await page.locator('#selectAll').click();
 await expect(page.locator('#guide')).toContainText('Pas 3');
 await expect(page.locator('#selectedCount')).toHaveText('2 seleccionats');
 await page.locator('#clearSelection').click();
 await expect(page.locator('#reviewPublication')).toBeDisabled();
 await page.getByLabel(/Portera fictícia/).check();
 await page.locator('#saveDraft').click();
 await expect(page.locator('#workspaceStatus')).toHaveText('Esborrany desat.');
 await page.getByLabel(/Reforç fictici/).check();
 await expect(page.locator('#overlapWarning')).toContainText('Reforç fictici');
 await page.locator('#reviewPublication').click();
 await expect(page.locator('#publicationPlayers')).toContainText('Equip d’origen fictici');
 await expect(page.locator('#publicationConflicts')).toContainText('solapament');
 await page.getByRole('button',{name:'Revisa la selecció'}).click();
 await expect(page.locator('#publication')).toBeHidden();
 await expect(page.locator('#detail')).not.toContainText('Historial de publicacions');
 await page.locator('#reviewPublication').click();
 await page.getByRole('button',{name:'Publica la convocatòria'}).click();
 await expect(page.locator('#detail')).toContainText('Historial de publicacions');
 await page.getByLabel(/Reforç fictici/).uncheck();
 await page.locator('#reviewPublication').click();
 await page.getByRole('button',{name:'Publica la convocatòria'}).click();
 await expect(page.locator('#detail')).toContainText('Publicada · modificada');
 await page.getByText('Versió anterior',{exact:false}).click();
 await expect(page.locator('#detail details').last()).toContainText('Reforç fictici');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
