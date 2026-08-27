// 1 KM E SI MANGIA - filtro uscite di servizio + caricamento script principale
(function () {
  const originalFetch = window.fetch.bind(window);
  const parole = [
    "area di servizio", "area servizio", "area di sosta", "area sosta",
    "area ristoro", "autogrill", "service area", "service station",
    "rest area", "rest stop", "truck stop", "stazione di servizio",
    "stazione servizio", "posto di servizio", "piazzola di sosta"
  ];

  function testo(u) {
    return [
      u?.nome, u?.nome_autostrada, u?.autostrada, u?.ref,
      u?.numero_uscita, u?.description, u?.operatore, u?.tipo
    ].filter(Boolean).join(" ").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function areaServizio(u) {
    if (!u) return true;
    const tipo = String(u.tipo || "").toLowerCase();

    if (
      tipo.includes("servizio") ||
      tipo.includes("autogrill") ||
      tipo.includes("ristoro") ||
      tipo.includes("sosta") ||
      tipo.includes("service") ||
      tipo === "area_servizio"
    ) return true;

    if (u.mostra_ristoranti === false || u.visualizza_mappa === false) return true;

    const n = testo(u);
    if (parole.some(p => n.includes(p))) return true;

    return /\barea\s+di\s+/.test(n) &&
           /\b(sud|nord|ovest|est)\b/.test(n);
  }

  window.fetch = async function (input, init) {
    const response = await originalFetch(input, init);
    const url = typeof input === "string" ? input : input?.url || "";

    if (!/\/uscite\.json(?:[?#]|$)/i.test(url)) return response;

    try {
      const data = await response.clone().json();
      if (!Array.isArray(data)) return response;

      const filtrate = data.filter(u => !areaServizio(u));
      console.log("Filtro aree di servizio:", data.length - filtrate.length, "escluse");

      return new Response(JSON.stringify(filtrate), {
        status: response.status,
        statusText: response.statusText,
        headers: { "Content-Type": "application/json" }
      });
    } catch (_) {
      return response;
    }
  };

  // ---------------------------------------------------------
  // AVVIO ROBUSTO DELLO SCRIPT PRINCIPALE
  //
  // Il problema che stiamo evitando qui e' questo:
  // se leaflet.markercluster non viene caricato dalla CDN,
  // dist/script.js si interrompe sulla creazione del cluster.
  // Di conseguenza spariscono insieme clustering, pulsante
  // ristoranti e menu. Aspettiamo/riproviamo il plugin prima
  // di avviare lo script principale.
  // ---------------------------------------------------------
  let avviato = false;

  function avviaPrincipale() {
    if (avviato) return;
    avviato = true;

    const s = document.createElement("script");
    s.src = "./dist/script.js?v=20260827-stable";
    s.defer = false;
    document.head.appendChild(s);
  }

  function caricaClusterDa(url, onFail) {
    const s = document.createElement("script");
    s.src = url;
    s.onload = function () {
      if (typeof window.L?.markerClusterGroup === "function") {
        avviaPrincipale();
      } else {
        onFail();
      }
    };
    s.onerror = onFail;
    document.head.appendChild(s);
  }

  function avviaQuandoPronto() {
    if (!window.L) {
      setTimeout(avviaQuandoPronto, 50);
      return;
    }

    if (typeof window.L.markerClusterGroup === "function") {
      avviaPrincipale();
      return;
    }

    // Primo tentativo: stesso CDN gia' usato dalla pagina.
    caricaClusterDa(
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js",
      function () {
        if (typeof window.L?.markerClusterGroup === "function") {
          avviaPrincipale();
          return;
        }

        // Secondo tentativo: jsDelivr.
        caricaClusterDa(
          "https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js",
          function () {
            // Se anche la seconda CDN non e' disponibile, avviamo
            // comunque il sito senza clustering: almeno mappa,
            // menu e ristoranti continuano a funzionare.
            if (typeof window.L.markerClusterGroup !== "function") {
              window.L.markerClusterGroup = function () {
                return window.L.layerGroup();
              };
            }
            avviaPrincipale();
          }
        );
      }
    );
  }

  avviaQuandoPronto();
})();
