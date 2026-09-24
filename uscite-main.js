// =====================================================
// 1 KM E SI MANGIA
// SCRIPT PRINCIPALE
// =====================================================


// =====================================================
// CONFIGURAZIONE
// =====================================================

const CONFIG = {

  // Limite RISTORANTI: 2 km DI STRADA (non linea d'aria).
  distanzaMassimaRistoranteKm: 2,

  tolleranzaDistanzaMetri: 100,

  // Google Places viene interrogato SOLO quando il GPS dell'utente
  // dimostra che si trova abbastanza vicino al casello selezionato.
  // Questo impedisce, ad esempio, di selezionare Reggio Calabria
  // mentre ci si trova in Valle d'Aosta e generare una chiamata Google.
  googlePlacesMaxGpsDistanceKm: 20,
  googlePlacesRadiusMeters: 2000,
  googlePlacesMaxResults: 15,

  get distanzaMassimaEffettivaMetri() {

    return (
      this.distanzaMassimaRistoranteKm * 1000 +
      this.tolleranzaDistanzaMetri
    );

  }

};


// =====================================================
// MAPPA
// =====================================================

const map = L.map("map", {

  center: [42.5, 12.5],

  zoom: 6,

  scrollWheelZoom: true

});

// API per i moduli esterni (GPS, ecc.)
window.appMap = map;
if (window.GPSManager) {
  window.GPSManager.attachMap(map);
}


// =====================================================
// OPENSTREETMAP
// =====================================================

L.tileLayer(

  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

  {

    maxZoom: 19,

    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  }

).addTo(map);


// =====================================================
// GRUPPO USCITE
// =====================================================

const clusterUscite = L.markerClusterGroup({

  showCoverageOnHover: false,

  spiderfyOnMaxZoom: false,

  zoomToBoundsOnClick: false,

  removeOutsideVisibleBounds: true,

  maxClusterRadius: 55

});

map.addLayer(clusterUscite);

// CLICK CLUSTER: semplice zoom, senza contorni, spiderfy o popup automatici.
// Il cluster serve solo per raggruppare i caselli quando la mappa è lontana.
clusterUscite.on("clusterclick", function(e) {
  if (!e || !e.layer) return;

  L.DomEvent.stop(e.originalEvent);

  const bounds = e.layer.getBounds && e.layer.getBounds();
  if (bounds && bounds.isValid()) {
    const currentZoom = map.getZoom();
    const targetZoom = Math.min(
      map.getMaxZoom() || 19,
      Math.max(currentZoom + 2, Math.min(14, currentZoom + 2))
    );

    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: targetZoom,
      animate: true
    });
  } else {
    map.setView(e.layer.getLatLng(), Math.min((map.getMaxZoom() || 19), map.getZoom() + 2), {
      animate: true
    });
  }
});

// =====================================================
// ICONA USCITA
// =====================================================

const exitIcon = L.divIcon({

  className: "",

  html:
    '<div class="custom-marker"></div>',

  iconSize: [36, 36],

  iconAnchor: [18, 18],

  popupAnchor: [0, -18]

});

// =====================================================
// DATABASE
// =====================================================

let usciteItaliane = [];


/* =========================================================
   ROUTING GOOGLE + FALLBACK
   Integrato da fix-google-route-1km.js
   ========================================================= */
// 1 KM E SI MANGIA - fix finale distanza Google Places
// Google Places -> Google Routes. Se Routes non risponde, usiamo un
// fallback geometrico prudente per non perdere locali realmente vicini.
(function(){
  "use strict";

  const originalFetch = window.fetch.bind(window);
  let googleSearchActive = false;
  let resetTimer = null;

  function attivaGoogleRoute(){
    googleSearchActive = true;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(function(){ googleSearchActive = false; }, 30000);
  }

  function fallbackDistance(init){
    try{
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
      const o = body?.origin || {}, d = body?.destination || {};
      const aLat=Number(o.lat), aLon=Number(o.lon), bLat=Number(d.lat), bLon=Number(d.lon);
      if(![aLat,aLon,bLat,bLon].every(Number.isFinite)) return null;
      const R=6371000, p1=aLat*Math.PI/180, p2=bLat*Math.PI/180;
      const dp=(bLat-aLat)*Math.PI/180, dl=(bLon-aLon)*Math.PI/180;
      const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
      const straight=2*R*Math.asin(Math.sqrt(h));
      // Solo locali molto vicini in linea d'aria: maggiorazione prudente 1.5x.
      if(straight>1300) return null;
      return Math.round(straight*1.5);
    }catch(_){ return null; }
  }

  function rispostaFallback(init){
    const d=fallbackDistance(init);
    if(d==null) return Promise.reject(new Error("Google Routes non disponibile e fallback non applicabile"));
    return Promise.resolve(new Response(JSON.stringify({distanceMeters:d}),{
      status:200,
      headers:{"Content-Type":"application/json"}
    }));
  }

  window.fetch = function(input, init){
    const url = typeof input === "string" ? input : (input && input.url ? input.url : "");

    if(url.includes("/api/places")){
      attivaGoogleRoute();
      try {
        if (init?.method === "POST" && typeof init.body === "string") {
          const body = JSON.parse(init.body);
          const exitLat = Number(body?.exit?.lat);
          const exitLon = Number(body?.exit?.lon);
          const posizione = window.GPSManager?.getLastPosition?.();
          const userLat = Number(posizione?.lat);
          const userLon = Number(posizione?.lng ?? posizione?.lon);
          if ([exitLat, exitLon, userLat, userLon].every(Number.isFinite)) {
            const R = 6371000;
            const p1 = exitLat * Math.PI / 180;
            const p2 = userLat * Math.PI / 180;
            const dp = (userLat - exitLat) * Math.PI / 180;
            const dl = (userLon - exitLon) * Math.PI / 180;
            const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
            const distanza = 2 * R * Math.asin(Math.sqrt(h));
            if (distanza <= 5000) {
              body.searchOrigin = { lat: userLat, lon: userLon };
              init = { ...init, body: JSON.stringify(body) };
            }
          }
        }
      } catch (error) {
        console.warn("Google zona: richiesta invariata", error);
      }
      return originalFetch(input, init);
    }

    // Durante la ricerca Google non permettiamo a OSRM di decidere il limite.
    if(googleSearchActive && (url.includes("router.project-osrm.org/") || url.includes("routing.openstreetmap.de/routed-car/"))){
      return Promise.reject(new Error("OSRM bypass: Google Routes richiesto"));
    }

    if(googleSearchActive && url.includes("/api/route")){
      return originalFetch(input, init).then(function(response){
        if(!response.ok) return rispostaFallback(init);
        return response.json().then(function(data){
          const road=Number(data?.distanceMeters);
          // Se Google restituisce una distanza anomala, verifichiamo il punto geometrico.
          const fallback=fallbackDistance(init);
          if(fallback!=null && (!Number.isFinite(road) || road>2000)){
            return new Response(JSON.stringify({distanceMeters:fallback}),{status:200,headers:{"Content-Type":"application/json"}});
          }
          return new Response(JSON.stringify(data),{status:response.status,headers:{"Content-Type":"application/json"}});
        }).catch(function(){ return rispostaFallback(init); });
      }).catch(function(){ return rispostaFallback(init); });
    }

    return originalFetch(input, init);
  };

  console.log("1KM: Google Places -> Google Routes + fallback prudente attivo");
})();


/* =========================================================
   RISTORANTI: DATABASE LOCALE + GOOGLE PLACES + DISTANZA STRADALE
   Integrato da fix-distanza-ristoranti.js
   ========================================================= */
