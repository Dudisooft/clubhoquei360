// Persistent per-club/per-match outbox. Demo identities are NOT production access.
export class PilotJournal {
 constructor({indexedDB=globalThis.indexedDB,name='ch360-functional-pilot-v1'}={}){this.indexedDB=indexedDB;this.name=name;}
 async open(){if(this.db)return this;this.db=await new Promise((resolve,reject)=>{const r=this.indexedDB.open(this.name,1);r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return this;}
 key(club,match,user){return [club,match,user].map(encodeURIComponent).join(':');}
 async transact(mode,fn){await this.open();return new Promise((resolve,reject)=>{const t=this.db.transaction('records',mode);let value;try{value=fn(t.objectStore('records'));}catch(e){t.abort();reject(e);return;}t.oncomplete=()=>resolve(value?.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('No s’ha pogut conservar la dada'));});}
 async read(key){return await this.transact('readonly',s=>s.get(key))||{key,events:[],clock:null};}
 async mutate(key,fn){await this.open();return new Promise((resolve,reject)=>{const t=this.db.transaction('records','readwrite'),s=t.objectStore('records'),r=s.get(key);let next;r.onsuccess=()=>{try{next=fn(r.result||{key,events:[],clock:null});s.put(next);}catch(e){t.abort();reject(e);}};t.oncomplete=()=>resolve(next);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('No s’ha pogut conservar la dada'));});}
 async append(key,event){return this.mutate(key,r=>({...r,events:[...r.events,{...event,id:event.id||crypto.randomUUID(),mutation_id:event.mutation_id||crypto.randomUUID(),pending:true}]}));}
 async clock(key,state){return this.mutate(key,r=>({...r,clock:state}));}
 async acknowledge(key,id){return this.mutate(key,r=>({...r,events:r.events.map(e=>e.id===id?{...e,pending:false}:e)}));}
 async merge(key,remote){return this.mutate(key,r=>{const byId=new Map(r.events.map(e=>[e.id,e]));for(const e of remote)byId.set(e.id,{...e,pending:false});return {...r,events:[...byId.values()]};});}
 async sync(key,transport){let state=await this.read(key);for(const event of state.events.filter(e=>e.pending)){await transport.send(event);await this.acknowledge(key,event.id);}return this.merge(key,await transport.list());}
}
