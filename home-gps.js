/* 1 KM E SI MANGIA - GPS HOME
   Posizione precisa per iPhone / Safari.
   NON accetta posizioni approssimative da rete/IP.
*/

(function () {
  "use strict";

  const button = document.getElementById("homeLocationButton");
  if (!button) return;

  const TESTO_ORIGINALE = "📍 USA LA MIA POSIZIONE";
  const PRECISIONE_MASSIMA = 1000; // massimo 1 km

  function salvaPosizioneEApri(position) {

    const accuracy = position.coords.accuracy;

    console.log("📍 POSIZIONE RICEVUTA:", {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: accuracy
    });

    // NON accettiamo posizioni troppo approssimative
    if (!accuracy || accuracy > PRECISIONE_MASSIMA) {

      button.disabled = false;
      button.textContent = "📍 USA LA MIA POSIZIONE";

      alert(
        "La posizione ricevuta non è abbastanza precisa.\n\n" +
        "Precisione attuale: circa " +
        Math.round(accuracy / 1000) +
        " km.\n\n" +
        "Attiva la posizione precisa per Safari e riprova."
      );

      return;
    }

    const data = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: accuracy,
      timestamp: Date.now()
    };

    try {
      sessionStorage.setItem(
        "1km-posizione",
        JSON.stringify(data)
      );
    } catch (e) {
      console.warn("Errore salvataggio posizione:", e);
    }

    console.log("✅ POSIZIONE PRECISA:", data);

    window.location.href = "uscite.html?posizione=1";
  }

  function errorePosizione(error) {

    console.error(
      "❌ GPS:",
      error.code,
      error.message
    );

    button.disabled = false;
    button.textContent = TESTO_ORIGINALE;

    if (error.code === 1) {
      alert(
        "Posizione negata.\n\n" +
        "Su iPhone vai in:\n" +
        "Impostazioni → Privacy e sicurezza → Localizzazione → Safari\n\n" +
        "e attiva la localizzazione precisa."
      );
    } else if (error.code === 2) {
      alert(
        "Impossibile determinare la posizione precisa.\n\n" +
        "Controlla la Localizzazione dell'iPhone e riprova."
      );
    } else if (error.code === 3) {
      alert(
        "Il GPS sta impiegando troppo tempo.\n\n" +
        "Riprova tra qualche secondo all'aperto."
      );
    } else {
      alert("Impossibile ottenere la posizione.");
    }
  }

  function trovaPosizione() {

    if (!navigator.geolocation) {
      alert("La geolocalizzazione non è disponibile.");
      return;
    }

    if (!window.isSecureContext) {
      alert(
        "La posizione richiede HTTPS.\n" +
        "Apri il sito tramite Vercel."
      );
      return;
    }

    button.disabled = true;
    button.textContent = "📍 RICERCA GPS...";

    console.log("📍 RICHIESTA GPS PRECISO AVVIATA");

    navigator.geolocation.getCurrentPosition(
      salvaPosizioneEApri,
      errorePosizione,
      {
        enableHighAccuracy: true,

        // aspettiamo realmente il GPS
        timeout: 60000,

        // NON usare una posizione vecchia
        maximumAge: 0
      }
    );
  }

  button.addEventListener("click", trovaPosizione);

})();