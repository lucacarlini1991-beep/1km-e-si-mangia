/* 1 KM E SI MANGIA - GPS Home
   Chiede la posizione direttamente dalla Home.
   Dopo il fix salva le coordinate per la pagina USCITE.
*/
(function () {
  "use strict";

  const button = document.getElementById("homeLocationButton");
  if (!button) return;

  function saveAndGo(position) {
    const data = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now()
    };
    try {
      sessionStorage.setItem("1km-posizione", JSON.stringify(data));
    } catch (e) {
      console.warn("Impossibile salvare la posizione", e);
    }
    window.location.href = "uscite.html?posizione=1";
  }

  button.addEventListener("click", function () {
    if (!navigator.geolocation) {
      alert("La geolocalizzazione non è disponibile su questo dispositivo.");
      return;
    }
    if (!window.isSecureContext) {
      alert("La posizione richiede HTTPS. Apri il sito dalla versione Vercel.");
      return;
    }

    button.disabled = true;
    button.textContent = "📍 RICERCA POSIZIONE...";

    navigator.geolocation.getCurrentPosition(
      saveAndGo,
      function (error) {
        button.disabled = false;
        button.textContent = "📍 USA LA MIA POSIZIONE";
        if (error.code === 1) alert("Permesso di posizione negato. Consenti la posizione per 1 KM E SI MANGIA e riprova.");
        else if (error.code === 2) alert("Posizione non disponibile. Controlla il GPS e riprova.");
        else if (error.code === 3) alert("La ricerca della posizione ha impiegato troppo tempo. Riprova.");
        else alert("Non siamo riusciti a ottenere la tua posizione.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
})();
