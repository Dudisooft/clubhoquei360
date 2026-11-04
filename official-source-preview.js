// An explicit consultation never changes saved lineups, starters or statistics.
export function mountOfficialPreview({db,root,getMatch=()=>null,getCatalogue=()=>null}){
 const box=document.createElement('section');box.className='panel';
 const heading=document.createElement('h2');heading.textContent='Acta federativa · consulta';
 const button=document.createElement('button');button.type='button';button.textContent='Consulta l’acta oficial (sense desar)';button.dataset.officialRead='';
 const output=document.createElement('div');output.setAttribute('aria-live','polite');output.dataset.officialPreview='';
 box.append(heading,button,output);root.append(box);
 const current=()=>{const catalogue=getCatalogue(),match=getMatch();return catalogue?'catalogue='+encodeURIComponent(catalogue):match?'match_id='+encodeURIComponent(match):null;};
 let sequence=0;
 const clear=()=>{sequence++;button.disabled=false;output.replaceChildren();};
 button.onclick=async()=>{
  const reference=current(),request=++sequence;if(!reference)return;button.disabled=true;output.textContent='Consultant la font oficial…';
  try{
   // Deliberately GET: old federation-sync versions reject it before any write.
   const result=await db.functions.invoke('federation-sync?'+reference,{method:'GET'});
   if(request!==sequence||reference!==current())return;
   if(result.error)throw Error('La consulta de només lectura no està disponible. No s’ha iniciat cap importació.');
   const data=result.data;if(data?.mode!=='read_only'||data.persistence!=='none')throw Error('El servidor no ha confirmat una consulta de només lectura.');
   output.textContent=data.message||'Consulta completada.';
   if(data.fixture?.score){const result=document.createElement('p');result.textContent='Resultat del calendari federatiu: '+data.fixture.score.join('–')+' · No modifica el marcador propi.';output.append(result);}
   if(data.report?.sides){
    const note=document.createElement('p');note.textContent=(data.state==='stale'?'Còpia temporal pendent d’actualització':'Acta oficial consultada')+' · '+data.cache.report_verified_at+' · No modifica convocatòries, titulars ni estadístiques.';output.append(note);
    for(const side of ['home','away']){
     const title=document.createElement('h3');title.textContent=side==='home'?'Local':'Visitant';const list=document.createElement('ul');
     for(const p of data.report.sides[side]||[]){const item=document.createElement('li');item.textContent=(p.number??'—')+' · '+(p.name||'Nom no disponible')+(p.position==='goalkeeper'?' · Porter':'');
      const totals=[['Gols',p.goals],['Grogues',p.yellow],['Blaves',p.blue],['Vermelles',p.red]].filter(([,value])=>Number.isInteger(value)&&value>0);if(totals.length)item.textContent+=' · '+totals.map(([label,value])=>label+': '+value).join(' · ');list.append(item);}output.append(title,list);
    }
   }
  }catch(e){if(request===sequence&&reference===current())output.textContent=e.message;}
  finally{if(request===sequence)button.disabled=false;}
 };
 return {clear};
}
