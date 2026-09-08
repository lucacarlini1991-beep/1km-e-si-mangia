window.Uscita2Parking=(()=>{let parkingPromise=null;
const distanceKm=(a,b,c,d)=>{const R=6371,q=x=>x*Math.PI/180,h=Math.sin(q(c-a)/2)**2+Math.cos(q(a))*Math.cos(q(c))*Math.sin(q(d-b)/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))};
function loadParking(){
  if(parkingPromise)return parkingPromise;
  parkingPromise=fetch('data/parcheggi.json',{cache:'force-cache'})
    .then(r=>{if(!r.ok)throw new Error('Database non disponibile');return r.json()})
    .then(d=>Array.isArray(d.items)?d.items:[]);
  return parkingPromise;
}
async function render(exit,container,limit){
  container.innerHTML='<section class="panel"><div class="panel-head"><div><h3>🅿️ Parcheggi</h3><p>Ricerca nel database locale vicino all’uscita.</p></div></div><p>Ricerca parcheggi…</p></section>';
  try{
    const items=await loadParking();
    const results=items
      .map(x=>({...x,distance:distanceKm(exit.lat,exit.lng,x.lat,x.lng)}))
      .filter(x=>limit==='all'||x.distance<=limit)
      .sort((a,b)=>a.distance-b.distance);
    container.innerHTML='<section class="panel"><div class="panel-head"><div><h3>🅿️ Parcheggi</h3><p>Solo sosta del veicolo.</p></div><b>'+results.length+' risultati</b></div>'+
      (results.length?'<div class="place-list">'+results.map(x=>'<article class="place-card"><div class="place-icon">🅿️</div><div class="place-main"><h4>'+x.name+'</h4><p>'+x.type+' · '+x.distance.toFixed(1)+' km dall’uscita</p></div><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+x.lat+','+x.lng+'">Mappa →</a></article>').join('')+'</div>':'<p class="empty-state">Nessun parcheggio ancora disponibile nel database per questa zona.</p>')+
    '</section>';
  }catch(err){
    console.error('Errore caricamento parcheggi',err);
    container.innerHTML='<section class="panel"><div class="panel-head"><div><h3>🅿️ Parcheggi</h3><p>Database locale.</p></div></div><p class="empty-state">Impossibile caricare i parcheggi al momento. Riprova tra poco.</p></section>';
  }
}
return{render,loadParking}})();