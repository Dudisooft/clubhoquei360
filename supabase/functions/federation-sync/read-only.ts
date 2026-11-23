// Read path of the existing connector. The caller supplies a JWT-scoped client,
// never service_role; only SELECT is used. Cache lives in this worker's memory.
export async function readOfficialMatch(db:any,match:string,api:any,{catalogue=null}:any={}){
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if((!match)===(!catalogue)||!uuid.test(catalogue||match))return {status:400,body:{error:'Identificador de partit invàlid'}};
 let source:any,expected:any=null;
 if(catalogue){
  const access=await db.rpc('match_mode_access',{p_catalogue:catalogue,p_match:null});
  if(access.error||access.data?.read!==true||access.data?.catalogue_id!==catalogue)return {status:403,body:{error:'Partit no autoritzat'}};
  const result=await db.from('federation_matches').select('id,external_match_id,match_fingerprint,raw_data').eq('id',catalogue).maybeSingle();
  if(result.error||!result.data)return {status:403,body:{error:'Partit no accessible'}};
  const f=result.data,scope=String(f.match_fingerprint||'').split(':');expected=f.raw_data;
  if(scope[0]!==access.data.federation||scope[2]!==access.data.competition_id||!expected?.home_team_id||!expected?.away_team_id)return {status:422,body:{error:'Identitat federativa pendent de verificar'}};
  source={federation:scope[0],season_id:scope[1],competition_id:scope[2],federation_match_id:f.external_match_id};
  if(!source.federation_match_id)return {status:200,body:{mode:'read_only',persistence:'none',state:'unavailable',message:'L’acta encara no té un codi federatiu verificat'}};
 }else{
  const result=await db.from('federation_match_sources').select('match_id,federation,federation_match_id,competition_id,season_id').eq('match_id',match).maybeSingle();
  if(result.error||!result.data)return {status:403,body:{error:'Partit no autoritzat o font no disponible'}};
  source=result.data;
 }
 if(!['RFEP','FECAPA'].includes(source.federation))return {status:422,body:{error:'Federació no identificada'}};
 try{
  const calendar=await api.calendar(source.federation,source.competition_id,source.season_id);
  const fixture=calendar.fixtures.find(f=>f.official_match_id===String(source.federation_match_id));
  if(!fixture)return {status:200,body:{mode:'read_only',persistence:'none',state:'unavailable',message:'Partit no identificat al calendari consultat; dades desades intactes'}};
  if(expected&&(String(expected.home_team_id)!==fixture.home_id||String(expected.away_team_id)!==fixture.away_id))return {status:422,body:{error:'Identitats del calendari incompatibles; consulta aturada'}};
  const report=await api.report(fixture);
  return {status:200,body:{mode:'read_only',persistence:'none',state:calendar.stale||report.stale?'stale':'available',federation:source.federation,official_match_id:fixture.official_match_id,fixture:{home_team:fixture.home_team,away_team:fixture.away_team,score:fixture.score??null,date:fixture.date??null,time:fixture.time??null},report,cache:{temporary:true,calendar_verified_at:calendar.verifiedAt,report_verified_at:report.verifiedAt,expires_at:report.expiresAt??null},message:calendar.stale||report.stale?'Font pendent de verificar; còpia temporal anterior':'Acta consultada; no s’ha importat ni modificat cap dada'}};
 }catch{return {status:200,body:{mode:'read_only',persistence:'none',state:'unavailable',message:'No s’ha pogut consultar l’acta oficial. Les dades desades es conserven; no es dedueix una alineació buida.'}};}
}
