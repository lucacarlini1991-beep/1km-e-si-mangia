/* 1 KM E SI MANGIA — PARCHEGGI
   Base della mappa: stessa logica funzionante di ESPLORA LE USCITE.
   Il GPS di gps.js/script.js NON viene modificato.
   I parcheggi vengono cercati solo dopo la scelta di un'uscita.
*/
(function () {
  "use strict";

  const OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ];

  const SEARCH_RADIUS = 2500;
  const state = {
    map: null,
    exits: [],
    selectedExit: null,
    parking: [],
    exitLayer: null,
    parkingLayer: null,
    loading: false
  };

  const $ = id => document.getElementById(id);

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(text, error) {
    const el = $("mpStatus");
    if (!el) return;
    el.textContent = text;
    el.style.color = error ? "#a52b23" : "";
  }

  function setBusy(button, busy, busyText, normalText) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
  }

  function distance(a, b) {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLon = (b.lon - a.lon) * rad;
    const lat1 = a.lat * rad;
    const lat2 = b.lat * rad;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function formatDistance(m) {
    if (!Number.isFinite(m)) return "—";
    return m < 1000
      ? Math.round(m) + " m"
      : (m / 1000).toFixed(1).replace(".", ",") + " km";
  }

  function isServiceArea(exit) {
    if (!exit) return true;

    const tipo = String(exit.tipo || "").toLowerCase();
    if (
      tipo.includes("servizio") ||
      tipo.includes("autogrill") ||
      tipo.includes("ristoro") ||
      tipo.includes("sosta") ||
      tipo.includes("service")
    ) return true;

    const text = (
      String(exit.nome || "") + " " +
      String(exit.nome_autostrada || "") + " " +
      String(exit.autostrada || "")
    ).toLowerCase();

    return [
      "area di servizio",
      "area servizio",
      "area di sosta",
      "area sosta",
      "autogrill",
      "area ristoro",
      "ristoro",
      "service area",
      "service station"
    ].some(word => text.includes(word));
  }

  function validExit(exit) {
    return !!exit &&
      Number.isFinite(Number(exit.lat)) &&
      Number.isFinite(Number(exit.lon)) &&
      exit.visualizza_mappa !== false &&
      !isServiceArea(exit);
  }

  function exitIcon() {
    return L.divIcon({
      className: "",
      html: '<div class="custom-marker"></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  }

  function parkingIcon() {
    return L.divIcon({
      className: "",
      html:
        '<div style="width:36px;height:36px;border-radius:50%;' +
        'background:#fff;border:3px solid #075c3b;display:flex;' +
        'align-items:center;justify-content:center;font-size:19px;' +
        'box-shadow:0 3px 10px rgba(0,0,0,.3)">🚛</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  }

  function initMap() {
    if (!window.L) {
      setStatus("Leaflet non è stato caricato.", true);
      return false;
    }

    const mapEl = $("mpMap");
    if (!mapEl) {
      setStatus("Contenitore della mappa non trovato.", true);
      return false;
    }

    try {
      state.map = L.map(mapEl, {
        center: [42.5, 12.5],
        zoom: 6,
        scrollWheelZoom: true,
        preferCanvas: false
      });

      window.parcheggiMap = state.map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        crossOrigin: true
      }).addTo(state.map);

      state.exitLayer =
        typeof L.markerClusterGroup === "function"
          ? L.markerClusterGroup({
              showCoverageOnHover: false,
              spiderfyOnMaxZoom: true,
              zoomToBoundsOnClick: true,
              removeOutsideVisibleBounds: true,
              maxClusterRadius: 55
            })
          : L.layerGroup();

      state.parkingLayer = L.layerGroup();

      state.map.addLayer(state.exitLayer);
      state.map.addLayer(state.parkingLayer);

      // Su Safari/iPhone la dimensione del contenitore può essere calcolata
      // dopo il primo paint: invalidiamo la mappa più volte.
      [50, 300, 1000].forEach(ms => {
        setTimeout(() => {
          if (state.map) state.map.invalidateSize(true);
        }, ms);
      });

      setStatus("Mappa caricata · carico le uscite…");
      return true;
    } catch (error) {
      console.error("PARCHEGGI — inizializzazione mappa:", error);
      setStatus("Errore nell'inizializzazione della mappa.", true);
      return false;
    }
  }

  async function loadExits() {
    try {
      const response = await fetch("./uscite.json?v=20260822-parcheggi", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("uscite.json HTTP " + response.status);
      }

      const data = await response.json();
      state.exits = Array.isArray(data)
        ? data.filter(validExit)
        : [];

      state.exitLayer.clearLayers();

      const icon = exitIcon();

      state.exits.forEach(exit => {
        const lat = Number(exit.lat);
        const lon = Number(exit.lon);

        const marker = L.marker([lat, lon], { icon });

        marker.bindPopup(
          '<div class="exit-popup">' +
            '<strong>' + esc(exit.nome || "Uscita autostradale") + "</strong>" +
            (exit.autostrada
              ? "<small>" + esc(exit.autostrada) +
                (exit.numero_uscita
                  ? " · Uscita " + esc(exit.numero_uscita)
                  : "") +
                "</small>"
              : "") +
            (exit.nome_autostrada
              ? "<small>" + esc(exit.nome_autostrada) + "</small>"
              : "") +
            "<small>🛣️ Uscita autostradale</small>" +
            '<button type="button" ' +
              'data-parcheggi-uscita="' + esc(exit.id) + '" ' +
              'style="margin-top:10px;width:100%;padding:10px;border:0;' +
              'border-radius:8px;background:#075c3b;color:#fff;' +
              'font-weight:800;cursor:pointer">' +
              "🚛 MOSTRA PARCHEGGI" +
            "</button>" +
          "</div>"
        );

        marker.on("click", () => {
          state.map.flyTo(
            [lat, lon],
            Math.max(state.map.getZoom(), 13),
            { duration: 0.5 }
          );
        });

        state.exitLayer.addLayer(marker);
      });

      if (!state.exits.length) {
        setStatus("Nessuna uscita disponibile nel database.", true);
      } else {
        setStatus(
          "Mappa pronta · scegli un’uscita per vedere i parcheggi"
        );
      }
    } catch (error) {
      console.error("PARCHEGGI — caricamento uscite:", error);
      setStatus("Impossibile caricare le uscite.", true);
    }
  }

  function overpassQuery(exit) {
    const lat = Number(exit.lat);
    const lon = Number(exit.lon);

    // NON cerchiamo ristoranti.
    // Solo oggetti OSM che rappresentano parcheggio/sosta/area servizi.
    return (
      '[out:json][timeout:40];(' +
      'nwr["amenity"="parking"](around:' + SEARCH_RADIUS + "," + lat + "," + lon + ");" +
      'nwr["amenity"="rest_area"](around:' + SEARCH_RADIUS + "," + lat + "," + lon + ");" +
      'nwr["highway"="services"](around:' + SEARCH_RADIUS + "," + lat + "," + lon + ");" +
      'nwr["highway"="rest_area"](around:' + SEARCH_RADIUS + "," + lat + "," + lon + ");" +
      ');out center tags;'
    );
  }

  async function queryOverpass(query) {
    let lastError = null;

    for (const url of OVERPASS) {
      for (const method of ["GET", "POST"]) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 45000);

          const options = {
            signal: controller.signal,
            headers: { Accept: "application/json" }
          };

          let target = url;

          if (method === "GET") {
            target += "?data=" + encodeURIComponent(query);
          } else {
            options.method = "POST";
            options.headers["Content-Type"] =
              "application/x-www-form-urlencoded";
            options.body = "data=" + encodeURIComponent(query);
          }

          const response = await fetch(target, options);
          clearTimeout(timer);

          if (!response.ok) {
            throw new Error("HTTP " + response.status);
          }

          return await response.json();
        } catch (error) {
          lastError = error;
          console.warn(
            "PARCHEGGI — Overpass " + method + " " + url,
            error
          );
        }
      }
    }

    throw lastError || new Error("Servizio OpenStreetMap non disponibile.");
  }

  function elementPoint(element) {
    if (
      Number.isFinite(Number(element.lat)) &&
      Number.isFinite(Number(element.lon))
    ) {
      return {
        lat: Number(element.lat),
        lon: Number(element.lon)
      };
    }

    if (
      element.center &&
      Number.isFinite(Number(element.center.lat)) &&
      Number.isFinite(Number(element.center.lon))
    ) {
      return {
        lat: Number(element.center.lat),
        lon: Number(element.center.lon)
      };
    }

    return null;
  }

  function isYes(value) {
    return [
      "yes",
      "true",
      "1",
      "designated",
      "permissive"
    ].includes(String(value || "").toLowerCase());
  }

  function numberFromTag(value) {
    if (value == null || value === "") return null;
    const match = String(value)
      .replace(",", ".")
      .match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  function profile() {
    return {
      lunghezza: Number(String($("mpL")?.value || "").replace(",", ".")),
      larghezza: Number(String($("mpW")?.value || "").replace(",", ".")),
      altezza: Number(String($("mpH")?.value || "").replace(",", ".")),
      peso: Number(String($("mpP")?.value || "").replace(",", "."))
    };
  }

  function compatibility(tags) {
    const p = profile();
    const checks = [];

    const maxHeight =
      numberFromTag(tags.maxheight || tags["maxheight:physical"]);
    const maxWidth = numberFromTag(tags.maxwidth);
    const maxLength = numberFromTag(tags.maxlength);
    const maxWeight = numberFromTag(tags.maxweight);

    if (
      tags.hgv === "no" ||
      tags["access:hgv"] === "no"
    ) return false;

    if (maxHeight !== null && p.altezza > 0) {
      checks.push(p.altezza <= maxHeight);
    }
    if (maxWidth !== null && p.larghezza > 0) {
      checks.push(p.larghezza <= maxWidth);
    }
    if (maxLength !== null && p.lunghezza > 0) {
      checks.push(p.lunghezza <= maxLength);
    }
    if (maxWeight !== null && p.peso > 0) {
      checks.push(p.peso <= maxWeight);
    }

    if (checks.includes(false)) return false;
    if (checks.length) return true;

    if (
      isYes(tags.hgv) ||
      isYes(tags["access:hgv"]) ||
      tags.highway === "services"
    ) return true;

    return null;
  }

  function normalize(element, exit) {
    const point = elementPoint(element);
    const tags = element.tags || {};

    if (!point) return null;

    if (
      tags.access === "private" ||
      tags.access === "no"
    ) return null;

    const d = distance(
      point,
      { lat: Number(exit.lat), lon: Number(exit.lon) }
    );

    if (d > SEARCH_RADIUS) return null;

    return {
      id: element.type + "-" + element.id,
      lat: point.lat,
      lon: point.lon,
      name:
        tags.name ||
        tags.operator ||
        (tags.highway === "services"
          ? "Area di servizio"
          : "Parcheggio"),
      tags: tags,
      distance: d,
      compat: compatibility(tags),
      limits: {
        height:
          tags.maxheight ||
          tags["maxheight:physical"] ||
          null,
        width: tags.maxwidth || null,
        length: tags.maxlength || null,
        weight: tags.maxweight || null
      }
    };
  }

  function services(tags) {
    const result = [];

    if (isYes(tags.toilets)) result.push("WC");
    if (isYes(tags.shower)) result.push("Doccia");
    if (isYes(tags.lit)) result.push("Illuminato");
    if (isYes(tags.surveillance)) result.push("Videosorveglianza");
    if (tags.fee === "yes") result.push("A pagamento");

    const capacity =
      tags["capacity:hgv"] ||
      tags.capacity_hgv;

    if (capacity) {
      result.push("Posti TIR " + capacity);
    }

    return result;
  }

  function compatibilityText(item) {
    if (item.compat === true) return "🟢 Compatibile";
    if (item.compat === false) return "🔴 Non compatibile";
    return "🟡 Da verificare";
  }

  function clearParking() {
    state.parking = [];
    if (state.parkingLayer) state.parkingLayer.clearLayers();
  }

  function renderParkingOnMap(exit) {
    state.parkingLayer.clearLayers();

    const bounds = L.latLngBounds([
      [Number(exit.lat), Number(exit.lon)]
    ]);

    const icon = parkingIcon();

    state.parking.forEach(item => {
      const marker = L.marker(
        [item.lat, item.lon],
        { icon }
      );

      marker.bindPopup(
        '<div class="parking-popup">' +
          "<strong>🚛 " + esc(item.name) + "</strong>" +
          "<small>📍 " + formatDistance(item.distance) +
            " dall’uscita</small>" +
          "<small>" + compatibilityText(item) + "</small>" +
          (services(item.tags).length
            ? "<small>" +
              esc(services(item.tags).join(" · ")) +
              "</small>"
            : "") +
          '<button type="button" ' +
            'class="parking-popup-nav" ' +
            'data-naviga-parcheggio="' + esc(item.id) + '">' +
            "🧭 NAVIGA" +
          "</button>" +
          '<button type="button" ' +
            'class="parking-popup-truck" ' +
            'data-camion-parcheggio="' + esc(item.id) + '">' +
            "🚛 NAVIGA CON IL CAMION" +
          "</button>" +
        "</div>"
      );

      state.parkingLayer.addLayer(marker);
      bounds.extend([item.lat, item.lon]);
    });

    if (bounds.isValid()) {
      state.map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 15
      });
    }

    setTimeout(() => state.map.invalidateSize(true), 100);
  }

  function renderList(exit) {
    const list = $("mpList");
    if (!list) return;

    if (!state.parking.length) {
      list.innerHTML =
        '<div class="mp-empty">' +
          "<strong>Nessun parcheggio trovato</strong><br>" +
          "OpenStreetMap non restituisce parcheggi o aree di sosta " +
          "entro 2,5 km da <strong>" +
          esc(exit.nome || "questa uscita") +
          "</strong>." +
          "<br><br>" +
          "Prova un’altra uscita oppure aggiorna i risultati." +
        "</div>";
      return;
    }

    list.innerHTML = state.parking.map((item, index) => {
      const limitEntries = [
        ["H", item.limits.height],
        ["Larg.", item.limits.width],
        ["Lung.", item.limits.length],
        ["Peso", item.limits.weight]
      ].filter(pair => pair[1]);

      const limitText = limitEntries.length
        ? "<br>" + limitEntries
            .map(pair => pair[0] + " " + esc(pair[1]))
            .join(" · ")
        : "";

      return (
        '<article class="mp-card">' +
          "<h3>🚛 " + esc(item.name) + "</h3>" +
          '<div class="mp-meta">' +
            '<span class="mp-chip">📍 ' +
              formatDistance(item.distance) +
              " dall’uscita</span>" +
            '<span class="mp-chip ' +
              (item.compat === true
                ? "good"
                : item.compat === false
                  ? "bad"
                  : "warn") +
              '">' +
              compatibilityText(item) +
            "</span>" +
          "</div>" +
          '<div class="mp-services">' +
            (services(item.tags).length
              ? esc(services(item.tags).join(" · "))
              : "Servizi non indicati") +
            limitText +
          "</div>" +
          '<div class="mp-card-actions">' +
            '<button class="mp-btn dark" type="button" ' +
              'data-nav-index="' + index + '">' +
              "🧭 NAVIGA" +
            "</button>" +
            '<button class="mp-btn" type="button" ' +
              'data-map-index="' + index + '">' +
              "📍 MAPPA" +
            "</button>" +
            '<button class="mp-btn primary" type="button" ' +
              'data-truck-index="' + index + '">' +
              "🚛 CAMION" +
            "</button>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  async function searchParking(exit) {
    if (!exit || state.loading) return;

    state.loading = true;
    state.selectedExit = exit;

    setBusy(
      $("mpNearestExit"),
      true,
      "🛣️ CERCO PARCHEGGI…",
      "🛣️ CERCA VICINO ALL'USCITA"
    );

    setStatus(
      "Cerco parcheggi vicino a " +
      (exit.nome || "questa uscita") +
      "…"
    );

    $("mpList").innerHTML =
      '<div class="mp-empty">⏳ Sto cercando i parcheggi intorno all’uscita…</div>';

    clearParking();

    try {
      const data = await queryOverpass(overpassQuery(exit));
      const seen = new Set();

      state.parking = (data.elements || [])
        .map(element => normalize(element, exit))
        .filter(Boolean)
        .filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 100);

      renderParkingOnMap(exit);
      renderList(exit);

      setStatus(
        state.parking.length +
        " parcheggi trovati · " +
        (exit.nome || "uscita")
      );
    } catch (error) {
      console.error("PARCHEGGI — ricerca:", error);
      clearParking();
      renderList(exit);
      setStatus(
        "Servizio parcheggi non disponibile · riprova",
        true
      );
    } finally {
      state.loading = false;
      setBusy(
        $("mpNearestExit"),
        false,
        "",
        "🛣️ CERCA VICINO ALL'USCITA"
      );
    }
  }

  function normalNavigation(item) {
    if (
      typeof window.apriNavigazione === "function"
    ) {
      window.apriNavigazione({
        nome: item.name,
        lat: item.lat,
        lon: item.lon
      });
      return;
    }

    const url =
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(item.lat + "," + item.lon) +
      "&travelmode=driving";

    window.open(url, "_blank", "noopener");
  }

  function truckNavigation(item) {
    if (
      window.CamionNavigazione &&
      typeof window.CamionNavigazione.naviga === "function"
    ) {
      window.CamionNavigazione.naviga({
        id: item.id,
        nome: item.name,
        lat: item.lat,
        lon: item.lon,
        destinazione_tipo: "parcheggio_mezzo_pesante"
      });
      return;
    }

    alert(
      "La navigazione mezzo pesante non è disponibile. Ricarica la pagina."
    );
  }

  function saveProfile() {
    const p = profile();
    const message = $("mpSaved");

    if (
      !Number.isFinite(p.lunghezza) || p.lunghezza <= 0 ||
      !Number.isFinite(p.larghezza) || p.larghezza <= 0 ||
      !Number.isFinite(p.altezza) || p.altezza <= 0 ||
      !Number.isFinite(p.peso) || p.peso <= 0
    ) {
      message.textContent =
        "⚠️ Inserisci tutte le dimensioni del mezzo.";
      message.style.color = "#a52b23";
      return;
    }

    localStorage.setItem(
      "1km-esimangia-mezzo",
      JSON.stringify({
        tipo: $("mpTipo")?.value || "Autoarticolato",
        lunghezzaM: p.lunghezza,
        larghezzaM: p.larghezza,
        altezzaM: p.altezza,
        pesoKg: p.peso * 1000,
        rimorchio: !!$("mpR")?.checked
      })
    );

    // Il GPS non viene toccato.
    // Aggiorniamo solo la compatibilità dei parcheggi già cercati.
    message.textContent =
      "✓ MEZZO SALVATO — dimensioni memorizzate su questo dispositivo.";
    message.style.color = "#176534";

    if (state.selectedExit && !state.loading) {
      renderParkingOnMap(state.selectedExit);
      renderList(state.selectedExit);
    }
  }

  function loadProfile() {
    try {
      const raw =
        localStorage.getItem("1km-esimangia-mezzo");

      if (!raw) return;

      const data = JSON.parse(raw);

      if (data.tipo) $("mpTipo").value = data.tipo;
      if (data.lunghezzaM) $("mpL").value = data.lunghezzaM;
      if (data.larghezzaM) $("mpW").value = data.larghezzaM;
      if (data.altezzaM) $("mpH").value = data.altezzaM;
      if (data.pesoKg) $("mpP").value = data.pesoKg / 1000;
      if (typeof data.rimorchio === "boolean") {
        $("mpR").checked = data.rimorchio;
      }
    } catch (error) {
      console.warn("PARCHEGGI — profilo mezzo:", error);
    }
  }

  // Questo pulsante resta isolato dal modulo GPS di Esplora Uscite.
  function locateNearestExit() {
    const button = $("mpLocate");

    if (!navigator.geolocation) {
      setStatus(
        "La geolocalizzazione non è disponibile su questo dispositivo.",
        true
      );
      return;
    }

    setBusy(
      button,
      true,
      "📍 CERCO LA POSIZIONE…",
      "📍 USA LA MIA POSIZIONE"
    );

    navigator.geolocation.getCurrentPosition(
      position => {
        const here = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };

        let nearest = null;
        let nearestDistance = Infinity;

        state.exits.forEach(exit => {
          const d = distance(here, {
            lat: Number(exit.lat),
            lon: Number(exit.lon)
          });

          if (d < nearestDistance) {
            nearestDistance = d;
            nearest = exit;
          }
        });

        if (!nearest) {
          setStatus("Nessuna uscita trovata.", true);
        } else {
          state.map.flyTo(
            [Number(nearest.lat), Number(nearest.lon)],
            13,
            { duration: 0.8 }
          );
          searchParking(nearest);
        }

        setBusy(
          button,
          false,
          "",
          "📍 USA LA MIA POSIZIONE"
        );
      },
      error => {
        console.warn("PARCHEGGI — GPS:", error);

        const text =
          error.code === 1
            ? "Posizione negata dal browser."
            : error.code === 3
              ? "Il GPS sta impiegando troppo tempo. Riprova."
              : "Posizione non disponibile su questo dispositivo.";

        setStatus(text, true);

        setBusy(
          button,
          false,
          "",
          "📍 USA LA MIA POSIZIONE"
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  }

  document.addEventListener("click", event => {
    const exitButton =
      event.target.closest &&
      event.target.closest("[data-parcheggi-uscita]");

    if (exitButton) {
      const exit = state.exits.find(
        item =>
          String(item.id) ===
          String(exitButton.dataset.parcheggiUscita)
      );

      if (exit) searchParking(exit);
      return;
    }

    const navButton =
      event.target.closest &&
      event.target.closest("[data-naviga-parcheggio]");

    if (navButton) {
      const item = state.parking.find(
        parking =>
          parking.id === navButton.dataset.navigaParcheggio
      );

      if (item) normalNavigation(item);
      return;
    }

    const truckButton =
      event.target.closest &&
      event.target.closest("[data-camion-parcheggio]");

    if (truckButton) {
      const item = state.parking.find(
        parking =>
          parking.id === truckButton.dataset.camionParcheggio
      );

      if (item) truckNavigation(item);
      return;
    }

    const navIndex =
      event.target.closest &&
      event.target.closest("[data-nav-index]");

    if (navIndex) {
      const item =
        state.parking[Number(navIndex.dataset.navIndex)];

      if (item) normalNavigation(item);
      return;
    }

    const mapIndex =
      event.target.closest &&
      event.target.closest("[data-map-index]");

    if (mapIndex) {
      const item =
        state.parking[Number(mapIndex.dataset.mapIndex)];

      if (item) {
        state.map.flyTo(
          [item.lat, item.lon],
          16,
          { duration: 0.5 }
        );
      }
      return;
    }

    const truckIndex =
      event.target.closest &&
      event.target.closest("[data-truck-index]");

    if (truckIndex) {
      const item =
        state.parking[Number(truckIndex.dataset.truckIndex)];

      if (item) truckNavigation(item);
    }
  });

  function start() {
    const ok = initMap();
    if (!ok) return;

    loadProfile();

    $("mpLocate")?.addEventListener(
      "click",
      locateNearestExit
    );

    $("mpNearestExit")?.addEventListener(
      "click",
      () => {
        if (state.selectedExit) {
          searchParking(state.selectedExit);
        } else {
          setStatus(
            "Scegli un casello sulla mappa per cercare i parcheggi."
          );
          $("mpMap")?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
      }
    );

    $("mpRefresh")?.addEventListener(
      "click",
      () => {
        if (state.selectedExit) {
          searchParking(state.selectedExit);
        } else {
          loadExits();
        }
      }
    );

    $("mpSave")?.addEventListener(
      "click",
      saveProfile
    );

    loadExits();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