// 1 KM E SI MANGIA - ristoranti locali + Google Places + distanza stradale
(function(){
  "use strict";

  const MAX_ROAD = 20000;
  const CANDIDATE_RADIUS = 25000;
  const GOOGLE_RADIUS = 20000;
  const GOOGLE_MAX = 15;
  const routeCache = new Map();
  const googleCache = new Map();
  let dbPromise = null;
  let uscitePromise = null;

  function dist(a,b,c,d){
    const R=6371000, p1=a*Math.PI/180, p2=c*Math.PI/180;
    const dp=(c-a)*Math.PI/180, dl=(d-b)*Math.PI/180;
    const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
  }

  function norm(v){
    return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
  }

  function clean(r){
    const s=norm(`${r?.nome||""} ${r?.google_address||""} ${r?.cucina||""}`);
    return !/(autogrill|area di servizio|area servizio|stazione di servizio|gas station|distributore|tamoil|eni|agip|q8|esso|shell|\bip\b|rest stop|truck stop)/i.test(s);
  }

  function loadExits(){
    if(!uscitePromise) uscitePromise=fetch("./uscite.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("uscite.json "+r.status);return r.json();});
    return uscitePromise;
  }

  // Fallback prudente: se i servizi di routing esterni sono temporaneamente
  // irraggiungibili, non facciamo sparire ristoranti realmente vicini.
  function fallbackRoad(exit,r){
    const lineare=dist(Number(exit.lat),Number(exit.lon),Number(r.lat),Number(r.lon));
    if(!Number.isFinite(lineare)) return null;
    return Math.round(lineare*1.35+80);
  }

  function storedExitDistance(exit,r){
    const d=Number(r?.uscita?.distanza_m);
    if(!Number.isFinite(d)||d<0) return null;
    const sameName=norm(r?.uscita?.nome)===norm(exit?.nome);
    const a=norm(r?.uscita?.autostrada), b=norm(exit?.autostrada);
    const sameRoad=!a||!b||a===b;
    return sameName&&sameRoad?d:null;
  }

  function loadDB(){
    if(!dbPromise) dbPromise=fetch("./ristoranti.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("ristoranti.json "+r.status);return r.json();});
    return dbPromise;
  }

  async function osrmTable(exit,candidates){
    const out=new Map();
    for(let start=0;start<candidates.length;start+=12){
      const chunk=candidates.slice(start,start+12);
      const coords=[`${exit.lon},${exit.lat}`,...chunk.map(r=>`${r.lon},${r.lat}`)].join(";");
      const dest=chunk.map((_,i)=>i+1).join(";");
      const urls=[
        `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=${dest}&annotations=distance`,
        `https://routing.openstreetmap.de/routed-car/table/v1/driving/${coords}?sources=0&destinations=${dest}&annotations=distance`
      ];
      let row=null;
      for(const url of urls){
        try{const r=await fetch(url,{cache:"no-store"});if(!r.ok)continue;const j=await r.json();if(Array.isArray(j?.distances?.[0])&&j.distances[0].length===chunk.length){row=j.distances[0];break;}}catch(e){}
      }
      if(row) chunk.forEach((r,i)=>{if(Number.isFinite(Number(row[i])))out.set(r,Number(row[i]));});
    }
    return out;
  }

  async function routeOne(exit,r){
    const key=`${exit.id}|${Number(r.lat).toFixed(6)}|${Number(r.lon).toFixed(6)}`;
    if(routeCache.has(key))return routeCache.get(key);
    const coords=`${exit.lon},${exit.lat};${r.lon},${r.lat}`;
    const urls=[`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`,`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=false`];
    for(const url of urls){try{const x=await fetch(url,{cache:"no-store"});if(!x.ok)continue;const j=await x.json();const d=Number(j?.routes?.[0]?.distance);if(Number.isFinite(d)){routeCache.set(key,d);return d;}}catch(e){}}

    // Ultimo fallback: Google Routes. Evita che un errore temporaneo
    // dei server OSRM faccia sparire tutti i ristoranti Google.
    try{
      const x=await fetch("/api/route",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          origin:{lat:Number(exit.lat),lon:Number(exit.lon)},
          destination:{lat:Number(r.lat),lon:Number(r.lon)}
        })
      });
      if(x.ok){
        const j=await x.json();
        const d=Number(j?.distanceMeters);
        if(Number.isFinite(d)){routeCache.set(key,d);return d;}
      }
    }catch(e){
      console.warn("Google Routes fallback non disponibile:",e);
    }

    return null;
  }

  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function panel(){return document.getElementById("ristorantiMapPanel");}
  function close(){panel()?.remove();}

  function mostraNavigazione(r){
    if(typeof window.apriNavigazione!=="function"){alert("Sistema di navigazione non disponibile.");return;}
    window._uscitaCorrente=r.uscita||window._uscitaCorrente;
    window.apriNavigazione({...r,demo_mezzo_pesante:false,destinazione_tipo:"ristorante"});
  }
  function mostraRientro(r){
    if(typeof window.apriRientroAutostrada!=="function"){alert("Rientro in autostrada non disponibile.");return;}
    window._uscitaCorrente=r.uscita||window._uscitaCorrente;
    window.apriRientroAutostrada(r);
  }

  function show(exit,items,googleSearched=false,radius=1000){
    const visibleItems=(radius==='all'?items:items.filter(r=>Number(r._road)<=Number(radius)));
    const filters=[['1 km',1000],['2 km',2000],['5 km',5000],['10 km',10000],['20 km',20000],['Tutti','all']];
    // Barra filtri separata: su mobile non deve mai finire sotto il pulsante Google.
    const filterBar='<div style="position:relative;z-index:5;box-sizing:border-box;display:block;min-height:70px;height:70px;padding:12px 12px 10px;margin:0;background:#fff;border-bottom:1px solid #edf1ef;overflow:hidden"><div style="display:flex;align-items:center;gap:8px;height:48px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;padding:0 1px 2px">'+filters.map(([label,value])=>'<button type="button" data-distance-filter="'+value+'" style="box-sizing:border-box!important;display:block!important;flex:0 0 auto!important;width:auto!important;height:44px!important;min-height:44px!important;max-height:44px!important;margin:0!important;border:1px solid '+(String(radius)===String(value)?'#075c3b':'#cbd8d2')+'!important;border-radius:22px!important;background:'+(String(radius)===String(value)?'#075c3b':'#fff')+'!important;color:'+(String(radius)===String(value)?'#fff':'#075c3b')+'!important;padding:0 16px!important;font-weight:800!important;font-size:13px!important;line-height:44px!important;cursor:pointer;white-space:nowrap!important;scroll-snap-align:start;box-shadow:none!important">'+label+'</button>').join('')+'</div></div>';
    close();
    window._ristorantiCorrenti=items;
    window.ristorantiCorrenti=items;
    window._uscitaCorrente=exit;

    const p=document.createElement("div");
    p.id="ristorantiMapPanel";
    p.style.cssText="position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(94vw,540px);height:min(90vh,820px);background:#fff;border-radius:20px;box-shadow:0 16px 55px rgba(0,0,0,.35);overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;color:#173b31;display:flex;flex-direction:column;";

    const googleButton=googleSearched
      ? `<div style="position:relative;z-index:1;flex:0 0 auto;margin:10px 12px 2px;padding:10px 12px;border-radius:11px;background:#eef6f1;color:#075c3b;text-align:center;font-size:12px;font-weight:800">✓ Risultati Google Places aggiunti</div>`
      : `<button id="cercaAltriGoogle" type="button" style="position:relative;z-index:1;flex:0 0 auto;box-sizing:border-box;width:calc(100% - 24px);height:52px;min-height:52px!important;max-height:52px;margin:10px 12px 2px;border:1px solid #075c3b;border-radius:11px;background:#fff;color:#075c3b;padding:0 12px!important;font-weight:800;font-size:12px;letter-spacing:.2px;line-height:50px!important;cursor:pointer">🔎 CERCA ALTRI RISTORANTI CON GOOGLE</button>`;

    p.innerHTML=`<div style="flex:0 0 auto;padding:14px 16px 13px;background:#075c3b;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.12)"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#f5a719">1 KM E SI MANGIA</div><div style="font-size:21px;font-weight:800;line-height:1.1;margin-top:3px">🍴 Ristoranti</div><div style="font-size:13px;opacity:.9;margin-top:4px;line-height:1.3">${esc(exit.nome||"Uscita")} · prima entro 1 km, poi amplia la ricerca</div></div><button id="chiudiRistorantiMap" type="button" aria-label="Chiudi" style="flex:0 0 auto;border:0;border-radius:50%;width:40px;height:40px;background:rgba(255,255,255,.16);color:#fff;font-size:28px;line-height:1;cursor:pointer">×</button></div></div>${filterBar}${googleButton}<div data-google-status style="min-height:0"></div><div data-restaurant-scroll style="flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px 10px 16px;background:#f5f8f6"></div>`;

    const lista=p.querySelector("[data-restaurant-scroll]");
    if(!visibleItems.length){
      lista.innerHTML=`<div style="background:#fff;border-radius:16px;padding:22px;margin:2px;text-align:center;color:#53635e">Nessun ristorante entro <b>${radius==='all'?'20 km':Number(radius)/1000+' km'} di strada</b>. Prova ad ampliare la ricerca.</div>`;
    }else{
      visibleItems.forEach((r,i)=>{
        const d=Math.round(Number(r._road));
        const dLabel=r._roadFallback?`≈ ${d} m`:`${d} m`;
        const cucina=r.cucina?esc(r.cucina):"Ristorante";
        const indirizzo=r.google_address?`<div style="font-size:12px;color:#66756f;margin-top:6px;line-height:1.35">📍 ${esc(r.google_address)}</div>`:"";
        const fonte=r.fonte==="Google Places"?`<span style="background:#eef6f1;color:#075c3b;border-radius:8px;padding:5px 7px;font-weight:800">Google Places</span>`:"";
        const rating=Number(r.google_rating??r.rating);
        const ratingCount=Number(r.google_rating_count??r.userRatingCount);
        const stelle=Number.isFinite(rating)&&rating>0?`<div style="display:flex;align-items:center;gap:5px;margin-top:8px;font-size:13px"><span style="color:#f5a719;letter-spacing:1px;font-size:18px;line-height:1">★★★★★</span><b style="color:#173b31">${rating.toFixed(1)}</b>${Number.isFinite(ratingCount)&&ratingCount>0?`<span style="color:#66756f">(${ratingCount.toLocaleString("it-IT")} recensioni)</span>`:""}</div>`:"";
        const parcheggio=r.parcheggio?.presente===true?"🅿️ Parcheggio presente":"🅿️ Parcheggio da verificare";
        const card=document.createElement("article");
        card.style.cssText="background:#fff;border:1px solid #dfe8e3;border-radius:16px;padding:13px;margin:0 1px 9px;box-shadow:0 2px 8px rgba(7,92,59,.07)";
        card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div style="min-width:0"><div style="font-size:17px;font-weight:800;line-height:1.22">${i+1}. ${esc(r.nome||"Ristorante")}</div><div style="font-size:13px;color:#53635e;margin-top:5px">🍽️ ${cucina}</div></div><div style="flex:0 0 auto;background:#eef6f1;color:#075c3b;border-radius:12px;padding:6px 8px;font-weight:800;font-size:12px;white-space:nowrap">📍 ${dLabel}</div></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;font-size:12px;color:#53635e"><span style="background:#f4f6f5;border-radius:8px;padding:5px 7px">${parcheggio}</span>${r.telefono?`<span style="background:#f4f6f5;border-radius:8px;padding:5px 7px">📞 ${esc(r.telefono)}</span>`:""}${fonte}</div>${stelle}${indirizzo}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><button type="button" data-naviga-ristorante data-nav-lat="${Number(r.lat)}" data-nav-lon="${Number(r.lon)}" data-nav-name="${esc(r.nome||'Ristorante')}" style="border:0;border-radius:11px;background:#075c3b;color:#fff;padding:10px 7px;font-weight:800;font-size:13px;cursor:pointer">🧭 NAVIGA</button><button type="button" data-rientro-autostrada style="border:1px solid #075c3b;border-radius:11px;background:#fff;color:#075c3b;padding:10px 7px;font-weight:800;font-size:12px;cursor:pointer">🔄 RIENTRA IN AUTOSTRADA</button></div><button type="button" data-recensione-id="${esc(r.id||r.osm_id||r.nome)}" style="width:100%;margin-top:8px;border:1px solid #f5a719;border-radius:11px;background:#fff8e9;color:#8a5a00;padding:10px 7px;font-weight:800;font-size:13px;cursor:pointer">⭐ RECENSISCI QUESTO RISTORANTE</button>`;
        card.querySelector("[data-naviga-ristorante]").addEventListener("click",e=>{e.preventDefault();e.stopPropagation();mostraNavigazione(r);});
        card.querySelector("[data-rientro-autostrada]").addEventListener("click",e=>{e.preventDefault();e.stopPropagation();mostraRientro(r);});
        lista.appendChild(card);
      });
    }
    document.body.appendChild(p);
    p.querySelectorAll("[data-distance-filter]").forEach(btn=>btn.addEventListener("click",()=>{
      const value=btn.dataset.distanceFilter==='all'?'all':Number(btn.dataset.distanceFilter);
      show(exit,items,googleSearched,value);
    }));
    p.querySelector("#chiudiRistorantiMap")?.addEventListener("click",close);

    const gb=p.querySelector("#cercaAltriGoogle");
    if(gb) gb.addEventListener("click",async e=>{
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      gb.disabled=true;gb.style.opacity=".7";gb.textContent="🔎 CERCO ALTRI RISTORANTI...";
      await arricchisciConGoogle(exit,items);
    });
  }

  async function cercaGoogle(exit){
    const key=String(exit.id||`${exit.lat},${exit.lon}`);
    if(googleCache.has(key)) return googleCache.get(key);
    const promise=(async()=>{
      const response=await fetch("/api/places",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({exit:{lat:Number(exit.lat),lon:Number(exit.lon)},radius:GOOGLE_RADIUS,maxResultCount:GOOGLE_MAX})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data?.error||`Google Places HTTP ${response.status}`);
      return Array.isArray(data.places)?data.places:[];
    })();
    googleCache.set(key,promise);
    try{return await promise;}catch(e){googleCache.delete(key);throw e;}
  }

  function mergeGoogle(locali,places,exit){
    const out=Array.isArray(locali)?locali.slice():[];
    const ids=new Set(out.map(r=>String(r.google_place_id||"" )).filter(Boolean));
    for(const place of Array.isArray(places)?places:[]){
      const lat=Number(place?.location?.latitude), lon=Number(place?.location?.longitude);
      const id=place?.id?String(place.id):"";
      const nome=place?.displayName?.text||"Ristorante";
      if(!id||!Number.isFinite(lat)||!Number.isFinite(lon)||ids.has(id)) continue;
      const ng=norm(nome);
      let dup=null;
      for(const r of out){
        const rl=Number(r.lat), ro=Number(r.lon); if(!Number.isFinite(rl)||!Number.isFinite(ro)) continue;
        const sameName=ng&&norm(r.nome)&& (ng===norm(r.nome)||ng.includes(norm(r.nome))||norm(r.nome).includes(ng));
        if(sameName&&dist(lat,lon,rl,ro)<=80){dup=r;break;}
      }
      if(dup){
        dup.google_place_id=id; dup.google_place_name=nome; dup.google_address=place?.formattedAddress||""; dup.google_types=Array.isArray(place?.types)?place.types:[]; dup.google_rating=Number(place?.rating); dup.google_rating_count=Number(place?.userRatingCount); ids.add(id);
      }else{
        out.push({id:`google:${id}`,google_place_id:id,google_place_name:nome,google_address:place?.formattedAddress||"",google_types:Array.isArray(place?.types)?place.types:[],google_rating:Number(place?.rating),google_rating_count:Number(place?.userRatingCount),nome,lat,lon,cucina:"Google Places",fonte:"Google Places",uscita:{id:exit.id,nome:exit.nome,distanza_m:null,lat:exit.lat,lon:exit.lon},parcheggio:{presente:false}});
        ids.add(id);
      }
    }
    return out;
  }

  async function arricchisciConGoogle(exit,localiVerificati){
    const status=panel()?.querySelector("[data-google-status]");
    try{
      const places=await cercaGoogle(exit);
      const combinati=mergeGoogle(localiVerificati,places,exit);
      const roadsAll=new Map();
      for(const r of combinati){
        const salvata=storedExitDistance(exit,r);
        if(salvata!=null) roadsAll.set(r,salvata);
      }
      const daCalcolare=combinati.filter(r=>!roadsAll.has(r));
      if(daCalcolare.length){
        const calcolate=await osrmTable(exit,daCalcolare);
        for(const [r,d] of calcolate) roadsAll.set(r,d);
      }
      const missingAll=combinati.filter(r=>!roadsAll.has(r));
      if(missingAll.length) for(const r of missingAll){const d=await routeOne(exit,r);if(d!=null)roadsAll.set(r,d);}
      for(const r of combinati){if(!roadsAll.has(r)){const stima=fallbackRoad(exit,r);if(stima!=null){roadsAll.set(r,stima);r._roadFallback=true;}}}
      const finali=combinati.filter(r=>roadsAll.has(r)&&roadsAll.get(r)<=MAX_ROAD).map(r=>{r._road=roadsAll.get(r);r.uscita={...(r.uscita||{}),id:exit.id,nome:exit.nome,distanza_m:Math.round(r._road),lat:exit.lat,lon:exit.lon};return r;}).sort((a,b)=>a._road-b._road);
      window._ristorantiVisualizzati=finali;
      show(exit,finali,true);
      console.log("RISTORANTI GOOGLE",{uscita:exit.nome,locali:localiVerificati.length,google:places.length,finali:finali.length});
    }catch(e){
      console.warn("Google Places non disponibile:",e);
      if(status) status.innerHTML=`<div style="margin:8px 12px;padding:9px 12px;border-radius:12px;background:#fff4e5;color:#8a5a00;text-align:center;font-size:12px;font-weight:700">Google Places non disponibile. I ristoranti locali restano disponibili.</div>`;
      const gb=panel()?.querySelector("#cercaAltriGoogle");
      if(gb){gb.disabled=false;gb.style.opacity="1";gb.textContent="🔎 Riprova con Google Places";}
    }
  }

  async function run(exit){
    try{
      const db=await loadDB();
      const locali=db.filter(r=>clean(r)&&Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lon))&&dist(Number(exit.lat),Number(exit.lon),Number(r.lat),Number(r.lon))<=CANDIDATE_RADIUS);
      // Prima usiamo la distanza dall'uscita già verificata nel database.
      // È fondamentale per non far calcolare a OSRM un giro assurdo partendo dal nodo autostradale.
      const roads=new Map();
      for(const r of locali){
        const salvata=storedExitDistance(exit,r);
        if(salvata!=null) roads.set(r,salvata);
      }
      const daCalcolare=locali.filter(r=>!roads.has(r));
      if(daCalcolare.length){
        const calcolate=await osrmTable(exit,daCalcolare);
        for(const [r,d] of calcolate) roads.set(r,d);
      }
      const missing=locali.filter(r=>!roads.has(r));
      for(const r of missing){
        const d=await routeOne(exit,r);
        if(d!=null) roads.set(r,d);
        else{
          const stima=fallbackRoad(exit,r);
          if(stima!=null){roads.set(r,stima);r._roadFallback=true;}
        }
      }
      const localiVerificati=locali.filter(r=>roads.has(r)&&roads.get(r)<=MAX_ROAD).map(r=>{r._road=roads.get(r);r.uscita={...(r.uscita||{}),id:exit.id,nome:exit.nome,distanza_m:Math.round(r._road),lat:exit.lat,lon:exit.lon};return r;}).sort((a,b)=>a._road-b._road);

      // Mostra SUBITO il database locale. Google Places parte SOLO
      // quando l'utente preme esplicitamente il pulsante "Cerca altri".
      // Non deve mai aprirsi o aggiornarsi automaticamente.
      window._ristorantiVisualizzati=localiVerificati;
      show(exit,localiVerificati,false);
    }catch(e){console.error("Ricerca ristoranti:",e);show(exit,[]);}
  }

  document.addEventListener("click",function(e){
    const b=e.target.closest&&e.target.closest("[data-ristoranti-uscita]");
    if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const id=b.getAttribute("data-ristoranti-uscita");
    loadExits().then(list=>{
      const all=Array.isArray(list)?list:[];
      const candidati=all.filter(x=>String(x.id||"")===String(id));
      if(!candidati.length){console.error("Uscita non trovata:",id);return;}
      // Alcuni database possono contenere ID ripetuti. In quel caso scegliamo
      // l'uscita fisicamente più vicina al centro della mappa aperta, così un
      // click su Ronco Scrivia non può riproporre Busalla.
      let exit=candidati[0];
      const centro=window.appMap&&typeof window.appMap.getCenter==="function"?window.appMap.getCenter():null;
      if(centro&&candidati.length>1){
        exit=candidati.slice().sort((a,b)=>dist(Number(centro.lat),Number(centro.lng),Number(a.lat),Number(a.lon))-dist(Number(centro.lat),Number(centro.lng),Number(b.lat),Number(b.lon)))[0];
      }
      run(exit);
    }).catch(err=>console.error("Uscite non disponibili:",err));
  },true);

  // NAVIGA: handler in cattura con coordinate sul bottone.
  // Evita conflitti con i vecchi listener ancora caricati nella pagina.
  document.addEventListener("click",function(e){
    const b=e.target&&e.target.closest?e.target.closest("#ristorantiMapPanel [data-naviga-ristorante][data-nav-lat]"):null;
    if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const lat=Number(b.dataset.navLat),lon=Number(b.dataset.navLon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)){alert("Coordinate del ristorante non disponibili.");return;}
    const r={lat,lon,nome:b.dataset.navName||"Ristorante"};
    if(typeof window.apriNavigazione==="function"){
      try{window.apriNavigazione(r);return;}catch(err){console.error("Errore NAVIGA:",err);}
    }
    window.location.assign("https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(lat+","+lon)+"&travelmode=driving");
  },true);

  window.__offlineRistorantiFix={run};
})();


