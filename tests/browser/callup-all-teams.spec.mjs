import {test,expect} from '@playwright/test';

const teams=['FEM15','Infantil D','FEM11','Sense plantilla'].map((name,i)=>({
 id:'team-'+i,club_id:'own',club_name:'Club propi fictici',team_name:name,category:name,
 operational:true,roster_import:true
}));
const matches=teams.map((t,i)=>({fixture_id:'match-'+i,team_id:t.id,club_id:'own',
 club_name:t.club_name,team_name:t.team_name,side:i%2?'away':'home',
 home_team:i%2?'Rival fictici':t.team_name,away_team:i%2?t.team_name:'Rival fictici',
 home_crest:'https://sidgad.cloud/fecapa/images/logos_clubes/home-fixture.png',away_crest:'https://sidgad.cloud/fecapa/images/logos_clubes/away-fixture.png',
 starts_at:'2030-01-15T10:30:00Z',kind:'match',can_edit:true}));

async function mock(page,{coach=false,weekUnavailable=false}={}){
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('https://sidgad.cloud/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><circle cx="22" cy="22" r="20" fill="#194b9b"/><text x="22" y="28" text-anchor="middle" fill="white" font-size="18">F</text></svg>'}));
 await page.route('**/app-client.js',r=>r.fulfill({contentType:'text/javascript',body:`
 const teams=${JSON.stringify(teams)},matches=${JSON.stringify(matches)},coach=${coach},weekUnavailable=${weekUnavailable};
 export const db={auth:{getUser:async()=>({data:{user:{id:'fixture-only',email:'fixture@example.test'}}})},
 async rpc(name,args){
 if(name==='read_callup_workflow'||name==='read_callup_week_workflow')return {error:{code:'PGRST202'}};
  const allowed=coach?teams.slice(0,1):teams;
  if(name==='club_setup_access')return {data:{teams:allowed,global_admin:false}};
  if(name==='read_club_callup_week')return weekUnavailable?{error:{code:'PGRST202'}}:{data:matches.map(f=>({...f,can_edit:!coach}))};
  if(name==='read_club_callups'&&!args.p_fixture)return {data:matches.filter(f=>allowed.some(t=>t.id===f.team_id)).map(f=>({...f,can_edit:!coach}))};
  const f=matches.find(f=>f.fixture_id===args.p_fixture);
  const candidates=f.team_id==='team-3'?[]:[{id:f.team_id+'-keeper',full_name:'Porteria fictícia '+f.team_name,dorsal:'1',position:'goalkeeper'}];
  if(name==='read_club_callup_detail')return {data:{fixture:f,candidates,can_edit:!coach,
   callup:JSON.parse(sessionStorage.getItem(f.fixture_id)||'null'),history:[],overlaps:[]}};
  if(name==='save_club_callup'){
   sessionStorage.setItem(f.fixture_id,JSON.stringify({players:candidates.filter(p=>args.p_players.includes(p.id)),revision:1,published:false}));
   return {data:{revision:1}};
  }
  return {data:[]};
 }};` }));
}

for(const width of [390,820,1280])test('all-team coordinator prepares own rosters and recovers drafts at '+width,async({page})=>{
 await page.setViewportSize({width,height:900});
 await mock(page);
 await page.goto('/clubhoquei360/dashboard.html?vista=convocatories&setmana=2030-01-14');
 await expect(page.locator('#teamPicker option')).toHaveCount(5);
 await expect(page.locator('#teamPicker')).toHaveValue('');
 await expect(page.locator('#teamPicker')).toHaveCSS('color','rgb(20, 40, 63)');
 await expect(page.locator('#fixtures article')).toHaveCount(4);
 await page.screenshot({path:'work/callup-all-teams-'+width+'.png',fullPage:true});
 await page.locator('#teamView').click();
 await page.reload();
 await expect(page.locator('#teamPicker')).toHaveValue('');
 await expect(page.locator('#fixtures article')).toHaveCount(4);
 await page.goto('/clubhoquei360/dashboard.html?vista=convocatories&setmana=2030-01-14');
 await page.locator('#teamPicker').selectOption('team-1');
 await expect(page.locator('#fixtures article')).toHaveCount(1);
 await expect(page.locator('#fixtures .club-side strong')).toHaveText(['Rival fictici','Infantil D']);
 await expect(page.locator('#fixtures .club-side img')).toHaveCount(2);
 await expect(page.locator('#fixtures .club-side img').first()).toHaveAttribute('src',matches[1].home_crest);
 await page.locator('#teamPicker').selectOption('');
 await expect(page.locator('#fixtures article')).toHaveCount(4);
 for(let i=0;i<3;i++){
  await page.locator('#teamPicker').selectOption('team-'+i);
  await page.getByRole('link',{name:'Preparar convocatòria'}).click();
  await expect(page.locator('#editor')).not.toContainText('Rival fictici');
  await expect(page.getByRole('checkbox',{name:'Porteria fictícia '+teams[i].team_name})).toBeVisible();
  await page.getByRole('checkbox',{name:'Porteria fictícia '+teams[i].team_name}).check();
  await page.locator('#saveDraft').click();
  await expect(page.locator('#workspaceStatus')).toHaveText('Esborrany desat.');
  await page.reload();
  await expect(page.locator('#editor input[type=checkbox]')).toBeChecked();
  await expect(page.locator('#selectedCount')).toHaveText('1 seleccionats');
  await page.getByRole('link',{name:'Torna a les convocatòries'}).click();
 }
 await page.locator('#teamPicker').selectOption('team-3');
 await page.getByRole('link',{name:'Preparar convocatòria'}).click();
 await expect(page.locator('#editor')).toContainText('Encara no hi ha jugadors disponibles per convocar');
 await page.locator('#importRoster').click();
 await expect(page.locator('#csvScope')).toHaveValue('team-3');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('restricted coach sees only assigned team even when weekly response contains other teams',async({page})=>{
 await mock(page,{coach:true});
 await page.goto('/clubhoquei360/dashboard.html?vista=convocatories&setmana=2030-01-14');
 await expect(page.locator('#teamPicker option')).toHaveCount(2);
 await page.locator('#teamPicker').selectOption('');
 await expect(page.locator('#fixtures article')).toHaveCount(1);
 await expect(page.locator('#fixtures')).not.toContainText('Infantil D');
 await page.getByRole('link',{name:'Consultar convocatòria'}).click();
 await expect(page.locator('#editor')).toHaveCount(0);
 await expect(page.locator('#pageTitle')).toHaveText('Convocatòria');
});

 test('missing weekly migration keeps available fixtures and explains the dependency',async({page})=>{
 await mock(page,{weekUnavailable:true});
 await page.goto('/clubhoquei360/dashboard.html?vista=convocatories&setmana=2030-01-14');
 await expect(page.locator('#workspaceStatus')).toContainText('necessita l’actualització del servidor');
 await expect(page.locator('#fixtures article')).toHaveCount(4);
 await page.locator('#teamPicker').selectOption('team-2');
 await expect(page.locator('#fixtures article')).toHaveCount(1);
 await expect(page.locator('#fixtures')).toContainText('FEM11');
});
