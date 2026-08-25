/* 1 KM E SI MANGIA - collega-gps.js */
(function(){
  "use strict";

  function init(){
    const b=document.getElementById("locationButton");
    if(!b)return;

    if(window.GPSManager &&
       window.appMap &&
       typeof window.GPSManager.attachMap==="function"){
      window.GPSManager.attachMap(window.appMap);
    }

    let working=false;

    function saved(){
      try{
        const r=sessionStorage.getItem("1km-posizione");
        if(!r)return false;

        const p=JSON.parse(r);
        const lat=Number(p.lat);
        const lng=Number(p.lng);
        const accuracy=Number(p.accuracy);

        if(!Number.isFinite(lat)||!Number.isFinite(lng)||
           !Number.isFinite(accuracy)||accuracy<=0||accuracy>1000){
          sessionStorage.removeItem("1km-posizione");
          return false;
        }

        if(!window.GPSManager)return false;

        window.GPSManager.updateMap(
          {lat,lng,accuracy,timestamp:Number(p.timestamp)||Date.now()},
          true
        );

        b.disabled=false;
        b.innerHTML='<img src="assets/pin-posizione.png" alt="" aria-hidden="true" style="width:28px;height:34px;object-fit:contain;display:inline-block;vertical-align:middle;margin-right:8px;">POSIZIONE TROVATA';

        if(typeof window.GPSManager.startWatch==="function"){
          window.GPSManager.startWatch();
        }

        /* La posizione era già stata trovata dalla Home.
           Ora avviamo esplicitamente Google Places anche nel flusso
           Home -> uscite.html. */
        if(typeof window.caricaGooglePlacesDaGPS==="function"){
          window.caricaGooglePlacesDaGPS({
            lat: lat,
            lng: lng,
            accuracy: accuracy,
            timestamp: Number(p.timestamp) || Date.now()
          });
        }

        return true;
      }catch(e){
        console.warn("GPS: posizione salvata non leggibile.",e);
        return false;
      }
    }

    function start(e){
      if(e){
        e.preventDefault();
        e.stopPropagation();
      }

      if(working)return;

      if(saved())return;

      if(!window.GPSManager ||
         typeof window.GPSManager.start!=="function"){
        alert("Modulo GPS non disponibile.\n\nRicarica la pagina e riprova.");
        return;
      }

      working=true;

      window.GPSManager.start({
        enableHighAccuracy:true,
        timeout:60000,
        maximumAge:0,
        onSuccess:function(posizione){
          working=false;
          if(typeof window.caricaGooglePlacesDaGPS==="function"){
            window.caricaGooglePlacesDaGPS(posizione);
          }
        }
      });

      /* Se il browser impiega molto, il GPS resta comunque in attesa. */
      setTimeout(function(){
        working=false;
      },65000);
    }

    b.addEventListener("click",start,false);
    window.avviaGPS=start;

    if(new URLSearchParams(location.search).get("gps")==="1"){
      setTimeout(saved,100);
    }

    console.log("✅ USCITE GPS: unico listener attivo");
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }
})();
