window.Uscita2Luoghi=(()=>{
const D=(a,b,c,d)=>{const R=6371,q=x=>x*Math.PI/180,h=Math.sin(q(c-a)/2)**2+Math.cos(q(a))*Math.cos(q(c))*Math.sin(q(d-b)/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let poiPromise=null;

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

async function loadPois(){
 if(poiPromise)return poiPromise;
 poiPromise=fetch('data/liguria_esplora_uscite_finale.geojson?v=20260912-liguria1')
  .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
  .then(d=>{
   if(!Array.isArray(d.features))throw new Error('GeoJSON non valido');
   return d.features
    .filter(f=>f?.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates))
    .map(f=>{
      const p=f.properties||{},c=f.geometry.coordinates;
      return {
       id:p.osm_id||p.id||p.name,
       name:p.name||'Luogo senza nome',
       lat:Number(c[1]),lng:Number(c[0]),
       category:p.category||'Da scoprire',
       group:p.group||'Da visitare',
       subtype:p.subtype||'',
       priority:Number(p.priority||0),
       tags:p.tags||{}
      };
    })
    .filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  });
 return poiPromise;
}

function detailText(x){
 const t=x.tags||{};
 return t.description||t.wikipedia||t.wikidata||x.category||'Luogo interessante da scoprire nei dintorni dell’uscita.';
}

function routeText(e,x){
 const start=e.name||'l’uscita selezionata';
 return 'Dall’uscita '+start+' la destinazione dista circa '+x.distance.toFixed(1)+' km in linea d’aria. Apri la navigazione per il percorso stradale aggiornato.';
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
 const website=t.website||t['contact:website']||'';
 const address=[t['addr:street'],t['addr:housenumber'],t['addr:city']].filter(Boolean).join(', ');
 m.innerHTML='<section class="panel poi-detail">'+
  '<button class="poi-back" type="button">← Torna ai luoghi</button>'+
  '<div class="poi-hero"><div class="poi-big-icon">'+cat(x)[0]+'</div><div><p class="eyebrow">COSA OFFRE L’USCITA</p><h3>'+esc(x.name)+'</h3><p>'+esc(cat(x)[1])+' · 📍 '+x.distance.toFixed(1)+' km dall’uscita</p></div></div>'+
  '<div class="poi-section"><h4>✨ Informazioni</h4><p>'+esc(detailText(x))+'</p>'+
  (address?'<p style="margin-top:10px"><b>📍 '+esc(address)+'</b></p>':'')+
  '</div>'+
  '<div class="poi-section route-story"><h4>🚗 Come raggiungerlo</h4><p>'+esc(routeText(e,x))+'</p></div>'+
  '<div class="poi-map"><div class="map-preview"><div>🗺️</div><b>Destinazione</b><span>'+esc(x.name)+' · '+x.lat.toFixed(5)+', '+x.lng.toFixed(5)+'</span></div>'+
  '<a class="poi-navigate" target="_blank" rel="noopener" href="'+mapUrl(x.lat,x.lng)+'">🧭 NAVIGA AL POI</a></div>'+
  (website?'<p style="margin-top:16px"><a target="_blank" rel="noopener" href="'+esc(website)+'">🌐 Sito ufficiale →</a></p>':'')+
  '</section>';
 m.querySelector('.poi-back').onclick=()=>render(e,m,window.Uscita2Distance?.get?.()||5);
}

async function render(e,m,limit){
 m.innerHTML='<section class="panel"><h3>✨ Cosa offre l’uscita</h3><p>Carico il database POI della Liguria…</p></section>';
 try{
  const d=await loadPois();
  const a=d.map(x=>({...x,distance:D(e.lat,e.lng,x.lat,x.lng)}))
   .filter(x=>limit==='all'||x.distance<=Number(limit))
   .sort((a,b)=>b.priority-a.priority||a.distance-b.distance||a.name.localeCompare(b.name,'it'));

  const groups={};
  a.forEach(x=>{const k=cat(x)[1];(groups[k]||(groups[k]=[])).push(x)});
  const html=a.length
   ? Object.entries(groups).map(([k,v])=>'<div class="poi-group"><h4>'+esc(k)+' <span>'+v.length+'</span></h4><div class="place-list">'+v.map(card).join('')+'</div></div>').join('')
   : '<div class="empty-poi">🔎 Nessun POI nel raggio selezionato.<br><small>Prova ad aumentare la distanza.</small></div>';

  m.innerHTML='<section class="panel places-panel"><div class="panel-head"><div><h3>✨ Cosa offre l’uscita</h3><p>Luoghi da visitare, panorami e punti utili del database locale Liguria.</p></div><b>'+a.length+' risultati</b></div>'+html+'</section>';
  m.querySelectorAll('.place-card').forEach(el=>el.onclick=()=>{
   const x=a.find(z=>String(z.id)===String(el.dataset.poi));
   if(x)openDetail(e,x,m);
  });
 }catch(err){
  console.error('Errore POI Liguria',err);
  m.innerHTML='<section class="panel"><h3>✨ Cosa offre l’uscita</h3><p>Impossibile caricare il database POI della Liguria. Riprova tra poco.</p></section>';
 }
}

return{render,loadPois};
})();