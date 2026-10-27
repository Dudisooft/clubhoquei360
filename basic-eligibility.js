// Scope is distinct from sporting eligibility. No production rule is assumed.
export const IHC_CLUB_ID='a48efe2f-c218-633e-6be6-4ce26e61f5cd';
export const categoryKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f\s]/g,'').toUpperCase();
// Conservative presentation exclusion, NOT an official eligibility matrix.
const order=[['PREBENJAMIINICIACIO','PREBENJAMI','BENJAMI','ALEVI','INFANTIL','JUVENIL','JUNIOR'],['FEM9','FEM11','FEM13','FEM15','FEM17']];
export function lowerCategory(from,to){return order.some(list=>list.includes(categoryKey(from))&&list.includes(categoryKey(to))&&list.indexOf(categoryKey(from))===list.indexOf(categoryKey(to))-1);}
export function reinforcementEligibility({player,sourceTeam,targetTeam,season,rule=null,conditionsVerified=false}){
 const missing=[];if(!Number.isInteger(player.birth_year))missing.push('any de naixement verificat');
 if(!rule?.verified||!/^https:\/\/(?:[^/]+\.)?(?:fecapa\.cat|fep\.es)\//.test(rule.source_url||'')||!rule.reference||rule.season!==season)missing.push('normativa oficial de temporada verificada');
 if(sourceTeam.club_id!==targetTeam.club_id||sourceTeam.season_id!==targetTeam.season_id)missing.push('club i temporada compatibles');
 if(!lowerCategory(sourceTeam.category,targetTeam.category))missing.push('categoria inferior compatible');
 if(rule?.verified){if(!targetTeam.competition_id||rule.competition_id!==targetTeam.competition_id||!targetTeam.federation||rule.federation!==targetTeam.federation)missing.push('àmbit de competició i federació comprovat');if(!rule.allowed_birth_years?.includes(player.birth_year))missing.push('edat compatible');if(rule.source_category!==sourceTeam.category||rule.target_category!==targetTeam.category)missing.push('àmbit de categoria de la norma');if(!player.sex||!rule.allowed_sexes?.includes(player.sex))missing.push('condició de sexe verificada');}
 if(!conditionsVerified)missing.push('resta de condicions federatives comprovades');
 return {eligible:missing.length===0,missing};
}
export function ownRosterScope(rows,entryIds,entryMap,teamMap,{observedIds=new Set(),targetTeam,season,rule=null}={}){
 const primary=rows.find(r=>entryIds.has(r.entry_id)&&r.raw_data?.active_in_latest_roster!==false&&(observedIds.has(r.raw_data?.observed_match_id)||(r.raw_data?.verification==='official_team_roster'&&r.raw_data?.membership_scope==='team')));
 if(primary)return {primary,lower:[],eligibility:null};
 const sameOrHigher=rows.some(r=>{const t=teamMap.get(entryMap.get(r.entry_id)?.club_team_id);return t&&r.raw_data?.observed_match_id&&!lowerCategory(t.category,targetTeam.category);});
 const lower=sameOrHigher?[]:rows.filter(r=>{const t=teamMap.get(entryMap.get(r.entry_id)?.club_team_id);return t&&r.raw_data?.active_in_latest_roster!==false&&lowerCategory(t.category,targetTeam.category);});
 const r=lower[0],t=r&&teamMap.get(entryMap.get(r.entry_id)?.club_team_id);
 return {primary,lower,eligibility:r?reinforcementEligibility({player:{birth_year:r.raw_data?.birth_year,sex:r.raw_data?.sex},sourceTeam:t,targetTeam,season,rule}):null};
}
