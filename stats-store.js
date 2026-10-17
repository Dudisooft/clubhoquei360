/* Shared Supabase persistence. A local outbox is a recovery mechanism, never
 * evidence that a server write succeeded. UUID + mutation UUID survive retries. */
export class StatsStore {
  constructor(db,{storage=localStorage,onChange=()=>{}}={}){this.db=db;this.storage=storage;this.onChange=onChange;this.pending=[];this.events=[];this.official=[];this.coverage=[];this.assignments=[];this.session=null;this.access={read:false,manage:false};this.flushing=null;this.generation=0;}
  key(suffix='outbox'){return `ch360-stats-v2:${this.uid}:${this.match}:${suffix}`;}
  remember(){this.storage.setItem(this.key(),JSON.stringify(this.pending));}
  async all(table,columns='*',configure=q=>q){
    const out=[];for(let offset=0;;offset+=500){const r=await configure(this.db.from(table).select(columns)).order(({stats_event_audit:'mutation_id',stats_matches:'match_id',stats_coverage:'match_id',stats_sessions:'match_id',federation_match_sources:'match_id',pilot_operator_state:'match_id'})[table]||'id').range(offset,offset+499);if(r.error)throw r.error;out.push(...r.data);if(r.data.length<500)return out;}
  }
  async open(match,uid){
    this.generation++;this.match=match;this.uid=uid;this.pending=JSON.parse(this.storage.getItem(this.key())||'[]');this.events=[];this.session=null;this.access={read:false,manage:false};
    await this.refresh();
    if(this.access.read){const r=await this.db.from('stats_sessions').select('*').eq('match_id',match).eq('user_id',uid).maybeSingle();if(r.error)throw r.error;this.session=r.data;}
    this.onChange();
  }
  async refresh(){
    const generation=this.generation,match=this.match;
    const permission=await this.db.rpc('stats_access',{p_match:match});if(permission.error)throw permission.error;
    if(generation!==this.generation)return;
    this.access=permission.data||{};
    if(!this.access.read){this.events=[];this.official=[];this.coverage=[];this.assignments=[];this.onChange();return;}
    const query=table=>this.all(table,'*',q=>q.eq('match_id',match));
    const results=await Promise.all([query('stats_events'),query('pilot_events'),query('stats_assignments'),query('stats_coverage'),this.db.from('stats_matches').select('*').eq('match_id',match).single()]);
    if(generation!==this.generation)return;
    if(results[4].error)throw results[4].error;
    [this.events,this.official,this.assignments,this.coverage]=results;this.context=results[4].data;
    this.onChange();
  }
  optimistic(){const map=new Map(this.events.map(e=>[e.id,e]));for(const p of this.pending)if(!p.blocked)map.set(p.event.id,{...p.event,revision:p.expected+1,operator_id:map.get(p.event.id)?.operator_id||this.uid,pending:true});return [...map.values()];}
  enqueue(event,expected=0){
    const item={event:{...event,id:event.id||crypto.randomUUID(),match_id:this.match,mutation_id:event.mutation_id||crypto.randomUUID()},expected};
    this.pending.push(item);try{this.remember();}catch(e){this.pending.pop();throw Error('No es pot conservar la cua local. Exporta les dades abans de continuar. '+e.message);}
    this.onChange();return this.flush();
  }
  async flush(){
    if(this.flushing)return this.flushing;
    const generation=this.generation;
    this.flushing=(async()=>{
      while(this.pending.length&&generation===this.generation){
        const item=this.pending[0];if(item.blocked)break;
        let response;try{response=await this.db.rpc('stats_write_event',{p_event:item.event,p_expected:item.expected});}catch(e){this.error=e.message;break;}
        if(generation!==this.generation)return;
        if(response.error){this.error=response.error.message;item.error=this.error;
          // Network failures can retry on reconnect. Scope/revision/validation
          // errors require review and must never be mistaken for an ACK.
          if(response.error.code&&response.error.code!=='PGRST000')item.blocked=true;
          this.remember();this.onChange();break;
        }
        const saved=Array.isArray(response.data)?response.data[0]:response.data;
        if(!saved?.id){this.error='Resposta de desament incompleta';break;}
        this.events=this.events.filter(e=>e.id!==saved.id).concat(saved);this.pending.shift();this.remember();this.error=null;this.onChange();
      }
    })().finally(()=>{this.flushing=null;});
    return this.flushing;
  }
  async retry(){for(const p of this.pending){delete p.blocked;delete p.error;}this.remember();await this.flush();}
  discard(mutationId){this.pending=this.pending.filter(p=>p.event.mutation_id!==mutationId);this.remember();this.onChange();}
  saveLocalClock(state){this.storage.setItem(this.key('clock'),JSON.stringify({state,serverRevision:this.session?.revision||0,savedAt:new Date().toISOString()}));}
  localClock(){try{return JSON.parse(this.storage.getItem(this.key('clock'))||'null');}catch{return null;}}
  async saveSession(state){
    const generation=this.generation,match=this.match;this.saveLocalClock(state);
    const response=await this.db.rpc('stats_save_session',{p_match:match,p_expected:this.session?.revision||0,p_state:state});if(response.error)throw response.error;
    if(generation!==this.generation)return null;
    this.session=Array.isArray(response.data)?response.data[0]:response.data;this.saveLocalClock(state);return this.session;
  }
}
