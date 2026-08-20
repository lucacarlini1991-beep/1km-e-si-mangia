/* 1 KM E SI MANGIA - collega-gps.js */
(function(){
  "use strict";
  function init(){
    const b=document.getElementById("locationButton"); if(!b)return;
    if(window.GPSManager&&window.appMap&&typeof window.GPSManager.attachMap==="function")window.GPSManager.attachMap(window.appMap);
    let working=false;
    function saved(){
      try{
        const r=sessionStorage.getItem("1km-posizione"); if(!r)return false; const p=JSON.parse(r);
        const lat=Number(p.lat),lng=Number(p.lng),accuracy=Number(p.accuracy);
        if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(accuracy)||accuracy<=0||accuracy>1000){sessionStorage.removeItem("1km-posizione");return false;}
        if(!window.GPSManager)return false;
        if(!window.GPSManager.updateMap({lat,lng,accuracy,timestamp:Number(p.timestamp)||Date.now()},true))return false;
        b.disabled=false;b.textContent="📍 POSIZIONE TROVATA";
        if(typeof window.GPSManager.startWatch==="function")window.GPSManager.startWatch();
        return true;
      }catch(e){console.warn("GPS: posizione Home non leggibile.",e);return false;}
    }
    function start(e){
      if(e){e.preventDefault();e.stopPropagation();} if(working)return;
      if(new URLSearchParams(location.search).get("gps")==="1"&&saved())return;
      if(!window.GPSManager||typeof window.GPSManager.start!=="function"){alert("Modulo GPS non disponibile.\n\nRicarica la pagina e riprova.");return;}
      working=true;b.disabled=true;b.textContent="📍 RICERCA POSIZIONE...";window.GPSManager.start({enableHighAccuracy:true,timeout:60000,maximumAge:0});setTimeout(function(){working=false;},1000);
    }
    b.addEventListener("click",start,false); window.avviaGPS=start;
    if(new URLSearchParams(location.search).get("gps")==="1")setTimeout(saved,100);
    console.log("✅ USCITE GPS: unico listener attivo");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