// =====================================================
// DATABASE RISTORANTI
// =====================================================

let ristorantiDatabase = [];

const ristorantiLayer = L.layerGroup().addTo(map);
const ristorantiPerUscitaMap = new Map();

const restaurantIcon = L.divIcon({
  className: "restaurant-map-icon",
  html:
    '<div style="width:34px;height:34px;border-radius:50%;background:#ffffff;border:3px solid #075c3b;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.35);">🍴</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17]
});

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nomeGiornoItalia() {
  return ["Su","Mo","Tu","We","Th","Fr","Sa"][new Date().getDay()];
}

function giornoInRegola(rule, day) {
  if (!rule) return false;
  if (rule === day) return true;
  const parts = rule.split("-");
  if (parts.length !== 2) return false;
  const giorni = ["Mo","Tu","We","Th","Fr","Sa","Su"];
  let a = giorni.indexOf(parts[0]), b = giorni.indexOf(parts[1]), x = giorni.indexOf(day);
  if (a < 0 || b < 0 || x < 0) return false;
  if (a <= b) return x >= a && x <= b;
  return x >= a || x <= b;
}

function statoApertura(apertura) {
  if (!apertura) return { label: "ORARI NON DISPONIBILI", color: "#65736e" };
  if (String(apertura).trim() === "24/7") return { label: "🟢 APERTO 24 ORE SU 24", color: "#16834b" };
  const day = nomeGiornoItalia();
  const now = new Date();
  const minuti = now.getHours() * 60 + now.getMinutes();
  const regole = String(apertura).split(";").map(x => x.trim()).filter(Boolean);
  let aperto = false, prossimo = null;
  for (const regola of regole) {
    const m = regola.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+(.+)$/i);
    if (!m) continue;
    const giorno = m[1].replace(/^./, c => c.toUpperCase()) + (m[2] ? "-" + m[2].replace(/^./, c => c.toUpperCase()) : "");
    if (!giornoInRegola(giorno, day)) continue;
    if (/off/i.test(m[3])) continue;
    const fasce = m[3].split(",").map(x => x.trim());
    for (const fascia of fasce) {
      const tm = fascia.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (!tm) continue;
      const inizio = Number(tm[1])*60+Number(tm[2]);
      let fine = Number(tm[3])*60+Number(tm[4]);
      if (fine === 0) fine = 1440;
      const dentro = fine >= inizio ? minuti >= inizio && minuti <= fine : (minuti >= inizio || minuti <= fine);
      if (dentro) { aperto = true; prossimo = `${tm[3].padStart(2,"0")}:${tm[4]}`; }
    }
  }
  if (aperto) return { label: prossimo ? `🟢 APERTO · chiude alle ${prossimo}` : "🟢 APERTO", color: "#16834b" };
  return { label: "🔴 CHIUSO", color: "#b23a2b" };
}

