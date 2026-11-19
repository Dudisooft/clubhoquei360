import {test,expect} from '@playwright/test';

async function setup(page,{fallback=false}={}){
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('https://sidgad.cloud/**',r=>r.fulfill({status:404,body:''}));
 await page.addInitScript(({fallback})=>{
  window.open=(url)=>{window.fixtureOpened=url;return null;};
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(fallback)throw Error('denied');window.fixtureCopied=text;}}});
 },{fallback});
 await page.route('**/app-client.js',r=>r.fulfill({contentType:'text/javascript',body:`
 const delegate=new URLSearchParams(location.search).get('fixtureRole')==='delegate';
 const fixture={fixture_id:'match',team_id:'team',club_id:'club',team_name:'FEM15',club_name:'Club FICTICI',home_team:'Club FICTICI',away_team:'Rival FICTICI',starts_at:'2030-01-15T09:00:00Z',can_edit:!delegate};
 const player={id:'internal',full_name:'Nom privat FICTICI',position:'goalkeeper',dorsal:'1'};
 const scope={entry_id:'entry',season_id:'season',competition_id:'comp',match_id:'match',cutoff:fixture.starts_at};
 function state(){return JSON.parse(sessionStorage.getItem('workflow-fixture')||JSON.stringify({revision:1,read:null,prefRevision:1,preferences:{kit:'Fictícia',street:'Polo fictici',margin_minutes:60},adopted:false}));}
 function store(s){sessionStorage.setItem('workflow-fixture',JSON.stringify(s));}
 export const db={auth:{getUser:async()=>({data:{user:{id:'fixture-user',email:'fixture@example.test'}}})},async rpc(name,args){
  const s=state();
  if(name==='club_setup_access')return {data:{teams:[{id:'team',team_name:'FEM15',club_id:'club',club_name:'Club FICTICI',operational:true,roster_import:!delegate}]}};
  if(name==='read_club_callups')return {data:[fixture]};
  if(name==='read_callup_workflow')return {data:{workflow_supported:true,fixture,can_edit:!delegate,candidates:s.adopted?[player]:[],
   callup:{fixture_id:'match',team_id:'team',published:true,revision:s.revision,players:[player]},history:[],overlaps:[],can_acknowledge:delegate,
   receipts:s.read===s.revision?[{reader_id:'delegate-fixture',read_at:'2030-01-01T10:00:00Z'}]:[],preferences:s.preferences,preferences_revision:s.prefRevision,
   message_fields:{round:'8',competition_name:'FEM. OR',venue:'Pavelló fictici',maps_url:'https://maps.app.goo.gl/fixture',maps_verified:true},
   evidence:{scope,appearances:[{...scope,match_id:'past',at:'2030-01-01T10:00Z',player_id:'catalogue-person',full_name:'Nom privat FICTICI',verified:true}]}}};
  if(name==='acknowledge_callup'){s.read=args.p_revision;store(s);return {data:{}};}
  if(name==='save_callup_preferences'){s.preferences=args.p_preferences;s.prefRevision++;store(s);return {data:{}};}
  if(name==='accept_callup_proposal'){s.adopted=true;store(s);return {data:'internal'};}
  return {error:{code:'PGRST202'}};
 }};` }));
}
const url='/clubhoquei360/dashboard.html?vista=convocatories&partit=match&equip=team';
for(const width of [390,820,1280])test('delegate reads a revision, shares exact non-nominal text and reloads at '+width,async({page})=>{
 await page.setViewportSize({width,height:950});await setup(page);
 await page.goto(url+'&fixtureRole=delegate');
 await expect(page.locator('#editor')).toHaveCount(0);
 await page.getByRole('button',{name:'He llegit la convocatòria',exact:true}).click();
 await expect(page.locator('#callupWorkflow')).toContainText('Llegida pel delegat');
 await page.reload();await expect(page.locator('#callupWorkflow')).toContainText('Llegida pel delegat');
 await page.screenshot({path:'work/delegate-callup-'+width+'.png',fullPage:true});
 const area=page.locator('[data-message]');
 await expect(area).toHaveValue(/‼️ CONVOCATÒRIA FEM15/);
 expect(await area.inputValue()).not.toContain('Nom privat FICTICI');
 expect(await area.inputValue()).toContain('⏰ *Convocats: 09:00h');
 expect(await area.inputValue()).toContain('📍Pista: Pavelló fictici https://maps.app.goo.gl/fixture');
 await area.fill((await area.inputValue()).replace('Polo fictici','Polo revisat'));
 await page.getByRole('button',{name:'Copiar i obrir WhatsApp',exact:true}).click();
 expect(await page.evaluate(()=>window.fixtureCopied)).toContain('Polo revisat');
 expect(await page.evaluate(()=>window.fixtureOpened)).toBe('https://wa.me/?text='+encodeURIComponent(await area.inputValue()));
 await page.evaluate(()=>{const s=JSON.parse(sessionStorage.getItem('workflow-fixture'));s.revision++;sessionStorage.setItem('workflow-fixture',JSON.stringify(s));});
 await page.reload();await expect(page.locator('#callupWorkflow')).toContainText('Pendent de lectura');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('coordinator adopts a separate suggestion and persists only this team preferences',async({page})=>{
 await setup(page);page.on('dialog',d=>d.accept());await page.goto(url);
 await expect(page.locator('#editor')).toContainText('Encara no hi ha jugadors disponibles per convocar');
 await page.getByLabel('Posició pendent de verificar').selectOption('field');
 await page.getByRole('button',{name:'Valida i incorpora a la plantilla interna',exact:true}).click();
 await expect(page.locator('#editor')).toContainText('Nom privat FICTICI');
 await page.getByText('Revisa les dades i l’equipació',{exact:true}).click();
 await page.getByLabel('Marge habitual abans del partit (minuts)').fill('45');
 await page.getByLabel('Roba de carrer',{exact:true}).fill('Xandall revisat');
 await page.getByRole('button',{name:'Desa les preferències d’aquest equip',exact:true}).click();
 await page.reload();await page.getByText('Revisa les dades i l’equipació',{exact:true}).click();await expect(page.getByLabel('Marge habitual abans del partit (minuts)')).toHaveValue('45');
 await expect(page.getByLabel('Roba de carrer',{exact:true})).toHaveValue('Xandall revisat');
});
test('clipboard denial provides selected manual text and a manual WhatsApp link without sending',async({page})=>{
 await setup(page,{fallback:true});await page.goto(url+'&fixtureRole=delegate');
 await page.getByRole('button',{name:'Copiar i obrir WhatsApp',exact:true}).click();
 await expect(page.locator('[data-copy-status]')).toContainText('Còpia manual');
 await expect(page.locator('[data-whatsapp]')).toBeVisible();
 expect(await page.evaluate(()=>window.fixtureOpened)).toBeUndefined();
});
