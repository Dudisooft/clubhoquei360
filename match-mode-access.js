// Capabilities come from an authenticated server RPC, never URL/profile labels.
export async function readModeAccess(db,{catalogue=null,match=null}={}){
 if((!catalogue)===(!match))throw Error('Cal identificar exactament un partit.');
 const r=await db.rpc('match_mode_access',{p_catalogue:catalogue,p_match:match});
 if(r.error)throw Error('No s’han pogut verificar els modes al servidor: '+r.error.message);
 const a=r.data;if(!a||typeof a!=='object'||Array.isArray(a)||typeof a.read!=='boolean')throw Error('El servidor no ha confirmat els permisos del partit.');
 return {...a,read:a.read===true,base:a.read===true&&a.base===true,advanced:a.read===true&&a.advanced===true,operational_read:a.read===true&&a.operational_read===true,activate_base:a.read===true&&a.activate_base===true,activate_advanced:a.read===true&&a.advanced===true&&a.activate_advanced===true};
}
export const modeAllowed=(access,mode)=>access?.read===true&&(mode==='base'?access.base===true:mode==='advanced'&&access.advanced===true);
export async function activateCatalogue(db,{catalogue,mode,practice=false}){
 const access=await readModeAccess(db,{catalogue});
 if(!modeAllowed(access,mode)||!access['activate_'+mode])throw Error('No tens permís per activar aquest mode.');
 const r=await db.rpc('match_activate_catalogue',{p_catalogue:catalogue,p_mode:mode,p_practice:practice});
 if(r.error)throw Error('No s’ha activat el registre: '+r.error.message);
 if(typeof r.data!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.data))throw Error('El servidor no ha confirmat la identitat del context.');
 const confirmed=await readModeAccess(db,{match:r.data});
 if(confirmed.catalogue_id!==catalogue||confirmed.operational!==r.data||!confirmed.operational_read||!modeAllowed(confirmed,mode))throw Error('El context retornat no correspon al partit autoritzat.');
 return r.data;
}
