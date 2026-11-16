// Link only stable federation IDs. Names and shirt numbers are display data.
export function compareCallup(official,players){
 const internalIds=new Set(players.map(p=>p.catalogue_player_id).filter(Boolean));
 const officialIds=new Set(official.map(p=>p.catalogue_player_id).filter(Boolean));
 const uncertain=officialIds.size!==official.length||internalIds.size!==players.length;
 const onlyOfficial=official.filter(p=>p.catalogue_player_id&&!internalIds.has(p.catalogue_player_id));
 const onlyInternal=players.filter(p=>p.catalogue_player_id&&!officialIds.has(p.catalogue_player_id));
 const shirts=new Map(official.filter(p=>p.catalogue_player_id).map(p=>[p.catalogue_player_id,p.dorsal]));
 const differentShirts=players.filter(p=>{
  if(official.filter(row=>row.catalogue_player_id===p.catalogue_player_id).length!==1)return false;
  const dorsal=shirts.get(p.catalogue_player_id);
  return dorsal!=null&&p.dorsal!=null&&String(dorsal)!==String(p.dorsal);
 });
 return {uncertain,onlyOfficial,onlyInternal,differentShirts};
}
