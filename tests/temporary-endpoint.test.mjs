import test from 'node:test';import assert from 'node:assert/strict';
import {createTemporaryAccessHandler} from '../supabase/functions/temporary-access/handler.js';
const token='a'.repeat(64);
function fixture(options={}){
 const calls=[],mail=[];const state={allowed:true,needsIdentity:false,superoperator:true,smtpReady:true,otpReady:true,...options};
 const handler=createTemporaryAccessHandler({allowedOrigin:'https://club.example.test',invitationBaseUrl:'https://club.example.test/clubhoquei360/convidat.html',rateSalt:'FICTITIOUS-SERVER-ONLY',smtpReady:state.smtpReady,otpReady:state.otpReady,
 service:{rpc:async(name,args)=>{calls.push({name,args});return {data:{allowed:state.allowed,email:'guest@example.test',needs_identity:state.needsIdentity}};},auth:{admin:{createUser:async args=>{calls.push({name:'createUser',args});return {};}}}},
 publicAuth:{signInWithOtp:async args=>{calls.push({name:'otp',args});return state.otpError?{error:Error('Provider error')}:{};}},
 callerClient:()=>({auth:{getUser:async()=>({data:{user:{id:'FICTITIOUS'}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:name==='temporary_admin_access'?state.superoperator:'guest@example.test'};}}),
 deliverInvitation:async data=>{if(state.smtpError)throw Error('SMTP rejected');mail.push(data);}
 });
 const request=(body,auth=true,origin='https://club.example.test')=>handler(new Request('https://edge.example.test',{method:'POST',headers:{origin,...(auth?{authorization:'Bearer FICTITIOUS'}:{}),'content-type':'application/json'},body:JSON.stringify(body)}));
 return {request,calls,mail,state};
}
test('unverified caller/club administrator cannot send invitations even with a valid-looking link',async()=>{
 const f=fixture({superoperator:false});assert.equal((await f.request({action:'send-invitation',token,id:'FICTITIOUS'})).status,403);assert.equal(f.mail.length,0);
 assert.equal((await f.request({action:'capabilities'},false)).status,401);
});
test('missing SMTP reports a copy-link fallback and never falsely claims email was sent',async()=>{
 const f=fixture({smtpReady:false});const response=await f.request({action:'send-invitation',token,id:'FICTITIOUS'});assert.equal(response.status,503);assert.match((await response.json()).error,/no s’ha enviat/);assert.equal(f.mail.length,0);
});
test('configured SMTP sends only to the server-checked recipient and uses the fixed application fragment URL',async()=>{
 const f=fixture();const result=await f.request({action:'send-invitation',id:'FICTITIOUS',token,email:'attacker@example.test',url:'https://attacker.example.test'});assert.equal(result.status,200);assert.equal((await result.json()).sent,true);assert.deepEqual(f.mail,[{to:'guest@example.test',url:'https://club.example.test/clubhoquei360/convidat.html#invite='+token}]);
});
test('SMTP rejection or an OTP provider error never produces a successful delivery claim',async()=>{
 const f=fixture({smtpError:true});assert.equal((await f.request({action:'send-invitation',id:'FICTITIOUS',token})).status,502);
 const o=fixture({otpError:true});assert.equal((await o.request({action:'request-code',email:'guest@example.test',token},false)).status,502);
});
test('email verification requires a configured provider; technical identity is unconfirmed and public signup is disabled',async()=>{
 const off=fixture({otpReady:false});assert.equal((await off.request({action:'request-code',email:'guest@example.test',token},false)).status,503);assert.equal(off.calls.length,0);
 const f=fixture({needsIdentity:true});assert.equal((await f.request({action:'request-code',email:'guest@example.test',token},false)).status,200);
 assert.deepEqual(f.calls.find(c=>c.name==='createUser').args,{email:'guest@example.test',email_confirm:false});assert.equal(f.calls.find(c=>c.name==='otp').args.options.shouldCreateUser,false);
 const reservation=f.calls.find(c=>c.name==='temporary_reserve_email');assert.match(reservation.args.p_address_hash,/^[a-f0-9]{64}$/);
});
test('invalid or rate-limited invitation cannot create an Auth identity or send an OTP; wrong origin is blocked',async()=>{
 const f=fixture({allowed:false});const result=await f.request({action:'request-code',email:'guest@example.test',token},false);assert.equal(result.status,200);assert.match((await result.json()).message,/Si les dades/);assert.equal(f.calls.some(c=>c.name==='otp'||c.name==='createUser'),false);
 assert.equal((await f.request({action:'request-code',email:'guest@example.test',token},false,'https://attacker.example.test')).status,403);
 assert.equal((await f.request({action:'request-code',email:'guest@example.test',token:'invalid'},false)).status,400);
});
