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
 if(name==='read_callup_workflow'||name==='read_callup_week_workflow')return {error:{code:'PGRST202'}};
   if(name==='club_setup_access')return {data:{teams:[]}};
   if(name==='read_club_callup_detail')return {error:{code:'PGRST202'}};
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
 await page.getByRole('link',{name:'Preparar convocatòria'}).click();
 await expect(page.locator('#editor')).toBeVisible();
 await page.locator('#toggleGuide').click();
 await expect(page.locator('#guide')).toContainText('Pas 2');
 await page.locator('#selectAll').click();
 await expect(page.locator('#guide')).toContainText('Pas 3');
 await expect(page.locator('#selectedCount')).toHaveText('2 seleccionats');
 await page.locator('#clearSelection').click();
 await expect(page.locator('#reviewPublication')).toBeDisabled();
 await page.getByRole('checkbox',{name:/Portera fictícia/}).check();
 await page.getByRole('button',{name:'Substitueix',exact:true}).click();
 await expect(page.getByRole('checkbox',{name:/Reforç fictici/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Portera fictícia/})).not.toBeChecked();
 await page.getByRole('button',{name:'Retira Reforç fictici'}).click();
 await expect(page.locator('#selectedCount')).toHaveText('0 seleccionats');
 await page.getByRole('checkbox',{name:/Portera fictícia/}).check();
 await page.locator('#saveDraft').click();
 await expect(page.locator('#workspaceStatus')).toHaveText('Esborrany desat.');
 await page.getByRole('checkbox',{name:/Reforç fictici/}).check();
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
 await page.getByRole('checkbox',{name:/Reforç fictici/}).uncheck();
 await page.locator('#reviewPublication').click();
 await page.getByRole('button',{name:'Publica la convocatòria'}).click();
 await expect(page.locator('#detail')).toContainText('Publicada · modificada');
 await page.getByText('Versió anterior',{exact:false}).click();
 await expect(page.locator('#detail details').last()).toContainText('Reforç fictici');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('setup shows the superadministrator next step and previews CSV before commit',async({page})=>{
 const calls=[];
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('**/app-client.js',r=>r.fulfill({contentType:'text/javascript',body:`
 export const db={
  auth:{getUser:async()=>({data:{user:{id:'fictici',email:'admin@example.test'}}})},
  async rpc(name,args){
 if(name==='read_callup_workflow'||name==='read_callup_week_workflow')return {error:{code:'PGRST202'}};
   if(name==='read_club_callups')return {data:[]};
   if(name==='club_setup_access')return {data:{global_admin:true,teams:[
    {id:'equip',team_name:'FEM15 fictici',club_name:'Club fictici',season_name:'2026/27',roster_import:true,operational:false}
   ]}};
   await fetch('/csv-test',{method:'POST',body:JSON.stringify(args)});
   return {data:[{name:'Portera fictícia',status:'new',position:'porteria'},
    {name:'Portera fictícia',status:'repeated',position:'porteria'}]};
  }
 };`}));
 await page.route('**/csv-test',r=>{
  calls.push(r.request().postDataJSON());
  return r.fulfill({body:''});
 });
 await page.goto('/clubhoquei360/dashboard.html');
 await expect(page.locator('#teamPicker')).toBeHidden();
 await expect(page.locator('#accessMessage')).toContainText('importar-los');
 await page.locator('#accessSetup').click();
 await page.locator('#csvKind').selectOption('roster');
 await page.locator('#csvFile').setInputFiles({
  name:'plantilla.csv',mimeType:'text/csv',buffer:Buffer.from('nom;dorsal;posicio\nPortera fictícia;1;porteria\nPortera fictícia;1;porteria')
 });
 await expect(page.locator('#csvCommit')).toBeDisabled();
 await page.getByRole('button',{name:'Previsualitza el CSV'}).click();
 await expect(page.locator('#csvPreview')).toContainText('Repetida al fitxer');
 expect(calls).toHaveLength(1);
 expect(calls[0]).not.toHaveProperty('p_preview');
 await page.locator('#csvCommit').click();
 await expect(page.locator('#csvStatus')).toHaveText('Files importades: 1.');
 expect(calls[1].p_preview).toHaveLength(2);
});

test('an assigned team is selectable even with an empty fixture list',async({page})=>{
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('**/app-client.js',r=>r.fulfill({contentType:'text/javascript',body:`
 export const db={
  auth:{getUser:async()=>({data:{user:{id:'fictici',email:'coord@example.test'}}})},
  async rpc(name){
   if(name==='read_club_callups')return {data:[]};
   return {data:{teams:[{id:'equip',team_name:'Equip sense calendari',club_name:'Club fictici',season_name:'2026/27',operational:true}]}};
  }
 };`}));
 await page.goto('/clubhoquei360/dashboard.html');
 await expect(page.locator('#teamPicker')).toHaveValue('equip');
 await expect(page.locator('#fixtures')).toContainText('encara no té partits');
 await expect(page.locator('#accessPanel')).toBeHidden();
});

