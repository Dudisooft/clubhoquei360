export const LOCAL_PROJECT='clubhoquei360-3a8-local',LOCAL_API='http://127.0.0.1:56431',LOCAL_DB='postgresql://127.0.0.1:56432/postgres';
export function assertLocalStaging(c){
 if(c.projectId!==LOCAL_PROJECT||c.apiUrl!==LOCAL_API||c.dbUrl!==LOCAL_DB)throw Error('Only the exact isolated 3A.8 endpoints are permitted.');
 for(const value of [c.apiUrl,c.dbUrl])if(value.includes('oevprbchlhyglhvopnvy')||value.includes('.supabase.co'))throw Error('Production/remote endpoint rejected.');
 return true;
}
