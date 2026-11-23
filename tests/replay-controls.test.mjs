import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parseHTML} from 'linkedom';
import {isCalendarOnlySource} from '../federation-selection.js';
test('selecting the Principal view never enables event corrections for a read-only account',()=>{
 const {document}=parseHTML(fs.readFileSync('avancat.html','utf8'));document.querySelector('#profile option[value=main]').setAttribute('selected','');
 document.querySelector('#feed').innerHTML='<button data-event-edit="0">Edit</button><button data-event-remove="0">Remove</button>';
 const recovery=document.createElement('button');recovery.id='resumeOfficialPending';document.body.append(recovery);
 const client=fs.readFileSync('federation-client.js','utf8'),start=client.indexOf(' function controls()'),end=client.indexOf(' render=function()',start);
 const ctx=vm.createContext({document,s:{startersConfirmed:true,starterSelections:{home:[],away:[]},half:1,timeoutsUsed:{home:{1:0},away:{1:0}}},pending:[],match:'fixture',analysis:{canOpenTeamRecorder:false},isCalendarOnlySource,roster:{busy:false,available:false},officialReady:()=>true,source:{federation_match_id:'1'},role:'viewer',loading:false,$:id=>document.getElementById(id),person:()=>null,timeoutLimit:()=>2,refreshRecoverButton:()=>{}});
 vm.runInContext(client.slice(start,end)+';controls()',ctx);
 for(const b of document.querySelectorAll('[data-event-edit],[data-event-remove]'))assert.equal(b.disabled,true);
 vm.runInContext('role="operator";controls()',ctx);for(const b of document.querySelectorAll('[data-event-edit],[data-event-remove]'))assert.equal(b.disabled,false);
});
