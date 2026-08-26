// =====================================================
// 1 KM E SI MANGIA
// SCRIPT PRINCIPALE
// =====================================================


// =====================================================
// CONFIGURAZIONE
// =====================================================

const CONFIG = {

  distanzaMassimaRistoranteKm: 2,

  tolleranzaDistanzaMetri: 100,

  // Google Places viene interrogato SOLO quando il GPS dell'utente
  // dimostra che si trova abbastanza vicino al casello selezionato.
  // Questo impedisce, ad esempio, di selezionare Reggio Calabria
  // mentre ci si trova in Valle d'Aosta e generare una chiamata Google.
  googlePlacesMaxGpsDistanceKm: 20,
  googlePlacesRadiusMeters: 2000,
  googlePlacesMaxResults: 15,

  get distanzaMassimaEffettivaMetri() {

    return (
      this.distanzaMassimaRistoranteKm * 1000 +
      this.tolleranzaDistanzaMetri
    );

  }

};


// =====================================================
// MAPPA
// =====================================================

const map = L.map("map", {

  center: [42.5, 12.5],

  zoom: 6,

  scrollWheelZoom: true

});

// API per i moduli esterni (GPS, ecc.)
window.appMap = map;
if (window.GPSManager) {
  window.GPSManager.attachMap(map);
}


// =====================================================
// OPENSTREETMAP
// =====================================================

L.tileLayer(

  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

  {

    maxZoom: 19,

    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  }

).addTo(map);


// =====================================================
// GRUPPO USCITE
// =====================================================

const clusterUscite = L.markerClusterGroup({

  showCoverageOnHover: false,

  spiderfyOnMaxZoom: true,

  zoomToBoundsOnClick: true,

  removeOutsideVisibleBounds: true,

  maxClusterRadius: 55

});

map.addLayer(clusterUscite);


// =====================================================
// ICONA USCITA
// =====================================================

const exitIcon = L.divIcon({

  className: "",

  html:
    '<div class="custom-marker"></div>',

  iconSize: [36, 36],

  iconAnchor: [18, 18],

  popupAnchor: [0, -18]

});

// =====================================================
// DATABASE
// =====================================================

let usciteItaliane = [];


// =====================================================
// DATABASE RISTORANTI
// =====================================================

let ristorantiDatabase = [];

const ristorantiLayer = L.layerGroup().addTo(map);
const ristorantiPerUscitaMap = new Map();

const restaurantIcon = L.divIcon({
  className: "restaurant-map-icon",
  html:
    '<div style="width:34px;height:34px;border-radius:50%;background:#ffffff;border:3px solid #075c3b;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.35);">🍴</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17]
});

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const SUPABASE_CONFIG = {
  url: "https://pyiheodneyvtcotuonpt.supabase.co",
  key: "sb_publishable_6FGQBm1zXfwY8zVSuNmTlA_DRW5DMfQ"
};

const recensioniOnlineCache = new Map();

const recensioniKey = (ristorante) => `1km-recensioni-${String(ristorante?.id || ristorante?.osm_id || ristorante?.nome || "ristorante")}`;

function idRistorante(ristorante) {
  return String(ristorante?.id || ristorante?.osm_id || ristorante?.nome || "ristorante");
}

