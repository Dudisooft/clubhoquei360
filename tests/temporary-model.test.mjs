import test from 'node:test';import assert from 'node:assert/strict';import {expiry,expiryInput,invitationUrl} from '../temporary-access-model.js';
test('trial durations are exact hours and custom expiry uses Europe/Madrid rather than machine time',()=>{
 const now=Date.parse('2026-10-23T10:00:00Z');for(const hours of [24,168,720])assert.equal(Date.parse(expiry(String(hours),'',now))-now,hours*3600000);
 assert.equal(expiry('custom','2026-10-24T12:00',now),'2026-10-24T10:00:00.000Z');assert.equal(expiry('custom','2026-10-26T12:00',now),'2026-10-26T11:00:00.000Z');assert.equal(expiryInput('2026-10-24T10:00:00Z'),'2026-10-24T12:00');
});
test('invalid/past expiry and nonexistent local DST times are rejected',()=>{
 assert.throws(()=>expiry('custom','2026-03-29T02:30',Date.parse('2026-03-28T00:00Z')),/no existeix/);assert.throws(()=>expiry('custom','2026-01-01T00:00',Date.parse('2026-10-23T00:00Z')),/futura/);assert.throws(()=>expiry('bad',''),/vàlida/);
});
test('acceptance URL stays under Pages subdirectory and puts the secret only in its fragment',()=>{
 const token='f'.repeat(64),url=new URL(invitationUrl(token,'https://club.example.test/clubhoquei360/accessos-temporals.html'));assert.equal(url.pathname,'/clubhoquei360/convidat.html');assert.equal(url.search,'');assert.equal(url.hash,'#invite='+token);assert.throws(()=>invitationUrl('bad','https://club.example.test'),/no vàlid/);
});
