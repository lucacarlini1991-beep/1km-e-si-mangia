window.Uscita2Parking=(()=>{let parkingPromise=null;
const distanceKm=(a,b,c,d)=>{const R=6371,q=x=>x*Math.PI/180,h=Math.sin(q(c-a)/2)**2+Math.cos(q(a))*Math.cos(q(c))*Math.sin(q(d-b)/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))};
async function loadParkingNear(exit,limit){
 const url='https://pyiheodneyvtcotuonpt.supabase.co/rest/v1/rpc/parcheggi_vicini';
 const key='sb_publishable_6FGQBm1zXfwY8zVSuNmTlA_DRW5DMfQ';
 const radius=limit==='all'?20:Number(limit||10);
 const r=await fetch(url,{
  method:'POST',
  headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key},
  body:JSON.stringify({
   p_lat:Number(exit.lat),
   p_lon:Number(exit.lng),
   p_raggio_km:radius,
   p_limite:100
  })
 });
 if(!r.ok)throw new Error('Supabase HTTP '+r.status);
 const rows=await r.json();
 if(!Array.isArray(rows))throw new Error('Risposta Supabase non valida');
 return rows.map(x=>({
  ...x,
  lat:+x.lat,
  lon:+x.lon,
  name:x.name||x.nome||'Parcheggio',
  distance:Number(x.distanza_km||0)
 }));
}
const esc=s=>String(s??'Parcheggio').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function render(exit,container,limit){
 container.innerHTML='<section class="panel"><div class="panel-head"><div><h3>🅿️ Parcheggi</h3><p>Carico il database dei parcheggi…</p></div></div></section>';
 try{
  const results=await loadParkingNear(exit,limit);
  container.innerHTML='<section class="panel"><div class="panel-head"><div><h3>🅿️ Parcheggi</h3><p>Parcheggi vicino all’uscita selezionata.</p></div><b>'+results.length+' risultati</b></div>'+
   (results.length?'<div class="place-list">'+results.map((x,i)=>'<article class="place-card"><div class="place-icon">🅿️</div><div class="place-main"><h4>'+esc(x.name||'Parcheggio')+'</h4><p>'+esc(x.access||x.type||x.parking||'Parcheggio')+' · '+x.distance.toFixed(1)+' km dall’uscita</p></div><button type="button" class="parking-navigate" data-parking="'+i+'">Naviga →</button></article>').join('')+'</div>':'<p class="empty-state">Nessun parcheggio nel raggio selezionato.</p>')+'</section>';
  container.querySelectorAll('.parking-navigate').forEach(btn=>btn.addEventListener('click',()=>{
    const x=results[Number(btn.dataset.parking)];
    if(window.apriNavigazione){
      window.apriNavigazione({...x,nome:x.name||x.nome||'Parcheggio'});
    }else{
      console.error('Modulo navigazione non caricato');
    }
  }));
 }catch(err){console.error('Errore caricamento parcheggi',err);container.innerHTML='<section class="panel"><div class="panel-head"><div><h3>🅿️ Parcheggi</h3><p>Database parcheggi.</p></div></div><p class="empty-state">Impossibile caricare i parcheggi. Riprova tra poco.</p></section>'}
}
return{render,loadParking:(exit,limit)=>loadParkingNear(exit,limit)}})();