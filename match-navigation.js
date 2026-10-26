import {calendarIdentity} from './federation-selection.js';
export function navigationRows(data){
 const {fixtures=[],groups=[],competitions=[],entries=[],links=[],matches=[],sources=[],contexts=[]}=data;
 return fixtures.map(f=>{const g=groups.find(g=>g.id===f.group_id),c=competitions.find(c=>c.id===g?.competition_id);if(!c)return null;
 const teams=entries.filter(e=>e.competition_id===c.id&&(links.some(l=>l.match_id===f.id&&l.entry_id===e.id)||[f.raw_data?.home_team_id,f.raw_data?.away_team_id].includes(e.external_team_id))).map(e=>e.club_team_id).filter(Boolean);
 const source=sources.find(s=>s.official_data?.calendar_match_id===f.id||(s.federation===c.federation&&s.competition_id===c.external_competition_id&&s.season_id===f.match_fingerprint?.split(':')[1]&&((f.external_match_id&&s.federation_match_id===f.external_match_id)||(calendarIdentity(s.official_data)&&calendarIdentity(s.official_data)===calendarIdentity({...f.raw_data,round:f.raw_data?.round||f.round_label})))));
 const context=contexts.find(b=>b.catalogue_match_id===f.id&&!b.practice);
 const operational=matches.find(m=>m.id===(context?.pilot_match_id||source?.match_id||f.id));
 return {...f,season:c.season_id,competition:c.id,teams,operational:operational?.id||null,federation:c.federation};
 }).filter(Boolean).sort((a,b)=>String(a.federation_start_at||'9999').localeCompare(String(b.federation_start_at||'9999'))||a.id.localeCompare(b.id));
}
export function matchHref(row,mode){if(row.operational)return './'+(mode==='base'?'base':'avancat')+'.html?match='+encodeURIComponent(row.operational);if(mode==='base'&&row.federation==='FECAPA')return './base.html?catalogue='+encodeURIComponent(row.id);return null;}
export function filteredRows(rows,{season='',competition='',team=''}){return rows.filter(r=>r.season===season&&r.competition===competition&&r.teams.includes(team));}
