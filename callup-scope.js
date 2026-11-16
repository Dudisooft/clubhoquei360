// Display filtering only. RPCs remain responsible for authorization.
export function scopeCallupFixtures(fixtures,teams,clubId,teamId=''){
 const seen=new Set();
 return fixtures.filter(f=>{
  const team=teams.get(f.team_id);
  if(!team||(clubId&&team.club_id!==clubId)||(teamId&&f.team_id!==teamId))return false;
  const key=JSON.stringify([f.fixture_id,f.team_id]);
  if(seen.has(key))return false;
  seen.add(key);
  return true;
 });
}
