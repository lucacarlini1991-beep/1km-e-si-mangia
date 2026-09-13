window.Uscita2Luoghi=(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache=new Map();

const META={
 'Attrazione':['✨','Attrazioni'],
 'Museo':['🏛️','Musei'],
 'Monumento':['🗿','Monumenti'],
 'Castello':['🏰','Castelli'],
 'Rovine':['🧱','Rovine'],
 'Sito archeologico':['🏺','Siti archeologici'],
 'Luogo della memoria':['🕯️','Luoghi della memoria'],
 'Luogo storico':['📜','Luoghi storici'],
 'Punto panoramico':['📸','Punti panoramici'],
 'Parcheggio visitatori':['🅿️','Parcheggi visitatori'],
 'Stazione ferroviaria':['🚉','Stazioni ferroviarie'],
 'Stazione autobus':['🚌','Stazioni autobus'],
 'Terminal traghetti':['⛴️','Terminal traghetti'],
 'Stazione funicolare':['🚋','Stazioni funicolari'],
 'Stazione trasporti':['🚏','Stazioni trasporti']
};

function cat(x){return META[x.category]||['📍',x.category||'Da scoprire']}

function client(){
 const c=window.ReviewsAuth?.client;
 if(c)return c;
 if(window.supabase&&window.SUPABASE_CONFIG){
   return window.supabase.createClient(window.SUPABASE_CONFIG.url,window.SUPABASE_CONFIG.key);
 }
 throw new Error('Supabase non inizializzato');
}

async function loadPois(e,limit){
 const radius=limit==='all'?100:Number(limit);
 const key=[e.lat,e.lng,radius].join('|');
 if(cache.has(key))return cache.get(key);

 const promise=client().rpc('get_nearby_poi',{
   p_lat:Number(e.lat),
   p_lon:Number(e.lng),
   p_radius_km:radius,
   p_limit:1000
 }).then(({data,error})=>{
   if(error)throw error;
   return (data||[]).map(p=>({
     id:p.id||p.osm_id||p.nome,
     name:p.nome||'Luogo senza nome',
     lat:Number(p.lat),
     lng:Number(p.lon),
     category:p.categoria||'Da scoprire',
     subtype:p.sottocategoria||'',
     description:p.descrizione||'',
     address:p.indirizzo||'',
     city:p.comune||'',
     province:p.provincia||'',
     region:p.regione||'',
     website:p.sito_web||'',
     phone:p.telefono||'',
     tags:p.tags||{},
     distance:Number(p.distanza_km||0)
   })).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
 }).catch(err=>{cache.delete(key);throw err});

 cache.set(key,promise);
 return promise;
}

function detailText(x){
 const t=x.tags||{};
 return x.description||t.description||t.wikipedia||t.wikidata||x.category||'Luogo interessante da scoprire nei dintorni dell’uscita.';
}

function routeText(e,x){
 return 'Dall’uscita '+(e.name||'selezionata')+' la destinazione dista circa '+x.distance.toFixed(1)+' km in linea d’aria. Apri la navigazione per il percorso stradale aggiornato.';
}

function mapUrl(a,b){return 'https://www.google.com/maps/search/?api=1&query='+a+','+b}

function card(x){
 const [ico,label]=cat(x);
 return '<article class="place-card" data-poi="'+esc(x.id)+'">'+
  '<div class="place-icon">'+ico+'</div>'+
  '<div class="place-main"><h4>'+esc(x.name)+'</h4>'+
  '<p>'+esc(label)+'</p><span>📍 '+x.distance.toFixed(1)+' km dall’uscita</span></div>'+
  '<button class="poi-open" type="button">SCOPRI →</button></article>';
}

function openDetail(e,x,m){
 const t=x.tags||{};
 const website=x.website||t.website||t['contact:website']||'';
 const address=x.address||[t['addr:street'],t['addr:housenumber'],x.city,t['addr:city']].filter(Boolean).join(', ');
 m.innerHTML='<section class="panel poi-detail">'+
  '<button class="poi-back" type="button">← Torna ai luoghi</button>'+
  '<div class="poi-hero"><div class="poi-big-icon">'+cat(x)[0]+'</div><div><p class="eyebrow">COSA OFFRE L’USCITA</p><h3>'+esc(x.name)+'</h3><p>'+esc(cat(x)[1])+' · 📍 '+x.distance.toFixed(1)+' km dall’uscita</p></div></div>'+
  '<div class="poi-section"><h4>✨ Informazioni</h4><p>'+esc(detailText(x))+'</p>'+
  (address?'<p style="margin-top:10px"><b>📍 '+esc(address)+'</b></p>':'')+
  (x.region?'<p style="margin-top:8px">📌 '+esc(x.region)+'</p>':'')+
  '</div>'+
  '<div class="poi-section route-story"><h4>🚗 Come raggiungerlo</h4><p>'+esc(routeText(e,x))+'</p></div>'+
  '<div class="poi-map"><div class="map-preview"><div>🗺️</div><b>Destinazione</b><span>'+esc(x.name)+' · '+x.lat.toFixed(5)+', '+x.lng.toFixed(5)+'</span></div>'+
  '<a class="poi-navigate" target="_blank" rel="noopener" href="'+mapUrl(x.lat,x.lng)+'">🧭 NAVIGA AL POI</a></div>'+
  (website?'<p style="margin-top:16px"><a target="_blank" rel="noopener" href="'+esc(website)+'">🌐 Sito ufficiale →</a></p>':'')+
  '</section>';
 m.querySelector('.poi-back').onclick=()=>render(e,m,window.Uscita2Distance?.get?.()||5);
}

async function render(e,m,limit){
 m.innerHTML='<section class="panel"><h3>✨ Cosa offre l’uscita</h3><p>Carico i luoghi da Supabase…</p></section>';
 try{
  const a=await loadPois(e,limit);
  const groups={};
  a.forEach(x=>{const k=cat(x)[1];(groups[k]||(groups[k]=[])).push(x)});
  const html=a.length
   ? Object.entries(groups).map(([k,v])=>'<div class="poi-group"><h4>'+esc(k)+' <span>'+v.length+'</span></h4><div class="place-list">'+v.map(card).join('')+'</div></div>').join('')
   : '<div class="empty-poi">🔎 Nessun POI nel raggio selezionato.<br><small>Prova ad aumentare la distanza.</small></div>';

  const scope=limit==='all'?'Ricerca estesa nei luoghi disponibili vicino all’uscita.':'Luoghi da visitare, panorami e punti utili vicino all’uscita.';
  m.innerHTML='<section class="panel places-panel"><div class="panel-head"><div><h3>✨ Cosa offre l’uscita</h3><p>'+scope+'</p></div><b>'+a.length+' risultati</b></div>'+html+'</section>';
  m.querySelectorAll('.place-card').forEach(el=>el.onclick=()=>{
   const x=a.find(z=>String(z.id)===String(el.dataset.poi));
   if(x)openDetail(e,x,m);
  });
 }catch(err){
  console.error('Errore POI Supabase',err);
  m.innerHTML='<section class="panel"><h3>✨ Cosa offre l’uscita</h3><p>Impossibile caricare i POI. Riprova tra poco.</p></section>';
 }
}

return{render,loadPois};
})();