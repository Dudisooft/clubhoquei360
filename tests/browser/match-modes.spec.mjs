import {test,expect} from '@playwright/test';
const cat='60000000-0000-4000-8000-000000000001',op='60000000-0000-4000-8000-000000000002';
// Contract/UI fixtures only. PostgreSQL authorization is tested in the server PR.
async function setup(page,{age='senior',role='ordinary',provider='RFEP',title='Equip FICTICI',division='Divisió FICTÍCIA',context=false,activate=false,missing=false,ready=true}={}){
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:''}));
 await page.route('**/app-client.js',r=>r.fulfill({contentType:'text/javascript',body:`
 const conf=${JSON.stringify({age,role,provider,title,division,context,activate,missing,ready,cat,op})};
 let active=conf.context||localStorage.getItem('mode-fixture-active')==='true',completed=conf.ready||localStorage.getItem('mode-fixture-completed')==='true';window.modeFixture={commands:0,inserts:0,imports:0};
 const advanced=['senior','junior'].includes(conf.age)||['superadmin','general_coordinator'].includes(conf.role);
 const row={id:conf.cat,group_id:'g',home_team:conf.title,away_team:'Rival FICTICI',federation_start_at:'2027-01-01T12:00Z',raw_data:{source_url:conf.provider==='RFEP'?'https://hockeypatines.fep.es/league/FICTICI':'https://hoqueipatins.fecapa.cat/league/FICTICI',home_team_id:'10',away_team_id:'20'}};
 const source={match_id:conf.op,federation:conf.provider,competition_id:'FICTICI',season_id:'41',home_name:conf.title,away_name:row.away_team,import_status:'pending',official_data:{source_kind:'verified_calendar',calendar_match_id:conf.cat,home_team_id:'10',away_team_id:'20'}};
 const tables=()=>({seasons:[{id:'s',label:'2026/27'}],teams:[{id:'t',name:conf.title}],federation_competitions:[{id:'c',club_id:'club',season_id:'s',federation:conf.provider,external_competition_id:'FICTICI',name:conf.division}],federation_groups:[{id:'g',competition_id:'c'}],federation_team_entries:[{id:'e',club_team_id:'t',competition_id:'c',external_team_id:'10'}],federation_matches:[row],federation_match_teams:[{match_id:conf.cat,entry_id:'e',side:'home'}],pilot_matches:active?[{id:conf.op,title:conf.title,starts_at:row.federation_start_at}]:[],pilot_members:active?[{match_id:conf.op,user_id:'FICTICI',role:'operator'}]:[],federation_match_sources:active?[source]:[],basic_match_contexts:active?[{catalogue_match_id:conf.cat,pilot_match_id:conf.op,practice:false}]:[],pilot_players:[],pilot_operator_state:[],pilot_events:[]});
 export const db={auth:{getUser:async()=>({data:{user:{id:'FICTICI'}}}),getSession:async()=>({data:{session:{user:{id:'FICTICI'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 rpc:async(name,args)=>{if(name==='match_mode_access'){if(conf.missing)return {error:{message:'Missing server migration'}};const read=conf.role!=='alien'&&(args.p_catalogue===conf.cat||args.p_match===conf.op&&active);return {data:{read,base:read,advanced:read&&advanced,operational:active?conf.op:null,operational_read:read&&active,advanced_context_ready:completed,catalogue_id:conf.cat,activate_base:read&&conf.activate,activate_advanced:read&&advanced&&conf.activate}};}
 if(name==='match_activate_catalogue'){if(!conf.activate||args.p_mode==='advanced'&&!advanced)return {error:{message:'Denied'}};window.modeFixture.commands++;active=true;completed=true;localStorage.setItem('mode-fixture-completed','true');localStorage.setItem('mode-fixture-active','true');return {data:conf.op};}
 if(name==='stats_access')return {data:{read:false,manage:false}};return {error:{message:'No additional fixture RPC'}};},
 from(table){let predicates=[],a=0,b=499,single=false;const q={select(){return q},eq(k,v){predicates.push(r=>r[k]===v);return q},in(k,vs){predicates.push(r=>vs.includes(r[k]));return q},order(){return q},range(x,y){a=x;b=y;return q},maybeSingle(){single=true;return q},insert(){window.modeFixture.inserts++;return q},then(fn){const rows=(tables()[table]||[]).filter(r=>predicates.every(p=>p(r))).slice(a,b+1);return Promise.resolve({data:single?rows[0]||null:rows,error:null}).then(fn)}};return q;},
 channel(){const ch={on(){return ch},subscribe(){return ch}};return ch;},removeChannel:async()=>{},functions:{invoke:async()=>{window.modeFixture.imports++;return {error:{message:'No imports in consultation'}};}}};` }));
}
async function choose(page){await page.goto('/clubhoquei360/partit.html');await page.locator('#season').selectOption('s');await page.locator('#competition').selectOption('c');await page.locator('#team').selectOption('t');await page.locator('#fixture').selectOption(cat);}
for(const [title,age,division] of [['SIMAR FICTICI','senior','OK Lliga'],['IHC B FICTICI','senior','Tercera Catalana'],['Sènior femení FICTICI','senior','Divisió nova sense llista'],['Júnior A FICTICI','junior','Júnior Or'],['Júnior D FICTICI','junior','Altra divisió']])test(title+' has both modes and future consultation without a context',async({page})=>{
 await setup(page,{age,title,division});await choose(page);await expect(page.locator('#navigationMode option[value=advanced]')).not.toHaveAttribute('disabled');await expect(page.locator('#openMatch')).toHaveAttribute('href','./partit-consulta.html?catalogue='+cat+'&mode=advanced');
 await page.locator('#openMatch').click();await expect(page.locator('#fixtureTitle')).toContainText(title);await expect(page.locator('#fixtureDetails')).toContainText('Partit futur');await expect(page.locator('#activateMatch')).toBeHidden();expect(await page.evaluate(()=>window.modeFixture)).toEqual({commands:0,inserts:0,imports:0});
});
for(const role of ['ordinary','admin','section_coordinator','coach','delegate'])test('youth ordinary access stays Base for '+role+' despite URL role labels',async({page})=>{
 await setup(page,{age:'youth',role,context:true,division:'Juvenil / Infantil FICTICI'});await choose(page);await expect(page.locator('#navigationMode')).toHaveValue('base');await expect(page.locator('#navigationMode option[value=advanced]')).toHaveAttribute('disabled','');
 await page.goto('/clubhoquei360/avancat.html?match='+op+'&role=platform_superadmin&profile=main');await expect(page.locator('#modeAccessDenied')).toContainText('Mode Avançat');expect(await page.evaluate(()=>document.querySelector('main').inert)).toBe(true);expect(await page.evaluate(()=>window.modeFixture.inserts)).toBe(0);
});
for(const role of ['superadmin','general_coordinator'])test('server-authenticated '+role+' exception allows lower-category Advanced consultation',async({page})=>{
 await setup(page,{age:'youth',role});await choose(page);await expect(page.locator('#navigationMode option[value=advanced]')).not.toHaveAttribute('disabled');await page.locator('#openMatch').click();await expect(page.locator('#fixtureDetails')).toContainText('Avançat');expect(await page.evaluate(()=>window.modeFixture.commands)).toBe(0);
});
test('activation is an explicit command and routes to the confirmed existing canonical identity once',async({page})=>{
 await setup(page,{age:'senior',role:'superadmin',activate:true});await page.goto('/clubhoquei360/partit-consulta.html?catalogue='+cat+'&mode=advanced');await expect(page.locator('#activateMatch')).toBeVisible();expect(await page.evaluate(()=>window.modeFixture.commands)).toBe(0);
 await page.locator('#activateMatch').click();await expect(page).toHaveURL(new RegExp('avancat.html\\?match='+op));await expect(page.locator('#selectedMatchIdentity')).toContainText('Equip FICTICI');expect(await page.evaluate(()=>window.modeFixture.inserts)).toBe(0);
});
test('unknown server permission contract fails closed without activation or fallback to another match',async({page})=>{
 await setup(page,{missing:true});await choose(page);await expect(page.locator('#selectionStatus')).toContainText('Missing server migration');await expect(page.locator('#openMatch')).toHaveAttribute('aria-disabled','true');expect(await page.evaluate(()=>window.modeFixture.commands)).toBe(0);
});
for(const width of [390,820,1440])test('future consultation fits '+width,async({page})=>{await setup(page);await page.setViewportSize({width,height:900});await page.goto('/clubhoquei360/partit-consulta.html?catalogue='+cat+'&mode=advanced');await expect(page.locator('#fixtureDetails')).toContainText('Avançat');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});