function leggiRecensioniLocali(ristorante) {
  try {
    const raw = localStorage.getItem(recensioniKey(ristorante));
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (_) { return []; }
}

function recensioniCache(ristorante) {
  const id = idRistorante(ristorante);
  return recensioniOnlineCache.has(id)
    ? recensioniOnlineCache.get(id)
    : leggiRecensioniLocali(ristorante);
}

function salvaCacheRecensioni(ristorante, recensioni) {
  recensioniOnlineCache.set(idRistorante(ristorante), recensioni);
}

async function caricaRecensioniOnline(ristorante) {
  const id = idRistorante(ristorante);
  try {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/restaurant_reviews?select=id,restaurant_id,rating,comment,created_at&restaurant_id=eq.${encodeURIComponent(id)}&is_published=eq.true&order=created_at.desc&limit=50`;
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_CONFIG.key,
        Authorization: `Bearer ${SUPABASE_CONFIG.key}`
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    const recensioni = Array.isArray(rows) ? rows.map(r => ({
      id: r.id,
      stelle: Number(r.rating),
      testo: r.comment,
      data: r.created_at ? new Date(r.created_at).toLocaleDateString("it-IT") : ""
    })) : [];
    salvaCacheRecensioni(ristorante, recensioni);
    return recensioni;
  } catch (error) {
    console.warn("Recensioni online non disponibili, uso quelle locali:", error);
    return recensioniCache(ristorante);
  }
}

async function inviaRecensioneOnline(ristorante, stelle, testo) {
  const id = idRistorante(ristorante);
  const url = `${SUPABASE_CONFIG.url}/rest/v1/restaurant_reviews`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_CONFIG.key,
      Authorization: `Bearer ${SUPABASE_CONFIG.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      restaurant_id: id,
      rating: stelle,
      comment: testo,
      is_published: true
    })
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${details}`);
  }
  const rows = await response.json();
  const nuova = Array.isArray(rows) && rows[0] ? rows[0] : {
    stelle,
    testo,
    data: new Date().toLocaleDateString("it-IT")
  };
  const recensioni = recensioniCache(ristorante);
  recensioni.unshift({
    id: nuova.id,
    stelle: Number(nuova.rating ?? stelle),
    testo: nuova.comment ?? testo,
    data: nuova.created_at ? new Date(nuova.created_at).toLocaleDateString("it-IT") : new Date().toLocaleDateString("it-IT")
  });
  salvaCacheRecensioni(ristorante, recensioni);
  return recensioni;
}

function datiValutazione(ristorante) {
  const recensioni = recensioniCache(ristorante);
  if (!recensioni.length) return { media: null, totale: 0 };
  const media = recensioni.reduce((sum, r) => sum + Number(r.stelle || 0), 0) / recensioni.length;
  return { media: Math.round(media * 10) / 10, totale: recensioni.length };
}

function stelleHtml(media) {
  if (media == null) return `<span style="letter-spacing:1px;color:#9aa7a2">☆☆☆☆☆</span>`;
  const rounded = Math.round(media);
  return `<span style="letter-spacing:1px;color:#f5a719">${"★".repeat(rounded)}${"☆".repeat(5-rounded)}</span>`;
}
function nomeGiornoItalia() {
  return ["Su","Mo","Tu","We","Th","Fr","Sa"][new Date().getDay()];
}

function giornoInRegola(rule, day) {
  if (!rule) return false;
  if (rule === day) return true;
  const parts = rule.split("-");
  if (parts.length !== 2) return false;
  const giorni = ["Mo","Tu","We","Th","Fr","Sa","Su"];
  let a = giorni.indexOf(parts[0]), b = giorni.indexOf(parts[1]), x = giorni.indexOf(day);
  if (a < 0 || b < 0 || x < 0) return false;
  if (a <= b) return x >= a && x <= b;
  return x >= a || x <= b;
}

function statoApertura(apertura) {
  if (!apertura) return { label: "ORARI NON DISPONIBILI", color: "#65736e" };
  if (String(apertura).trim() === "24/7") return { label: "🟢 APERTO 24 ORE SU 24", color: "#16834b" };
  const day = nomeGiornoItalia();
  const now = new Date();
  const minuti = now.getHours() * 60 + now.getMinutes();
  const regole = String(apertura).split(";").map(x => x.trim()).filter(Boolean);
  let aperto = false, prossimo = null;
  for (const regola of regole) {
    const m = regola.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+(.+)$/i);
    if (!m) continue;
    const giorno = m[1].replace(/^./, c => c.toUpperCase()) + (m[2] ? "-" + m[2].replace(/^./, c => c.toUpperCase()) : "");
    if (!giornoInRegola(giorno, day)) continue;
    if (/off/i.test(m[3])) continue;
    const fasce = m[3].split(",").map(x => x.trim());
    for (const fascia of fasce) {
      const tm = fascia.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (!tm) continue;
      const inizio = Number(tm[1])*60+Number(tm[2]);
      let fine = Number(tm[3])*60+Number(tm[4]);
      if (fine === 0) fine = 1440;
      const dentro = fine >= inizio ? minuti >= inizio && minuti <= fine : (minuti >= inizio || minuti <= fine);
      if (dentro) { aperto = true; prossimo = `${tm[3].padStart(2,"0")}:${tm[4]}`; }
    }
  }
  if (aperto) return { label: prossimo ? `🟢 APERTO · chiude alle ${prossimo}` : "🟢 APERTO", color: "#16834b" };
  return { label: "🔴 CHIUSO", color: "#b23a2b" };
}

function bloccoRistoranteExtra(ristorante) {
  const valutazione = datiValutazione(ristorante);
  const stato = statoApertura(ristorante.apertura);
  return `
    <div style="margin-top:9px;padding-top:9px;border-top:1px solid #e5e5e5;display:grid;gap:5px">
      <strong style="color:${stato.color};font-size:13px">${stato.label}</strong>
      ${ristorante.apertura ? `<small>🕐 ${escapeHtml(ristorante.apertura)}</small>` : ""}
      <div style="font-size:13px"><strong>${stelleHtml(valutazione.media)}</strong> <span style="color:#66736f">${valutazione.media != null ? valutazione.media + " / 5 · " + valutazione.totale + " valutazioni" : "Nessuna valutazione"}</span></div>
      <button type="button" data-recensione-id="${escapeHtml(ristorante.id || ristorante.osm_id || ristorante.nome)}" style="margin-top:3px;border:0;border-radius:9px;background:#f5a719;color:#073f2e;padding:8px 10px;font-weight:800;cursor:pointer">⭐ VALUTA / LASCIA UN'INFORMAZIONE</button>
    </div>`;
}

function creaPopupRistorante(ristorante) {
  const nome = escapeHtml(ristorante.nome || "Ristorante");
  const distanza = Number.isFinite(Number(ristorante?.uscita?.distanza_m))
    ? `<small>📍 ${Math.round(Number(ristorante.uscita.distanza_m))} m dall'uscita</small>` : "";
  const parcheggio = ristorante.parcheggio?.presente === true
    ? `<small>🅿️ Parcheggio ${ristorante.parcheggio.distanza_m != null ? Math.round(Number(ristorante.parcheggio.distanza_m)) + " m" : "presente"}</small>`
    : `<small>🅿️ Parcheggio da verificare</small>`;
  return `<div style="min-width:210px;line-height:1.4"><strong>${nome}</strong>${ristorante.cucina ? `<small>🍽️ ${escapeHtml(ristorante.cucina)}</small>` : ""}${distanza}${parcheggio}${ristorante.telefono ? `<small>📞 ${escapeHtml(ristorante.telefono)}</small>` : ""}${bloccoRistoranteExtra(ristorante)}</div>`;
}

function apriRecensione(ristorante) {
  document.getElementById("recensioneModal1km")?.remove();
  const recensioni = recensioniCache(ristorante);
  const valutazione = datiValutazione(ristorante);
  const modal = document.createElement("div");
  modal.id = "recensioneModal1km";
  modal.style.cssText = "position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui,sans-serif;";
  modal.innerHTML = `<div style="width:min(94vw,520px);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35)"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><div style="font-size:12px;color:#f5a719;font-weight:800;letter-spacing:2px">1 KM E SI MANGIA</div><h2 style="margin:4px 0">${escapeHtml(ristorante.nome || "Ristorante")}</h2></div><button id="chiudiRecensione1km" type="button" style="border:0;background:#eee;border-radius:50%;width:36px;height:36px;font-size:20px">×</button></div><div data-online-summary style="margin:12px 0 18px;font-size:14px">${valutazione.media != null ? `${stelleHtml(valutazione.media)} <strong>${valutazione.media}/5</strong> · ${valutazione.totale} valutazioni` : "Ancora nessuna valutazione"}</div><div style="padding:14px;background:#f4f7f5;border-radius:12px"><strong>La tua esperienza</strong><div id="stelleInput1km" style="font-size:30px;letter-spacing:3px;margin:7px 0;cursor:pointer" aria-label="Scegli da 1 a 5 stelle">☆☆☆☆☆</div><textarea id="testoRecensione1km" maxlength="500" placeholder="Es. parcheggio comodo, servizio veloce, adatto a camion..." style="width:100%;min-height:90px;border:1px solid #ccd8d3;border-radius:10px;padding:10px;font:inherit;resize:vertical"></textarea><button id="salvaRecensione1km" type="button" style="width:100%;margin-top:10px;border:0;border-radius:10px;background:#075c3b;color:#fff;padding:12px;font-weight:800">PUBBLICA ANONIMAMENTE</button></div><div data-online-list style="margin-top:18px"><strong>Esperienze degli utenti</strong>${recensioni.length ? recensioni.slice(-8).reverse().map(r => `<div style="border-bottom:1px solid #e7ece9;padding:12px 0"><div>${stelleHtml(Number(r.stelle))}</div><div style="margin-top:4px;color:#53635e">${escapeHtml(r.testo || "")}</div><small style="color:#8a9692">Utente anonimo · ${escapeHtml(r.data || "")}</small></div>`).join("") : `<p style="color:#687772">Nessuna esperienza ancora. Sii il primo.</p>`}</div><small style="display:block;margin-top:15px;color:#8a9692">Le informazioni vengono pubblicate in forma anonima e sono condivise con gli altri utenti.</small></div>`;
  document.body.appendChild(modal);
  let stelle = 0;
  const input = modal.querySelector("#stelleInput1km");
  function aggiorna() { input.textContent = "★".repeat(stelle) + "☆".repeat(5-stelle); input.style.color = "#f5a719"; }
  input.addEventListener("click", e => { const rect=input.getBoundingClientRect(); stelle=Math.min(5,Math.max(1,Math.ceil(((e.clientX-rect.left)/rect.width)*5))); aggiorna(); });
  modal.querySelector("#chiudiRecensione1km").onclick = () => modal.remove();
  modal.addEventListener("click", e => { if(e.target===modal) modal.remove(); });

  caricaRecensioniOnline(ristorante).then(() => {
    if (!document.body.contains(modal)) return;
    const latest = recensioniCache(ristorante);
    const latestVal = datiValutazione(ristorante);
    const summary = modal.querySelector("[data-online-summary]");
    if (summary) summary.innerHTML = latestVal.media != null ? `${stelleHtml(latestVal.media)} <strong>${latestVal.media}/5</strong> · ${latestVal.totale} valutazioni` : "Ancora nessuna valutazione";
    const list = modal.querySelector("[data-online-list]");
    if (list) list.innerHTML = latest.length ? latest.slice(0,8).map(r => `<div style="border-bottom:1px solid #e7ece9;padding:12px 0"><div>${stelleHtml(Number(r.stelle))}</div><div style="margin-top:4px;color:#53635e">${escapeHtml(r.testo || "")}</div><small style="color:#8a9692">Utente anonimo · ${escapeHtml(r.data || "")}</small></div>`).join("") : `<p style="color:#687772">Nessuna esperienza ancora. Sii il primo.</p>`;
  });

  modal.querySelector("#salvaRecensione1km").onclick = async () => {
    const testo = modal.querySelector("#testoRecensione1km").value.trim();
    const bottone = modal.querySelector("#salvaRecensione1km");
    if (!stelle) return alert("Scegli da 1 a 5 stelle.");
    if (testo.length < 3) return alert("Scrivi almeno qualche parola sulla tua esperienza.");
    bottone.disabled = true;
    bottone.textContent = "PUBBLICAZIONE...";
    try {
      await inviaRecensioneOnline(ristorante, stelle, testo);
      modal.remove();
      if (window._ristorantiRefresh) window._ristorantiRefresh();
      alert("Grazie! La tua valutazione è stata pubblicata in forma anonima.");
    } catch (error) {
      console.error("Errore pubblicazione recensione:", error);
      bottone.disabled = false;
      bottone.textContent = "PUBBLICA ANONIMAMENTE";
      alert("Non è stato possibile pubblicare ora la valutazione. Riprova tra poco.");
    }
  };
}

function ristorantiPerUscita(uscita) {
  if (!uscita || !uscita.id) return [];
  return ristorantiPerUscitaMap.get(String(uscita.id)) || [];
}

function creaPopupRistorante(ristorante) {
  const nome = escapeHtml(ristorante.nome || "Ristorante");
  const distanza = Number.isFinite(Number(ristorante?.uscita?.distanza_m))
    ? `<small>📍 ${Math.round(Number(ristorante.uscita.distanza_m))} m dall'uscita</small>` : "";
  const parcheggio = ristorante.parcheggio?.presente === true
    ? `<small>🅿️ Parcheggio ${ristorante.parcheggio.distanza_m != null ? Math.round(Number(ristorante.parcheggio.distanza_m)) + " m" : "presente"}</small>`
    : `<small>🅿️ Parcheggio da verificare</small>`;
  const ristoranteId = escapeHtml(
    ristorante.id != null ? String(ristorante.id) : String(ristorante.osm_id || ristorante.nome || "")
  );

  return `
    <div class="popup-ristorante-1km" style="min-width:230px;line-height:1.4;text-align:left">
      <strong style="display:block;font-size:16px;margin-bottom:5px">${nome}</strong>
      ${ristorante.cucina ? `<small>🍽️ ${escapeHtml(ristorante.cucina)}</small>` : ""}
      ${distanza}
      ${parcheggio}
      ${ristorante.telefono ? `<small>📞 ${escapeHtml(ristorante.telefono)}</small>` : ""}
      ${ristorante.google_address ? `<small>📍 ${escapeHtml(ristorante.google_address)}</small>` : ""}
      ${ristorante.fonte === "Google Places" ? `<small style="color:#075c3b;font-weight:700">Google Places</small>` : ""}
      ${bloccoRistoranteExtra(ristorante)}
      <button type="button" data-naviga-ristorante="${ristoranteId}" style="display:block;width:100%;margin-top:10px;padding:10px 12px;border:0;border-radius:9px;background:#075c3b;color:#fff;font-size:14px;font-weight:800;cursor:pointer">🧭 NAVIGA</button>
    </div>
  `;
}

function creaMarkerRistorante(ristorante) {
  if (typeof ristorante.lat !== "number" || typeof ristorante.lon !== "number") {
    return null;
  }

  const marker = L.marker([ristorante.lat, ristorante.lon], {
    icon: restaurantIcon
  });

  marker.bindPopup(creaPopupRistorante(ristorante));
  return marker;
}

function chiudiPannelloRistoranti() {
  const panel = document.getElementById("ristorantiMapPanel");
  if (panel) panel.remove();
}

function mostraRistorantiDatabase(uscita, ristorantiOverride) {
  if (!uscita) return;
  window._ultimaUscitaRistoranti = uscita;
  window._ristorantiRefresh = function() {
    mostraRistorantiDatabase(
      window._ultimaUscitaRistoranti,
      window._ristorantiVisualizzati || []
    );
  };

  const ristoranti = Array.isArray(ristorantiOverride)
    ? ristorantiOverride
    : ristorantiPerUscita(uscita);
  ristorantiLayer.clearLayers();
  chiudiPannelloRistoranti();

  const bounds = L.latLngBounds([[uscita.lat, uscita.lon]]);
  let markerCount = 0;

  ristoranti.forEach(function(ristorante) {
    const marker = creaMarkerRistorante(ristorante);
    if (!marker) return;

    marker.addTo(ristorantiLayer);
    bounds.extend([ristorante.lat, ristorante.lon]);
    markerCount++;
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 15
    });
  }

  const panel = document.createElement("div");
  panel.id = "ristorantiMapPanel";
  panel.style.cssText =
    "position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,520px);max-height:80vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:18px;font-family:system-ui,sans-serif;";

  if (!ristoranti.length) {
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong style="font-size:20px">Nessun ristorante</strong>
        <button id="chiudiRistorantiMap" type="button" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer">×</button>
      </div>
      <p>Non risultano ristoranti associati a questa uscita nel database.</p>
    `;
  } else {
    const cards = ristoranti.map(function(ristorante, index) {
      const nome = escapeHtml(ristorante.nome || "Ristorante");
      const distanza = Number.isFinite(Number(ristorante?.uscita?.distanza_m))
        ? Math.round(Number(ristorante.uscita.distanza_m)) + " m dall'uscita"
        : "";
      const parcheggio = ristorante.parcheggio?.presente === true
        ? "🅿️ Parcheggio " + (ristorante.parcheggio.distanza_m != null ? Math.round(Number(ristorante.parcheggio.distanza_m)) + " m" : "presente")
        : "🅿️ Parcheggio da verificare";

      return `
        <div style="border:1px solid #e5e5e5;border-radius:14px;padding:12px;margin-top:10px">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <div>
              <strong>${index + 1}. ${nome}</strong>
              ${ristorante.cucina ? `<div style="font-size:12px;color:#555;margin-top:3px">🍽️ ${escapeHtml(ristorante.cucina)}</div>` : ""}
            </div>
            ${typeof ristorante.lat === "number" && typeof ristorante.lon === "number"
              ? `<button type="button" data-ristorante-index="${index}" style="box-sizing:border-box;min-width:132px;height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:10px;background:#075c3b;color:#fff;padding:8px 12px;font-weight:700;cursor:pointer;white-space:nowrap"><svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><path d="M9 3 6 29M23 3l3 26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M16 4v5M16 13v5M16 22v6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 4"/></svg> NAVIGA</button>` + (ristorante.parcheggio?.presente === true && Number.isFinite(Number(ristorante.parcheggio.distanza_m)) && Number(ristorante.parcheggio.distanza_m) <= 600
                ? ` <button type="button" data-demo-ristorante-index="${index}" style="box-sizing:border-box;min-width:132px;height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #075c3b;border-radius:10px;background:#fff;color:#075c3b;padding:8px 12px;font-weight:700;cursor:pointer;white-space:nowrap">🚛 DEMO</button>`
                : "")
              : ""}
          </div>
          <div style="font-size:12px;color:#555;margin-top:7px;display:grid;gap:3px">
            ${distanza ? `<span>📏 ${distanza}</span>` : ""}
            <span>${parcheggio}</span>
            ${ristorante.telefono ? `<span>📞 ${escapeHtml(ristorante.telefono)}</span>` : ""}
            ${ristorante.google_address ? `<span>📍 ${escapeHtml(ristorante.google_address)}</span>` : ""}
            ${ristorante.fonte === "Google Places" ? `<span style="color:#075c3b;font-weight:700">Google Places</span>` : ""}
            ${bloccoRistoranteExtra(ristorante)}
          </div>
        </div>
      `;
    }).join("");

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;position:sticky;top:0;background:#fff;padding-bottom:10px">
        <div>
          <strong style="font-size:20px">🍴 Ristoranti</strong>
          <div style="font-size:13px;color:#555">${escapeHtml(uscita.nome || "Uscita autostradale")} · ${ristoranti.length} trovati</div>
        </div>
        <button id="chiudiRistorantiMap" type="button" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer">×</button>
      </div>
      ${cards}
      <button id="chiudiRistorantiMapBottom" type="button" style="width:100%;margin-top:14px;border:0;border-radius:12px;background:#075c3b;color:#fff;padding:12px;font-weight:700;cursor:pointer">CHIUDI</button>
    `;
  }

  document.body.appendChild(panel);

  const closeTop = panel.querySelector("#chiudiRistorantiMap");
  if (closeTop) closeTop.addEventListener("click", chiudiPannelloRistoranti);

  const closeBottom = panel.querySelector("#chiudiRistorantiMapBottom");
  if (closeBottom) closeBottom.addEventListener("click", chiudiPannelloRistoranti);

  panel.querySelectorAll("[data-ristorante-index]").forEach(function(button) {
    button.addEventListener("click", function() {
      const index = Number(button.getAttribute("data-ristorante-index"));
      const ristorante = ristoranti[index];
      if (!ristorante) return;

      chiudiPannelloRistoranti();

      // Il pulsante della scheda ristorante porta direttamente
      // alla scelta dell'app di navigazione.
      // navigazione.js espone apriNavigazione().
      if (typeof window.apriNavigazione === "function") {
        window.apriNavigazione(ristorante);
        return;
      }

      // Fallback: se navigazione.js non fosse ancora disponibile,
      // manteniamo comunque il comportamento precedente.
      map.setView([ristorante.lat, ristorante.lon], 17, { animate: true });

      ristorantiLayer.eachLayer(function(layer) {
        if (
          layer.getLatLng &&
          Math.abs(layer.getLatLng().lat - ristorante.lat) < 0.000001 &&
          Math.abs(layer.getLatLng().lng - ristorante.lon) < 0.000001
        ) {
          layer.openPopup();
        }
      });
    });
  });


  // =====================================================
  // MODALITÀ DEMO MEZZI PESANTI
  // =====================================================
  panel.querySelectorAll("[data-demo-ristorante-index]").forEach(function(button) {
    button.addEventListener("click", function() {
      const index = Number(button.getAttribute("data-demo-ristorante-index"));
      const ristorante = ristoranti[index];
      if (!ristorante) return;

      const parcheggio = ristorante.parcheggio;
      const distanza = Number(parcheggio?.distanza_m);

      if (
        parcheggio?.presente !== true ||
        !Number.isFinite(distanza) ||
        distanza > 600 ||
        !Number.isFinite(Number(parcheggio?.lat)) ||
        !Number.isFinite(Number(parcheggio?.lon))
      ) {
        alert("Per questo ristorante non è disponibile un parcheggio entro 600 m.");
        return;
      }

      const overlay = document.createElement("div");
      overlay.id = "demoMezziPesanti";
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:11000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:18px;";

      const nome = escapeHtml(ristorante.nome || "Ristorante");
      overlay.innerHTML = `
        <div style="width:min(94vw,460px);background:#fff;border-radius:20px;padding:20px;box-shadow:0 15px 50px rgba(0,0,0,.35);font-family:system-ui,sans-serif">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
            <div>
              <div style="font-size:13px;font-weight:800;letter-spacing:1px;color:#075c3b">MODALITÀ DEMO</div>
              <h2 style="margin:4px 0 0;font-size:23px">🚛 Mezzo pesante</h2>
            </div>
            <button type="button" data-demo-close style="border:0;background:#f2f2f2;border-radius:50%;width:38px;height:38px;font-size:22px;cursor:pointer">×</button>
          </div>

          <p style="margin:16px 0 8px"><strong>${nome}</strong></p>
          <p style="margin:0 0 16px;color:#444">
            Parcheggio disponibile a <strong>${Math.round(distanza)} m</strong> dal ristorante.
          </p>

          <div style="display:grid;gap:10px">
            <button type="button" data-demo-destination="restaurant" style="height:48px;border:0;border-radius:12px;background:#075c3b;color:#fff;font-weight:800;cursor:pointer">
              NAVIGA AL RISTORANTE
            </button>
            <button type="button" data-demo-destination="parking" style="height:48px;border:1px solid #075c3b;border-radius:12px;background:#fff;color:#075c3b;font-weight:800;cursor:pointer">
              🅿️ NAVIGA AL PARCHEGGIO
            </button>
          </div>

          <p style="margin:14px 0 0;font-size:12px;line-height:1.4;color:#666">
            Demo: la destinazione parcheggio è limitata a 600 m dal ristorante.
            Le app esterne possono non applicare automaticamente i profili e le restrizioni specifiche per mezzi pesanti: verificare sempre segnaletica e limiti locali.
          </p>
        </div>
      `;

      document.body.appendChild(overlay);

      function chiudiDemo() {
        overlay.remove();
      }

      overlay.querySelector("[data-demo-close]").addEventListener("click", chiudiDemo);

      overlay.addEventListener("click", function(event) {
        if (event.target === overlay) chiudiDemo();
      });

      overlay.querySelectorAll("[data-demo-destination]").forEach(function(action) {
        action.addEventListener("click", function() {
          const tipo = action.getAttribute("data-demo-destination");

          let destinazione;

          if (tipo === "parking") {
            destinazione = {
              ...ristorante,
              nome: "Parcheggio vicino a " + (ristorante.nome || "ristorante"),
              lat: Number(parcheggio.lat),
              lon: Number(parcheggio.lon),
              demo_mezzo_pesante: true,
              destinazione_tipo: "parcheggio"
            };
          } else {
            destinazione = {
              ...ristorante,
              demo_mezzo_pesante: true,
              destinazione_tipo: "ristorante"
            };
          }

          if (typeof window.apriNavigazione === "function") {
            chiudiDemo();
            window.apriNavigazione(destinazione);
          } else {
            alert("Sistema di navigazione non disponibile.");
          }
        });
      });
    });
  });

  // Espone solo lo stato corrente necessario ai moduli aggiuntivi.
  window._ristorantiCorrenti = ristoranti;
  window._uscitaCorrente = uscita;

  console.log("Ristoranti mostrati:", ristoranti.length, "Marker:", markerCount, "Uscita:", uscita.nome);
}

