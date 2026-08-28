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
