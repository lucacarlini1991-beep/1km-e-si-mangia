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
    const filterBar='<div style="display:flex;gap:7px;overflow-x:auto;padding:10px 12px 2px;background:#fff">'+filters.map(([label,value])=>'<button type="button" data-distance-filter="'+value+'" style="flex:0 0 auto;border:1px solid '+(String(radius)===String(value)?'#075c3b':'#cbd8d2')+';border-radius:20px;background:'+(String(radius)===String(value)?'#075c3b':'#fff')+';color:'+(String(radius)===String(value)?'#fff':'#075c3b')+';padding:8px 12px;font-weight:800;font-size:12px;cursor:pointer">'+label+'</button>').join('')+'</div>';
    close();
    window._ristorantiCorrenti=items;
    window.ristorantiCorrenti=items;
    window._uscitaCorrente=exit;

    const p=document.createElement("div");
    p.id="ristorantiMapPanel";
    p.style.cssText="position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(94vw,540px);height:min(92vh,820px);background:#fff;border-radius:22px;box-shadow:0 16px 55px rgba(0,0,0,.35);overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;color:#173b31;display:flex;flex-direction:column;";

    const googleButton=googleSearched
      ? `<div style="margin:10px 12px 0;padding:9px 12px;border-radius:12px;background:#eef6f1;color:#075c3b;text-align:center;font-size:12px;font-weight:800">✓ Ricerca Google Places già effettuata</div>`
      : `<button id="cercaAltriGoogle" type="button" style="margin:10px 12px 0;border:1px solid #075c3b;border-radius:12px;background:#fff;color:#075c3b;padding:11px 12px;font-weight:800;font-size:13px;cursor:pointer">🔎 CERCA ALTRI RISTORANTI CON GOOGLE</button>`;

    p.innerHTML=`<div style="flex:0 0 auto;padding:18px 18px 14px;background:#075c3b;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.12)"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#f5a719">1 KM E SI MANGIA</div><div style="font-size:22px;font-weight:800;line-height:1.15;margin-top:3px">🍴 Ristoranti</div><div style="font-size:14px;opacity:.9;margin-top:3px">${esc(exit.nome||"Uscita")} · prima entro 1 km, poi amplia la ricerca</div></div><button id="chiudiRistorantiMap" type="button" aria-label="Chiudi" style="flex:0 0 auto;border:0;border-radius:50%;width:42px;height:42px;background:rgba(255,255,255,.16);color:#fff;font-size:28px;line-height:1;cursor:pointer">×</button></div></div>${filterBar}${googleButton}<div data-google-status style="min-height:0"></div><div data-restaurant-scroll style="flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 12px 18px;background:#f5f8f6"></div>`;

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
        card.style.cssText="background:#fff;border:1px solid #dfe8e3;border-radius:18px;padding:15px;margin:0 2px 10px;box-shadow:0 2px 8px rgba(7,92,59,.07)";
        card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div style="min-width:0"><div style="font-size:18px;font-weight:800;line-height:1.2">${i+1}. ${esc(r.nome||"Ristorante")}</div><div style="font-size:13px;color:#53635e;margin-top:5px">🍽️ ${cucina}</div></div><div style="flex:0 0 auto;background:#eef6f1;color:#075c3b;border-radius:12px;padding:6px 8px;font-weight:800;font-size:12px;white-space:nowrap">📍 ${dLabel}</div></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;font-size:12px;color:#53635e"><span style="background:#f4f6f5;border-radius:8px;padding:5px 7px">${parcheggio}</span>${r.telefono?`<span style="background:#f4f6f5;border-radius:8px;padding:5px 7px">📞 ${esc(r.telefono)}</span>`:""}${fonte}</div>${stelle}${indirizzo}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><button type="button" data-naviga-ristorante data-nav-lat="${Number(r.lat)}" data-nav-lon="${Number(r.lon)}" data-nav-name="${esc(r.nome||'Ristorante')}" style="border:0;border-radius:11px;background:#075c3b;color:#fff;padding:11px 7px;font-weight:800;font-size:13px;cursor:pointer">🧭 NAVIGA</button><button type="button" data-rientro-autostrada style="border:1px solid #075c3b;border-radius:11px;background:#fff;color:#075c3b;padding:10px 7px;font-weight:800;font-size:12px;cursor:pointer">🔄 RIENTRA IN AUTOSTRADA</button></div>`;
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
