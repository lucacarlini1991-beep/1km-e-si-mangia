// 1 KM E SI MANGIA — PARCHEGGI MEZZI PESANTI
(function () {
  'use strict';

  const OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  const RADIUS = 5000;
  const state = { map:null, exits:[], selectedExit:null, parking:[], parkingLayer:null, exitLayer:null, userMarker:null, userPosition:null, fromGps:false, loading:false };

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function distance(a,b){
    const R=6371000, rad=Math.PI/180;
    const dLat=(b.lat-a.lat)*rad, dLon=(b.lon-a.lon)*rad;
    const la1=a.lat*rad, la2=b.lat*rad;
    const x=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  }
  function fmt(m){ return m<1000 ? Math.round(m)+' m' : (m/1000).toFixed(1).replace('.',',')+' km'; }
  function status(t,error=false){ const e=$('mpStatus'); if(e){e.textContent=t;e.style.color=error?'#a52b23':'';} }
  function busy(el,on,onText,offText){ if(!el)return;el.disabled=on;el.textContent=on?onText:offText; }

  function initMap(){
    if(!window.L){ status('Leaflet non è stato caricato',true); return false; }
    const el=$('mpMap');
    if(!el){ status('Contenitore mappa non trovato',true); return false; }
    try{
      state.map=L.map('mpMap',{center:[42.5,12.5],zoom:6,scrollWheelZoom:true});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(state.map);

      state.exitLayer = typeof L.markerClusterGroup==='function'
        ? L.markerClusterGroup({showCoverageOnHover:false,spiderfyOnMaxZoom:true,zoomToBoundsOnClick:true,removeOutsideVisibleBounds:true,maxClusterRadius:55})
        : L.layerGroup();
      state.parkingLayer=L.layerGroup();
      state.map.addLayer(state.exitLayer);
      state.map.addLayer(state.parkingLayer);

      status('Mappa caricata · carico le uscite…');
      setTimeout(()=>state.map.invalidateSize(true),50);
      setTimeout(()=>state.map.invalidateSize(true),400);
      setTimeout(()=>state.map.invalidateSize(true),1200);
      return true;
    }catch(e){ console.error(e);status('Errore nell’inizializzazione della mappa',true);return false; }
  }

  function exitIcon(){ return L.divIcon({className:'',html:'<div class="custom-marker"></div>',iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-18]}); }
  function parkingIcon(){ return L.divIcon({className:'',html:'<div style="width:38px;height:38px;border-radius:50%;background:#fff;border:3px solid #075c3b;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 10px rgba(0,0,0,.3)">🚛</div>',iconSize:[38,38],iconAnchor:[19,19],popupAnchor:[0,-19]}); }

  async function loadExits(){
    try{
      const r=await fetch('./uscite.json?v=20260822',{cache:'no-store'});
      if(!r.ok)throw new Error('uscite.json HTTP '+r.status);
      const data=await r.json();
      state.exits=Array.isArray(data)?data.filter(x=>x&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon))&&x.visualizza_mappa!==false):[];
      state.exitLayer.clearLayers();
      const icon=exitIcon();
      state.exits.forEach(exit=>{
        const m=L.marker([Number(exit.lat),Number(exit.lon)],{icon});
        m.bindPopup(`<div class="exit-popup"><strong>${esc(exit.nome||'Uscita autostradale')}</strong>${exit.autostrada?`<small>${esc(exit.autostrada)}${exit.numero_uscita?' · Uscita '+esc(exit.numero_uscita):''}</small>`:''}<small>🛣️ Uscita autostradale</small><button type="button" data-parcheggi-uscita="${esc(exit.id)}" style="margin-top:10px;width:100%;padding:10px;border:0;border-radius:8px;background:#075c3b;color:#fff;font-weight:800;cursor:pointer">🚛 MOSTRA PARCHEGGI</button></div>`);
        m.on('click',()=>state.map.flyTo([Number(exit.lat),Number(exit.lon)],Math.max(state.map.getZoom(),13),{duration:.5}));
        state.exitLayer.addLayer(m);
      });
      status('Mappa pronta · scegli un’uscita per vedere i parcheggi');
    }catch(e){console.error(e);status('Impossibile caricare le uscite',true);}
  }

  function query(exit){
    const lat=Number(exit.lat),lon=Number(exit.lon);
    return `[out:json][timeout:15];(
      nwr["amenity"="parking"](around:${RADIUS},${lat},${lon});
      nwr["amenity"="rest_area"](around:${RADIUS},${lat},${lon});
      nwr["highway"="services"](around:${RADIUS},${lat},${lon});
      nwr["highway"="rest_area"](around:${RADIUS},${lat},${lon});
    );out center tags;`;
  }

  async function overpass(q){
    let last=null;
    for(const url of OVERPASS){
      try{
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),18000);
        const target=url+'?data='+encodeURIComponent(q);
        const r=await fetch(target,{signal:controller.signal,headers:{Accept:'application/json'}});
        clearTimeout(timer);
        if(!r.ok)throw new Error('HTTP '+r.status);
        const data=await r.json();
        return data;
      }catch(e){
        last=e;
        console.warn('Overpass',url,e.message);
      }
    }
    throw last||new Error('Overpass non disponibile');
  }

  function point(e){
    if(Number.isFinite(Number(e.lat))&&Number.isFinite(Number(e.lon)))return{lat:Number(e.lat),lon:Number(e.lon)};
    if(e.center&&Number.isFinite(Number(e.center.lat))&&Number.isFinite(Number(e.center.lon)))return{lat:Number(e.center.lat),lon:Number(e.center.lon)};
    return null;
  }
  function yes(v){return ['yes','true','1','designated','permissive'].includes(String(v||'').toLowerCase());}
  function profile(){
    const p={
      lunghezza:Number(String($('mpL')?.value||'').replace(',','.')),
      larghezza:Number(String($('mpW')?.value||'').replace(',','.')),
      altezza:Number(String($('mpH')?.value||'').replace(',','.')),
      peso:Number(String($('mpP')?.value||'').replace(',','.'))
    };
    return p;
  }
  function parseNum(v){const n=parseFloat(String(v||'').replace(',','.').replace(/[^0-9.\-]/g,''));return Number.isFinite(n)?n:null;}
  function compat(tags){
    const p=profile();
    const checks=[];
    const h=parseNum(tags.maxheight||tags['maxheight:physical']);
    const w=parseNum(tags.maxwidth);
    const l=parseNum(tags.maxlength);
    const weight=parseNum(tags.maxweight);
    if(tags.hgv==='no'||tags['access:hgv']==='no') return false;
    if(h!==null&&p.altezza>0)checks.push(p.altezza<=h);
    if(w!==null&&p.larghezza>0)checks.push(p.larghezza<=w);
    if(l!==null&&p.lunghezza>0)checks.push(p.lunghezza<=l);
    if(weight!==null&&p.peso>0)checks.push(p.peso<=weight);
    if(checks.includes(false))return false;
    if(checks.length)return true;
    if(yes(tags.hgv)||yes(tags['access:hgv'])||tags.highway==='services')return true;
    return null;
  }
  function normalize(e,exit){
    const p=point(e),tags=e.tags||{}; if(!p)return null;
    if(tags.access==='private'||tags.access==='no')return null;
    return {id:e.type+'-'+e.id,lat:p.lat,lon:p.lon,name:tags.name||tags.operator||(tags.highway==='services'?'Area di servizio':'Parcheggio'),tags,distance:distance(p,{lat:Number(exit.lat),lon:Number(exit.lon)}),compat:compat(tags),limits:{height:tags.maxheight||tags['maxheight:physical']||null,width:tags.maxwidth||null,length:tags.maxlength||null,weight:tags.maxweight||null}};
  }
  function services(t){const a=[];if(yes(t.toilets))a.push('WC');if(yes(t.shower))a.push('Doccia');if(yes(t.lit))a.push('Illuminato');if(yes(t.surveillance))a.push('Videosorveglianza');if(t.fee==='yes')a.push('A pagamento');if(t['capacity:hgv']||t.capacity_hgv)a.push('Posti TIR '+(t['capacity:hgv']||t.capacity_hgv));return a;}
  function compatText(x){return x.compat===true?'🟢 Compatibile':x.compat===false?'🔴 Non compatibile':'🟡 Da verificare';}

  function renderParking(exit){
    state.parkingLayer.clearLayers();
    const icon=parkingIcon();
    state.parking.forEach(x=>{const m=L.marker([x.lat,x.lon],{icon});m.bindPopup(`<div class="parking-popup"><strong>${esc(x.name)}</strong><small>📍 ${fmt(x.distance)} dall’uscita</small><small>${compatText(x)}</small>${services(x.tags).length?`<small>${esc(services(x.tags).join(' · '))}</small>`:''}<button type="button" class="parking-popup-nav" data-naviga-parcheggio="${esc(x.id)}">🧭 NAVIGA</button></div>`);state.parkingLayer.addLayer(m);});
    setTimeout(()=>state.map.invalidateSize(true),100);
  }
  function renderList(exit){
    const el=$('mpList');if(!el)return;
    if(!state.parking.length){el.innerHTML=`<div class="mp-empty"><strong>Nessun parcheggio trovato</strong><br>OpenStreetMap non restituisce parcheggi entro 2,5 km da <strong>${esc(exit.nome||'questa uscita')}</strong>.</div>`;return;}
    el.innerHTML=state.parking.map((x,i)=>`<article class="mp-card"><h3>🚛 ${esc(x.name)}</h3><div class="mp-meta"><span class="mp-chip">📍 ${fmt(x.distance)} dall’uscita</span><span class="mp-chip ${x.compat===true?'good':x.compat===false?'bad':'warn'}">${compatText(x)}</span></div><div class="mp-services">${services(x.tags).length?esc(services(x.tags).join(' · ')):'Servizi non indicati'}${Object.values(x.limits).some(Boolean)?'<br>'+Object.entries({'H':x.limits.height,'Larg.':x.limits.width,'Lung.':x.limits.length,'Peso':x.limits.weight}).filter(([,v])=>v).map(([k,v])=>k+' '+esc(v)).join(' · '):''}</div><div class="mp-card-actions"><button class="mp-btn dark" type="button" data-nav-index="${i}">🧭 NAVIGA</button><button class="mp-btn" type="button" data-map-index="${i}">📍 MAPPA</button></div></article>`).join('');
  }

  async function searchParking(exit, options){
    if(!exit||state.loading)return;
    state.loading=true;
    state.selectedExit=exit;

    busy($('mpNearestExit'),true,'🛣️ CERCO PARCHEGGI…','🛣️ CERCA VICINO ALL\'USCITA');
    status('Cerco parcheggi entro 5 km da '+(exit.nome||'questa uscita')+'…');
    $('mpList').innerHTML='<div class="mp-loading">⏳ Cerco i parcheggi intorno all’uscita…</div>';

    try{
      const data=await overpass(query(exit));
      const seen=new Set();

      state.parking=(data.elements||[])
        .map(e=>normalize(e,exit))
        .filter(Boolean)
        .filter(x=>x.distance<=RADIUS&&!seen.has(x.id)&&seen.add(x.id))
        .sort((a,b)=>a.distance-b.distance)
        .slice(0,100);

      renderParking(exit);
      renderList(exit);

      if(state.parking.length){
        status(state.parking.length+' parcheggi trovati · '+(exit.nome||'uscita'));
      }else{
        status('Nessun parcheggio OSM trovato entro 5 km · '+(exit.nome||'uscita'));
      }
    }catch(e){
      console.error(e);
      state.parking=[];
      renderParking(exit);
      renderList(exit);
      status('Ricerca parcheggi non disponibile · riprova tra poco',true);
    }finally{
      state.loading=false;
      busy($('mpNearestExit'),false,'','🛣️ CERCA VICINO ALL\'USCITA');
    }
  }

  function navigate(x){
    const url='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(x.lat+','+x.lon)+'&travelmode=driving';
    window.open(url,'_blank','noopener');
  }
  function loadProfile(){
    try{const raw=localStorage.getItem('1km-esimangia-mezzo');if(raw){const x=JSON.parse(raw);if(x.lunghezzaM)$('mpL').value=x.lunghezzaM;if(x.larghezzaM)$('mpW').value=x.larghezzaM;if(x.altezzaM)$('mpH').value=x.altezzaM;if(x.pesoKg)$('mpP').value=x.pesoKg/1000;}}
    catch(e){}
  }
  function saveProfile(){
    const p=profile(),msg=$('mpSaved');
    if(!(p.lunghezza>0&&p.larghezza>0&&p.altezza>0&&p.peso>0)){msg.textContent='⚠️ Inserisci tutte le dimensioni del mezzo.';msg.style.color='#a52b23';return;}
    localStorage.setItem('1km-esimangia-mezzo',JSON.stringify({lunghezzaM:p.lunghezza,larghezzaM:p.larghezza,altezzaM:p.altezza,pesoKg:p.peso*1000}));
    msg.textContent='✓ MEZZO SALVATO — dimensioni memorizzate su questo dispositivo.';msg.style.color='#176534';
    if(state.selectedExit) searchParking(state.selectedExit);
  }
  async function handleNearestFromPosition(pos){
    const here={lat:Number(pos.lat),lon:Number(pos.lon)};

    let best=null,bestD=Infinity;
    state.exits.forEach(e=>{
      const d=distance(here,{lat:Number(e.lat),lon:Number(e.lon)});
      if(d<bestD){bestD=d;best=e;}
    });

    if(!best){
      status('Posizione GPS trovata · nessuna uscita disponibile',true);
      return;
    }

    status('Posizione GPS trovata · uscita più vicina: '+(best.nome||'uscita autostradale'));

    // Il GPS serve solo a scegliere l'uscita.
    // La ricerca parcheggi non cambia la posizione/zoom della mappa.
    await searchParking(best);
  }

  function locate(){
    const b=$('mpLocate');
    if(!window.GPSCamionManager){
      status('GPS camion non disponibile: ricarica la pagina',true);
      return;
    }
    busy(b,true,'📍 CERCO LA POSIZIONE…','📍 USA LA MIA POSIZIONE');
    window.GPSCamionManager.start({
      onSuccess:function(pos){
        handleNearestFromPosition(pos).finally(()=>busy(b,false,'','📍 USA LA MIA POSIZIONE'));
      },
      onError:function(err){
        console.warn('GPS camion:',err);
        let text='Posizione non disponibile';
        if(err && err.code===1) text='Posizione negata dal browser';
        else if(err && err.code===3) text='Ricerca della posizione troppo lenta · riprova';
        status(text,true);
        busy(b,false,'','📍 USA LA MIA POSIZIONE');
      }
    });
  }

  document.addEventListener('click',e=>{
    const exitBtn=e.target.closest?.('[data-parcheggi-uscita]');
    if(exitBtn){const exit=state.exits.find(x=>String(x.id)===String(exitBtn.dataset.parcheggiUscita));if(exit)searchParking(exit);return;}
    const nav=e.target.closest?.('[data-naviga-parcheggio]');if(nav){const x=state.parking.find(p=>p.id===nav.dataset.navigaParcheggio);if(x)navigate(x);return;}
    const ni=e.target.closest?.('[data-nav-index]');if(ni){const x=state.parking[Number(ni.dataset.navIndex)];if(x)navigate(x);return;}
    const mi=e.target.closest?.('[data-map-index]');if(mi){const x=state.parking[Number(mi.dataset.mapIndex)];if(x)state.map.flyTo([x.lat,x.lon],16,{duration:.5});return;}
  });

  function start(){
    const ok=initMap();if(!ok)return;
    if(window.GPSCamionManager) window.GPSCamionManager.attachMap(state.map);
    loadProfile();
    $('mpLocate')?.addEventListener('click',locate);
    $('mpNearestExit')?.addEventListener('click',()=>{
      if(state.selectedExit) searchParking(state.selectedExit);
      else locate();
    });
    $('mpRefresh')?.addEventListener('click',()=>state.selectedExit?searchParking(state.selectedExit):loadExits());
    $('mpSave')?.addEventListener('click',saveProfile);
    loadExits();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
