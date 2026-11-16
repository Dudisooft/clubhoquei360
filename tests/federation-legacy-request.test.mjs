import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchLegacyHtml} from '../supabase/functions/federation-sync/legacy-request.ts';

test('legacy transport identifies the failed resource and does not retry or log the body',async()=>{
 const referer='https://www.hoqueipatins.fecapa.cat/league/4811';
 let calls=0;
 const fetcher=async(url,options)=>{
  calls++;
  assert.equal(url.href,'https://www.server2.sidgad.es/fecapa/fecapa_stats_1_4811.php');
  assert.equal(options.method,'POST');
  assert.equal(options.headers.Origin,new URL(referer).origin);
  assert.equal(options.headers.Referer,referer);
  assert.equal(options.body.get('tipo_stats'),'plantillas');
  return new Response('private-response',{status:403});
 };
 await assert.rejects(fetchLegacyHtml('FECAPA','fecapa_stats_1_4811.php',referer,{tipo_stats:'plantillas'},{fetcher}),error=>{
  assert.match(error.message,/Official source HTTP 403 \(POST www\.server2\.sidgad\.es\/fecapa\/fecapa_stats_1_4811\.php, \d+ ms\)/);
  assert.doesNotMatch(error.message,/private-response|plantillas/);
  return true;
 });
 assert.equal(calls,1);
});

test('legacy RFEP transport distinguishes connection failure, empty content and a fetched report',async()=>{
 const request=fetcher=>fetchLegacyHtml('RFEP','rfep_gr_4321_1.php','https://www.hockeypatines.fep.es/',{idp:'4321'},{fetcher});
 await assert.rejects(request(async()=>{throw Error('internal detail');}),/Official source connection error \(POST .*rfep_gr_4321_1\.php/);
 await assert.rejects(request(async()=>new Response('  ')),/Empty or excessive official response/);
 assert.equal(await request(async()=>new Response('<table>Fixture</table>')),'<table>Fixture</table>');
});
