// Presentation selection never grants membership or match access.
export function readableText(background,preferred='#ffffff'){
 const rgb=background.slice(1).match(/../g).map(v=>{const x=parseInt(v,16)/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
 const l=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 const luminance=c=>{const xs=c.slice(1).match(/../g).map(v=>{const x=parseInt(v,16)/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*xs[0]+.7152*xs[1]+.0722*xs[2];};
 const p=luminance(preferred);return (Math.max(l,p)+.05)/(Math.min(l,p)+.05)>=4.5?preferred:l>.179?'#000000':'#ffffff';
}
export function applyIdentity(config,document){
 for(const [name,value] of Object.entries({'--brand':config.primary_color,'--club-header':config.secondary_color,'--brand-text':readableText(config.primary_color,config.contrast_color),'--club-header-text':readableText(config.secondary_color,config.contrast_color)}))document.documentElement.style.setProperty(name,value);
 const identity=document.getElementById('clubIdentity');if(identity){identity.replaceChildren();if(config.crest_url&&/^https:\/\//.test(config.crest_url)){const img=document.createElement('img');img.src=config.crest_url;img.alt='Escut de '+config.official_name;img.width=46;img.height=46;identity.append(img);}const label=document.createElement('strong');label.textContent=config.official_name;identity.append(label);}
}
export async function loadClubContext(db,{storage=localStorage,search=location.search}={}){
 const result=await db.from('club_settings').select('*').order('official_name');if(result.error)throw Error('Configuració multiclub pendent: '+result.error.message);
 const clubs=result.data||[],slug=new URLSearchParams(search).get('club')||storage.getItem('ch360_club')||'igualada';
 const active=clubs.find(c=>c.slug===slug)||null;
 // An unavailable selection must not silently show a different club's data.
 return {clubs,active,requested:slug,select(slug){storage.setItem('ch360_club',slug);return './federacio.html?club='+encodeURIComponent(slug);}};
}
