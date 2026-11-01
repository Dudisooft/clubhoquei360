/* FED-01 experimental contract: synthetic transport only. No fetch, database,
 * credentials, scheduler or production import. Not a Playoff/SIDGAD parser. */
import {createHash} from 'node:crypto';
const id=v=>typeof v==='string'&&v.trim().length>0;
export function identity(federation,season,competition,match){
 if(!['FECAPA','RFEP'].includes(federation)||![season,competition,match].every(id))throw Error('Invalid scoped identity');
 return JSON.stringify([federation,season,competition,match]);
}
export function classifyResponse({status,body='',retryAfter=null}){
 if(status===401||status===403)return {state:'access_denied',retry:false};
 if(status===429)return {state:'rate_limited',retry:true,retryAfter};
 if(status===304)return {state:'not_modified',retry:false};
 if(status>=500)return {state:'upstream_error',retry:true};
 if(status!==200)return {state:'unavailable',retry:false};
 if(!body.trim())return {state:'empty_response',retry:false};
 return {state:'received',retry:false};
}
export function validateReport(report,expected){
 const errors=[];
 if(!report||report.kind!=='match_lineup')return {state:'partial',errors:['Match lineup required; season roster is not a substitute']};
 const key=identity(expected.federation,expected.season,expected.competition,expected.match);
 if(identity(report.federation,report.season,report.competition,report.match)!==key)errors.push('Match scope mismatch');
 if(!id(report.sourceUrl)||!/^https:\/\//.test(report.sourceUrl)||!Number.isFinite(Date.parse(report.fetchedAt)))errors.push('Provenance missing');
 const seen=new Set();
 for(const side of ['home','away']){
  const line=report[side];if(!line||line.teamId!==expected[side+'TeamId']||!Array.isArray(line.players)||!line.players.length){errors.push(side+' incomplete');continue;}
  for(const p of line.players){
   if(!id(p.id)||!id(p.name)||p.shirt!=null&&!/^\d{1,3}$/.test(p.shirt))errors.push('Invalid participant');
   if(seen.has(p.id))errors.push('Duplicate participant across match');seen.add(p.id);
   // Missing optional goals/assists/cards are null, never inferred as zero.
  }
 }
 return {state:errors.length?'partial':'verified',errors};
}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).filter(k=>k!=='fetchedAt').sort().map(k=>[k,canonical(v[k])])):v;
export const fingerprint=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export function stageReport(previous,incoming,expected){
 const validation=validateReport(incoming,expected);
 if(validation.state!=='verified')return {state:'partial',official:previous,errors:validation.errors};
 return {state:previous&&fingerprint(previous)===fingerprint(incoming)?'unchanged':'staged',official:structuredClone(incoming)};
}
export async function fixtureConnector(source,expected,readFixture){
 if(source.mode!=='synthetic')return {state:'authorization_pending'};
 const response=await readFixture();return {...validateReport(response,expected),report:response};
}
