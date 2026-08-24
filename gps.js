/* 1 KM E SI MANGIA - gps.js - MOTORE GPS UNICO */
(function(){
  "use strict";
  const KEY="1km-posizione";
  let map=null, marker=null, circle=null, watchId=null, last=null;
  const opt={enableHighAccuracy:true,timeout:60000,maximumAge:0,maxAccuracy:1000,zoom:15};
  function normalize(p){
    if(!p||!p.coords)return null;
    const lat=Number(p.coords.latitude),lng=Number(p.coords.longitude),accuracy=Number(p.coords.accuracy);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(accuracy)||lat<-90||lat>90||lng<-180||lng>180||accuracy<=0||accuracy>opt.maxAccuracy)return null;
    return {lat,lng,accuracy,timestamp:Date.now()};
  }
  function save(p){try{sessionStorage.setItem(KEY,JSON.stringify(p));}catch(e){}}
  function attachMap(m){map=m||null;return api;}
  function getMap(){if(map)return map;if(window.appMap&&typeof window.appMap.setView==="function"){map=window.appMap;return map;}return null;}
  function icon(){
    if(!window.L)return null;
    return L.icon({
      iconUrl:"assets/pin-posizione.png",
      iconRetinaUrl:"assets/pin-posizione.png",
      iconSize:[46,58],
      iconAnchor:[23,58],
      popupAnchor:[0,-52]
    });
  }
  function updateMap(p,center){
    const m=getMap(); if(!m||!window.L){console.error("GPS: mappa Leaflet non disponibile.");return false;}
    const ll=[p.lat,p.lng];
    if(!marker)marker=L.marker(ll,{icon:icon(),zIndexOffset:10000}).addTo(m);else marker.setLatLng(ll);
    if(!circle)circle=L.circle(ll,{radius:p.accuracy,color:"#075c3b",weight:2,fillColor:"#075c3b",fillOpacity:.10,interactive:false}).addTo(m);else{circle.setLatLng(ll);circle.setRadius(p.accuracy);}
    marker.bindPopup("<strong>📍 TU SEI QUI</strong><br>Precisione GPS circa "+Math.round(p.accuracy)+" m");
    if(center)m.setView(ll,opt.zoom,{animate:true});
    return true;
  }
  function error(e){
    console.error("GPS ERRORE:",e&&e.code,e&&e.message);
    const b=document.getElementById("locationButton"); if(b){b.disabled=false;b.textContent="📍 USA LA MIA POSIZIONE";}
    let msg="Non siamo riusciti a ottenere la tua posizione.";
    if(e&&e.code===1)msg="Permesso di posizione negato.\n\nSu iPhone vai in:\nImpostazioni → Privacy e sicurezza → Localizzazione → Safari\n\ne attiva la Posizione precisa.";
    else if(e&&e.code===2)msg="La posizione non è disponibile.\n\nControlla la Localizzazione dell'iPhone e riprova.";
    else if(e&&e.code===3)msg="Il GPS sta impiegando troppo tempo.\n\nRiprova tra qualche secondo.";
    alert(msg);
  }
  function start(newOpt){
    if(newOpt)Object.assign(opt,newOpt);
    if(!window.isSecureContext){const e=new Error("La geolocalizzazione richiede HTTPS.");e.code="INSECURE_CONTEXT";error(e);return false;}
    if(!navigator.geolocation){const e=new Error("Geolocalizzazione non disponibile.");e.code="NOT_SUPPORTED";error(e);return false;}
    getMap(); stop();
    const b=document.getElementById("locationButton"); if(b){b.disabled=true;b.textContent="📍 RICERCA POSIZIONE...";}
    navigator.geolocation.getCurrentPosition(function(p){const d=normalize(p);if(!d){error({code:2});return;}last=d;save(d);if(updateMap(d,true))startWatch();else error({code:2});},error,{enableHighAccuracy:true,timeout:60000,maximumAge:0});
    return true;
  }
  function startWatch(){
    if(!navigator.geolocation)return false; if(watchId!==null)navigator.geolocation.clearWatch(watchId);
    watchId=navigator.geolocation.watchPosition(function(p){const d=normalize(p);if(!d)return;last=d;save(d);updateMap(d,false);},function(e){console.warn("GPS tracking:",e);},{enableHighAccuracy:true,timeout:30000,maximumAge:0});
    return true;
  }
  function stop(){if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}return api;}
  function getLastPosition(){if(last)return last;try{const r=sessionStorage.getItem(KEY);return r?JSON.parse(r):null;}catch(e){return null;}}
  function clearSavedPosition(){try{sessionStorage.removeItem(KEY);}catch(e){}last=null;return api;}
  const api={attachMap,start,startWatch,stop,updateMap,getLastPosition,clearSavedPosition};
  window.GPSManager=api;
  console.log("✅ GPS MANAGER CARICATO — nessun listener duplicato");
})();
