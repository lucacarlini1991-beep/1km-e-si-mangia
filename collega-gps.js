/* 1 KM E SI MANGIA - collega-gps.js
   Il GPSManager viene caricato prima di script.js.
   script.js gestisce il pulsante della pagina uscite per evitare
   due listener sullo stesso pulsante.
*/
(function () {
  "use strict";
  window.addEventListener("load", function () {
    if (window.GPSManager) {
      console.log("COLLEGA-GPS.JS ATTIVO: GPSManager disponibile");
    } else {
      console.warn("COLLEGA-GPS.JS: GPSManager non disponibile");
    }
  });
})();
