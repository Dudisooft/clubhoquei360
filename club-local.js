import {db} from './app-client.js';
const tables=['teams','federation_team_entries','federation_competitions','federation_match_teams'];
try{
 const values=await Promise.all(tables.map(async t=>{const r=await db.from(t).select('*');if(r.error)throw r.error;return r.data;}));
 const [teams,entries,competitions,links]=values;
 document.getElementById('status').textContent=teams.length+' equips · '+entries.length+' inscripcions · '+competitions.length+' competicions';
 for(const t of teams.sort((a,b)=>(a.category+a.name).localeCompare(b.category+b.name,'ca',{numeric:true}))){
  const card=document.createElement('article');card.className='panel';const title=document.createElement('h3');title.textContent=t.category+' · '+t.name;card.append(title);
  for(const e of entries.filter(e=>e.club_team_id===t.id)){const c=competitions.find(c=>c.id===e.competition_id),p=document.createElement('p');const count=links.filter(l=>l.entry_id===e.id).length;p.textContent=c.federation+' · '+c.name+' · '+(count?count+' partits disponibles':'Calendari pendent de recuperar');const a=document.createElement('a');a.href=e.source_url;a.textContent=' Font oficial';a.target='_blank';a.rel='noopener';p.append(a);card.append(p);}
  document.getElementById('teams').append(card);
 }
}catch(e){document.getElementById('status').textContent='No s’ha pogut carregar el catàleg: '+e.message;}
