/* 1 KM E SI MANGIA - demo.js
   La modalità DEMO mezzi pesanti è integrata nello script principale
   di questa build per non duplicare listener e overlay.
*/
(function () {
  "use strict";
  window.DemoMezziPesanti = {
    disponibile: function () {
      return document.querySelectorAll("[data-demo-ristorante-index]").length > 0;
    }
  };
  console.log("DEMO.JS ATTIVO");
})();