function bloccoRistoranteExtra(ristorante) {
  const stato = statoApertura(ristorante.apertura);
  const id = escapeHtml(ristorante.id || ristorante.osm_id || ristorante.nome || "");
  return `
    <div style="margin-top:9px;padding-top:9px;border-top:1px solid #e5e5e5;display:grid;gap:5px">
      <strong style="color:${stato.color};font-size:13px">${stato.label}</strong>
      ${ristorante.apertura ? `<small>🕐 ${escapeHtml(ristorante.apertura)}</small>` : ""}
      <button type="button" data-recensione-id="${id}" style="margin-top:3px;border:0;border-radius:9px;background:#f5a719;color:#073f2e;padding:8px 10px;font-weight:800;cursor:pointer">⭐ RECENSIONI</button>
    </div>`;
}

function ristorantiPerUscita(uscita) {
  if (!uscita || !uscita.id) return [];
  return ristorantiPerUscitaMap.get(String(uscita.id)) || [];
}

function creaPopupRistorante(ristorante) {
  const nome = escapeHtml(ristorante.nome || "Ristorante");
  const distanza = Number.isFinite(Number(ristorante?.uscita?.distanza_m))
    ? `<small>📍 ${Math.round(Number(ristorante.uscita.distanza_m))} m dall'uscita</small>` : "";
  const parcheggio = ristorante.parcheggio?.presente === true
    ? `<small>🅿️ Parcheggio ${ristorante.parcheggio.distanza_m != null ? Math.round(Number(ristorante.parcheggio.distanza_m)) + " m" : "presente"}</small>`
    : `<small>🅿️ Parcheggio da verificare</small>`;
  const ristoranteId = escapeHtml(
    ristorante.id != null ? String(ristorante.id) : String(ristorante.osm_id || ristorante.nome || "")
  );

  return `
    <div class="popup-ristorante-1km" style="min-width:230px;line-height:1.4;text-align:left">
      <strong style="display:block;font-size:16px;margin-bottom:5px">${nome}</strong>
      ${ristorante.cucina ? `<small>🍽️ ${escapeHtml(ristorante.cucina)}</small>` : ""}
      ${distanza}
      ${parcheggio}
      ${ristorante.telefono ? `<small>📞 ${escapeHtml(ristorante.telefono)}</small>` : ""}
      ${ristorante.google_address ? `<small>📍 ${escapeHtml(ristorante.google_address)}</small>` : ""}
      ${ristorante.fonte === "Google Places" ? `<small style="color:#075c3b;font-weight:700">Google Places</small>` : ""}
      ${bloccoRistoranteExtra(ristorante)}
      <button type="button" data-naviga-ristorante="${ristoranteId}" style="display:block;width:100%;margin-top:10px;padding:10px 12px;border:0;border-radius:9px;background:#075c3b;color:#fff;font-size:14px;font-weight:800;cursor:pointer">${window.I18N?.tr("navigate","🧭 NAVIGA")||"🧭 NAVIGA"}</button>
    </div>
  `;
}

function creaMarkerRistorante(ristorante) {
  if (typeof ristorante.lat !== "number" || typeof ristorante.lon !== "number") {
    return null;
  }

  const marker = L.marker([ristorante.lat, ristorante.lon], {
    icon: restaurantIcon
  });

  marker.bindPopup(creaPopupRistorante(ristorante));
  return marker;
}

function chiudiPannelloRistoranti() {
  const panel = document.getElementById("ristorantiMapPanel");
  if (panel) panel.remove();
}

