import http from 'node:http';import {secrets,docker,network} from './remediation-runtime.mjs';import {assertLocalStaging} from './remediation-safety.mjs';
assertLocalStaging(secrets);
function target(name,port){const i=JSON.parse(docker(['inspect',name]).stdout)[0];if(i.Config.Labels?.['ch360.staging']!==secrets.projectId)throw Error('Gateway target is not staging.');const ip=i.NetworkSettings.Networks[network]?.IPAddress;if(!ip)throw Error('Missing isolated target IP.');return {hostname:ip,port};}
const server=http.createServer((req,res)=>{
 const origin=req.headers.origin;if(origin&&origin!=='http://127.0.0.1:56490'){res.writeHead(403);res.end();return;}
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:56490');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,range-unit');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');res.setHeader('Access-Control-Expose-Headers','content-range');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.url==='/.well-known/ch360-staging'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({projectId:secrets.projectId,isolation:'local-only',auth:'Supabase GoTrue',database:'PostgreSQL',rest:'PostgREST'}));return;}
 const auth=req.url?.startsWith('/auth/v1/'),rest=req.url?.startsWith('/rest/v1/');if((!auth&&!rest)||req.url.includes('oevprbchlhyglhvopnvy')){res.writeHead(404);res.end();return;}
 if(req.headers.apikey!==secrets.anonKey&&req.url!=='/auth/v1/health'){res.writeHead(401);res.end();return;}
 let upstream;try{upstream=target(auth?'ch360_3a8_auth':'ch360_3a8_rest',auth?9999:3000);}catch{res.writeHead(503);res.end();return;}
 const headers={...req.headers,host:'127.0.0.1'};delete headers.origin;const proxy=http.request({...upstream,path:req.url.replace(auth?'/auth/v1':'/rest/v1',''),method:req.method,headers},up=>{res.writeHead(up.statusCode,Object.fromEntries(Object.entries(up.headers).filter(([k])=>!k.startsWith('access-control'))));up.pipe(res);});proxy.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end();});req.pipe(proxy);
});server.listen(56431,'127.0.0.1',()=>console.log('Isolated gateway ready on loopback; forwards to real Auth and PostgREST.'));
