// Rehearsal writes stay on this device; federation reads retain server RLS.
export class PracticeStore {
 constructor(storage,onChange=()=>{}){Object.assign(this,{storage,onChange,rows:[],pending:[]});}
 async open(match,uid){this.key=`ch360-basic-practice:${uid}:${match}`;this.rows=JSON.parse(this.storage.getItem(this.key)||'[]');}
 all(){return this.rows;}
 async enqueue(batch){const next=[...this.rows,...batch];this.storage.setItem(this.key,JSON.stringify(next));this.rows=next;this.onChange();}
 async flush(){}
 async refresh(){}
}
export async function readPractice(db,id){
 const [m,p]=await Promise.all([db.from('federation_matches').select('id,home_team,away_team,federation_start_at,home_score,away_score,raw_data,fetched_at,external_match_id').eq('id',id).maybeSingle(),db.from('federation_match_lineups').select('id,player_id,side,display_name,shirt_number,reported_goals,raw_data').eq('match_id',id).order('shirt_number')]);
 if(m.error||p.error)throw m.error||p.error;
 if(!m.data||m.data.raw_data?.report_status!=='verified')throw Error('No hi ha una acta verificada accessible per a aquesta prova.');
 const fixture=m.data,raw=fixture.raw_data,report=raw.report_data||{};
 if(!p.data?.length)throw Error('La plantilla federativa no està disponible amb els teus permisos.');
 return {fixture,players:p.data.map(x=>({id:x.player_id||x.id,team:x.side,full_name:x.display_name,dorsal:x.shirt_number})),source:{federation:'FECAPA',home_name:fixture.home_team,away_name:fixture.away_team,official_data:{home_score:fixture.home_score,away_score:fixture.away_score,official_status:report.official_status||raw.report_summary?.official_status||null,fetched_at:report.fetched_at||raw.report_fetched_at||fixture.fetched_at,players:p.data.map(x=>({team:x.side,goals:x.reported_goals,yellow:x.raw_data?.yellow??null,blue:x.raw_data?.blue??null,red:x.raw_data?.red??null}))}}};
}