function mostraRistorantiDatabase(uscita, ristorantiOverride) {
  if (!uscita) return;
  window._ultimaUscitaRistoranti = uscita;
  window._ristorantiRefresh = function() {
    mostraRistorantiDatabase(
      window._ultimaUscitaRistoranti,
      window._ristorantiVisualizzati || []
    );
  };

  const ristoranti = Array.isArray(ristorantiOverride)
    ? ristorantiOverride
    : ristorantiPerUscita(uscita);

  // Mantiene disponibile lo stesso elenco per tutti i pulsanti NAVIGA.
  window._ristorantiVisualizzati = ristoranti;
  ristorantiLayer.clearLayers();
  chiudiPannelloRistoranti();

  const bounds = L.latLngBounds([[uscita.lat, uscita.lon]]);
  let markerCount = 0;

  ristoranti.forEach(function(ristorante) {
    const marker = creaMarkerRistorante(ristorante);
    if (!marker) return;

    marker.addTo(ristorantiLayer);
    bounds.extend([ristorante.lat, ristorante.lon]);
    markerCount++;
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 15
    });
  }

  const panel = document.createElement("div");
  panel.id = "ristorantiMapPanel";
  panel.style.cssText =
    "position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,520px);max-height:80vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:18px;font-family:system-ui,sans-serif;";

  if (!ristoranti.length) {
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong style="font-size:20px">${window.I18N?.tr("noRestaurant","Nessun ristorante")||"Nessun ristorante"}</strong>
        <button id="chiudiRistorantiMap" type="button" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer">×</button>
      </div>
      <p>Non risultano ristoranti associati a questa uscita nel database.</p>
    `;
  } else {
    const cards = ristoranti.map(function(ristorante, index) {
      const nome = escapeHtml(ristorante.nome || "Ristorante");
      const distanza = Number.isFinite(Number(ristorante?.uscita?.distanza_m))
        ? Math.round(Number(ristorante.uscita.distanza_m)) + " m dall'uscita"
        : "";
      const parcheggio = ristorante.parcheggio?.presente === true
        ? "🅿️ Parcheggio " + (ristorante.parcheggio.distanza_m != null ? Math.round(Number(ristorante.parcheggio.distanza_m)) + " m" : "presente")
        : "🅿️ Parcheggio da verificare";

      return `
        <div class="rr-card-clickable" data-restaurant-id="${escapeHtml(ristorante.id || ristorante.osm_id || ristorante.place_id || ristorante.nome)}" title="Apri il ristorante e leggi le recensioni" style="border:1px solid #e5e5e5;border-radius:14px;padding:12px;margin-top:10px;cursor:pointer">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <div>
              <strong>${index + 1}. ${nome}</strong>
              ${ristorante.cucina ? `<div style="font-size:12px;color:#555;margin-top:3px">🍽️ ${escapeHtml(ristorante.cucina)}</div>` : ""}
            </div>
            ${typeof ristorante.lat === "number" && typeof ristorante.lon === "number"
              ? `<button type="button" data-ristorante-index="${index}" style="box-sizing:border-box;min-width:132px;height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:10px;background:#075c3b;color:#fff;padding:8px 12px;font-weight:700;cursor:pointer;white-space:nowrap"><svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><path d="M9 3 6 29M23 3l3 26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M16 4v5M16 13v5M16 22v6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 4"/></svg> NAVIGA</button>` + (ristorante.parcheggio?.presente === true && Number.isFinite(Number(ristorante.parcheggio.distanza_m)) && Number(ristorante.parcheggio.distanza_m) <= 600
                ? ` <button type="button" data-demo-ristorante-index="${index}" style="box-sizing:border-box;min-width:132px;height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #075c3b;border-radius:10px;background:#fff;color:#075c3b;padding:8px 12px;font-weight:700;cursor:pointer;white-space:nowrap">🚛 DEMO</button>`
                : "")
              : ""}
          </div>
          <div style="font-size:12px;color:#555;margin-top:7px;display:grid;gap:3px">
            ${distanza ? `<span>📏 ${distanza}</span>` : ""}
            <span>${parcheggio}</span>
            ${ristorante.telefono ? `<span>📞 ${escapeHtml(ristorante.telefono)}</span>` : ""}
            ${ristorante.google_address ? `<span>📍 ${escapeHtml(ristorante.google_address)}</span>` : ""}
            ${ristorante.fonte === "Google Places" ? `<span style="color:#075c3b;font-weight:700">Google Places</span>` : ""}
            ${bloccoRistoranteExtra(ristorante)}
          </div>
        </div>
      `;
    }).join("");

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;position:sticky;top:0;background:#fff;padding-bottom:10px">
        <div>
          <strong style="font-size:20px">${window.I18N?.tr("restaurants","🍴 Ristoranti")||"🍴 Ristoranti"}</strong>
          <div style="font-size:13px;color:#555">${escapeHtml(uscita.nome || "Uscita autostradale")} · ${ristoranti.length} ${window.I18N?.tr("found","trovati")||"trovati"}</div>
        </div>
        <button id="chiudiRistorantiMap" type="button" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer">×</button>
      </div>
      ${cards}
      <button id="chiudiRistorantiMapBottom" type="button" style="width:100%;margin-top:14px;border:0;border-radius:12px;background:#075c3b;color:#fff;padding:12px;font-weight:700;cursor:pointer">${window.I18N?.tr("close","CHIUDI")||"CHIUDI"}</button>
    `;
  }

  document.body.appendChild(panel);

  const closeTop = panel.querySelector("#chiudiRistorantiMap");
  if (closeTop) closeTop.addEventListener("click", chiudiPannelloRistoranti);

  const closeBottom = panel.querySelector("#chiudiRistorantiMapBottom");
  if (closeBottom) closeBottom.addEventListener("click", chiudiPannelloRistoranti);

  panel.querySelectorAll("[data-ristorante-index]").forEach(function(button) {
    button.addEventListener("click", function() {
      const index = Number(button.getAttribute("data-ristorante-index"));
      const ristorante = ristoranti[index];
      if (!ristorante) return;

      // NAVIGA deve funzionare sempre: prima prova il pannello di scelta
      // Google Maps / Waze / Apple Maps, poi usa Google Maps nello stesso tab.
      try {
        if (typeof window.apriNavigazione === "function") {
          window.apriNavigazione(ristorante);
          return;
        }
      } catch (error) {
        console.error("Errore apertura scelta navigazione:", error);
      }

      const url = "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(Number(ristorante.lat) + "," + Number(ristorante.lon)) +
        "&travelmode=driving";
      window.location.href = url;
      return;

      ristorantiLayer.eachLayer(function(layer) {
        if (
          layer.getLatLng &&
          Math.abs(layer.getLatLng().lat - ristorante.lat) < 0.000001 &&
          Math.abs(layer.getLatLng().lng - ristorante.lon) < 0.000001
        ) {
          layer.openPopup();
        }
      });
    });
  });


  // =====================================================
  // MODALITÀ DEMO MEZZI PESANTI
  // =====================================================
  panel.querySelectorAll("[data-demo-ristorante-index]").forEach(function(button) {
    button.addEventListener("click", function() {
      const index = Number(button.getAttribute("data-demo-ristorante-index"));
      const ristorante = ristoranti[index];
      if (!ristorante) return;

      const parcheggio = ristorante.parcheggio;
      const distanza = Number(parcheggio?.distanza_m);

      if (
        parcheggio?.presente !== true ||
        !Number.isFinite(distanza) ||
        distanza > 600 ||
        !Number.isFinite(Number(parcheggio?.lat)) ||
        !Number.isFinite(Number(parcheggio?.lon))
      ) {
        alert(window.I18N?.tr("parkingUnavailable","Per questo ristorante non è disponibile un parcheggio entro 600 m.")||"Per questo ristorante non è disponibile un parcheggio entro 600 m.");
        return;
      }

      const overlay = document.createElement("div");
      overlay.id = "demoMezziPesanti";
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:11000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:18px;";

      const nome = escapeHtml(ristorante.nome || "Ristorante");
      overlay.innerHTML = `
        <div style="width:min(94vw,460px);background:#fff;border-radius:20px;padding:20px;box-shadow:0 15px 50px rgba(0,0,0,.35);font-family:system-ui,sans-serif">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
            <div>
              <div style="font-size:13px;font-weight:800;letter-spacing:1px;color:#075c3b">MODALITÀ DEMO</div>
              <h2 style="margin:4px 0 0;font-size:23px">🚛 Mezzo pesante</h2>
            </div>
            <button type="button" data-demo-close style="border:0;background:#f2f2f2;border-radius:50%;width:38px;height:38px;font-size:22px;cursor:pointer">×</button>
          </div>

          <p style="margin:16px 0 8px"><strong>${nome}</strong></p>
          <p style="margin:0 0 16px;color:#444">
            Parcheggio disponibile a <strong>${Math.round(distanza)} m</strong> dal ristorante.
          </p>

          <div style="display:grid;gap:10px">
            <button type="button" data-demo-destination="restaurant" style="height:48px;border:0;border-radius:12px;background:#075c3b;color:#fff;font-weight:800;cursor:pointer">
              NAVIGA AL RISTORANTE
            </button>
            <button type="button" data-demo-destination="parking" style="height:48px;border:1px solid #075c3b;border-radius:12px;background:#fff;color:#075c3b;font-weight:800;cursor:pointer">
              🅿️ NAVIGA AL PARCHEGGIO
            </button>
          </div>

          <p style="margin:14px 0 0;font-size:12px;line-height:1.4;color:#666">
            Demo: la destinazione parcheggio è limitata a 600 m dal ristorante.
            Le app esterne possono non applicare automaticamente i profili e le restrizioni specifiche per mezzi pesanti: verificare sempre segnaletica e limiti locali.
          </p>
        </div>
      `;

      document.body.appendChild(overlay);

      function chiudiDemo() {
        overlay.remove();
      }

      overlay.querySelector("[data-demo-close]").addEventListener("click", chiudiDemo);

      overlay.addEventListener("click", function(event) {
        if (event.target === overlay) chiudiDemo();
      });

      overlay.querySelectorAll("[data-demo-destination]").forEach(function(action) {
        action.addEventListener("click", function() {
          const tipo = action.getAttribute("data-demo-destination");

          let destinazione;

          if (tipo === "parking") {
            destinazione = {
              ...ristorante,
              nome: "Parcheggio vicino a " + (ristorante.nome || "ristorante"),
              lat: Number(parcheggio.lat),
              lon: Number(parcheggio.lon),
              demo_mezzo_pesante: true,
              destinazione_tipo: "parcheggio"
            };
          } else {
            destinazione = {
              ...ristorante,
              demo_mezzo_pesante: true,
              destinazione_tipo: "ristorante"
            };
          }

          if (typeof window.apriNavigazione === "function") {
            chiudiDemo();
            window.apriNavigazione(destinazione);
          } else {
            alert(window.I18N?.tr("navUnavailable","Sistema di navigazione non disponibile.")||"Sistema di navigazione non disponibile.");
          }
        });
      });
    });
  });

  // Espone solo lo stato corrente necessario ai moduli aggiuntivi.
  window._ristorantiCorrenti = ristoranti;
  window._uscitaCorrente = uscita;

  console.log("Ristoranti mostrati:", ristoranti.length, "Marker:", markerCount, "Uscita:", uscita.nome);
}

