/* 1 KM E SI MANGIA
   GPS Home → apre USCITE e richiede la posizione.
*/

(function () {
  "use strict";

  const button = document.getElementById("homeLocationButton");

  if (!button) return;

  function avviaGPS(event) {

    event.preventDefault();

    console.log("📍 HOME GPS: richiesta avviata");

    if (!navigator.geolocation) {
      alert("La geolocalizzazione non è disponibile su questo dispositivo.");
      return;
    }

    button.textContent = "📍 RICERCA POSIZIONE...";
    button.style.pointerEvents = "none";

    navigator.geolocation.getCurrentPosition(

      function (position) {

        const data = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };

        console.log("📍 GPS RICEVUTO:", data);

        // Accettiamo solo una posizione entro 1 km
        if (
          !data.accuracy ||
          data.accuracy > 1000
        ) {

          button.textContent = "📍 USA LA MIA POSIZIONE";
          button.style.pointerEvents = "auto";

          alert(
            "La posizione ricevuta non è abbastanza precisa.\n\n" +
            "Precisione: circa " +
            Math.round(data.accuracy / 1000) +
            " km.\n\n" +
            "Attiva la Posizione precisa dell'iPhone e riprova."
          );

          return;
        }

        try {
          sessionStorage.setItem(
            "1km-posizione",
            JSON.stringify(data)
          );
        } catch (e) {
          console.warn("Errore sessionStorage:", e);
        }

        console.log("✅ POSIZIONE SALVATA");

        window.location.href = "uscite.html?gps=1";

      },

      function (error) {

        console.error(
          "❌ ERRORE GPS:",
          error.code,
          error.message
        );

        button.textContent = "📍 USA LA MIA POSIZIONE";
        button.style.pointerEvents = "auto";

        if (error.code === 1) {
          alert(
            "Posizione negata.\n\n" +
            "Su iPhone controlla:\n" +
            "Impostazioni → Privacy e sicurezza → Localizzazione → Safari\n\n" +
            "e attiva Posizione precisa."
          );
        } else if (error.code === 2) {
          alert(
            "Impossibile ottenere la posizione precisa."
          );
        } else if (error.code === 3) {
          alert(
            "Il GPS sta impiegando troppo tempo.\n\nRiprova."
          );
        } else {
          alert(
            "Errore durante la ricerca della posizione."
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 0
      }
    );
  }

  button.addEventListener("click", avviaGPS, false);

})();