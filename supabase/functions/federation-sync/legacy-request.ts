type Observation = {
 resource: string;
 method: 'POST';
 stage: 'connect' | 'http' | 'body' | 'validate' | 'complete';
 status: number | null;
 durationMs: number;
 redirected: boolean | null;
 mediaType: string | null;
 proxyReported: boolean;
};

// Only the fixed federation endpoint and response metadata appear in diagnostics.
export async function fetchLegacyHtml(
 federation: string,
 resource: string,
 referer: string,
 params: Record<string,string>,
 {fetcher=fetch,timeout=20000,maxLength=3000000,observe}: {
  fetcher?: typeof fetch; timeout?: number; maxLength?: number; observe?: (value: Observation)=>void;
 } = {},
) {
 const namespace=federation.toLowerCase();
 if(!['fecapa','rfep'].includes(namespace)||!new RegExp('^'+namespace+'_[a-z0-9_]+\\.php$').test(resource))throw Error('Invalid federation resource');
 const url=new URL(`https://www.server2.sidgad.es/${namespace}/${resource}`);
 const endpoint=url.host+url.pathname;
 const started=Date.now();
 const signal=AbortSignal.timeout(timeout);
 let response: Response | undefined;
 const report=(stage: Observation['stage'])=>{
  const type=(response?.headers.get('content-type')||'').split(';',1)[0].trim().toLowerCase();
  const mediaType=type?(/^(?:text|application)\/[a-z0-9.+-]{1,48}$/.test(type)?type:'other'):null;
  const durationMs=Date.now()-started;
  const proxyReported=response?.headers.has('proxy-status')||false;
  observe?.({resource:endpoint,method:'POST',stage,status:response?.status??null,durationMs,redirected:response?.redirected??null,mediaType,proxyReported});
  const annotations=[response?.redirected?'redirected':'',proxyReported?'proxy reported':'',mediaType,stage].filter(Boolean);
  return `POST ${endpoint}, ${durationMs} ms, ${annotations.join(', ')}`;
 };
 try {
  response=await fetcher(url,{method:'POST',headers:{Origin:new URL(referer).origin,Referer:referer,'X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams(params),signal});
 } catch {
  throw Error(`Official source ${signal.aborted?'timeout':'connection error'} (${report('connect')})`);
 }
 if(!response.ok){
  const message=`Official source HTTP ${response.status} (${report('http')})`;
  await response.body?.cancel().catch(()=>{});
  throw Error(message);
 }
 let html: string;
 try { html=await response.text(); }
 catch { throw Error(`Official source ${signal.aborted?'timeout':'response interrupted'} (${report('body')})`); }
 if(!html.trim()||html.length>maxLength)throw Error(`Empty or excessive official response (${report('validate')})`);
 report('complete');
 return html;
}
