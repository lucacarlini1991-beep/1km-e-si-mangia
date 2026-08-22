/* 1 KM E SI MANGIA — PARCHEGGI MEZZI PESANTI — GPS + USCITE ROBUSTI */
(function(){
  'use strict';

  const OVERPASS=[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];
  const SEARCH_RADIUS=20000;
  const EXIT_RADIUS=12000;
  const state={pos:null,exits:[],results:[],map:null,markers:null,searchCenter:null,searchMode:'near'};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function dist(a,b){const R=6371000,rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad,la=a.lat*rad,lb=b.lat*rad;const x=Math.sin(dLat/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
  function fmt(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(1).replace('.',',')+' km';}
  function coord(e){if(Number.isFinite(Number(e.lat))&&Number.isFinite(Number(e.lon)))return {lat:Number(e.lat),lon:Number(e.lon)};if(e.center&&Number.isFinite(Number(e.center.lat))&&Number.isFinite(Number(e.center.lon)))return {lat:Number(e.center.lat),lon:Number(e.center.lon)};return null;}

  function queryFor(pos,radius){
    const lat=pos.lat,lon=pos.lon;
    return `[out:json][timeout:45];(
      nwr["amenity"="parking"]["hgv"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["access:hgv"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["capacity:hgv"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["goods"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["truck"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["motor_vehicle"="hgv"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["motorcar"="no"](around:${radius},${lat},${lon});
      nwr["highway"="services"](around:${radius},${lat},${lon});
      nwr["highway"="rest_area"](around:${radius},${lat},${lon});
    );out center tags;`;
  }

  async function overpass(q){
    const requests=OVERPASS.map(async url=>{
      const c=new AbortController(),t=setTimeout(()=>c.abort(),50000);
      try{
        const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q),signal:c.signal,cache:'no-store'});
        if(!r.ok)throw new Error('HTTP '+r.status);
        return await r.json();
      }finally{clearTimeout(t);}
    });
    try{return await Promise.any(requests);}catch(e){throw new Error('Servizio parcheggi non raggiungibile');}
  }

  async function loadExits(){
    try{
      const r=await fetch('uscite.json',{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const d=await r.json();
      state.exits=Array.isArray(d)?d.filter(x=>Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon))):[];
      return state.exits.length>0;
    }catch(e){state.exits=[];return false;}
  }

  function nearestExit(p){
    let best=null,bestD=Infinity;
    for(const e of state.exits){const d=dist(p,{lat:Number(e.lat),lon:Number(e.lon)});if(d<bestD){bestD=d;best=e;}}
    return best?{data:best,distance:bestD}:null;
  }

  function tagBool(v){return ['yes','designated','permissive','true','1','hgv'].includes(String(v||'').toLowerCase());}
  function parkingName(tags){return tags.name||tags.operator||((tags.highway==='services')?'Area di servizio':(tags.highway==='rest_area'?'Area di sosta':'Parcheggio mezzi pesanti'));}
  function services(tags){
    const out=[];
    if(tagBool(tags.toilets))out.push('WC');
    if(tagBool(tags.shower))out.push('Doccia');
    if(tagBool(tags.lit))out.push('Illuminato');
    if(tagBool(tags.surveillance))out.push('Videosorveglianza');
    if(tags.fee==='yes')out.push('A pagamento');
    if(tags.capacity_hgv||tags['capacity:hgv'])out.push('Posti TIR: '+(tags.capacity_hgv||tags['capacity:hgv']));
    return out;
  }
  function limits(tags){return {maxheight:tags.maxheight||tags['maxheight:physical']||null,maxwidth:tags.maxwidth||null,maxlength:tags.maxlength||null,maxweight:tags.maxweight||null};}

  function truckScore(tags){
    let s=0;
    if(tags.hgv)s+=5;
    if(tags['access:hgv'])s+=5;
    if(tags['capacity:hgv'])s+=5;
    if(tags.goods)s+=4;
    if(tags.truck)s+=4;
    if(tags.motor_vehicle==='hgv')s+=5;
    if(tags.motorcar==='no')s+=2;
    if(tags.highway==='services')s+=3;
    if(tags.highway==='rest_area')s+=2;
    return s;
  }

  function normalize(e){
    const tags=e.tags||{},p=coord(e);if(!p)return null;
    const score=truckScore(tags);if(score<=0)return null;
    const ex=nearestExit(p),lim=limits(tags);
    const compat=window.verificaCompatibilitaParcheggio?window.verificaCompatibilitaParcheggio(lim):null;
    return {id:e.type+'-'+e.id,lat:p.lat,lon:p.lon,tags,name:parkingName(tags),distance:state.pos?dist(state.pos,p):Infinity,searchDistance:state.searchCenter?dist(state.searchCenter,p):Infinity,exit:ex,limits:lim,compat,services:services(tags),truckScore:score};
  }

  function renderMap(){
    if(!state.map||!window.L)return;
    state.map.invalidateSize();
    if(state.markers)state.markers.clearLayers();else state.markers=L.layerGroup().addTo(state.map);
    const pts=[];
    if(state.pos){const m=L.marker([state.pos.lat,state.pos.lon]);m.bindPopup('<b>La tua posizione</b>');state.markers.addLayer(m);pts.push([state.pos.lat,state.pos.lon]);}
    if(state.searchMode==='exit'&&state.searchCenter){const m=L.marker([state.searchCenter.lat,state.searchCenter.lon]);m.bindPopup('<b>Uscita autostradale di riferimento</b>');state.markers.addLayer(m);pts.push([state.searchCenter.lat,state.searchCenter.lon]);}
    for(const r of state.results){
      const color=r.compat&&r.compat.ok===true?'#176534':r.compat&&r.compat.ok===false?'#9a2929':'#8a5a00';
      const icon=L.divIcon({className:'',html:`<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"><div style="transform:rotate(45deg);color:#fff;text-align:center;font-weight:800;font-size:14px;line-height:23px">🚛</div></div>`,iconSize:[34,34],iconAnchor:[17,30]});
      const m=L.marker([r.lat,r.lon],{icon});
      m.bindPopup(`<b>${esc(r.name)}</b><br>${r.distance!==Infinity?fmt(r.distance):''}${r.exit?`<br>🛣️ ${fmt(r.exit.distance)} dall'uscita ${esc(r.exit.data.nome||'')}`:''}`);
      state.markers.addLayer(m);pts.push([r.lat,r.lon]);
    }
    if(pts.length===1)state.map.setView(pts[0],12);else if(pts.length>1)state.map.fitBounds(pts,{padding:[30,30]});
  }

  function card(r,i){
    const c=r.compat;
    const chip=c&&c.ok===true?'<span class="mp-chip good">🟢 Compatibile</span>':c&&c.ok===false?'<span class="mp-chip bad">🔴 Non compatibile</span>':'<span class="mp-chip warn">🟡 Da verificare</span>';
    const lim=[];
    if(r.limits.maxheight)lim.push('H max '+esc(r.limits.maxheight)+' m');
    if(r.limits.maxwidth)lim.push('Larg. max '+esc(r.limits.maxwidth)+' m');
    if(r.limits.maxlength)lim.push('Lung. max '+esc(r.limits.maxlength)+' m');
    if(r.limits.maxweight)lim.push('Peso max '+esc(r.limits.maxweight));
    const serv=r.services.length?r.services.join(' · '):'Servizi non indicati';
    const near=state.searchMode==='exit'?`<span class="mp-chip">🛣️ ${fmt(r.searchDistance)} dall'uscita</span>`:`<span class="mp-chip">📍 ${fmt(r.distance)}</span>`;
    const exitInfo=state.searchMode==='exit'?'':(r.exit?`<span class="mp-chip">🛣️ ${fmt(r.exit.distance)} dall'uscita ${esc(r.exit.data.nome||'')}</span>`:'');
    return `<article class="mp-card"><h3>${esc(r.name)}</h3><div class="mp-meta">${near}${exitInfo}${chip}</div><div class="mp-services">${esc(serv)}${lim.length?'<br><strong>Limiti dichiarati:</strong> '+lim.join(' · '):'<br><span>Limiti dimensionali non pubblicati.</span>'}</div><div class="mp-card-actions"><button class="mp-btn dark" type="button" data-nav-index="${i}">🧭 NAVIGA</button><button class="mp-btn" type="button" data-map-index="${i}">📍 MAPPA</button></div></article>`;
  }

  function renderList(){
    const list=$('mpList');
    if(!state.results.length){list.innerHTML='<div class="mp-empty">Nessun parcheggio per mezzi pesanti trovato nell’area cercata. Prova a cercare di nuovo o usa un’uscita diversa.</div>';return;}
    list.innerHTML=state.results.map(card).join('');
    list.querySelectorAll('[data-nav-index]').forEach(b=>b.onclick=()=>{const r=state.results[Number(b.dataset.navIndex)];if(window.apriNavigazione)window.apriNavigazione({nome:r.name,lat:r.lat,lon:r.lon});else window.open(`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}&travelmode=driving`,'_blank');});
    list.querySelectorAll('[data-map-index]').forEach(b=>b.onclick=()=>{const r=state.results[Number(b.dataset.mapIndex)];if(!state.map)return;state.map.setView([r.lat,r.lon],16);if(state.markers)state.markers.eachLayer(m=>{if(m.getLatLng&&Math.abs(m.getLatLng().lat-r.lat)<1e-7&&Math.abs(m.getLatLng().lng-r.lon)<1e-7)m.openPopup();});});
  }

  async function search(center,mode){
    state.searchCenter=center;state.searchMode=mode||'near';
    $('mpStatus').textContent=mode==='exit'?'Cerco parcheggi vicino all’uscita…':'Cerco parcheggi…';
    $('mpList').innerHTML='<div class="mp-loading">⏳ Ricerca dei parcheggi per mezzi pesanti in corso…</div>';
    try{
      const data=await overpass(queryFor(center,mode==='exit'?EXIT_RADIUS:SEARCH_RADIUS));
      const arr=(data.elements||[]).map(normalize).filter(Boolean);
      const seen=new Set();
      state.results=arr.filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true;})
        .sort((a,b)=>(mode==='exit'?a.searchDistance-b.searchDistance:a.distance-b.distance)).slice(0,60);
      $('mpStatus').textContent=state.results.length+' risultati'+(mode==='exit'?' vicino all’uscita':'');
      renderList();renderMap();
    }catch(e){
      console.error('PARCHEGGI:',e);
      $('mpStatus').textContent='Errore ricerca';
      $('mpList').innerHTML='<div class="mp-empty">Il servizio mappe non risponde in questo momento. Riprova tra qualche secondo.</div>';
    }
  }

  function initMap(){
    const el=$('mpMap');
    if(!window.L||!el){if($('mpStatus'))$('mpStatus').textContent='Mappa non disponibile';return;}
    state.map=L.map(el,{zoomControl:true}).setView([41.9,12.5],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(state.map);
    setTimeout(()=>state.map.invalidateSize(),150);
  }

  function getGPSPosition(){
    return new Promise((resolve,reject)=>{
      if(window.GPSManager&&typeof window.GPSManager.getLastPosition==='function'){
        const cached=window.GPSManager.getLastPosition();
        if(cached&&Number.isFinite(Number(cached.lat))&&Number.isFinite(Number(cached.lng))){resolve({lat:Number(cached.lat),lon:Number(cached.lng)});return;}
      }
      if(!window.isSecureContext){reject({code:'secure',message:'La posizione richiede HTTPS'});return;}
      if(!navigator.geolocation){reject({code:2,message:'Geolocalizzazione non disponibile'});return;}
      navigator.geolocation.getCurrentPosition(
        p=>{
          const lat=Number(p.coords.latitude),lon=Number(p.coords.longitude),acc=Number(p.coords.accuracy);
          if(!Number.isFinite(lat)||!Number.isFinite(lon)){reject({code:2});return;}
          if(window.GPSManager&&typeof window.GPSManager.updateMap==='function')window.GPSManager.updateMap({lat,lng:lon,accuracy:Number.isFinite(acc)?acc:0},true);
          resolve({lat,lon});
        },
        e=>reject(e),
        {enableHighAccuracy:true,timeout:60000,maximumAge:0}
      );
    });
  }

  async function locate(){
    const b=$('mpLocate');
    if(b)b.disabled=true;
    $('mpStatus').textContent='📍 Acquisizione posizione…';
    try{
      const p=await getGPSPosition();
      state.pos=p;
      state.searchCenter=p;
      await search(p,'near');
    }catch(e){
      console.error('GPS PARCHEGGI:',e);
      $('mpStatus').textContent='Posizione non disponibile';
      let msg='Non riesco a ottenere la posizione.';
      if(e&&e.code===1)msg='Permesso posizione negato. Controlla la Localizzazione e la Posizione precisa per questo sito nelle impostazioni dell’iPhone.';
      else if(e&&e.code===3)msg='Il GPS sta impiegando troppo tempo. Spostati all’aperto e riprova.';
      else if(e&&e.code===2)msg='La posizione non è disponibile. Controlla GPS e Localizzazione dell’iPhone.';
      else if(e&&e.code==='secure')msg='La geolocalizzazione funziona solo con HTTPS.';
      alert(msg);
    }finally{if(b)b.disabled=false;}
  }

  async function nearestExitSearch(){
    const b=$('mpNearestExit');if(b)b.disabled=true;
    try{
      if(!state.pos){
        $('mpStatus').textContent='📍 Prima rilevo la tua posizione…';
        state.pos=await getGPSPosition();
      }
      if(!state.exits.length){
        $('mpStatus').textContent='Carico le uscite autostradali…';
        const ok=await loadExits();
        if(!ok)throw new Error('Elenco uscite non disponibile');
      }
      const ex=nearestExit(state.pos);
      if(!ex)throw new Error('Nessuna uscita trovata');
      const center={lat:Number(ex.data.lat),lon:Number(ex.data.lon)};
      state.searchCenter=center;
      $('mpStatus').textContent=`Uscita più vicina: ${ex.data.nome||'uscita'} · ${fmt(ex.distance)}`;
      await search(center,'exit');
    }catch(e){
      console.error('USCITA PARCHEGGI:',e);
      $('mpStatus').textContent='Impossibile cercare vicino all’uscita';
      $('mpList').innerHTML='<div class="mp-empty">Non riesco a determinare l’uscita più vicina. Controlla la posizione e riprova.</div>';
    }finally{if(b)b.disabled=false;}
  }

  function loadProfile(){const v=window.getProfiloMezzoPesante?window.getProfiloMezzoPesante():window._defaultMezzoPesante;$('mpTipo').value=v.tipo;$('mpL').value=v.lunghezza;$('mpW').value=v.larghezza;$('mpH').value=v.altezza;$('mpP').value=v.peso;$('mpR').checked=!!v.rimorchio;}
  function saveProfile(){const v={tipo:$('mpTipo').value,lunghezza:Number($('mpL').value)||0,larghezza:Number($('mpW').value)||0,altezza:Number($('mpH').value)||0,peso:Number($('mpP').value)||0,rimorchio:$('mpR').checked};if(window.salvaProfiloMezzoPesante)window.salvaProfiloMezzoPesante(v);$('mpSaved').textContent='✓ Dati del mezzo salvati su questo dispositivo';if(state.results.length){state.results=state.results.map(r=>Object.assign(r,{compat:window.verificaCompatibilitaParcheggio?window.verificaCompatibilitaParcheggio(r.limits):null}));renderList();renderMap();}}

  document.addEventListener('DOMContentLoaded',async()=>{
    initMap();
    loadProfile();
    await loadExits();
    $('mpLocate').onclick=locate;
    $('mpNearestExit').onclick=nearestExitSearch;
    $('mpRefresh').onclick=()=>state.pos?search(state.searchMode==='exit'&&state.searchCenter?state.searchCenter:state.pos,state.searchMode):locate();
    $('mpSave').onclick=saveProfile;
  });
})();
