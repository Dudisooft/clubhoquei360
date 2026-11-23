// Validate the restored Auth database with real GoTrue-issued sessions.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {work,secrets,docker,network,dbName} from './runtime.mjs';import {assertLocalStaging} from './safety.mjs';
assertLocalStaging(secrets);
const receipt=JSON.parse(fs.readFileSync(path.join(work,'restore-results.json'))),target=receipt.target;
assert.match(target,/^ch360_pr53_restore_[a-f0-9]{8}$/);
const database=JSON.parse(docker(['inspect',target]).stdout)[0];assert.equal(database.Config.Labels['ch360.staging'],secrets.projectId);assert.equal(database.HostConfig.NetworkMode,network);
function start(kind,port){
 const original=JSON.parse(docker(['inspect','ch360_pr53_'+kind]).stdout)[0];assert.equal(original.Config.Labels['ch360.staging'],secrets.projectId);
 const file=path.join(work,target+'_'+kind+'.env');
 if(!fs.existsSync(file))fs.writeFileSync(file,fs.readFileSync(path.join(work,'ch360_pr53_'+kind+'.env'),'utf8').replaceAll('@'+dbName+':5432','@'+target+':5432'),{mode:0o600});
 const name=target+'_'+kind,existing=docker(['inspect',name],{allowFailure:true});
 if(existing.status)docker(['run','-d','--pull=never','--name',name,'--label','ch360.staging='+secrets.projectId,'--network',network,'--env-file',file,original.Image]);
 else{assert.equal(JSON.parse(existing.stdout)[0].Config.Labels['ch360.staging'],secrets.projectId);docker(['start',name]);}
 const current=JSON.parse(docker(['inspect',name]).stdout)[0];assert.equal(current.HostConfig.NetworkMode,network);
 return {host:current.NetworkSettings.Networks[network].IPAddress,port};
}
const auth=start('auth',9999),rest=start('rest',3000);
async function request(target,path,method='GET',body=null,token=null){
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:target.host,port:target.port,path,method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}},r=>{let text='';r.on('data',c=>text+=c);r.on('end',()=>{let data=null;try{data=JSON.parse(text);}catch{}resolve({status:r.statusCode,data});});});
  req.on('error',reject);req.setTimeout(4000,()=>req.destroy(Error('Local timeout')));if(body)req.write(JSON.stringify(body));req.end();
 });
}
for(let i=0;i<40;i++){try{if((await request(auth,'/health')).status===200)break;}catch{}await new Promise(r=>setTimeout(r,200));}
const accounts=JSON.parse(fs.readFileSync(path.join(work,'accounts-private.json'))),f=JSON.parse(fs.readFileSync(path.join(work,'browser-fixture.json')));
for(const role of ['coordinator','delegate','otherclub']){
 const a=accounts[role],login=await request(auth,'/token?grant_type=password','POST',{email:a.email,password:a.password});assert.equal(login.status,200);assert.equal(login.data.user.id,a.id);
 const read=await request(rest,'/rpc/read_callup_workflow?'+new URLSearchParams({p_fixture:f.match,p_team:f.team}),'GET',null,login.data.access_token);
 assert.equal(read.status,role==='otherclub'?403:200);
 if(role!=='otherclub'){assert.equal(read.data.workflow_supported,true);assert.equal(read.data.callup.published,true);}
}
receipt.restored_auth_login=true;receipt.restored_postgrest_rls=true;
fs.writeFileSync(path.join(work,'restore-results.json'),JSON.stringify(receipt,null,2),{mode:0o600});
console.log('PASS: restored database authenticates real coordinator/delegate accounts and denies the foreign-club session through PostgREST.');