// =====================================================
// GOOGLE PLACES + CONTROLLO GPS
// =====================================================

function distanzaGpsMetri(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizzaNomeGoogle(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// =====================================================
// DISTANZA REALE SU STRADA
// =====================================================
// Il limite ristoranti non viene piu' deciso in linea d'aria.
// Usiamo OSRM per calcolare la distanza stradale dall'uscita.
// Se il routing non riesce, il ristorante NON viene mostrato:
// meglio nessun risultato che mostrare un locale oltre 2 km reali.

const distanzaStradaleCache = new Map();

async function distanzaStradaleRistoranti(uscita, ristoranti) {
  if (!uscita || !Array.isArray(ristoranti) || !ristoranti.length) return [];

  const origineLat = Number(uscita.lat);
  const origineLon = Number(uscita.lon);

  if (!Number.isFinite(origineLat) || !Number.isFinite(origineLon)) {
    throw new Error("Coordinate uscita non valide");
  }

  const validi = ristoranti.filter(function(r) {
    return Number.isFinite(Number(r?.lat)) && Number.isFinite(Number(r?.lon));
  });

  if (!validi.length) return [];

  const risultati = new Map();
  const daCalcolare = [];

  validi.forEach(function(r) {
    const chiave = [
      String(uscita.id || ""),
      Number(r.lat).toFixed(6),
      Number(r.lon).toFixed(6)
    ].join(":");

    if (distanzaStradaleCache.has(chiave)) {
      risultati.set(r, distanzaStradaleCache.get(chiave));
    } else {
      daCalcolare.push({ ristorante: r, chiave });
    }
  });

  if (daCalcolare.length) {
    const coordinate = [
      `${origineLon},${origineLat}`,
      ...daCalcolare.map(function(item) {
        return `${Number(item.ristorante.lon)},${Number(item.ristorante.lat)}`;
      })
    ].join(";");

    const destinazioni = daCalcolare.map(function(_, index) {
      return index + 1;
    }).join(";");

    const endpoints = [
      `https://router.project-osrm.org/table/v1/driving/${coordinate}?sources=0&destinations=${destinazioni}&annotations=distance`,
      `https://routing.openstreetmap.de/routed-car/table/v1/driving/${coordinate}?sources=0&destinations=${destinazioni}&annotations=distance`
    ];

    let distances = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) continue;

        const data = await response.json();
        const row = Array.isArray(data?.distances) && Array.isArray(data.distances[0])
          ? data.distances[0]
          : null;

        if (row && row.length === daCalcolare.length) {
          distances = row;
          break;
        }
      } catch (error) {
        console.warn("Routing stradale non disponibile:", error);
      }
    }

    if (!distances) {
      throw new Error("Impossibile calcolare le distanze stradali");
    }

    daCalcolare.forEach(function(item, index) {
      const distanza = Number(distances[index]);

      if (Number.isFinite(distanza)) {
        distanzaStradaleCache.set(item.chiave, distanza);
        risultati.set(item.ristorante, distanza);
      }
    });
  }

  return validi.map(function(r) {
    return {
      ristorante: r,
      distanza_m: risultati.get(r)
    };
  });
}

async function filtraRistorantiPerStrada(uscita, ristoranti) {
  const misure = await distanzaStradaleRistoranti(uscita, ristoranti);
  const limite = CONFIG.distanzaMassimaRistoranteKm * 1000;

  return misure
    .filter(function(item) {
      return Number.isFinite(Number(item.distanza_m)) &&
        Number(item.distanza_m) <= limite;
    })
    .map(function(item) {
      const ristorante = item.ristorante;

      if (!ristorante.uscita) {
        ristorante.uscita = {
          id: uscita.id,
          nome: uscita.nome
        };
      }

      // Questa e' la distanza usata dalla UI: DISTANZA STRADALE.
      ristorante.uscita.distanza_m = Math.round(Number(item.distanza_m));

      return ristorante;
    });
}

function unisciRistorantiGoogle(ristorantiLocali, placesGoogle, uscita) {
  const risultato = Array.isArray(ristorantiLocali) ? ristorantiLocali.slice() : [];
  const usati = new Set();

  risultato.forEach(function(r) {
    if (r.google_place_id) usati.add(String(r.google_place_id));
  });

  (Array.isArray(placesGoogle) ? placesGoogle : []).forEach(function(place) {
    const location = place?.location;
    const lat = Number(location?.latitude);
    const lon = Number(location?.longitude);
    const placeId = place?.id ? String(place.id) : "";
    const nome = place?.displayName?.text || "Ristorante";

    if (!placeId || !Number.isFinite(lat) || !Number.isFinite(lon) || usati.has(placeId)) return;

    // Se il locale Google corrisponde chiaramente a uno gia presente
    // nel nostro database, arricchiamo quello esistente invece di duplicarlo.
    const nomeGoogle = normalizzaNomeGoogle(nome);
    let duplicato = null;

    for (const locale of risultato) {
      const lLat = Number(locale?.lat);
      const lLon = Number(locale?.lon);
      if (!Number.isFinite(lLat) || !Number.isFinite(lLon)) continue;
      const d = distanzaGpsMetri(lat, lon, lLat, lLon);
      const nomeLocale = normalizzaNomeGoogle(locale.nome);
      const stessoNome = nomeGoogle && nomeLocale && (
        nomeGoogle === nomeLocale ||
        nomeGoogle.includes(nomeLocale) ||
        nomeLocale.includes(nomeGoogle)
      );
      if (d <= 80 && stessoNome) {
        duplicato = locale;
        break;
      }
    }

    if (duplicato) {
      duplicato.google_place_id = placeId;
      duplicato.google_place_name = nome;
      duplicato.google_address = place?.formattedAddress || "";
      duplicato.google_types = Array.isArray(place?.types) ? place.types : [];
      usati.add(placeId);
      return;
    }

    risultato.push({
      id: `google:${placeId}`,
      google_place_id: placeId,
      google_place_name: nome,
      google_address: place?.formattedAddress || "",
      google_types: Array.isArray(place?.types) ? place.types : [],
      nome,
      lat,
      lon,
      cucina: "Google Places",
      fonte: "Google Places",
      uscita: {
        id: uscita.id,
        nome: uscita.nome,
        distanza_m: null
      },
      parcheggio: { presente: false }
    });
    usati.add(placeId);
  });

  return risultato;
}

function mostraAvvisoGoogle(titolo, testo) {
  chiudiPannelloRistoranti();
  const panel = document.createElement("div");
  panel.id = "ristorantiMapPanel";
  panel.style.cssText = "position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,520px);background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:20px;font-family:system-ui,sans-serif;";
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><strong style="font-size:20px">📍 ${escapeHtml(titolo)}</strong><button id="chiudiRistorantiMap" type="button" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer">×</button></div><p style="line-height:1.5;color:#46544f">${escapeHtml(testo)}</p>`;
  document.body.appendChild(panel);
  panel.querySelector("#chiudiRistorantiMap")?.addEventListener("click", chiudiPannelloRistoranti);
}

