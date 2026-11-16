const formats = {
 clubs: ['nom'],
 seasons: ['nom','inici','fi'],
 teams: ['nom','categoria'],
 roster: ['nom','dorsal','posicio']
};

export function csvColumns(kind){
 return formats[kind].join(';');
}

export function parseClubCsv(text,kind){
 const source=text.replace(/^\uFEFF/,'').trimEnd();
 const header=source.split(/\r?\n/,1)[0];
 const delimiter=header.includes(';')?';':',';
 const records=[];
 let cells=[],value='',quoted=false,closed=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(quoted){
   if(c==='"'&&source[i+1]==='"'){value+='"';i++;}
   else if(c==='"'){quoted=false;closed=true;}
   else value+=c;
  }else if(c===delimiter||c==='\n'||c==='\r'){
   cells.push(value.trim());
   value='';
   closed=false;
   if(c===delimiter)continue;
   if(c==='\r'&&source[i+1]==='\n')i++;
   if(cells.some(Boolean))records.push(cells);
   cells=[];
  }else if(c==='"'&&!value&&!closed){
   quoted=true;
  }else{
   if(c==='"'||closed)throw new Error('Revisa les cometes del CSV.');
   value+=c;
  }
 }
 if(quoted)throw new Error('Hi ha un camp del CSV amb cometes sense tancar.');
 cells.push(value.trim());
 if(cells.some(Boolean))records.push(cells);
 const columns=records.shift()?.map(value=>value.toLowerCase());
 if(columns?.join(';')!==csvColumns(kind))throw new Error('Capçalera esperada · '+csvColumns(kind));
 if(!records.length||records.length>500)throw new Error('El CSV ha de contenir entre 1 i 500 files de dades.');
 return records.map((row,index)=>{
  if(row.length!==columns.length)throw new Error('Revisa el nombre de camps de la fila '+(index+2)+'.');
  return Object.fromEntries(columns.map((column,i)=>[column,row[i]]));
 });
}
