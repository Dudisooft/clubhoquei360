import {createClient} from 'npm:@supabase/supabase-js@2.95.3';
import nodemailer from 'npm:nodemailer@10.2.1';
import {createTemporaryAccessHandler} from './handler.js';
const env=(name:string)=>Deno.env.get(name)||'';
const url=env('SUPABASE_URL'),secret=env('SUPABASE_SERVICE_ROLE_KEY'),anon=env('SUPABASE_ANON_KEY');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const baseUrl=env('TEMPORARY_ACCESS_APP_URL')||'https://dudisooft.github.io/clubhoquei360/convidat.html';
const smtpHost=env('TEMPORARY_SMTP_HOST'),smtpUser=env('TEMPORARY_SMTP_USER'),smtpPassword=env('TEMPORARY_SMTP_PASSWORD'),from=env('TEMPORARY_SMTP_FROM');
const smtpPort=Number(env('TEMPORARY_SMTP_PORT')||'587');
const smtpReady=!!(smtpHost&&smtpUser&&smtpPassword&&from&&[465,587].includes(smtpPort));
const mailer=smtpReady?nodemailer.createTransport({host:smtpHost,port:smtpPort,secure:smtpPort===465,requireTLS:true,auth:{user:smtpUser,pass:smtpPassword},connectionTimeout:10000,socketTimeout:15000}):null;
Deno.serve(createTemporaryAccessHandler({
 service:createClient(url,secret,options),publicAuth:createClient(url,anon,options).auth,
 callerClient:(jwt:string)=>createClient(url,anon,{...options,global:{headers:{Authorization:'Bearer '+jwt}}}),
 invitationBaseUrl:baseUrl,allowedOrigin:new URL(baseUrl).origin,rateSalt:secret,
 otpReady:env('TEMPORARY_ACCESS_OTP_READY')==='true',smtpReady,
 deliverInvitation:async({to,url}:{to:string;url:string})=>{
  if(!mailer)throw Error('SMTP unavailable');
  const result=await mailer.sendMail({from,to,subject:'ClubHoquei360 · Invitació temporal',text:'Has rebut una invitació temporal a ClubHoquei360. Obre aquest enllaç abans de 30 minuts i verifica el teu correu per activar-la:\n\n'+url+'\n\nL’enllaç és d’un sol ús i no concedeix accés sense verificar el correu destinatari.'});
  if(!result.accepted?.length)throw Error('SMTP did not accept recipient');
 }
}));
