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

    // Copre anche i vecchi record OSM tipo="casello"
    // con nomi come "Area di Aurelia Sud".
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
      console.log(
        "Filtro aree di servizio:",
        data.length - filtrate.length,
        "escluse"
      );

      return new Response(JSON.stringify(filtrate), {
        status: response.status,
        statusText: response.statusText,
        headers: { "Content-Type": "application/json" }
      });
    } catch (_) {
      return response;
    }
  };

  const s = document.createElement("script");
  s.src = "./dist/script.js";
  s.defer = false;

  if (document.currentScript) {
    document.currentScript.after(s);
  } else {
    document.head.appendChild(s);
  }
})();