async function mostraTuttiRistoranti(uscita) {
  if (!uscita) return;

  /*
   * IMPORTANTE:
   * la ricerca dei ristoranti NON dipende dal GPS dell'utente.
   * Il GPS serve esclusivamente al pulsante "USA LA MIA POSIZIONE".
   *
   * La sequenza e':
   *   1) uscita selezionata
   *   2) ricerca locale + Google attorno al CASELLO
   *   3) calcolo distanza REALE SU STRADA uscita -> ristorante
   *   4) mostra solo risultati entro 2 km di strada
   */

  const localiGrezzi = ristorantiPerUscita(uscita);

  // Mostriamo subito i locali gia' presenti nel database locale,
  // ma anche questi vengono verificati sulla distanza stradale.
  let locali = [];
  try {
    locali = await filtraRistorantiPerStrada(uscita, localiGrezzi);
  } catch (error) {
    console.warn("Routing locale non disponibile:", error);
    // Non blocchiamo Google: i risultati Google verranno comunque
    // cercati e poi verificati sulla distanza stradale.
    locali = [];
  }

  window._ristorantiVisualizzati = locali;

  // Stato iniziale: nessun risultato. NON mostriamo messaggi GPS
  // e NON mostriamo "attendi Google Places".
  mostraRistorantiDatabase(uscita, locali);

  try {
    /*
     * Google viene interrogato sempre usando SOLO le coordinate
     * dell'uscita selezionata.
     */
    const response = await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exit: {
          lat: Number(uscita.lat),
          lon: Number(uscita.lon)
        },
        radius: CONFIG.googlePlacesRadiusMeters,
        maxResultCount: CONFIG.googlePlacesMaxResults
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    const placesGoogle = Array.isArray(data.places)
      ? data.places
      : [];

    /*
     * Uniamo database locale + Google, poi facciamo il filtro
     * STRADALE definitivo per tutti i risultati.
     */
    const combinatiGrezzi = unisciRistorantiGoogle(
      locali,
      placesGoogle,
      uscita
    );

    let risultatiFinali = [];

    try {
      risultatiFinali = await filtraRistorantiPerStrada(
        uscita,
        combinatiGrezzi
      );
    } catch (routingError) {
      console.warn(
        "Routing Google non disponibile:",
        routingError
      );

      // Manteniamo soltanto i risultati locali gia' verificati.
      risultatiFinali = locali;
    }

    window._ristorantiVisualizzati = risultatiFinali;
    mostraRistorantiDatabase(uscita, risultatiFinali);

    if (risultatiFinali.length === 0) {
      mostraAvvisoGoogle(
        window.I18N?.tr("noRestaurantsFound","0 ristoranti trovati")||"0 ristoranti trovati",
        window.I18N?.tr("noRestaurantsText","Non ci sono ristoranti trovati nelle vicinanze di questa uscita.")||"Non ci sono ristoranti trovati nelle vicinanze di questa uscita."
      );
    }

    console.log("RISTORANTI - ricerca completata", {
      uscita: uscita.nome,
      risultatiLocali: locali.length,
      risultatiGoogle: placesGoogle.length,
      risultatiFinali: risultatiFinali.length,
      limiteStradaleMetri:
        CONFIG.distanzaMassimaRistoranteKm * 1000
    });

  } catch (error) {
    console.warn("Google Places non disponibile:", error);

    /*
     * Nessun messaggio tecnico all'utente.
     * Se abbiamo locali verificati li mostriamo.
     * Altrimenti mostriamo direttamente il messaggio finale previsto.
     */
    window._ristorantiVisualizzati = locali;
    mostraRistorantiDatabase(uscita, locali);

    if (locali.length === 0) {
      mostraAvvisoGoogle(
        window.I18N?.tr("noRestaurantsFound","0 ristoranti trovati")||"0 ristoranti trovati",
        window.I18N?.tr("noRestaurantsText","Non ci sono ristoranti trovati nelle vicinanze di questa uscita.")||"Non ci sono ristoranti trovati nelle vicinanze di questa uscita."
      );
    }
  }
}
window.mostraTuttiRistoranti = mostraTuttiRistoranti;

// =====================================================
// RECENSIONI / NAVIGAZIONE DAL POPUP RISTORANTE
// =====================================================

document.addEventListener("click", function(event) {
  const navigaBtn = event.target.closest && event.target.closest("[data-naviga-ristorante]");
  if (navigaBtn) {
    event.preventDefault();
    event.stopPropagation();
    const id = navigaBtn.getAttribute("data-naviga-ristorante");
    const elencoCorrente = Array.isArray(window._ristorantiVisualizzati)
      ? window._ristorantiVisualizzati
      : ristorantiDatabase;
    const ristorante = elencoCorrente.find(function(item) {
      return String(item.id || item.osm_id || item.nome) === String(id);
    });
    if (!ristorante) {
      console.error("Navigazione: ristorante non trovato:", id);
      return;
    }
    try {
      if (typeof window.apriNavigazione === "function") {
        window.apriNavigazione(ristorante);
        return;
      }
    } catch (error) {
      console.error("Errore apertura navigazione:", error);
    }

    if (Number.isFinite(Number(ristorante.lat)) && Number.isFinite(Number(ristorante.lon))) {
      window.location.href =
        "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(Number(ristorante.lat) + "," + Number(ristorante.lon)) +
        "&travelmode=driving";
    }
  }
}, true);


// =====================================================
// SICUREZZA CLICK NAVIGA NELLE SCHEDE RISTORANTI
// =====================================================
document.addEventListener("click", function(event) {
  const button = event.target.closest && event.target.closest("#ristorantiMapPanel [data-ristorante-index]");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const index = Number(button.getAttribute("data-ristorante-index"));
  const elenco = Array.isArray(window._ristorantiVisualizzati)
    ? window._ristorantiVisualizzati
    : [];
  const ristorante = elenco[index];
  if (!ristorante || !Number.isFinite(Number(ristorante.lat)) || !Number.isFinite(Number(ristorante.lon))) {
    alert(window.I18N?.tr("coordinatesUnavailable","Coordinate del ristorante non disponibili.")||"Coordinate del ristorante non disponibili.");
    return;
  }

  try {
    if (typeof window.apriNavigazione === "function") {
      window.apriNavigazione(ristorante);
      return;
    }
  } catch (error) {
    console.error("Errore navigazione scheda:", error);
  }

  window.location.href =
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(Number(ristorante.lat) + "," + Number(ristorante.lon)) +
    "&travelmode=driving";
}, true);

// Carica e indicizza il database ristoranti per ID uscita.
fetch("./ristoranti.json")
  .then(function(response) {
    if (!response.ok) throw new Error("Impossibile caricare ristoranti.json");
    return response.json();
  })
  .then(function(database) {
    if (!Array.isArray(database)) {
      throw new Error("ristoranti.json non contiene un array");
    }

    ristorantiDatabase = database;
    ristorantiPerUscitaMap.clear();

    ristorantiDatabase.forEach(function(ristorante) {
      const id = ristorante?.uscita?.id;
      if (!id) return;

      const chiave = String(id);
      if (!ristorantiPerUscitaMap.has(chiave)) {
        ristorantiPerUscitaMap.set(chiave, []);
      }

      // Manteniamo solo il raggio configurato: 2 km + 100 m.
      const distanza = Number(ristorante?.uscita?.distanza_m);
      if (!Number.isFinite(distanza) || distanza <= CONFIG.distanzaMassimaEffettivaMetri) {
        ristorantiPerUscitaMap.get(chiave).push(ristorante);
      }
    });

    console.log("DATABASE RISTORANTI - caricati:", ristorantiDatabase.length);
    console.log("Uscite con ristoranti:", ristorantiPerUscitaMap.size);
  })
  .catch(function(error) {
    console.error("Errore database ristoranti:", error);
  });

// Pulsante presente nel popup dell'uscita.
document.addEventListener("click", function(event) {
  const button = event.target.closest("[data-ristoranti-uscita]");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();

  const id = button.getAttribute("data-ristoranti-uscita");
  const uscita = usciteItaliane.find(function(item) {
    return String(item.id || "") === String(id);
  });

  if (!uscita) {
    console.error("Uscita non trovata:", id);
    return;
  }

  mostraTuttiRistoranti(uscita);
}, true);


// =====================================================
// CONTROLLA SE E' AREA DI SERVIZIO / AUTOGRILL
// =====================================================

function eAreaDiServizio(uscita) {

  if (!uscita || typeof uscita !== "object") return true;

  // Controlliamo tutti i campi: nel database alcune aree di servizio
  // non usano sempre il campo "nome".
  const valori = [];
  Object.keys(uscita).forEach(function(key) {
    const value = uscita[key];
    if (value == null) return;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      valori.push(String(value));
    } else if (typeof value === "object") {
      try { valori.push(JSON.stringify(value)); } catch (_) {}
    }
  });

  const testo = valori.join(" ").toLowerCase();
  const tipo = String(uscita.tipo || uscita.type || uscita.category || uscita.kind || "").toLowerCase();

  if (
    tipo.includes("servizio") ||
    tipo.includes("autogrill") ||
    tipo.includes("service") ||
    tipo.includes("ristoro") ||
    tipo.includes("sosta") ||
    testo.includes('"highway":"services"') ||
    testo.includes('"highway": "services"') ||
    testo.includes('"amenity":"service') ||
    testo.includes('"amenity": "service')
  ) return true;

  const nome = String(
    uscita.nome || uscita.name || uscita.label || uscita.title || ""
  ).trim().toLowerCase();

  const paroleDaEscludere = [
    "area di servizio",
    "area servizio",
    "area di sosta",
    "area sosta",
    "autogrill",
    "area ristoro",
    "service area",
    "service station"
  ];

  if (paroleDaEscludere.some(function(parola) { return testo.includes(parola); })) {
    return true;
  }

  // Esempio reale: "Area di Giovi Ovest".
  if (/^area\s+(di|del|della|dei|degli)\s+/.test(nome)) {
    return true;
  }

  return false;
}


// =====================================================
// CONTROLLA USCITA VALIDA
// =====================================================

