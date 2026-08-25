/* 1 KM E SI MANGIA - gps.js - MOTORE GPS UNICO */
(function(){
  "use strict";

  const KEY = "1km-posizione";

  let map = null;
  let marker = null;
  let circle = null;
  let watchId = null;
  let last = null;

  const opt = {
    enableHighAccuracy: true,
    timeout: 60000,
    maximumAge: 0,
    maxAccuracy: 1000,
    zoom: 15
  };

  function normalize(p){
    if(!p || !p.coords) return null;

    const lat = Number(p.coords.latitude);
    const lng = Number(p.coords.longitude);
    const accuracy = Number(p.coords.accuracy);

    if(
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(accuracy) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180 ||
      accuracy <= 0 ||
      accuracy > opt.maxAccuracy
    ){
      return null;
    }

    return {
      lat,
      lng,
      accuracy,
      timestamp: Date.now()
    };
  }

  function save(p){
    try{
      sessionStorage.setItem(KEY, JSON.stringify(p));
    }catch(e){}
  }

  function setLocationButton(text, disabled){
    const b = document.getElementById("locationButton");

    if(!b) return;

    b.disabled = !!disabled;

    b.innerHTML =
      '<img src="assets/pin-posizione.png" alt="" aria-hidden="true" ' +
      'style="width:28px;height:34px;object-fit:contain;display:inline-block;' +
      'vertical-align:middle;margin-right:8px;">' +
      text;
  }

  function attachMap(m){
    map = m || null;
    return api;
  }

  function getMap(){
    if(map) return map;

    if(
      window.appMap &&
      typeof window.appMap.setView === "function"
    ){
      map = window.appMap;
      return map;
    }

    return null;
  }

  function icon(){
    if(!window.L) return null;

    return L.divIcon({
      className: "gps-user-location-icon",

      html:
        '<div style="' +
        'width:22px;' +
        'height:22px;' +
        'border-radius:50%;' +
        'background:#075c3b;' +
        'border:4px solid #fff;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.35);' +
        'box-sizing:border-box;' +
        '"></div>',

      iconSize: [22,22],
      iconAnchor: [11,11],
      popupAnchor: [0,-14]
    });
  }

  function updateMap(p, center){
    const m = getMap();

    if(!m || !window.L){
      console.error("GPS: mappa Leaflet non disponibile.");
      return false;
    }

    const ll = [p.lat, p.lng];

    if(!marker){
      marker = L.marker(ll, {
        icon: icon(),
        zIndexOffset: 10000
      }).addTo(m);
    }else{
      marker.setLatLng(ll);
    }

    if(!circle){
      circle = L.circle(ll, {
        radius: p.accuracy,
        color: "#075c3b",
        weight: 2,
        fillColor: "#075c3b",
        fillOpacity: .10,
        interactive: false
      }).addTo(m);
    }else{
      circle.setLatLng(ll);
      circle.setRadius(p.accuracy);
    }

    marker.bindPopup(
      "<strong>📍 TU SEI QUI</strong><br>" +
      "Precisione GPS circa " +
      Math.round(p.accuracy) +
      " m"
    );

    if(center){
      m.setView(ll, opt.zoom, {
        animate: true
      });
    }

    return true;
  }

  function error(e){
    console.error(
      "GPS ERRORE:",
      e && e.code,
      e && e.message
    );

    setLocationButton(
      "USA LA MIA POSIZIONE",
      false
    );

    let msg =
      "Non siamo riusciti a ottenere la tua posizione.";

    if(e && e.code === 1){
      msg =
        "Permesso di posizione negato.\n\n" +
        "Su iPhone vai in:\n" +
        "Impostazioni → Privacy e sicurezza → Localizzazione → Safari\n\n" +
        "e attiva la Posizione precisa.";
    }
    else if(e && e.code === 2){
      msg =
        "La posizione non è disponibile.\n\n" +
        "Controlla la Localizzazione dell'iPhone e riprova.";
    }
    else if(e && e.code === 3){
      msg =
        "Il GPS sta impiegando troppo tempo.\n\n" +
        "Riprova tra qualche secondo.";
    }

    alert(msg);
  }

  function start(newOpt){

    if(newOpt){
      Object.assign(opt, newOpt);
    }

    if(!window.isSecureContext){
      const e = new Error(
        "La geolocalizzazione richiede HTTPS."
      );

      e.code = "INSECURE_CONTEXT";

      error(e);

      return false;
    }

    if(!navigator.geolocation){
      const e = new Error(
        "Geolocalizzazione non disponibile."
      );

      e.code = "NOT_SUPPORTED";

      error(e);

      return false;
    }

    getMap();

    stop();

    setLocationButton(
      "RICERCA POSIZIONE...",
      true
    );

    navigator.geolocation.getCurrentPosition(
      function(p){

        const d = normalize(p);

        if(!d){
          error({code:2});
          return;
        }

        last = d;

        save(d);

        const ok = updateMap(d, true);

        if(!ok){
          error({code:2});
          return;
        }

        /* POSIZIONE TROVATA */
        setLocationButton(
          "POSIZIONE TROVATA",
          false
        );

        /* Avvia il tracking senza bloccare il pulsante */
        startWatch();

      },
      error,
      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 0
      }
    );

    return true;
  }

  function startWatch(){

    if(!navigator.geolocation){
      return false;
    }

    if(watchId !== null){
      navigator.geolocation.clearWatch(watchId);
    }

    watchId = navigator.geolocation.watchPosition(
      function(p){

        const d = normalize(p);

        if(!d) return;

        last = d;

        save(d);

        updateMap(d, false);

        /* Mantieni lo stato corretto */
        setLocationButton(
          "POSIZIONE TROVATA",
          false
        );

      },
      function(e){

        console.warn(
          "GPS tracking:",
          e
        );

      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );

    return true;
  }

  function stop(){

    if(watchId !== null){
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    return api;
  }

  function getLastPosition(){

    if(last) return last;

    try{
      const r =
        sessionStorage.getItem(KEY);

      return r ? JSON.parse(r) : null;

    }catch(e){
      return null;
    }
  }

  function clearSavedPosition(){

    try{
      sessionStorage.removeItem(KEY);
    }catch(e){}

    last = null;

    return api;
  }

  const api = {
    attachMap,
    start,
    startWatch,
    stop,
    updateMap,
    getLastPosition,
    clearSavedPosition
  };

  window.GPSManager = api;

  console.log(
    "✅ GPS MANAGER CARICATO — posizione + tracking attivi"
  );

})();