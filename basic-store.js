/* Append-only pilot stream; server RLS remains authoritative. No writes to the
 * advanced operator snapshot, player records, or federation source. */
export class BasicStore{
 constructor(db,storage,onChange=()=>{}){Object.assign(this,{db,storage,onChange,pending:[],rows:[]});}
 async open(match,uid){this.match=match;this.uid=uid;this.key=`ch360-basic:${uid}:${match}`;const saved=JSON.parse(this.storage.getItem(this.key)||'{}');this.pending=saved.pending||[];this.rows=saved.rows||[];await this.refresh();}
 remember(){this.storage.setItem(this.key,JSON.stringify({pending:this.pending,rows:this.rows}));}
 all(){return [...new Map([...this.rows,...this.pending.flat()].map(r=>[r.id,r])).values()];}
 async refresh(){const rows=[];for(let offset=0;;offset+=500){const r=await this.db.from('pilot_events').select('*').eq('match_id',this.match).order('created_at').order('id').range(offset,offset+499);if(r.error)throw r.error;rows.push(...r.data);if(r.data.length<500)break;}this.rows=rows;this.remember();this.onChange();}
 async enqueue(batch){const old=[...this.pending];this.pending.push(batch);try{this.remember();}catch(e){this.pending=old;throw Error('No es pot conservar el registre al dispositiu: '+e.message);}this.onChange();await this.flush();}
 async flush(){if(this.flushing)return this.flushing;this.flushing=(async()=>{while(this.pending.length){const batch=this.pending[0];let response;try{response=await this.db.from('pilot_events').insert(batch);}catch(e){this.error=e.message;break;}if(response.error){if(response.error.code==='23505'){const found=await this.db.from('pilot_events').select('*').eq('match_id',this.match).in('id',batch.map(r=>r.id));if(found.error||found.data.length!==batch.length){this.error='Conflicte d’identificadors: cal revisar la cua.';break;}}else{this.error=response.error.message;break;}}this.rows=[...new Map([...this.rows,...batch].map(r=>[r.id,r])).values()];this.pending.shift();this.remember();this.error=null;}this.onChange();})().finally(()=>this.flushing=null);return this.flushing;}
}
export async function syncFederation(db,match,source){
 if(!['FECAPA','RFEP'].includes(source?.federation))throw Error('No hi ha una font federativa verificada per a aquest partit.');
 const response=await db.functions.invoke('federation-sync',{body:{match_id:match}});
 if(response.error){
  const context=response.error.context;
  if(context instanceof Response){
   const body=await context.clone().json().catch(()=>null);
   if(context.status===401)throw Error('Sessió no vàlida. Torna a iniciar sessió.');
   if(context.status===403)throw Error('El servidor ha denegat la consulta federativa (HTTP 403).');
   throw Error(federationError(body?.error)||'El servei de sincronització ha respost amb HTTP '+context.status+'.');
  }
  throw Error('Error de connexió amb el servei de sincronització: '+response.error.message);
 }
 if(response.data?.error)throw Error(federationError(response.data.error));
 const results=Array.isArray(response.data?.results)?response.data.results.filter(item=>item?.match_id===match):[];
 const result=results.length===1?results[0]:null;
 if(result?.error)throw Error(federationError(result.error));
 if(!['verified','cached','unchanged','pending'].includes(result?.status))throw Error('El servei no ha confirmat cap dada del partit.');
 return result.status==='verified'&&result.team_id?'team_verified':result.status;
}

function federationError(message){
 const upstream=/Official source HTTP (\d+)/i.exec(message||'');
 return upstream?'La font federativa externa ha respost amb HTTP '+upstream[1]+'.':message;
}

export function federationSyncMessage(status){
 return {
  verified:'S’ha verificat l’acta amb el servidor federatiu i s’ha desat la còpia oficial.',
  team_verified:'S’han desat dades federatives de l’equip. El servei no ha confirmat una actualització específica de l’acta.',
  cached:'S’ha recuperat la memòria cau. Encara no s’ha fet cap consulta nova a la federació.',
  unchanged:'S’ha consultat la federació. Les dades oficials ja estaven actualitzades.',
  pending:'El servei no disposa d’una acta oficial verificable per a aquest partit.'
 }[status];
}
