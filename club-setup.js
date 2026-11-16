import {db} from './app-client.js';
import {csvColumns,parseClubCsv} from './club-csv.js';

const $=id=>document.getElementById(id);
const labels={clubs:'Clubs',seasons:'Temporades',teams:'Equips',roster:'Plantilla interna'};
const statuses={new:'Nova',repeated:'Repetida al fitxer',existing:'Ja existeix',ambiguous:'Coincidència ambigua'};
let scopes={},prepared=null,generation=0;

function clearPreview(){
 generation++;
 prepared=null;
 $('csvPreview').replaceChildren();
 $('csvCommit').disabled=true;
 $('csvStatus').textContent='';
}

function updateScope(preferred){
 clearPreview();
 const kind=$('csvKind').value;
 const targets=scopes[kind]||[];
 $('csvScope').replaceChildren(...targets.map(t=>new Option(t.label,t.id)));
 if(targets.some(t=>t.id===preferred))$('csvScope').value=preferred;
 $('csvScopeLabel').hidden=kind==='clubs';
 $('csvHelp').textContent=kind?'Capçalera CSV · '+csvColumns(kind)+(kind==='roster'
  ?' · Posició: pista o porteria. El dorsal pot quedar buit.'
  :kind==='teams'?' · Introdueix la categoria de cada equip.':''):'';
}

export function configureSetup(access){
 const clubs=access?.clubs||[];
 scopes={
  clubs:access?.global_admin?[{id:'',label:'Plataforma'}]:[],
  seasons:clubs.map(c=>({id:c.id,label:c.name})),
  teams:(access?.seasons||[]).map(s=>({id:s.id,label:clubs.find(c=>c.id===s.club_id)?.name+' · '+s.label})),
  roster:(access?.teams||[]).filter(t=>t.roster_import).map(t=>({
   id:t.id,label:[t.club_name,t.team_name,t.category,t.season_name].filter(Boolean).join(' · ')
  }))
 };
 const kinds=Object.keys(scopes).filter(kind=>scopes[kind].length);
 $('clubSetup').hidden=!kinds.length;
 $('setupNav').hidden=!kinds.length;
 $('csvKind').replaceChildren(...kinds.map(kind=>new Option(labels[kind],kind)));
 $('csvFile').value='';
 updateScope();
}

export function openSetup(team,kind='roster'){
 if(!scopes[kind]?.length)return;
 $('csvKind').value=kind;
 updateScope(team);
 $('clubSetup').open=true;
 $('clubSetup').scrollIntoView();
 $('csvFile').focus();
}

$('csvKind').onchange=()=>updateScope();
$('csvScope').onchange=clearPreview;
$('csvFile').onchange=clearPreview;
$('csvForm').onsubmit=async event=>{
 event.preventDefault();
 clearPreview();
 const version=generation;
 const kind=$('csvKind').value;
 const scope=$('csvScope').value||null;
 const file=$('csvFile').files[0];
 try{
  if(!file||file.size>250000)throw new Error('Tria un CSV de fins a 250 kB.');
  const rows=parseClubCsv(await file.text(),kind);
  if(version!==generation)return;
  const args={p_kind:kind,p_scope:scope,p_rows:rows};
  const {data,error}=await db.rpc('import_club_csv',args);
  if(version!==generation)return;
  if(error)throw error;
  const count=data.filter(row=>row.status==='new').length;
  const items=data.map(row=>{
   const li=document.createElement('li');
   li.textContent=[row.name,row.category,row.dorsal,row.position,row.starts_on,row.ends_on,statuses[row.status]].filter(Boolean).join(' · ');
   return li;
  });
  $('csvPreview').replaceChildren(...items);
  $('csvStatus').textContent=count+' files noves de '+data.length+'. Es conservaran els registres existents.';
  prepared={...args,p_preview:data};
  $('csvCommit').disabled=!count;
 }catch(error){
  if(version===generation)$('csvStatus').textContent=error.message;
 }
};

$('csvCommit').onclick=async()=>{
 if(!prepared)return;
 const version=generation;
 const form=$('csvForm');
 form.inert=true;
 $('csvCommit').disabled=true;
 try{
  const {data,error}=await db.rpc('import_club_csv',prepared);
  if(version!==generation)return;
  if(error)throw error;
  const count=data.filter(row=>row.status==='new').length;
  const {data:access}=await db.rpc('club_setup_access',{});
  if(version!==generation)return;
  if(access)document.dispatchEvent(new CustomEvent('club-setup-updated',{detail:access}));
  else clearPreview();
  $('csvStatus').textContent='Files importades: '+count+'.';
 }catch(error){
  if(version===generation){
   clearPreview();
   $('csvStatus').textContent=error.message+' Torna a previsualitzar el CSV.';
  }
 }finally{
  form.inert=false;
 }
};
