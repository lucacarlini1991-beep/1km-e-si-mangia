window.Uscita2Luoghi=(()=>{
const D=(a,b,c,d)=>{const R=6371,q=x=>x*Math.PI/180,h=Math.sin(q(c-a)/2)**2+Math.cos(q(a))*Math.cos(q(c))*Math.sin(q(d-b)/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cat=x=>({nature:['🌿','Natura e paesaggi'],culture:['🏛️','Storia e cultura'],viewpoint:['📸','Punto panoramico'],historic:['📜','Luogo storico'],square:['🏙️','Piazza e centro'],transport:['🚉','Interscambio città']})[x.category]||['📍','Da scoprire'];
function routeText(e,x){
 const start=e.name||'l’uscita selezionata', km=x.distance.toFixed(1);
 const where=x.city?(' verso '+x.city):'';
 const type=cat(x)[1].toLowerCase();
 return 'Dall’uscita '+start+' percorri la viabilità principale'+where+'. Dopo circa '+km+' km segui le indicazioni per '+x.name+'. '+(x.access||('Una volta arrivato in zona, cerca il punto di accesso più comodo e completa l’ultimo tratto '+(x.walking?'a piedi':'seguendo le indicazioni locali')+'.'))+' Questa guida verrà resa sempre più precisa con i dati stradali e i parcheggi consigliati.';
}
function mapUrl(a,b){return 'https://www.google.com/maps/search/?api=1&query='+a+','+b}
function card(x){const [ico,label]=cat(x);return '<article class="place-card" data-poi="'+esc(x.id||x.name)+'"><div class="place-icon">'+ico+'</div><div class="place-main"><h4>'+esc(x.name)+'</h4><p>'+esc(label)+(x.interest?' · ⭐ '+esc(x.interest)+'/10':'')+'</p><span>📍 '+x.distance.toFixed(1)+' km dall’uscita</span></div><button class="poi-open" type="button">SCOPRI →</button></article>'}
function openDetail(e,x,m){
 m.innerHTML='<section class="panel poi-detail"><button class="poi-back" type="button">← Torna ai luoghi</button><div class="poi-hero"><div class="poi-big-icon">'+cat(x)[0]+'</div><div><p class="eyebrow">COSA OFFRE L’USCITA</p><h3>'+esc(x.name)+'</h3><p>'+esc(cat(x)[1])+' · 📍 '+x.distance.toFixed(1)+' km dall’uscita</p></div></div><div class="poi-section"><h4>✨ Perché scoprirlo</h4><p>'+esc(x.description||'Un luogo interessante da scoprire nei dintorni dell’uscita.')+'</p></div><div class="poi-section route-story"><h4>🚗 Come raggiungerlo</h4><p>'+esc(routeText(e,x))+'</p></div><div class="poi-map"><div class="map-preview"><div>🗺️</div><b>Anteprima destinazione</b><span>'+esc(x.name)+' · '+x.lat.toFixed(5)+', '+x.lng.toFixed(5)+'</span></div><a class="poi-navigate" target="_blank" rel="noopener" href="'+mapUrl(x.lat,x.lng)+'">🧭 NAVIGA AL POI</a></div></section>';
 m.querySelector('.poi-back').onclick=()=>render(e,m,window.Uscita2Distance?.get?.()||5);
}
async function render(e,m,limit){
 m.innerHTML='<section class="panel"><h3>✨ Cosa offre l’uscita</h3><p>Caricamento luoghi interessanti…</p></section>';
 try{
  const d=await fetch('data/luoghi.json?v=20260912-poi1').then(x=>x.json());
  const a=(d.items||[]).map(x=>({...x,distance:D(e.lat,e.lng,x.lat,x.lng)})).filter(x=>limit==='all'||x.distance<=limit).sort((a,b)=>(b.interest||0)-(a.interest||0)||a.distance-b.distance);
  const groups={};
  a.forEach(x=>{const k=cat(x)[1];(groups[k]||(groups[k]=[])).push(x)});
  const html=a.length?Object.entries(groups).map(([k,v])=>'<div class="poi-group"><h4>'+esc(k)+' <span>'+v.length+'</span></h4><div class="place-list">'+v.map(card).join('')+'</div></div>').join(''):'<div class="empty-poi">🔎 Nessun POI nel raggio selezionato.<br><small>Prova ad aumentare la distanza.</small></div>';
  m.innerHTML='<section class="panel"><div class="panel-head"><div><h3>✨ Cosa offre l’uscita</h3><p>Scopri luoghi, panorami, storia e punti strategici per visitare la zona.</p></div><b>'+a.length+' risultati</b></div>'+html+'</section>';
  m.querySelectorAll('.place-card').forEach(el=>el.onclick=()=>{const x=a.find(z=>String(z.id||z.name)===el.dataset.poi);if(x)openDetail(e,x,m)});
 }catch(err){m.innerHTML='<section class="panel"><h3>✨ Cosa offre l’uscita</h3><p>Dati POI non ancora disponibili.</p></section>'}
}
return{render};
})();