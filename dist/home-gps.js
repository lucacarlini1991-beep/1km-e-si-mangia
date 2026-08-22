/* 1 KM E SI MANGIA - home-gps.js */
(function(){
  "use strict";
  function init(){
    const b=document.getElementById("homeLocationButton"); if(!b)return;
    let working=false;
    b.addEventListener("click",function(e){
      e.preventDefault();e.stopPropagation();if(working)return;
      if(!window.isSecureContext){alert("La geolocalizzazione richiede HTTPS.\n\nApri il sito pubblicato su Vercel.");return;}
      if(!navigator.geolocation){alert("La geolocalizzazione non è disponibile su questo dispositivo.");return;}
      working=true;b.disabled=true;b.textContent="📍 RICERCA POSIZIONE...";
      navigator.geolocation.getCurrentPosition(function(p){
        const lat=Number(p.coords.latitude),lng=Number(p.coords.longitude),accuracy=Number(p.coords.accuracy);
        if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(accuracy)||accuracy<=0||accuracy>1000){working=false;b.disabled=false;b.textContent="📍 USA LA MIA POSIZIONE";alert("La posizione ricevuta non è abbastanza precisa.\n\nPrecisione: circa "+Math.round(accuracy/1000)+" km.\n\nAttiva la Posizione precisa dell'iPhone e riprova.");return;}
        try{sessionStorage.setItem("1km-posizione",JSON.stringify({lat,lng,accuracy,timestamp:Date.now()}));}catch(err){working=false;b.disabled=false;b.textContent="📍 USA LA MIA POSIZIONE";alert("Impossibile salvare la posizione. Riprova.");return;}
        window.location.href="uscite.html?gps=1";
      },function(err){
        working=false;b.disabled=false;b.textContent="📍 USA LA MIA POSIZIONE";
        if(err.code===1)alert("Posizione negata.\n\nSu iPhone vai in:\nImpostazioni → Privacy e sicurezza → Localizzazione → Safari\n\ne attiva la Posizione precisa.");
        else if(err.code===2)alert("Impossibile ottenere la posizione.\n\nControlla la Localizzazione dell'iPhone e riprova.");
        else if(err.code===3)alert("Il GPS sta impiegando troppo tempo.\n\nRiprova.");
        else alert("Errore durante la ricerca della posizione.");
      },{enableHighAccuracy:true,timeout:60000,maximumAge:0});
    },false);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
