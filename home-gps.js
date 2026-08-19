/* 1 KM E SI MANGIA - GPS Home
   Richiesta posizione dalla Home.
   Salva le coordinate e apre USCITE.
   Gestione ottimizzata per iPhone / Safari.
*/

(function () {
  "use strict";

  const button = document.getElementById("homeLocationButton");

  if (!button) return;

  const TESTO_ORIGINALE = "📍 USA LA MIA POSIZIONE";

  function salvaPosizioneEApri(position) {
    const data = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now()
    };

    console.log("📍 POSIZIONE TROVATA:", data);

    try {
      sessionStorage.setItem(
        "1km-posizione",
        JSON.stringify(data)
      );
    } catch (e) {
      console.warn("Impossibile salvare la posizione:", e);
    }

    window.location.href = "uscite.html?posizione=1";
  }

  function errorePosizione(error) {
    console.warn(
      "Errore geolocalizzazione:",
      error.code,
      error.message
    );

    button.disabled = false;
    button.textContent = TESTO_ORIGINALE;

    if (error.code === 1) {
      alert(
        "La posizione è stata negata. " +
        "Controlla i permessi di localizzazione di Safari " +
        "nelle impostazioni dell'iPhone e riprova."
      );
    } else if (error.code === 2) {
      alert(
        "Non riesco a determinare la posizione. " +
        "Controlla che la Localizzazione sia attiva sul tuo iPhone e riprova."
      );
    } else if (error.code === 3) {
      alert(
        "Il GPS sta impiegando troppo tempo. " +
        "Riprova tra qualche secondo."
      );
    } else {
      alert(
        "Non siamo riusciti a ottenere la tua posizione. Riprova."
      );
    }
  }

  function trovaPosizione() {
    if (!navigator.geolocation) {
      alert(
        "La geolocalizzazione non è disponibile su questo dispositivo."
      );
      return;
    }

    if (!window.isSecureContext) {
      alert(
        "La posizione richiede una connessione HTTPS. " +
        "Apri 1 KM E SI MANGIA dal sito Vercel."
      );
      return;
    }

    button.disabled = true;
    button.textContent = "📍 RICERCA POSIZIONE...";

    console.log("📍 Avvio richiesta GPS");

    navigator.geolocation.getCurrentPosition(
      salvaPosizioneEApri,

      function (error) {
        console.warn(
          "Primo tentativo GPS fallito:",
          error.code,
          error.message
        );

        if (error.code === 2 || error.code === 3) {
          console.log("📍 Avvio secondo tentativo GPS");

          navigator.geolocation.getCurrentPosition(
            salvaPosizioneEApri,
            errorePosizione,
            {
              enableHighAccuracy: false,
              timeout: 30000,
              maximumAge: 120000
            }
          );
        } else {
          errorePosizione(error);
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 45000,
        maximumAge: 10000
      }
    );
  }

  button.addEventListener("click", trovaPosizione);

})();