// Saved official report rows are distinct from a result summary or season candidates.
export function lineupSummary(fixture,rows){
 const unique=new Set(),counts={home:0,away:0};let invalid=false;
 for(const row of rows){if(!row.id||unique.has(row.id)||!Object.hasOwn(counts,row.side)){invalid=true;continue;}unique.add(row.id);counts[row.side]++;}
 const verified=fixture.raw_data?.report_status==='verified'&&counts.home>0&&counts.away>0&&!invalid;
 const text=verified?`Alineacions de l’acta desades: ${counts.home} locals i ${counts.away} visitants.`:counts.home||counts.away?`Alineacions parcials: ${counts.home} locals i ${counts.away} visitants. L’acta completa no està acreditada.`:'Alineacions oficials pendents. Un resultat publicat no acredita els convocats.';
 return {verified,counts,text:text+' Les plantilles de temporada són candidates i no substitueixen les alineacions del partit.'};
}
export async function readLineupSummary(db,fixture){
 try{const r=await db.from('federation_match_lineups').select('id,side').eq('match_id',fixture.id);if(r.error)throw r.error;if(!Array.isArray(r.data))throw Error('Incomplete response');return lineupSummary(fixture,r.data);}
 catch{return {verified:false,counts:null,text:'No s’han pogut consultar les alineacions. No es considera que siguin buides ni verificades.'};}
}
