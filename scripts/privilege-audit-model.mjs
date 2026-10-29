// Audit classification only. Never runs SQL or changes application permissions.
export function assessPrivilege(p){
 if(p.defaultOnly)return {risk:p.clientBeneficiary?'B':'C',kind:'future_default',currentObjectGrant:false,exploitationProven:false};
 if(!p.effective)return {risk:'D',kind:'no_effective_privilege',currentObjectGrant:false,exploitationProven:false};
 if(p.ownerEntry||p.administrativeRole)return {risk:'C',kind:p.ownerEntry?'owner_authority':'administrative_role',currentObjectGrant:true,exploitationProven:false};
 if(p.clientInvocationProven)return {risk:'A',kind:'demonstrated_client_path',currentObjectGrant:true,exploitationProven:true};
 return {risk:'B',kind:p.explicitAcl?'explicit_client_acl':p.viaPublic?'public_acl':'role_membership',currentObjectGrant:true,exploitationProven:false};
}
export function currentGrantGate(rows){
 // Administrative/owner rights are not ordinary client grants. Future defaults
 // require their own review, not a fictional current-table vulnerability count.
 const unsafe=rows.filter(p=>!p.defaultOnly&&p.effective&&!p.ownerEntry&&!p.administrativeRole&&p.clientBeneficiary);
 return {ready:unsafe.length===0,unsafeCurrentClientGrants:unsafe.length,demonstratedClientPaths:unsafe.filter(p=>p.clientInvocationProven).length};
}
