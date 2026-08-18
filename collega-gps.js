/* =========================================================
   1 KM E SI MANGIA
   collega-gps.js

   COLLEGAMENTO HOME → GPS → USCITE

   Questo file utilizza gps.js.

   NON gestisce:
   - mappa
   - ristoranti
   - navigazione
   - modalità camion

   Serve solo per il pulsante:
   "USA LA MIA POSIZIONE"
   ========================================================= */

   (function () {

    "use strict";
  
    document.addEventListener(
      "DOMContentLoaded",
      function () {
  
        const button =
          document.getElementById(
            "homeLocationButton"
          );
  
        /*
          Se la pagina non contiene
          il pulsante Home, non facciamo nulla.
        */
  
        if (!button) {
          return;
        }
  
  
        button.addEventListener(
          "click",
          function () {
  
            if (
              !window.GPSManager
            ) {
  
              console.error(
                "GPS: gps.js non è stato caricato."
              );
  
              alert(
                "Il sistema GPS non è disponibile. Ricarica la pagina."
              );
  
              return;
            }
  
  
            if (
              !window.isSecureContext
            ) {
  
              alert(
                "La posizione GPS richiede una connessione HTTPS."
              );
  
              return;
            }
  
  
            button.disabled =
              true;
  
            button.setAttribute(
              "aria-busy",
              "true"
            );
  
            button.textContent =
              "📍 RICERCA POSIZIONE...";
  
  
            /*
              Richiediamo una posizione precisa.
            */
  
            window.GPSManager.start({
  
              watch:
                false,
  
              enableHighAccuracy:
                true,
  
              timeout:
                20000,
  
              maximumAge:
                0,
  
              maxAccuracy:
                500,
  
              onPosition:
                function (position) {
  
                  console.log(
                    "HOME GPS:",
                    position
                  );
  
  
                  /*
                    Passiamo la posizione
                    alla pagina uscite.
  
                    Il GPS NON è obbligatorio
                    per usare la pagina:
                    se l'utente vuole,
                    potrà comunque esplorare
                    manualmente la mappa.
                  */
  
                  const params =
                    new URLSearchParams();
  
                  params.set(
                    "lat",
                    position.lat
                  );
  
                  params.set(
                    "lng",
                    position.lng
                  );
  
                  params.set(
                    "accuracy",
                    position.accuracy
                  );
  
  
                  window.location.href =
                    "uscite.html?" +
                    params.toString();
                },
  
              onError:
                function (error) {
  
                  console.error(
                    "HOME GPS ERROR:",
                    error
                  );
  
  
                  button.disabled =
                    false;
  
                  button.removeAttribute(
                    "aria-busy"
                  );
  
                  button.textContent =
                    "📍 USA LA MIA POSIZIONE";
  
  
                  let message =
                    "Non è stato possibile rilevare la posizione.";
  
  
                  if (
                    error &&
                    error.code === 1
                  ) {
  
                    message =
                      "Hai negato l'accesso alla posizione. " +
                      "Abilitalo nelle impostazioni del browser.";
  
                  } else if (
                    error &&
                    error.code === 2
                  ) {
  
                    message =
                      "La posizione non è disponibile. " +
                      "Riprova tra qualche secondo.";
  
                  } else if (
                    error &&
                    error.code === 3
                  ) {
  
                    message =
                      "Il GPS sta impiegando troppo tempo. " +
                      "Riprova.";
                  }
  
  
                  alert(
                    message
                  );
                }
  
            });
  
          }
        );
  
      }
    );
  
  })();