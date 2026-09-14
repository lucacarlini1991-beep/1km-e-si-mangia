// 1 KM E SI MANGIA - filtro uscite di servizio
// Temporaneamente disattivato: il caricamento di uscite.json deve essere trasparente.
(function () {
  "use strict";

  // Fix UI mobile: caricato qui per la pagina Ristoranti senza toccare la logica della mappa.
  if (!document.querySelector('script[data-1km-ui-fix="1"]')) {
    const s = document.createElement("script");
    s.src = "fix-ui-1km.js?v=20260914-final-ui";
    s.async = false;
    s.setAttribute("data-1km-ui-fix", "1");
    document.head.appendChild(s);
  }
})();