// =====================================================
// GOOGLE PLACES + CONTROLLO GPS
// =====================================================

function distanzaGpsMetri(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizzaNomeGoogle(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unisciRistorantiGoogle(ristorantiLocali, placesGoogle, uscita) {
  const risultato = Array.isArray(ristorantiLocali) ? ristorantiLocali.slice() : [];
  const usati = new Set();

  risultato.forEach(function(r) {
    if (r.google_place_id) usati.add(String(r.google_place_id));
  });

  (Array.isArray(placesGoogle) ? placesGoogle : []).forEach(function(place) {
    const location = place?.location;
    const lat = Number(location?.latitude);
    const lon = Number(location?.longitude);
    const placeId = place?.id ? String(place.id) : "";
    const nome = place?.displayName?.text || "Ristorante";

    if (!placeId || !Number.isFinite(lat) || !Number.isFinite(lon) || usati.has(placeId)) return;

    // Se il locale Google corrisponde chiaramente a uno gia presente
    // nel nostro database, arricchiamo quello esistente invece di duplicarlo.
    const nomeGoogle = normalizzaNomeGoogle(nome);
    let duplicato = null;

    for (const locale of risultato) {
      const lLat = Number(locale?.lat);
      const lLon = Number(locale?.lon);
      if (!Number.isFinite(lLat) || !Number.isFinite(lLon)) continue;
      const d = distanzaGpsMetri(lat, lon, lLat, lLon);
      const nomeLocale = normalizzaNomeGoogle(locale.nome);
      const stessoNome = nomeGoogle && nomeLocale && (
        nomeGoogle === nomeLocale ||
        nomeGoogle.includes(nomeLocale) ||
        nomeLocale.includes(nomeGoogle)
      );
      if (d <= 80 && stessoNome) {
        duplicato = locale;
        break;
      }
    }

    if (duplicato) {
      duplicato.google_place_id = placeId;
      duplicato.google_place_name = nome;
      duplicato.google_address = place?.formattedAddress || "";
      duplicato.google_types = Array.isArray(place?.types) ? place.types : [];
      usati.add(placeId);
      return;
    }

    risultato.push({
      id: `google:${placeId}`,
      google_place_id: placeId,
      google_place_name: nome,
      google_address: place?.formattedAddress || "",
      google_types: Array.isArray(place?.types) ? place.types : [],
      nome,
      lat,
      lon,
      cucina: "Google Places",
      fonte: "Google Places",
      uscita: {
        id: uscita.id,
        nome: uscita.nome,
        distanza_m: null
      },
      parcheggio: { presente: false }
    });
    usati.add(placeId);
  });

  return risultato;
}

function mostraAvvisoGoogle(titolo, testo) {
  chiudiPannelloRistoranti();
  const panel = document.createElement("div");
  panel.id = "ristorantiMapPanel";
  panel.style.cssText = "position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,520px);background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:20px;font-family:system-ui,sans-serif;";
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><strong style="font-size:20px">📍 ${escapeHtml(titolo)}</strong><button id="chiudiRistorantiMap" type="button" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer">×</button></div><p style="line-height:1.5;color:#46544f">${escapeHtml(testo)}</p>`;
  document.body.appendChild(panel);
  panel.querySelector("#chiudiRistorantiMap")?.addEventListener("click", chiudiPannelloRistoranti);
}

async function mostraTuttiRistoranti(uscita) {
  if (!uscita) return;

  const gps = window.GPSManager && typeof window.GPSManager.getLastPosition === "function"
    ? window.GPSManager.getLastPosition()
    : null;

  if (!gps || !Number.isFinite(Number(gps.lat)) || !Number.isFinite(Number(gps.lng))) {
    mostraAvvisoGoogle(
      "Posizione necessaria",
      "Per mostrare i ristoranti devi prima attivare la tua posizione GPS. Senza una posizione valida non facciamo nessuna chiamata a Google Places."
    );
    return;
  }

  const distanzaGps = distanzaGpsMetri(
    Number(gps.lat),
    Number(gps.lng),
    Number(uscita.lat),
    Number(uscita.lon)
  );
  const tolleranzaGps = Math.max(0, Number(gps.accuracy) || 0);
  const limiteGps = CONFIG.googlePlacesMaxGpsDistanceKm * 1000 + tolleranzaGps;

  if (!Number.isFinite(distanzaGps) || distanzaGps > limiteGps) {
    mostraAvvisoGoogle(
      "Uscita troppo lontana",
      "Avvicinati a questa uscita per scoprire altri locali. Grazie al servizio Google Places potremo aiutarti a trovarne altri. Per ora ti mostriamo quelli presenti sul nostro sito."
    );
    console.log("Google Places BLOCCATO: uscita lontana dal GPS", {
      uscita: uscita.nome,
      distanzaGpsMetri: Math.round(distanzaGps),
      limiteGpsMetri: Math.round(limiteGps)
    });
    return;
  }

  // Mostriamo subito i dati gia presenti nel nostro database, poi li arricchiamo
  // con Google. La chiave Google resta sempre sul server Vercel.
  const locali = ristorantiPerUscita(uscita);
  window._ristorantiVisualizzati = locali;
  mostraRistorantiDatabase(uscita, locali);

  const panel = document.getElementById("ristorantiMapPanel");
  if (panel) {
    const titolo = panel.querySelector("strong");
    if (titolo) titolo.textContent = "🍴 Ristoranti · ricerca Google...";
  }

  try {
    const response = await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exit: { lat: Number(uscita.lat), lon: Number(uscita.lon) },
        radius: CONFIG.googlePlacesRadiusMeters,
        maxResultCount: CONFIG.googlePlacesMaxResults
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    const placesGoogle = Array.isArray(data.places) ? data.places : [];
    const combinati = unisciRistorantiGoogle(locali, placesGoogle, uscita);
    window._ristorantiVisualizzati = combinati;
    mostraRistorantiDatabase(uscita, combinati);

    console.log("Google Places OK", {
      uscita: uscita.nome,
      gpsDistanzaMetri: Math.round(distanzaGps),
      risultatiGoogle: placesGoogle.length,
      risultatiTotali: combinati.length
    });
  } catch (error) {
    console.error("Google Places non disponibile:", error);
    window._ristorantiVisualizzati = locali;
    // Non perdiamo i risultati OSM gia disponibili se Google ha un problema.
    const current = document.getElementById("ristorantiMapPanel");
    if (current) {
      const info = document.createElement("div");
      info.style.cssText = "margin:10px 0;padding:10px;border-radius:10px;background:#fff4d6;color:#6b5317;font-size:12px;";
      info.textContent = "Google Places non ha risposto. Mostro i ristoranti gia presenti nel database.";
      current.insertBefore(info, current.children[1] || null);
    }
  }
}

window.mostraTuttiRistoranti = mostraTuttiRistoranti;

// =====================================================
// RECENSIONI / NAVIGAZIONE DAL POPUP RISTORANTE
// =====================================================

document.addEventListener("click", function(event) {
  const recensioneBtn = event.target.closest && event.target.closest("[data-recensione-id]");
  if (recensioneBtn) {
    event.preventDefault();
    event.stopPropagation();
    const id = recensioneBtn.getAttribute("data-recensione-id");
    const elencoCorrente = Array.isArray(window._ristorantiVisualizzati)
      ? window._ristorantiVisualizzati
      : ristorantiDatabase;
    const ristorante = elencoCorrente.find(function(item) {
      return String(item.id || item.osm_id || item.nome) === String(id);
    });
    if (ristorante) apriRecensione(ristorante);
    return;
  }

  const navigaBtn = event.target.closest && event.target.closest("[data-naviga-ristorante]");
  if (navigaBtn) {
    event.preventDefault();
    event.stopPropagation();
    const id = navigaBtn.getAttribute("data-naviga-ristorante");
    const elencoCorrente = Array.isArray(window._ristorantiVisualizzati)
      ? window._ristorantiVisualizzati
      : ristorantiDatabase;
    const ristorante = elencoCorrente.find(function(item) {
      return String(item.id || item.osm_id || item.nome) === String(id);
    });
    if (!ristorante) {
      console.error("Navigazione: ristorante non trovato:", id);
      return;
    }
    if (typeof window.apriNavigazione === "function") {
      window.apriNavigazione(ristorante);
    } else {
      alert("La navigazione non è disponibile. Ricarica la pagina.");
    }
  }
}, true);

// Carica e indicizza il database ristoranti per ID uscita.
fetch("./ristoranti.json")
  .then(function(response) {
    if (!response.ok) throw new Error("Impossibile caricare ristoranti.json");
    return response.json();
  })
  .then(function(database) {
    if (!Array.isArray(database)) {
      throw new Error("ristoranti.json non contiene un array");
    }

    ristorantiDatabase = database;
    ristorantiPerUscitaMap.clear();

    ristorantiDatabase.forEach(function(ristorante) {
      const id = ristorante?.uscita?.id;
      if (!id) return;

      const chiave = String(id);
      if (!ristorantiPerUscitaMap.has(chiave)) {
        ristorantiPerUscitaMap.set(chiave, []);
      }

      // Manteniamo solo il raggio configurato: 2 km + 100 m.
      const distanza = Number(ristorante?.uscita?.distanza_m);
      if (!Number.isFinite(distanza) || distanza <= CONFIG.distanzaMassimaEffettivaMetri) {
        ristorantiPerUscitaMap.get(chiave).push(ristorante);
      }
    });

    console.log("DATABASE RISTORANTI - caricati:", ristorantiDatabase.length);
    console.log("Uscite con ristoranti:", ristorantiPerUscitaMap.size);
  })
  .catch(function(error) {
    console.error("Errore database ristoranti:", error);
  });

// Pulsante presente nel popup dell'uscita.
document.addEventListener("click", function(event) {
  const button = event.target.closest("[data-ristoranti-uscita]");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();

  const id = button.getAttribute("data-ristoranti-uscita");
  const uscita = usciteItaliane.find(function(item) {
    return String(item.id || "") === String(id);
  });

  if (!uscita) {
    console.error("Uscita non trovata:", id);
    return;
  }

  mostraTuttiRistoranti(uscita);
}, true);


// =====================================================
// CONTROLLA SE E' AREA DI SERVIZIO / AUTOGRILL
// =====================================================

function eAreaDiServizio(uscita) {

  if (!uscita) {

    return true;

  }


  // ---------------------------------------------
  // CONTROLLO CAMPO TIPO
  // ---------------------------------------------

  const tipo = String(
    uscita.tipo || ""
  ).toLowerCase();


  if (

    tipo.includes("servizio") ||

    tipo.includes("autogrill") ||

    tipo.includes("ristoro") ||

    tipo.includes("sosta") ||

    tipo.includes("service")

  ) {

    return true;

  }


  // ---------------------------------------------
  // CONTROLLO NOME
  // ---------------------------------------------

  const nome = (

    String(uscita.nome || "") +

    " " +

    String(uscita.nome_autostrada || "") +

    " " +

    String(uscita.autostrada || "")

  ).toLowerCase();


  const paroleDaEscludere = [

    "area di servizio",

    "area servizio",

    "area di sosta",

    "area sosta",

    "autogrill",

    "area ristoro",

    "ristoro",

    "service area",

    "service station"

  ];


  for (
    let i = 0;
    i < paroleDaEscludere.length;
    i++
  ) {

    if (
      nome.includes(
        paroleDaEscludere[i]
      )
    ) {

      return true;

    }

  }


  return false;

}


// =====================================================
// CONTROLLA USCITA VALIDA
// =====================================================

function uscitaValida(uscita) {

  if (!uscita) {

    return false;

  }


  if (

    typeof uscita.lat !== "number" ||

    typeof uscita.lon !== "number"

  ) {

    return false;

  }


  if (
    uscita.visualizza_mappa === false
  ) {

    return false;

  }


  // ESCLUDI AUTOGRILL / AREE DI SERVIZIO

  if (
    eAreaDiServizio(uscita)
  ) {

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

      popup +=
        ` · Uscita ${uscita.numero_uscita}`;

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

      throw new Error(
        "Impossibile caricare uscite.json"
      );

    }

    return response.json();

  })

  .then(function(database) {

    usciteItaliane = database;


    console.log(
      "================================="
    );

    console.log(
      "DATABASE 1 KM E SI MANGIA"
    );

    console.log(
      "Uscite caricate:",
      usciteItaliane.length
    );

    console.log(
      "================================="
    );


    let usciteVisibili = 0;

    let usciteEscluse = 0;


    // ---------------------------------------------
    // CREA MARKER
    // ---------------------------------------------

    usciteItaliane.forEach(function(uscita) {

      if (
        !uscitaValida(uscita)
      ) {

        usciteEscluse++;

        return;

      }


      const marker = L.marker(

        [
          uscita.lat,
          uscita.lon
        ],

        {
          icon: exitIcon
        }

      );


      marker.bindPopup(
        creaPopup(uscita)
      );


      // -------------------------------------------
      // CLICK MARKER
      // -------------------------------------------

      marker.on(

        "click",

        function() {

          map.flyTo(

            [
              uscita.lat,
              uscita.lon
            ],

            14,

            {
              duration: 1
            }

          );

        }

      );


      clusterUscite.addLayer(
        marker
      );


      usciteVisibili++;

    });


    console.log(
      "Uscite visibili:",
      usciteVisibili
    );


    console.log(
      "Elementi esclusi:",
      usciteEscluse
    );


    console.log(
      "Filtro ristoranti:",
      CONFIG.distanzaMassimaRistoranteKm +
      " km + " +
      CONFIG.tolleranzaDistanzaMetri +
      " m"
    );


    console.log(
      "Distanza effettiva:",
      CONFIG.distanzaMassimaEffettivaMetri +
      " m"
    );

  })


  .catch(function(error) {

    console.error(
      "Errore database:",
      error
    );

  });


// =====================================================
// PULSANTE "ESPLORA LA MAPPA"
// =====================================================

const mapButton =
  document.getElementById(
    "mapButton"
  );


const mapSection =
  document.getElementById(
    "mapSection"
  );


if (mapButton) {

  mapButton.addEventListener(

    "click",

    function() {

      if (mapSection) {

        mapSection.scrollIntoView({

          behavior: "smooth"

        });

      }

    }

  );

}


// =====================================================
// MENU PRINCIPALE - GESTIONE UNIFICATA
// =====================================================


(function () {

  function initMenu() {

    const menuButton = document.querySelector(".menu-button");

    // Supportiamo entrambe le versioni che abbiamo usato:
    // #mobileMenu / .mobile-menu
    // #siteMenu / .site-menu
    const menuPanel =
      document.getElementById("mobileMenu") ||
      document.querySelector(".mobile-menu") ||
      document.getElementById("siteMenu") ||
      document.querySelector(".site-menu");

    const menuClose =
      document.getElementById("menuClose") ||
      document.querySelector(".menu-close") ||
      document.querySelector(".site-menu-close");

    const overlay =
      document.querySelector(".site-menu-overlay") ||
      document.querySelector(".mobile-menu-overlay");

    if (!menuButton || !menuPanel) {
      console.warn("MENU: elementi non trovati", {
        menuButton: !!menuButton,
        menuPanel: !!menuPanel
      });
      return;
    }

    let aperto = false;

    function openMenu() {

      aperto = true;

      menuPanel.classList.add("open");
      menuPanel.classList.add("active");

      menuPanel.setAttribute("aria-hidden", "false");

      menuButton.setAttribute("aria-expanded", "true");

      document.body.classList.add("menu-open");

      // Forziamo anche lo stile essenziale in modo che il menu
      // funzioni anche se una vecchia regola CSS è rimasta nel file.
      menuPanel.style.visibility = "visible";
      menuPanel.style.opacity = "1";
      menuPanel.style.pointerEvents = "auto";
      menuPanel.style.zIndex = "9999";

      if (overlay) {
        overlay.classList.add("open");
        overlay.classList.add("active");
        overlay.style.visibility = "visible";
        overlay.style.opacity = "1";
        overlay.style.pointerEvents = "auto";
        overlay.style.zIndex = "9998";
      }

      console.log("MENU APERTO");
    }

    function closeMenu() {

      aperto = false;

      menuPanel.classList.remove("open");
      menuPanel.classList.remove("active");

      menuPanel.setAttribute("aria-hidden", "true");

      menuButton.setAttribute("aria-expanded", "false");

      document.body.classList.remove("menu-open");

      menuPanel.style.visibility = "hidden";
      menuPanel.style.opacity = "0";
      menuPanel.style.pointerEvents = "none";

      if (overlay) {
        overlay.classList.remove("open");
        overlay.classList.remove("active");
        overlay.style.visibility = "hidden";
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
      }

      console.log("MENU CHIUSO");
    }

    // Stato iniziale
    closeMenu();

    // Pulsante hamburger
    menuButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (aperto) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Pulsante X
    if (menuClose) {
      menuClose.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
      });
    }

    // Overlay
    if (overlay) {
      overlay.addEventListener("click", function () {
        closeMenu();
      });
    }

    // ESC
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    // Link del menu
    const menuLinks = menuPanel.querySelectorAll(".menu-link");

    menuLinks.forEach(function (link) {

      link.addEventListener("click", function (event) {

        const target = link.getAttribute("href");

        closeMenu();

        if (target && target.startsWith("#")) {

          const elemento = document.querySelector(target);

          if (elemento) {
            event.preventDefault();

            setTimeout(function () {
              elemento.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }, 150);
          }
        }
      });
    });

    console.log("MENU PRINCIPALE ATTIVO");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenu);
  } else {
    initMenu();
  }

})();


// =====================================================
// RESIZE MAPPA
// =====================================================

window.addEventListener("resize", function () {

  setTimeout(function () {
    map.invalidateSize();
  }, 100);

});


// =====================================================
// AVVIO
// =====================================================

console.log("=================================");
console.log("1 KM E SI MANGIA - SCRIPT AVVIATO");
console.log(
  "Filtro:",
  CONFIG.distanzaMassimaRistoranteKm +
  " km + " +
  CONFIG.tolleranzaDistanzaMetri +
  " m"
);
console.log("=================================");
