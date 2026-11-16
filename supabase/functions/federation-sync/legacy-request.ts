// The legacy endpoint remains fixed. Error details omit form fields and response bodies.
export async function fetchLegacyHtml(
 federation: string,
 resource: string,
 referer: string,
 params: Record<string,string>,
 {fetcher=fetch,timeout=20000,maxLength=3000000} = {},
) {
 const namespace=federation.toLowerCase();
 if(!['fecapa','rfep'].includes(namespace)||!new RegExp('^'+namespace+'_[a-z0-9_]+\\.php$').test(resource))throw Error('Invalid federation resource');
 const url=new URL(`https://www.server2.sidgad.es/${namespace}/${resource}`);
 const context=`POST ${url.host}${url.pathname}`;
 const started=Date.now();
 const signal=AbortSignal.timeout(timeout);
 let response: Response;
 try {
  response=await fetcher(url,{method:'POST',headers:{Origin:new URL(referer).origin,Referer:referer,'X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams(params),signal});
 } catch {
  throw Error(`Official source ${signal.aborted?'timeout':'connection error'} (${context}, ${Date.now()-started} ms)`);
 }
 const diagnostic=`${context}, ${Date.now()-started} ms${response.redirected?', redirected':''}${response.headers.has('proxy-status')?', proxy reported':''}`;
 if(!response.ok)throw Error(`Official source HTTP ${response.status} (${diagnostic})`);
 let html: string;
 try { html=await response.text(); }
 catch { throw Error(`Official source ${signal.aborted?'timeout':'response interrupted'} (${diagnostic})`); }
 if(!html.trim()||html.length>maxLength)throw Error(`Empty or excessive official response (${diagnostic})`);
 return html;
}
