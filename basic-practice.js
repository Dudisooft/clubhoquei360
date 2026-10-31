// Rehearsal writes stay on this device; federation reads retain server RLS.
export class PracticeStore {
 constructor(storage,onChange=()=>{}){Object.assign(this,{storage,onChange,rows:[],pending:[]});}
 async open(match,uid){this.key=`ch360-basic-practice:${uid}:${match}`;this.rows=JSON.parse(this.storage.getItem(this.key)||'[]');}
 all(){return this.rows;}
 async enqueue(batch){const next=[...this.rows,...batch];this.storage.setItem(this.key,JSON.stringify(next));this.rows=next;this.onChange();}
 async flush(){}
 async refresh(){}
}
export async function readCatalogueFixture(db,id,requireReport=false){
 const [m,p]=await Promise.all([db.from('federation_matches').select('id,group_id,home_team,away_team,federation_start_at,home_score,away_score,raw_data,fetched_at,external_match_id').eq('id',id).maybeSingle(),db.from('federation_match_lineups').select('id,player_id,side,display_name,shirt_number,is_goalkeeper,reported_goals,raw_data').eq('match_id',id).order('shirt_number')]);
 if(m.error||p.error)throw m.error||p.error;
 if(!m.data||(requireReport&&m.data.raw_data?.report_status!=='verified'))throw Error('No hi ha una acta verificada accessible per a aquesta prova.');
 const fixture=m.data,raw=fixture.raw_data,report=raw.report_data||{};
 let provider;try{provider=new URL(raw.source_url);}catch{throw Error('La font FECAPA del partit no és verificable.');}if(provider.protocol!=='https:'||!['hoqueipatins.fecapa.cat','www.hoqueipatins.fecapa.cat'].includes(provider.hostname))throw Error('La font del partit no és FECAPA.');
 if(requireReport&&!p.data?.length)throw Error('La plantilla federativa no està disponible amb els teus permisos.');
 return {fixture,players:p.data.map(x=>({id:x.player_id||x.id,team:x.side,full_name:x.display_name,dorsal:x.shirt_number,position:x.is_goalkeeper?'goalkeeper':'field',catalog_player_id:x.player_id||null,federation_player_id:/^[1-9]\d*$/.test(String(x.raw_data?.external_id??''))?String(x.raw_data.external_id):null,catalog_lineup_id:x.id,official_source:raw.source_url||null,origin:raw.report_status==='verified'?'Acta FECAPA d’aquest partit':'Dades federatives parcials',eligibility:raw.report_status==='verified'?'Consta a l’acta d’aquest partit':'Elegibilitat del partit no acreditada',matchVerified:raw.report_status==='verified',selectable:raw.report_status==='verified'})),source:{federation:'FECAPA',home_name:fixture.home_team,away_name:fixture.away_team,home_crest_url:raw.home_crest||null,away_crest_url:raw.away_crest||null,official_data:{home_team_id:raw.home_team_id||null,away_team_id:raw.away_team_id||null,home_score:fixture.home_score,away_score:fixture.away_score,official_status:report.official_status||raw.report_summary?.official_status||null,fetched_at:report.fetched_at||raw.report_fetched_at||fixture.fetched_at,players:p.data.map(x=>({team:x.side,goals:x.reported_goals,yellow:x.raw_data?.yellow??null,blue:x.raw_data?.blue??null,red:x.raw_data?.red??null}))}}};
}

export async function readPractice(db,id){return readCatalogueFixture(db,id,true);}
