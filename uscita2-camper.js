window.Uscita2Camper=(()=>{
const D=(a,b,c,d)=>{const R=6371,q=x=>x*Math.PI/180,h=Math.sin(q(c-a)/2)**2+Math.cos(q(a))*Math.cos(q(c))*Math.sin(q(d-b)/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function client(){const c=window.ReviewsAuth?.client;if(c)return c;if(window.supabase&&window.SUPABASE_CONFIG)return window.supabase.createClient(window.SUPABASE_CONFIG.url,window.SUPABASE_CONFIG.key);throw new Error('Supabase non inizializzato')}
async function load(){
 const {data,error}=await client().from('camper_service').select('id,nome,tipo,lat,lon,indirizzo,comune,provincia,servizi,access,orari,pagamento,note,osm_id');
 if(error)throw error;
 return (data||[]).map(x=>({...x,distance:0})).filter(x=>Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon)));
}
function label(x){return x.tipo==='area_camper'?'🚐 Area camper':'🚰 Camper service'}
function services(x){const s=Array.isArray(x.servizi)?x.servizi:[];return s.map(v=>String(v).replaceAll('_',' ')).join(' · ')||'Servizi da verificare'}
async function render(e,m,limit){
 m.innerHTML='<section class="panel camper-panel"><h3>🚐 Camper</h3><p>Carico aree camper e camper service…</p></section>';
 try{
  const all=await load();
  const max=limit==='all'?100:Number(limit);
  const a=all.map(x=>({...x,distance:D(e.lat,e.lng,Number(x.lat),Number(x.lon))})).filter(x=>x.distance<=max).sort((a,b)=>a.distance-b.distance);
  const areas=a.filter(x=>x.tipo==='area_camper'),service=a.filter(x=>x.tipo!=='area_camper');
  const card=x=>'<article class="place-card"><div class="place-icon">'+(x.tipo==='area_camper'?'🚐':'🚰')+'</div><div class="place-main"><h4>'+esc(x.nome||label(x))+'</h4><p>'+esc(label(x))+(services(x)?' · '+esc(services(x)):'')+'</p><span>📍 '+x.distance.toFixed(1)+' km dall’uscita</span></div><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+x.lat+','+x.lon+'">NAVIGA →</a></article>';
  m.innerHTML='<section class="panel camper-panel"><div class="panel-head"><div><h3>🚐 Camper</h3><p>Aree di sosta attrezzate e camper service dal database nazionale.</p></div><b>'+a.length+' risultati</b></div><div class="poi-group"><h4>🚐 Aree camper <span>'+areas.length+'</span></h4><div class="place-list">'+(areas.length?areas.map(card).join(''):'<div class="empty">Nessuna area camper nel raggio selezionato.</div>')+'</div></div><div class="poi-group"><h4>🚰 Camper service <span>'+service.length+'</span></h4><div class="place-list">'+(service.length?service.map(card).join(''):'<div class="empty">Nessun camper service nel raggio selezionato.</div>')+'</div></div></section>';
 }catch(err){console.error('Errore camper Supabase',err);m.innerHTML='<section class="panel camper-panel"><h3>🚐 Camper</h3><p>Impossibile caricare le aree camper. Riprova tra poco.</p></section>'}
}
return{render};
})();