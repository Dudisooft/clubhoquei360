/* Subscription state is separate from HTTP write acknowledgements and polling.
 * Only an applied refresh triggered by postgres_changes marks a live update. */
export class StatsLiveSync {
 constructor(db,{refresh,onChange=()=>{},onError=()=>{},now=()=>Date.now()}){
  this.db=db;this.refresh=refresh;this.onChange=onChange;this.onError=onError;this.now=now;
  this.generation=0;this.current=null;this.state={status:'idle',lastUpdateAt:null};
 }
 snapshot(){return {...this.state};}
 publish(changes){this.state={...this.state,...changes};this.onChange(this.snapshot());}
 async remove(channel){if(channel)try{await this.db.removeChannel(channel);}catch{/* HTTP recovery remains available if transport cleanup fails. */}}
 async stop(){const previous=this.current;this.generation++;this.current=null;this.publish({status:'idle',lastUpdateAt:null});await this.remove(previous?.channel);}
 async start({match,uid}){
  const generation=++this.generation,previous=this.current;this.current=null;
  this.publish({status:'connecting',lastUpdateAt:null});await this.remove(previous?.channel);
  if(generation!==this.generation)return;
  const context={channel:this.db.channel('stats-'+match+'-'+uid),pending:false,notificationPending:false,task:null};
  this.current=context;
  for(const table of ['stats_events','stats_assignments','stats_coverage'])context.channel.on('postgres_changes',{event:'*',schema:'public',table,filter:'match_id=eq.'+match},()=>{
   if(this.current===context)return this.queueRefresh(context,true);
  });
  context.channel.subscribe(status=>{
   if(this.current!==context)return;
   if(status==='SUBSCRIBED'){this.publish({status:'connected'});return this.queueRefresh(context,false);}
   if(['TIMED_OUT','CHANNEL_ERROR','CLOSED'].includes(status))this.publish({status:'reconnecting'});
  });
 }
 queueRefresh(context,direct){
  context.pending=true;context.notificationPending ||= direct;
  if(context.task)return context.task;
  context.task=Promise.resolve().then(async()=>{
   while(this.current===context&&context.pending){
    const notification=context.notificationPending;context.pending=false;context.notificationPending=false;
    try{
     const canRead=await this.refresh();
     if(this.current!==context)return;
     if(canRead===false){await this.stop();return;}
     if(notification)this.publish({lastUpdateAt:this.now()});
    }catch(e){if(this.current===context)this.onError(e);}
   }
  }).finally(()=>{context.task=null;if(this.current===context&&context.pending)return this.queueRefresh(context,false);});
  return context.task;
 }
}