test('global admin selects another club and previews a role without changing the account',async({page})=>{
 const clubs=[{id:'club1',name:'Club fictici 1'},{id:'club2',name:'Club fictici 2'}];
 const teams=clubs.map((c,i)=>({id:'equip'+(i+1),club_id:c.id,club_name:c.name,team_name:'Equip '+(i+1),operational:true}));
 const match={...fixture,club_id:'club2',team_id:'equip2',team_name:'Equip 2',published:false,revision:1};
 const calls=[];
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('**/write-test',r=>{calls.push(r.request().postData());return r.fulfill({body:''});});
 await page.route('**/app-client.js',r=>r.fulfill({contentType:'text/javascript',body:`
 const fixture=${JSON.stringify(match)},candidates=${JSON.stringify(candidates)};
 export const db={
  auth:{getUser:async()=>({data:{user:{id:'global',email:'global@example.test'}}})},
  async rpc(name,args){
 if(name==='read_callup_workflow'||name==='read_callup_week_workflow')return {error:{code:'PGRST202'}};
   if(name==='club_setup_access')return {data:{global_admin:true,clubs:${JSON.stringify(clubs)},teams:${JSON.stringify(teams)}}};
   if(name==='read_club_callup_detail')return {error:{code:'PGRST202'}};
   if(name==='read_club_callups')return {data:args.p_fixture?{
    fixture,can_edit:true,candidates,callup:{revision:1,players:candidates,published:false},history:[],overlaps:[]
   }:[fixture]};
   await fetch('/write-test',{method:'POST',body:JSON.stringify(args)});
   return {data:{revision:2}};
  }
 };`}));
 await page.goto('/clubhoquei360/dashboard.html');
 await page.locator('#clubPicker').selectOption('club2');
 await expect(page.locator('#teamPicker')).toHaveValue('equip2');
 await page.locator('#previewRole').selectOption('coach');
 await page.getByRole('link',{name:'Consultar convocatòria'}).click();
 await expect(page.locator('#previewRole')).toHaveValue('coach');
 await expect(page.locator('#editor')).toHaveCount(0);
 await expect(page.locator('#detail')).not.toContainText('Esborrany');
 await page.locator('#previewRole').selectOption('coordinator');
 await expect(page.locator('#editor')).toBeVisible();
 await expect(page.locator('#saveDraft')).toBeDisabled();
 await expect(page.locator('#reviewPublication')).toBeDisabled();
 await page.locator('#previewRole').selectOption('');
 await expect(page.locator('#saveDraft')).toBeEnabled();
 expect(calls).toEqual([]);
});

test('weekly view groups all visible club teams and keeps the date on return',async({page})=>{
 const week='2030-01-14';
 const club={id:'club',name:'Club fictici'};
 const clubs=[club,{id:'other',name:'Un altre club fictici'}];
 const teams=[
  {id:'equip-a',club_id:club.id,club_name:club.name,team_name:'Equip A',operational:true},
  {id:'equip-b',club_id:club.id,club_name:club.name,team_name:'Equip B',operational:true},
  {id:'equip-c',club_id:'other',club_name:'Un altre club fictici',team_name:'Equip C',operational:true}
 ];
 const matches=teams.map((t,i)=>({...fixture,fixture_id:'match-'+i,club_id:t.club_id,team_id:t.id,team_name:t.team_name,
  starts_at:'2030-01-'+(15+i)+'T09:30:00Z'}));
 matches[0].published=true;
 matches[0].published_players=candidates;
 matches[0].published_staff={coaches:['Tècnica fictícia']};
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('**/app-client.js',r=>r.fulfill({contentType:'text/javascript',body:`
 const matches=${JSON.stringify(matches)},candidates=${JSON.stringify(candidates)};
 export const db={
  auth:{getUser:async()=>({data:{user:{id:'global',email:'global@example.test'}}})},
  async rpc(name,args){
 if(name==='read_callup_workflow'||name==='read_callup_week_workflow')return {error:{code:'PGRST202'}};
   if(name==='club_setup_access')return {data:{global_admin:true,clubs:${JSON.stringify(clubs)},teams:${JSON.stringify(teams)}}};
   if(name==='read_club_callup_week')return {data:args.p_monday==='${week}'?matches.filter(f=>f.club_id===args.p_club):[]};
   if(name==='read_club_callup_detail')return {data:{fixture:matches[0],can_edit:true,candidates,staff_supported:true,
    callup:{revision:1,published:true,players:candidates,staff:matches[0].published_staff},history:[],overlaps:[]}};
   return {data:matches};
  }
 };`}));
 await page.goto('/clubhoquei360/dashboard.html?vista=convocatories&setmana='+week);
 await expect(page.locator('#fixtures')).toContainText('Equip A');
 await expect(page.locator('#fixtures')).toContainText('Equip B');
 await expect(page.locator('#fixtures')).not.toContainText('Equip C');
 await page.getByText('Convocats (2)',{exact:true}).click();
 await expect(page.getByText('Tècnica fictícia',{exact:false})).toBeVisible();
 await page.getByRole('link',{name:'Preparar convocatòria'}).first().click();
 await expect(page.getByLabel('Entrenadors assignats')).toHaveValue('Tècnica fictícia');
 await page.getByRole('link',{name:'Torna a les convocatòries'}).click();
 await expect(page.locator('#weeklyView')).toHaveAttribute('aria-pressed','true');
 await page.locator('#nextWeek').click();
 await expect(page.locator('#fixtures')).toContainText('Cap partit disponible');
});
