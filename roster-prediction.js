// Transparent ranking of evidence. Confidence describes history, never eligibility.
export function predictRoster(bundle={}){
 const {scope,appearances=[],official=[],official_verified=false,internal=[]}=bundle;
 if(!scope)return official_verified?[]:internal.map(p=>({player_id:p.catalogue_player_id||p.id,internal_id:p.id,full_name:p.full_name,
  dorsal:p.dorsal??null,position:p.position||null,classification:p.reinforcement?'possible_reinforcement':'regular',confidence:'verified_internal',
  eligible:true,official:false,appearances:0,total_reports:0,frequency:null,last_seen:null,sources:[],duplicate_warning:false}));
 const key=r=>JSON.stringify([r.full_name,r.dorsal,r.position,r.source_url]);
 const groups=new Map(),current=[...(official_verified?official:appearances)].sort((a,b)=>String(a.player_id).localeCompare(String(b.player_id))||
  (Date.parse(b.at)||0)-(Date.parse(a.at)||0)||String(a.match_id).localeCompare(String(b.match_id))||key(a).localeCompare(key(b)));
 for(const row of current){
  if(!row.player_id||!row.full_name||row.verified!==true||row.entry_id!==scope.entry_id||row.season_id!==scope.season_id||row.competition_id!==scope.competition_id)continue;
  if(!official_verified&&(!(Date.parse(row.at)<Date.parse(scope.cutoff))||row.match_id===scope.match_id))continue;
  const id=String(row.player_id),group=groups.get(id)||[];
  if(!group.some(x=>x.match_id===row.match_id))group.push(row);
  groups.set(id,group);
 }
 const observedCount=new Set(current.filter(r=>r.verified&&r.entry_id===scope.entry_id&&r.season_id===scope.season_id&&r.competition_id===scope.competition_id&&(official_verified||Date.parse(r.at)<Date.parse(scope.cutoff))).map(r=>r.match_id)).size;
 const reportCount=Number.isInteger(bundle.report_count)&&bundle.report_count>=observedCount&&bundle.report_count<=12?bundle.report_count:observedCount;
 const out=[];
 for(const [id,rows] of groups){
  rows.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||String(a.match_id).localeCompare(String(b.match_id)));
  const last=rows[0],known=internal.find(p=>p.catalogue_player_id===id||p.id===id);
  out.push({player_id:id,external_player_id:last.external_player_id||null,full_name:last.full_name,dorsal:last.dorsal??null,position:last.position||null,
   appearances:rows.length,total_reports:reportCount,frequency:reportCount?rows.length/reportCount:0,last_seen:last.at,
   classification:known?.reinforcement?'possible_reinforcement':rows.length>=3&&rows.length/reportCount>=.6?'regular':rows.length>=2?'occasional':'limited_evidence',
   confidence:official_verified?'current_official':rows.length>=3?'high':rows.length===2?'medium':'low',
   official:official_verified,eligible:!!known,internal_id:known?.id||null,
   duplicate_warning:current.some(r=>r.player_id&&r.player_id!==id&&r.full_name.trim().toLocaleLowerCase('ca')===last.full_name.trim().toLocaleLowerCase('ca')),
   sources:rows.map(r=>({match_id:r.match_id,url:r.source_url||null,at:r.at,kind:r.source_kind||'official_report'})),entry_id:scope.entry_id});
 }
 if(!official_verified)for(const p of internal){
  if(out.some(r=>r.internal_id===p.id))continue;
  out.push({player_id:p.catalogue_player_id||p.id,internal_id:p.id,full_name:p.full_name,dorsal:p.dorsal??null,position:p.position||null,
   classification:p.reinforcement?'possible_reinforcement':'regular',confidence:'verified_internal',eligible:true,official:false,
   appearances:0,total_reports:reportCount,frequency:null,last_seen:null,sources:[{url:null,at:null,match_id:null}],duplicate_warning:false});
 }
 return out.sort((a,b)=>Number(b.official)-Number(a.official)||b.appearances-a.appearances||(Date.parse(b.last_seen)||0)-(Date.parse(a.last_seen)||0)||String(a.player_id).localeCompare(String(b.player_id)));
}
export const proposalLabel=p=>({regular:'Habitual',occasional:'Ocasional',limited_evidence:'Poca evidència',possible_reinforcement:'Possible reforç'}[p.classification]||'Proposta');
