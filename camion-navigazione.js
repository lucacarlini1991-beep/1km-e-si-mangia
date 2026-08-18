/* 1 KM E SI MANGIA - camion-navigazione.js
   Modulo di supporto per la modalità demo camion.
   La demo vera è già integrata in script.js in questa build.
*/
(function () {
  "use strict";
  window.CamionNavigazione = {
    disponibile: function () {
      return typeof window.apriNavigazione === "function";
    }
  };
  console.log("CAMION-NAVIGAZIONE.JS ATTIVO");
})();
