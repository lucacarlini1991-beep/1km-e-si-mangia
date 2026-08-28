// 1 KM E SI MANGIA - fix finale distanza Google Places
// Quando parte la ricerca Google, non usiamo OSRM per decidere il limite dei 2 km.
// Forziamo il percorso dei risultati Google attraverso /api/route (Google Routes).
// Questo evita che un percorso OSRM errato dal punto geometrico del casello
// faccia sparire ristoranti che sono realmente a pochi minuti dall'uscita.
(function(){
  "use strict";

  const originalFetch = window.fetch.bind(window);
  let googleSearchActive = false;
  let resetTimer = null;

  function attivaGoogleRoute(){
    googleSearchActive = true;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(function(){ googleSearchActive = false; }, 30000);
  }

  window.fetch = function(input, init){
    const url = typeof input === "string"
      ? input
      : (input && input.url ? input.url : "");

    // La chiamata Places indica che è appena iniziata la ricerca Google.
    if (url.includes("/api/places")) {
      attivaGoogleRoute();
      return originalFetch(input, init);
    }

    // Durante il calcolo dei risultati Google, impediamo a OSRM di fornire
    // una distanza alternativa: routeOne() passerà automaticamente a /api/route.
    if (googleSearchActive && (
      url.includes("router.project-osrm.org/") ||
      url.includes("routing.openstreetmap.de/routed-car/")
    )) {
      return Promise.reject(new Error("OSRM bypass: Google Routes richiesto per i risultati Google"));
    }

    return originalFetch(input, init);
  };

  console.log("1KM: Google Places -> Google Routes attivo per il filtro 2 km");
})();
