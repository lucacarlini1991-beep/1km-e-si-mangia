// =====================================================
// FILTRO AREE DI SERVIZIO
// =====================================================

function eAreaDiServizio(uscita) {
  if (!uscita) return true;

  const tipo = String(uscita.tipo || "").toLowerCase().trim();

  // Qualsiasi record esplicitamente classificato come servizio/sosta/autogrill
  // non deve mai essere considerato un'uscita autostradale.
  if (
    tipo.includes("servizio") ||
    tipo.includes("autogrill") ||
    tipo.includes("ristoro") ||
    tipo.includes("sosta") ||
    tipo.includes("service") ||
    tipo === "area_servizio" ||
    uscita.mostra_ristoranti === false ||
    uscita.visualizza_mappa === false
  ) {
    return true;
  }

  const nomeCompleto = [
    uscita.nome,
    uscita.nome_autostrada,
    uscita.autostrada,
    uscita.ref,
    uscita.numero_uscita,
    uscita.description,
    uscita.operatore
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Parole tipiche delle aree di servizio/sosta.
  const paroleDaEscludere = [
    "area di servizio",
    "area servizio",
    "area di sosta",
    "area sosta",
    "area ristoro",
    "autogrill",
    "service area",
    "service station",
    "rest area",
    "rest stop",
    "truck stop",
    "stazione di servizio",
    "stazione servizio",
    "posto di servizio",
    "piazzola di sosta"
  ];

  if (paroleDaEscludere.some(parola => nomeCompleto.includes(parola))) {
    return true;
  }

  // Alcuni record OSM vecchi/non aggiornati arrivano con tipo="casello"
  // ma hanno un nome del tipo "Area di ... Sud/Nord". Sono aree di servizio,
  // non caselli: non devono comparire né sulla mappa né come uscita GPS.
  if (/\barea\s+di\s+/.test(nomeCompleto) &&
      /\b(sud|nord|ovest|est)\b/.test(nomeCompleto)) {
    return true;
  }

  return false;
}


// =====================================================
// CONTROLLA USCITA VALIDA
// =====================================================

function uscitaValida(uscita) {
  if (!uscita) return false;

  if (
    typeof uscita.lat !== "number" ||
    typeof uscita.lon !== "number"
  ) {
    return false;
  }

  // ESCLUDI SEMPRE AREE DI SERVIZIO / SOSTA / AUTOGRILL
  if (eAreaDiServizio(uscita)) {
    return false;
  }

  return true;
}


// =====================================================
// CREA POPUP
// =====================================================

function creaPopup(uscita) {
  let popup = `
    <div class="exit-popup">
      <strong>
        ${uscita.nome || "Uscita autostradale"}
      </strong>
  `;

  if (uscita.autostrada) {
    popup += `
      <small>
        ${uscita.autostrada}
    `;

    if (uscita.numero_uscita) {
      popup += ` · Uscita ${uscita.numero_uscita}`;
    }

    popup += `
      </small>
    `;
  }

  if (uscita.nome_autostrada) {
    popup += `
      <small>
        ${uscita.nome_autostrada}
      </small>
    `;
  }

  popup += `
      <small>
        🛣️ Uscita autostradale
      </small>

      <button
        type="button"
        data-ristoranti-uscita="${escapeHtml(uscita.id)}"
        style="margin-top:10px;width:100%;padding:9px;border:0;border-radius:8px;cursor:pointer;background:#075c3b;color:#fff;font-weight:700;"
      >
        🍴 MOSTRA RISTORANTI
      </button>

    </div>
  `;

  return popup;
}


// =====================================================
// CARICA DATABASE USCITE
// =====================================================

fetch("./uscite.json")
  .then(function(response) {
    if (!response.ok) {
      throw new Error("Impossibile caricare uscite.json");
    }
    return response.json();
  })
  .then(function(database) {
    // Conserviamo solo i veri caselli/uscite. In questo modo il filtro vale
    // anche per eventuali dati OSM vecchi che non riportano più il tipo corretto.
    usciteItaliane = Array.isArray(database)
      ? database.filter(uscitaValida)
      : [];

    console.log("=================================");
    console.log("DATABASE 1 KM E SI MANGIA");
    console.log("Uscite caricate:", usciteItaliane.length);
    console.log("=================================");

    let usciteVisibili = 0;
    let usciteEscluse = Array.isArray(database) ? database.length - usciteItaliane.length : 0;

    usciteItaliane.forEach(function(uscita) {
      const marker = L.marker(
        [uscita.lat, uscita.lon],
        { icon: exitIcon }
      );

      marker.bindPopup(creaPopup(uscita));

      marker.on("click", function() {
        map.flyTo(
          [uscita.lat, uscita.lon],
          14,
          { duration: 1 }
        );
      });

      clusterUscite.addLayer(marker);
      usciteVisibili++;
    });

    console.log("Uscite visibili:", usciteVisibili);
    console.log("Aree/svincoli esclusi:", usciteEscluse);
    console.log(
      "Filtro ristoranti:",
      CONFIG.distanzaMassimaRistoranteKm + " km + " + CONFIG.tolleranzaDistanzaMetri + " m"
    );

    if (typeof window.onUsciteCaricate === "function") {
      window.onUsciteCaricate(usciteItaliane);
    }
  })
  .catch(function(error) {
    console.error("Errore caricamento database uscite:", error);
  });
