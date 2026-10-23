(function(){
 const ready=async()=>{
  if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  const header=document.querySelector('header');if(!header)return null;
  const identity=document.createElement('div');identity.id='clubIdentity';identity.style.cssText='display:flex;align-items:center;gap:10px';header.prepend(identity);
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Club actiu');header.append(nav);
  const link=document.createElement('a');link.textContent='Dades federatives';link.href='./federacio.html'+location.search;nav.append(link);
  try{
   const [{db},{loadClubContext,applyIdentity}]=await Promise.all([import('./app-client.js'),import('./club-context.js')]);
   const context=await loadClubContext(db);window.ch360ClubContext=context;window.ch360ClubId=context.active?.club_id||null;
   if(context.active){applyIdentity(context.active,document);const picker=document.createElement('select');picker.setAttribute('aria-label','Selecciona club');for(const c of context.clubs){const o=document.createElement('option');o.value=c.slug;o.textContent=c.official_name;picker.append(o);}picker.value=context.active.slug;picker.onchange=()=>{location.href=context.select(picker.value);};nav.prepend(picker);}
   else identity.textContent='Club no disponible amb els teus permisos';
   return context;
  }catch(e){identity.textContent='Identitat del club pendent de configurar';identity.title=e.message;return null;}
 };
 const style=document.createElement('style');style.textContent='header{background:var(--club-header,#112f64)!important;color:var(--club-header-text,#fff)!important}header nav{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-left:auto}header nav a{color:inherit}#clubIdentity img{object-fit:contain}.primary,button.primary{background:var(--brand,#194b9b);color:var(--brand-text,#fff)}:focus-visible{outline:3px solid currentColor;outline-offset:3px}';document.head.append(style);
 window.ch360ClubReady=ready();
})();
