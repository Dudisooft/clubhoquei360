import test from 'node:test';
import assert from 'node:assert/strict';
import {digest,validateAccess,invitationGrant} from '../scripts/lib/pilot-access.mjs';
const record={digest:digest('fixture-secret'),user:'operator-fem15',federation:'FECAPA',team:'12419',match:'fem15-match',role:'external',expiresAt:10000};
test('invitations fix identity, club, match, role and expiry on the server',()=>{
 const list=validateAccess([record]);
 assert.equal(invitationGrant(list,'wrong',record.match,record.team,1),null);
 assert.equal(invitationGrant(list,'fixture-secret','other',record.team,1),null);
 assert.equal(invitationGrant(list,'fixture-secret',record.match,'other',1),null);
 assert.equal(invitationGrant(list,'fixture-secret',record.match,record.team,10000),null);
 assert.deepEqual(invitationGrant(list,'fixture-secret',record.match,record.team,1),{user:record.user,match:record.match,club:'FECAPA:12419',role:'external',expiresAt:10000});
});
test('malformed or duplicate local access configuration fails closed',()=>{
 for(const records of [[],[record,record],[{...record,digest:'bad'}],[{...record,role:'admin'}],[{...record,federation:'other'}]]) assert.throws(()=>validateAccess(records));
});
