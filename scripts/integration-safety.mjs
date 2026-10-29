// Every staging entry point must fail before network/SQL when this check fails.
export const LOCAL_PROJECT='clubhoquei360-3a6-local';
export const LOCAL_API='http://127.0.0.1:56331';
export const LOCAL_DB='postgresql://127.0.0.1:56332/postgres';
const PRODUCTION_REF='oevprbchlhyglhvopnvy';
export function assertLocalStaging({projectId,apiUrl,dbUrl}){
 if(projectId!==LOCAL_PROJECT)throw Error('Staging requires the exact isolated local project identifier.');
 for(const [value,protocol,port] of [[apiUrl,'http:','56331'],[dbUrl,'postgresql:','56332']]){
  if(typeof value!=='string'||value.toLowerCase().includes(PRODUCTION_REF))throw Error('Production identifiers are forbidden in staging.');
  let u;try{u=new URL(value);}catch{throw Error('Invalid staging endpoint.');}
  if(u.protocol!==protocol||u.hostname!=='127.0.0.1'||u.port!==port||u.search||u.hash)throw Error('Only the fixed loopback staging endpoints are allowed.');
 }
 return true;
}

export function assertLocalConfig(text){
 if(typeof text!=='string'||text.includes(PRODUCTION_REF)||/https?:\/\/[^\s"']*\.supabase\.co\b/.test(text))throw Error('Remote or production staging configuration rejected.');
 if(!text.includes(`project_id = "${LOCAL_PROJECT}"`))throw Error('Unexpected local project configuration.');
 return true;
}