function uscitaValida(uscita) {

  if (!uscita) {

    return false;

  }


  if (

    typeof uscita.lat !== "number" ||

    typeof uscita.lon !== "number"

  ) {

    return false;

  }


  if (
    uscita.visualizza_mappa === false
  ) {

    return false;

  }


  // ESCLUDI AUTOGRILL / AREE DI SERVIZIO

  if (
    eAreaDiServizio(uscita)
  ) {

    return false;

  }


  return true;

}


// =====================================================
// CREA POPUP
// =====================================================

function creaPopup(uscita) {

  let popup = `

    <div class="exit-popup">

      <strong>
        ${uscita.nome || "Uscita autostradale"}
      </strong>

  `;


  if (uscita.autostrada) {

    popup += `

      <small>
        ${uscita.autostrada}

    `;


    if (uscita.numero_uscita) {

      popup +=
        ` · Uscita ${uscita.numero_uscita}`;

    }


    popup += `

      </small>

    `;

  }


  if (uscita.nome_autostrada) {

    popup += `

      <small>
        ${uscita.nome_autostrada}
      </small>

    `;

  }


  popup += `

      <small>
        🛣️ Uscita autostradale
      </small>

      <button
        type="button"
        data-ristoranti-uscita="${escapeHtml(uscita.id)}"
        style="margin-top:10px;width:100%;padding:9px;border:0;border-radius:8px;cursor:pointer;background:#075c3b;color:#fff;font-weight:700;"
      >
        🍴 MOSTRA RISTORANTI
      </button>

    </div>

  `;


  return popup;

}


// =====================================================
// CARICA DATABASE USCITE
// =====================================================

fetch("./uscite.json")

  .then(function(response) {

    if (!response.ok) {

      throw new Error(
        "Impossibile caricare uscite.json"
      );

    }

    return response.json();

  })

  .then(function(database) {

    usciteItaliane = database;


    console.log(
      "================================="
    );

    console.log(
      "DATABASE 1 KM E SI MANGIA"
    );

    console.log(
      "Uscite caricate:",
      usciteItaliane.length
    );

    console.log(
      "================================="
    );


    let usciteVisibili = 0;

    let usciteEscluse = 0;

    // Evita doppioni dello stesso casello presenti per le due carreggiate
    // o per nodi OSM molto vicini (es. Isola del Cantone).
    const usciteMostrate = [];

    function distanzaTraCoordinate(aLat, aLon, bLat, bLon) {
      const R = 6371000;
      const toRad = Math.PI / 180;
      const dLat = (bLat - aLat) * toRad;
      const dLon = (bLon - aLon) * toRad;
      const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(aLat * toRad) * Math.cos(bLat * toRad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    function chiaveNomeUscita(uscita) {
      return String(uscita && uscita.nome || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }


    // ---------------------------------------------
    // CREA MARKER
    // ---------------------------------------------

    usciteItaliane.forEach(function(uscita) {

      if (
        !uscitaValida(uscita)
      ) {

        usciteEscluse++;

        return;

      }

      // Lo stesso casello può comparire due volte nel database, uno per
      // ciascun nodo/carreggiata. Sulla mappa ne mostriamo uno solo.
      const nomeChiave = chiaveNomeUscita(uscita);
      const doppione = usciteMostrate.some(function(esistente) {
        return esistente.nome === nomeChiave &&
          distanzaTraCoordinate(
            esistente.lat,
            esistente.lon,
            Number(uscita.lat),
            Number(uscita.lon)
          ) < 1000;
      });

      if (doppione) {
        usciteEscluse++;
        return;
      }

      usciteMostrate.push({
        nome: nomeChiave,
        lat: Number(uscita.lat),
        lon: Number(uscita.lon)
      });


      const marker = L.marker(

        [
          uscita.lat,
          uscita.lon
        ],

        {
          icon: exitIcon
        }

      );

      // Dati dell'uscita sul marker: servono per evitare che un cluster
      // con punti vicini faccia perdere la selezione dell'uscita corretta.
      marker._uscita1km = uscita;


      marker.bindPopup(
        creaPopup(uscita)
      );


      // -------------------------------------------
      // CLICK MARKER
      // -------------------------------------------

      marker.on(

        "click",

        function() {
          // Il popup Leaflet si apre normalmente. Niente flyTo automatico:
          // su iPhone il movimento della mappa poteva far richiudere subito la scheda.
        }

      );


      clusterUscite.addLayer(
        marker
      );


      usciteVisibili++;

    });


    console.log(
      "Uscite visibili:",
      usciteVisibili
    );


    console.log(
      "Elementi esclusi:",
      usciteEscluse
    );


    console.log(
      "Filtro ristoranti:",
      CONFIG.distanzaMassimaRistoranteKm +
      " km + " +
      CONFIG.tolleranzaDistanzaMetri +
      " m"
    );


    console.log(
      "Distanza effettiva:",
      CONFIG.distanzaMassimaEffettivaMetri +
      " m"
    );

  })


  .catch(function(error) {

    console.error(
      "Errore database:",
      error
    );

  });


// =====================================================
// PULSANTE "ESPLORA LA MAPPA"
// =====================================================

const mapButton =
  document.getElementById(
    "mapButton"
  );


const mapSection =
  document.getElementById(
    "mapSection"
  );


if (mapButton) {

  mapButton.addEventListener(

    "click",

    function() {

      if (mapSection) {

        mapSection.scrollIntoView({

          behavior: "smooth"

        });

      }

    }

  );

}


// =====================================================
// MENU PRINCIPALE - GESTIONE UNIFICATA
// =====================================================


(function () {

  function initMenu() {

    const menuButton = document.querySelector(".menu-button");

    // Supportiamo entrambe le versioni che abbiamo usato:
    // #mobileMenu / .mobile-menu
    // #siteMenu / .site-menu
    const menuPanel =
      document.getElementById("mobileMenu") ||
      document.querySelector(".mobile-menu") ||
      document.getElementById("siteMenu") ||
      document.querySelector(".site-menu");

    const menuClose =
      document.getElementById("menuClose") ||
      document.querySelector(".menu-close") ||
      document.querySelector(".site-menu-close");

    const overlay =
      document.querySelector(".site-menu-overlay") ||
      document.querySelector(".mobile-menu-overlay");

    if (!menuButton || !menuPanel) {
      console.warn("MENU: elementi non trovati", {
        menuButton: !!menuButton,
        menuPanel: !!menuPanel
      });
      return;
    }

    let aperto = false;

    function openMenu() {

      aperto = true;

      menuPanel.classList.add("open");
      menuPanel.classList.add("active");

      menuPanel.setAttribute("aria-hidden", "false");

      menuButton.setAttribute("aria-expanded", "true");

      document.body.classList.add("menu-open");

      // Forziamo anche lo stile essenziale in modo che il menu
      // funzioni anche se una vecchia regola CSS è rimasta nel file.
      menuPanel.style.visibility = "visible";
      menuPanel.style.opacity = "1";
      menuPanel.style.pointerEvents = "auto";
      menuPanel.style.zIndex = "9999";

      if (overlay) {
        overlay.classList.add("open");
        overlay.classList.add("active");
        overlay.style.visibility = "visible";
        overlay.style.opacity = "1";
        overlay.style.pointerEvents = "auto";
        overlay.style.zIndex = "9998";
      }

      console.log("MENU APERTO");
    }

    function closeMenu() {

      aperto = false;

      menuPanel.classList.remove("open");
      menuPanel.classList.remove("active");

      menuPanel.setAttribute("aria-hidden", "true");

      menuButton.setAttribute("aria-expanded", "false");

      document.body.classList.remove("menu-open");

      menuPanel.style.visibility = "hidden";
      menuPanel.style.opacity = "0";
      menuPanel.style.pointerEvents = "none";

      if (overlay) {
        overlay.classList.remove("open");
        overlay.classList.remove("active");
        overlay.style.visibility = "hidden";
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
      }

      console.log("MENU CHIUSO");
    }

    // Stato iniziale
    closeMenu();

    // Pulsante hamburger
    menuButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (aperto) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Pulsante X
    if (menuClose) {
      menuClose.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
      });
    }

    // Overlay
    if (overlay) {
      overlay.addEventListener("click", function () {
        closeMenu();
      });
    }

    // ESC
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    // Link del menu
    const menuLinks = menuPanel.querySelectorAll(".menu-link");

    menuLinks.forEach(function (link) {

      link.addEventListener("click", function (event) {

        const target = link.getAttribute("href");

        closeMenu();

        if (target && target.startsWith("#")) {

          const elemento = document.querySelector(target);

          if (elemento) {
            event.preventDefault();

            setTimeout(function () {
              elemento.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }, 150);
          }
        }
      });
    });

    console.log("MENU PRINCIPALE ATTIVO");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenu);
  } else {
    initMenu();
  }

})();


// =====================================================
// RESIZE MAPPA
// =====================================================

window.addEventListener("resize", function () {

  setTimeout(function () {
    map.invalidateSize();
  }, 100);

});


// =====================================================
// AVVIO
// =====================================================

console.log("=================================");
console.log("1 KM E SI MANGIA - SCRIPT AVVIATO");
console.log(
  "Filtro:",
  CONFIG.distanzaMassimaRistoranteKm +
  " km + " +
  CONFIG.tolleranzaDistanzaMetri +
  " m"
);
console.log("=================================");