test('existing Base context offers explicit completion for Advanced without choosing another match',async({page})=>{
 await setup(page,{age:'senior',context:true,ready:false,activate:true,division:'Tercera Catalana FICTÍCIA'});await choose(page);await expect(page.locator('#openMatch')).toHaveAttribute('href','./partit-consulta.html?catalogue='+cat+'&mode=advanced');await page.locator('#openMatch').click();
 await expect(page.locator('#activateMatch')).toHaveText('Prepara el context del Mode Avançat');expect(await page.evaluate(()=>window.modeFixture.commands)).toBe(0);await page.locator('#activateMatch').click();await expect(page).toHaveURL(new RegExp('avancat.html\\?match='+op));
});

test('RFEP future explicit Base activation opens the same operative match without a FECAPA-only roster error',async({page})=>{
 await setup(page,{age:'senior',activate:true,provider:'RFEP'});await page.goto('/clubhoquei360/partit-consulta.html?catalogue='+cat+'&mode=base');await expect(page.locator('#activateMatch')).toBeVisible();await page.locator('#activateMatch').click();await expect(page).toHaveURL(new RegExp('base.html\\?match='+op));await expect(page.locator('#status')).toContainText('Preparant convocatòries');await expect(page.locator('#preparation')).toBeVisible();expect(await page.evaluate(()=>window.modeFixture.inserts)).toBe(0);
});
