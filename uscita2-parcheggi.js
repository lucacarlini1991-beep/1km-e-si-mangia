window.Uscita2Parking=(()=>{let parkingPromise=null;
const distanceKm=(a,b,c,d)=>{const R=6371,q=x=>x*Math.PI/180,h=Math.sin(q(c-a)/2)**2+Math.cos(q(a))*Math.cos(q(c))*Math.sin(q(d-b)/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))};
function loadParking(){
 if(parkingPromise)return parkingPromise;
 parkingPromise=fetch('parcheggi-leggeri.json',{cache:'force-cache'})
  .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
  .then(items=>{
   if(!Array.isArray(items))throw new Error('Formato database non valido');
   return items.filter(x=>Number.isFinite(+x.lat)&&Number.isFinite(+x.lon)).map(x=>({...x,lat:+x.lat,lon:+x.lon}));
  });
 return parkingPromise;
}
const esc=s=>String(s??'Parcheggio').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function render(exit,container,limit){
 container.innerHTML='<section class="panel"><div class="panel-head"><div><h3>🅿️ Parcheggi</h3><p>Carico il database dei parcheggi…</p></div></div></section>';
 try{
  const items=await loadParking();
  const results=items.map(x=>({...x,distance:distanceKm(exit.lat,exit.lng,x.lat,x.lon)}))
   .filter(x=>limit==='all'||x.distance<=limit).sort((a,b)=>a.distance-b.distance);
  container.innerHTML='<section class="panel"><div class="panel-head"><div><h3>🅿️ Parcheggi</h3><p>Parcheggi vicino all’uscita selezionata.</p></div><b>'+results.length+' risultati</b></div>'+
   (results.length?'<div class="place-list">'+results.map(x=>'<article class="place-card"><div class="place-icon">🅿️</div><div class="place-main"><h4>'+esc(x.name||'Parcheggio')+'</h4><p>'+esc(x.access||x.type||x.parking||'Parcheggio')+' · '+x.distance.toFixed(1)+' km dall’uscita</p></div><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+x.lat+','+x.lon+'">Naviga →</a></article>').join('')+'</div>':'<p class="empty-state">Nessun parcheggio nel raggio selezionato.</p>')+'</section>';
 }catch(err){console.error('Errore caricamento parcheggi',err);container.innerHTML='<section class="panel"><div class="panel-head"><div><h3>🅿️ Parcheggi</h3><p>Database parcheggi.</p></div></div><p class="empty-state">Impossibile caricare i parcheggi. Riprova tra poco.</p></section>'}
}
return{render,loadParking}})();