/* 1 KM E SI MANGIA — NAVIGAZIONE REALE MEZZI PESANTI
   Routing HGV con profilo mezzo salvato sul dispositivo.
   Motore: Valhalla + dati OpenStreetMap.
*/
(function () {
  "use strict";

  const PROFILE_KEY = "1km_mezzo_pesante_v2";
  const TEST_POSITION_KEY = "1km-camion-posizione-test";
  const ROUTING_URL = "https://valhalla1.openstreetmap.de/route";

  const DEFAULTS = {
    tipo: "Autoarticolato",
    lunghezza: 16.5,
    larghezza: 2.55,
    altezza: 4.0,
    peso: 40,
    rimorchio: true
  };

  function number(v) {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function getProfile() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); } catch (_) {}

    // Compatibilità con il vecchio salvataggio.
    if (!Object.keys(p).length) {
      try {
        const old = JSON.parse(localStorage.getItem("1km-esimangia-mezzo") || "{}");
        if (old && Object.keys(old).length) {
          p = {
            lunghezza: number(old.lunghezzaM),
            larghezza: number(old.larghezzaM),
            altezza: number(old.altezzaM),
            peso: number(old.pesoKg) !== null ? number(old.pesoKg) / 1000 : null
          };
        }
      } catch (_) {}
    }

    return {
      ...DEFAULTS,
      ...p,
      lunghezza: number(p.lunghezza) ?? DEFAULTS.lunghezza,
      larghezza: number(p.larghezza) ?? DEFAULTS.larghezza,
      altezza: number(p.altezza) ?? DEFAULTS.altezza,
      peso: number(p.peso) ?? DEFAULTS.peso
    };
  }

  function getTestPosition() {
    try {
      const p = JSON.parse(localStorage.getItem(TEST_POSITION_KEY) || "null");
      if (!p) return null;
      const lat = number(p.lat), lon = number(p.lng ?? p.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    } catch (_) {
      return null;
    }
  }

  // GPS CAMION SEPARATO: non legge né modifica il modulo GPS esistente.
  // Se viene passata una posizione esplicita, quella ha la precedenza.
  function getTruckPosition(explicitOrigin) {
    if (explicitOrigin) {
      const lat = number(explicitOrigin.lat), lon = number(explicitOrigin.lng ?? explicitOrigin.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return Promise.resolve({ lat, lon });
    }

    const test = getTestPosition();
    if (test) return Promise.resolve(test);

    if (!navigator.geolocation) {
      return Promise.reject(new Error("Il GPS del modulo camion non è disponibile su questo dispositivo."));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => reject(new Error("Il GPS camion non riesce a ottenere la posizione. Su Chromebook puoi impostare una posizione di test.")),
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
      );
    });
  }

  function setTestPosition(position) {
    const lat = number(position?.lat), lon = number(position?.lng ?? position?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Posizione di test non valida.");
    localStorage.setItem(TEST_POSITION_KEY, JSON.stringify({ lat, lon }));
    return { lat, lon };
  }

  function clearTestPosition() {
    localStorage.removeItem(TEST_POSITION_KEY);
  }

  // Polyline6 di Valhalla: lat/lon con precisione 1e-6.
  function decodePolyline6(str) {
    let index = 0, lat = 0, lon = 0, points = [];
    while (index < str.length) {
      let result = 0, shift = 0, b;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      result = 0; shift = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lon += (result & 1) ? ~(result >> 1) : (result >> 1);
      points.push([lat / 1e6, lon / 1e6]);
    }
    return points;
  }

  async function calculateRoute(origin, destination) {
    const p = getProfile();
    const payload = {
      locations: [
        { lat: origin.lat, lon: origin.lon, type: "break" },
        { lat: destination.lat, lon: destination.lon, type: "break" }
      ],
      costing: "truck",
      units: "kilometers",
      directions_options: { units: "kilometers", language: "it-IT" },
      costing_options: {
        truck: {
          height: p.altezza,
          width: p.larghezza,
          length: p.lunghezza,
          weight: p.peso,
          use_truck_route: 1,
          hgv_no_access_penalty: 43200
        }
      }
    };

    const response = await fetch(ROUTING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "1km-e-si-mangia"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error("Il servizio di routing camion non risponde (HTTP " + response.status + "). " + text.slice(0, 160));
    }

    const data = await response.json();
    if (!data.trip || !data.trip.legs || !data.trip.legs.length) {
      throw new Error("Il motore non ha trovato un percorso compatibile con le dimensioni del mezzo.");
    }

    const summary = data.trip.summary || {};
    const maneuvers = data.trip.legs.flatMap(leg => leg.maneuvers || []);
    const shape = data.trip.legs.map(leg => leg.shape).filter(Boolean).join("");

    return {
      profile: p,
      distance: number(summary.length),
      time: number(summary.time),
      points: decodePolyline6(shape),
      maneuvers
    };
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "—";
    const min = Math.round(seconds / 60);
    if (min < 60) return min + " min";
    return Math.floor(min / 60) + " h " + String(min % 60).padStart(2, "0") + " min";
  }

  function close() {
    document.getElementById("camion-route-overlay-1km")?.remove();
    document.body.style.overflow = "";
  }

  function addStyles() {
    if (document.getElementById("camion-route-styles-1km")) return;
    const s = document.createElement("style");
    s.id = "camion-route-styles-1km";
    s.textContent = `
      #camion-route-overlay-1km{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:12px;font-family:Arial,sans-serif}
      .camion-route-box-1km{width:min(720px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}
      .camion-route-head-1km{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .camion-route-head-1km h2{margin:0;color:#075c3b;font-size:21px}
      .camion-route-head-1km p{margin:4px 0 0;color:#666;font-size:13px}
      .camion-route-close-1km{width:38px;height:38px;border:0;border-radius:50%;background:#eee;font-size:22px;cursor:pointer}
      .camion-route-profile-1km{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:14px 0}
      .camion-route-profile-1km div{background:#f2f6f3;border-radius:10px;padding:9px;text-align:center;font-size:12px;color:#496056}
      .camion-route-profile-1km strong{display:block;color:#075c3b;font-size:15px;margin-bottom:2px}
      #camion-route-map-1km{height:330px;border-radius:15px;overflow:hidden;background:#e8ecea}
      .camion-route-summary-1km{display:flex;gap:10px;margin:12px 0}
      .camion-route-summary-1km div{flex:1;background:#075c3b;color:#fff;border-radius:12px;padding:12px;text-align:center}
      .camion-route-summary-1km strong{display:block;font-size:18px}
      .camion-route-summary-1km span{font-size:11px;opacity:.85}
      .camion-route-warning-1km{margin:10px 0;padding:11px 12px;border-radius:12px;background:#fff7e5;color:#6d5111;font-size:12px;line-height:1.4}
      .camion-route-steps-1km{margin:12px 0 0;padding:0;list-style:none}
      .camion-route-steps-1km li{padding:9px 4px;border-bottom:1px solid #eee;font-size:13px;color:#333}
      .camion-route-footer-1km{display:flex;gap:10px;margin-top:14px}
      .camion-route-footer-1km button{flex:1;min-height:48px;border-radius:12px;border:0;font-weight:800;cursor:pointer}
      .camion-route-close-btn-1km{background:#eee;color:#222}
      @media(max-width:520px){.camion-route-profile-1km{grid-template-columns:repeat(2,1fr)}#camion-route-map-1km{height:300px}}
    `;
    document.head.appendChild(s);
  }

  function createOverlay(destination) {
    close();
    addStyles();

    const overlay = document.createElement("div");
    overlay.id = "camion-route-overlay-1km";
    overlay.innerHTML = `
      <div class="camion-route-box-1km">
        <div class="camion-route-head-1km">
          <div><h2>🚛 NAVIGAZIONE MEZZO PESANTE</h2><p>${escapeHtml(destination.nome || "Destinazione")}</p></div>
          <button class="camion-route-close-1km" type="button">×</button>
        </div>
        <div id="camion-route-status-1km" style="padding:18px 4px;text-align:center;color:#555">Calcolo del percorso compatibile con il tuo mezzo…</div>
        <div id="camion-route-content-1km" style="display:none">
          <div id="camion-route-profile-1km" class="camion-route-profile-1km"></div>
          <div id="camion-route-map-1km"></div>
          <div id="camion-route-summary-1km" class="camion-route-summary-1km"></div>
          <div class="camion-route-warning-1km">⚠️ Il percorso usa le restrizioni HGV disponibili nei dati OpenStreetMap. Non sostituisce la segnaletica reale: in presenza di un divieto sul posto, seguire sempre il divieto.</div>
          <ul id="camion-route-steps-1km" class="camion-route-steps-1km"></ul>
          <div class="camion-route-footer-1km"><button class="camion-route-close-btn-1km" type="button">CHIUDI</button></div>
        </div>
      </div>`;

    overlay.querySelectorAll(".camion-route-close-1km,.camion-route-close-btn-1km").forEach(b => b.addEventListener("click", close));
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    return overlay;
  }

  function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  }

  function render(overlay, result) {
    const p = result.profile;
    overlay.querySelector("#camion-route-status-1km").style.display = "none";
    overlay.querySelector("#camion-route-content-1km").style.display = "block";

    overlay.querySelector("#camion-route-profile-1km").innerHTML = `
      <div><strong>${p.lunghezza.toFixed(2)} m</strong>Lunghezza</div>
      <div><strong>${p.larghezza.toFixed(2)} m</strong>Larghezza</div>
      <div><strong>${p.altezza.toFixed(2)} m</strong>Altezza</div>
      <div><strong>${p.peso.toFixed(1)} t</strong>Peso</div>`;

    overlay.querySelector("#camion-route-summary-1km").innerHTML = `
      <div><strong>${Number.isFinite(result.distance) ? result.distance.toFixed(1) + " km" : "—"}</strong><span>Distanza</span></div>
      <div><strong>${formatTime(result.time)}</strong><span>Tempo stimato</span></div>`;

    const steps = overlay.querySelector("#camion-route-steps-1km");
    const useful = result.maneuvers.filter(m => m && m.instruction).slice(0, 80);
    steps.innerHTML = useful.length
      ? useful.map((m, i) => `<li><strong>${i + 1}.</strong> ${escapeHtml(m.instruction)}</li>`).join("")
      : "<li>Percorso calcolato. Segui la linea sulla mappa.</li>";

    const mapEl = overlay.querySelector("#camion-route-map-1km");
    if (window.L && result.points.length > 1) {
      const map = L.map(mapEl, { zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map);
      const line = L.polyline(result.points, { weight: 6 }).addTo(map);
      L.marker(result.points[0]).addTo(map).bindPopup("Partenza");
      L.marker(result.points[result.points.length - 1]).addTo(map).bindPopup("Destinazione");
      map.fitBounds(line.getBounds(), { padding: [18, 18] });
    } else {
      mapEl.innerHTML = "<div style='height:100%;display:flex;align-items:center;justify-content:center;color:#666;padding:20px;text-align:center'>Mappa non disponibile in questa pagina.<br>Il percorso è stato comunque calcolato.</div>";
    }
  }

  async function navigate(destination, explicitOrigin) {
    const coordinate = typeof window.coordinateNavigazione === "function"
      ? window.coordinateNavigazione(destination)
      : { lat: number(destination?.lat), lon: number(destination?.lon) };

    if (!coordinate || !Number.isFinite(coordinate.lat) || !Number.isFinite(coordinate.lon)) {
      alert("Coordinate della destinazione non disponibili.");
      return;
    }

    const overlay = createOverlay(destination);

    try {
      const origin = await getTruckPosition(explicitOrigin);
      const result = await calculateRoute(origin, coordinate);
      render(overlay, result);
    } catch (error) {
      console.error("NAVIGAZIONE HGV:", error);
      const status = overlay.querySelector("#camion-route-status-1km");
      status.innerHTML = `
        <div style="color:#a52b24;font-weight:800;margin-bottom:8px">Impossibile calcolare il percorso camion.</div>
        <div style="font-size:13px;line-height:1.45">${escapeHtml(error.message || "Errore di routing")}</div>
        <button type="button" style="margin-top:14px;padding:11px 18px;border:0;border-radius:10px;background:#075c3b;color:#fff;font-weight:800;cursor:pointer" id="camion-route-retry-1km">RIPROVA</button>`;
      status.querySelector("#camion-route-retry-1km")?.addEventListener("click", () => navigate(destination));
    }
  }

  window.CamionNavigazione = {
    disponibile: function () { return true; },
    getProfilo: getProfile,
    naviga: navigate,
    impostaPosizioneTest: setTestPosition,
    rimuoviPosizioneTest: clearTestPosition,
    chiudi: close
  };

  console.log("🚛 CAMION-NAVIGAZIONE.JS ATTIVO — routing HGV + profilo salvato");
})();
