// 1 KM E SI MANGIA — PARCHEGGI MEZZI PESANTI
// La mappa e la logica delle uscite seguono la stessa struttura funzionante
// di "Esplora le uscite". Cambiano solo i contenuti mostrati: parcheggi.
(function () {
  'use strict';

  const OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];
  const PARKING_RADIUS = 2500;
  const state = {
    map: null,
    exits: [],
    selectedExit: null,
    parking: [],
    parkingLayer: null,
    exitCluster: null,
    position: null,
    loading: false
  };

  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function distance(a, b) {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLon = (b.lon - a.lon) * rad;
    const la1 = a.lat * rad;
    const la2 = b.lat * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function formatDistance(m) {
    if (!Number.isFinite(m)) return '—';
    return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  }

  function status(text, error) {
    const el = $('mpStatus');
    if (!el) return;
    el.textContent = text;
    el.style.color = error ? '#a52b23' : '';
  }

  function busy(button, yes, busyText, normalText) {
    if (!button) return;
    button.disabled = yes;
    button.textContent = yes ? busyText : normalText;
  }

  function showMapMessage(text, error) {
    const mapEl = $('mpMap');
    if (!mapEl) return;
    const old = mapEl.querySelector('.mp-map-message');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'mp-map-message';
    box.textContent = text;
    box.style.cssText = `position:absolute;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box;font:700 17px/1.4 'Roboto Condensed',sans-serif;color:${error ? '#a52b23' : '#52615b'};background:#e8ece9;pointer-events:none`;
    mapEl.appendChild(box);
  }

  function clearMapMessage() {
    const el = $('mpMap')?.querySelector('.mp-map-message');
    if (el) el.remove();
  }

  // MAPPA: stessa inizializzazione della pagina ESPLORA LE USCITE.
  function initMap() {
    if (!window.L) {
      status('Libreria mappa non caricata', true);
      return false;
    }

    try {
      state.map = L.map('mpMap', {
        center: [42.5, 12.5],
        zoom: 6,
        scrollWheelZoom: true
      });
      window.appMap = state.map;

      // IDENTICO tile layer usato da ESPLORA LE USCITE.
      L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
      ).addTo(state.map);

      // Usa il clustering di Esplora Uscite quando disponibile, ma NON
      // rendiamo la mappa dipendente dal plugin: su alcuni browser/CDN
      // il plugin può arrivare dopo Leaflet e bloccare tutta l'inizializzazione.
      if (typeof L.markerClusterGroup === 'function') {
        state.exitCluster = L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          zoomToBoundsOnClick: true,
          removeOutsideVisibleBounds: true,
          maxClusterRadius: 55
        });
      } else {
        state.exitCluster = L.layerGroup();
      }
      state.map.addLayer(state.exitCluster);

      // Layer separato per i parcheggi, come il layer ristoranti.
      state.parkingLayer = L.layerGroup().addTo(state.map);

      const tileLayer = state.map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) return layer;
      });
      // Non dichiarare la mappa pronta prima che le tile siano realmente caricate.
      let tileReady = false;
      state.map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          layer.once('load', () => {
            tileReady = true;
            clearMapMessage();
            status('Mappa caricata · scegli un’uscita per vedere i parcheggi');
            state.map.invalidateSize(true);
          });
          layer.once('tileerror', () => {
            if (!tileReady) status('Mappa in caricamento…');
          });
        }
      });
      setTimeout(() => state.map && state.map.invalidateSize(true), 100);
      setTimeout(() => state.map && state.map.invalidateSize(true), 600);
      setTimeout(() => state.map && state.map.invalidateSize(true), 1500);
      status('Carico la mappa…');
      return true;
    } catch (error) {
      console.error('Mappa parcheggi:', error);
      status('Errore nell’inizializzazione della mappa', true);
      return false;
    }
  }

  function exitIcon() {
    return L.divIcon({
      className: '',
      html: '<div class="custom-marker"></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  }

  const parkingIcon = L.divIcon({
    className: 'parking-map-icon',
    html: '<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid #075c3b;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.35)">🚛</div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17]
  });

  function validExit(exit) {
    return exit && Number.isFinite(Number(exit.lat)) && Number.isFinite(Number(exit.lon)) && exit.visualizza_mappa !== false;
  }

  async function loadExits() {
    try {
      const response = await fetch('./uscite.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      state.exits = Array.isArray(data) ? data.filter(validExit) : [];
      if (!state.exits.length) throw new Error('Nessuna uscita nel database');
      drawExits();
      if (state.map) { /* stato gestito dal caricamento delle tile */ }
      return true;
    } catch (error) {
      console.error('Uscite:', error);
      status('Impossibile caricare le uscite', true);
      showMapMessage('Non riesco a caricare il database delle uscite.', true);
      return false;
    }
  }

  function exitPopup(exit) {
    return `<div class="exit-popup"><strong>${esc(exit.nome || 'Uscita autostradale')}</strong>${exit.autostrada ? `<small>${esc(exit.autostrada)}${exit.numero_uscita ? ' · Uscita ' + esc(exit.numero_uscita) : ''}</small>` : ''}<small>🛣️ Uscita autostradale</small><button type="button" data-parcheggi-uscita="${esc(exit.id)}" style="margin-top:10px;width:100%;padding:10px;border:0;border-radius:8px;cursor:pointer;background:#075c3b;color:#fff;font-weight:800">🚛 MOSTRA PARCHEGGI</button></div>`;
  }

  function drawExits() {
    if (!state.map || !state.exitCluster) return;
    state.exitCluster.clearLayers();
    const icon = exitIcon();
    state.exits.forEach(exit => {
      const marker = L.marker([Number(exit.lat), Number(exit.lon)], { icon });
      marker.bindPopup(exitPopup(exit));
      marker.on('click', () => {
        state.map.flyTo([Number(exit.lat), Number(exit.lon)], Math.max(state.map.getZoom(), 13), { duration: 0.6 });
      });
      state.exitCluster.addLayer(marker);
    });
  }

  function parkingQuery(exit) {
    const lat = Number(exit.lat), lon = Number(exit.lon);
    // Prima recuperiamo TUTTE le aree di sosta/parcheggio nell'area.
    // Il filtro camion viene fatto dopo, sui tag disponibili, così un
    // parcheggio OSM senza hgv=yes non sparisce dalla ricerca.
    return `[out:json][timeout:35];(
      nwr["amenity"="parking"](around:${PARKING_RADIUS},${lat},${lon});
      nwr["amenity"="parking_space"](around:${PARKING_RADIUS},${lat},${lon});
      nwr["amenity"="rest_area"](around:${PARKING_RADIUS},${lat},${lon});
      nwr["highway"="services"](around:${PARKING_RADIUS},${lat},${lon});
      nwr["highway"="rest_area"](around:${PARKING_RADIUS},${lat},${lon});
    );out center tags;`;
  }

  async function overpass(query) {
    let lastError = null;
    for (const url of OVERPASS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 32000);
        const response = await fetch(url + '?data=' + encodeURIComponent(query), { headers: { Accept: 'application/json' }, signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
      } catch (error) {
        lastError = error;
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 32000);
          const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query), signal: controller.signal });
          clearTimeout(timer);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return await response.json();
        } catch (error2) {
          lastError = error2;
        }
      }
    }
    throw lastError || new Error('Servizio parcheggi non disponibile');
  }

  function point(element) {
    if (Number.isFinite(Number(element.lat)) && Number.isFinite(Number(element.lon))) return { lat: Number(element.lat), lon: Number(element.lon) };
    if (element.center && Number.isFinite(Number(element.center.lat)) && Number.isFinite(Number(element.center.lon))) return { lat: Number(element.center.lat), lon: Number(element.center.lon) };
    return null;
  }

  function yes(value) { return ['yes', 'true', '1', 'designated', 'permissive'].includes(String(value || '').toLowerCase()); }

  function score(tags) {
    let s = 0;
    if (tags.highway === 'services') s += 8;
    if (yes(tags.hgv)) s += 8;
    if (yes(tags['access:hgv'])) s += 7;
    if (tags['capacity:hgv'] || tags.capacity_hgv) s += 6;
    if (tags.truck) s += 5;
    if (tags.goods) s += 4;
    if (tags['parking:lane:hgv']) s += 4;
    if (tags.hgv === 'no' || tags['access:hgv'] === 'no') s -= 30;
    if (tags.access === 'private' || tags.access === 'no') s -= 50;
    return s;
  }

  function limits(tags) {
    return {
      height: tags.maxheight || tags['maxheight:physical'] || null,
      width: tags.maxwidth || null,
      length: tags.maxlength || null,
      weight: tags.maxweight || null
    };
  }

  function normalize(element, exit) {
    const tags = element.tags || {};
    const p = point(element);
    if (!p || tags.access === 'private' || tags.access === 'no') return null;
    const d = distance(p, { lat: Number(exit.lat), lon: Number(exit.lon) });
    const lim = limits(tags);
    const compat = typeof window.verificaCompatibilitaParcheggio === 'function' ? window.verificaCompatibilitaParcheggio(lim) : null;
    return {
      id: element.type + '-' + element.id,
      lat: p.lat,
      lon: p.lon,
      name: tags.name || tags.operator || (tags.highway === 'services' ? 'Area di servizio' : 'Parcheggio mezzi pesanti'),
      tags,
      distance: d,
      limits: lim,
      compat,
      score: score(tags)
    };
  }

  function services(tags) {
    const out = [];
    if (yes(tags.toilets)) out.push('WC');
    if (yes(tags.shower)) out.push('Doccia');
    if (yes(tags.lit)) out.push('Illuminato');
    if (yes(tags.surveillance)) out.push('Videosorveglianza');
    if (tags.fee === 'yes') out.push('A pagamento');
    if (tags['capacity:hgv'] || tags.capacity_hgv) out.push('Posti TIR: ' + (tags['capacity:hgv'] || tags.capacity_hgv));
    return out;
  }

  function compatibilityText(item) {
    if (item.compat?.ok === true) return '🟢 Compatibile';
    if (item.compat?.ok === false) return '🔴 Non compatibile';
    return '🟡 Da verificare';
  }

  function popupParking(item) {
    const lim = [];
    if (item.limits.height) lim.push('H max ' + esc(item.limits.height) + ' m');
    if (item.limits.width) lim.push('Larg. max ' + esc(item.limits.width) + ' m');
    if (item.limits.length) lim.push('Lung. max ' + esc(item.limits.length) + ' m');
    if (item.limits.weight) lim.push('Peso max ' + esc(item.limits.weight));
    const serv = services(item.tags);
    return `<div class="parking-popup"><strong>${esc(item.name)}</strong><small>📍 ${formatDistance(item.distance)} dall’uscita</small><small>${compatibilityText(item)}</small>${serv.length ? `<small>${esc(serv.join(' · '))}</small>` : ''}${lim.length ? `<small>${lim.join(' · ')}</small>` : ''}<button type="button" class="parking-popup-nav" data-naviga-parcheggio="${esc(item.id)}">🧭 NAVIGA</button></div>`;
  }

  function renderParkingOnMap(exit) {
    state.parkingLayer.clearLayers();
    const bounds = L.latLngBounds([[Number(exit.lat), Number(exit.lon)]]);
    state.parking.forEach(item => {
      const marker = L.marker([item.lat, item.lon], { icon: parkingIcon });
      marker.bindPopup(popupParking(item));
      marker.on('click', () => state.map.setView([item.lat, item.lon], Math.max(state.map.getZoom(), 15), { animate: true }));
      marker.addTo(state.parkingLayer);
      bounds.extend([item.lat, item.lon]);
    });
    if (bounds.isValid()) state.map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    setTimeout(() => state.map.invalidateSize(true), 150);
  }

  function renderList(exit) {
    const list = $('mpList');
    if (!list) return;
    if (!state.parking.length) {
      list.innerHTML = `<div class="mp-empty"><strong>Nessun parcheggio trovato</strong><br>Non risultano parcheggi nei ${PARKING_RADIUS / 1000} km intorno a <strong>${esc(exit.nome || 'questa uscita')}</strong> nei dati OpenStreetMap.</div>`;
      return;
    }
    list.innerHTML = state.parking.map((item, index) => {
      const serv = services(item.tags);
      return `<article class="mp-card"><h3>🚛 ${esc(item.name)}</h3><div class="mp-meta"><span class="mp-chip">📍 ${formatDistance(item.distance)} dall’uscita</span><span class="mp-chip ${item.compat?.ok === true ? 'good' : item.compat?.ok === false ? 'bad' : 'warn'}">${compatibilityText(item)}</span></div><div class="mp-services">${serv.length ? esc(serv.join(' · ')) : 'Servizi non indicati'}${item.limits.height || item.limits.width || item.limits.length || item.limits.weight ? '<br>' + [item.limits.height ? 'H ' + esc(item.limits.height) + ' m' : '', item.limits.width ? 'Larg. ' + esc(item.limits.width) + ' m' : '', item.limits.length ? 'Lung. ' + esc(item.limits.length) + ' m' : '', item.limits.weight ? 'Peso ' + esc(item.limits.weight) : ''].filter(Boolean).join(' · ') : ''}</div><div class="mp-card-actions"><button class="mp-btn dark" type="button" data-nav-index="${index}">🧭 NAVIGA</button><button class="mp-btn" type="button" data-map-index="${index}">📍 MAPPA</button></div></article>`;
    }).join('');
  }

  function showParkingPanel(exit) {
    let panel = document.getElementById('parkingExitPanel');
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.id = 'parkingExitPanel';
    panel.style.cssText = 'position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,520px);max-height:80vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:18px;font-family:system-ui,sans-serif;';
    const cards = state.parking.map((item, index) => `<div style="border:1px solid #e5e5e5;border-radius:14px;padding:12px;margin-top:10px"><div style="display:flex;justify-content:space-between;gap:10px"><strong>${index + 1}. 🚛 ${esc(item.name)}</strong><button type="button" data-parking-index="${index}" style="min-width:112px;height:40px;border:0;border-radius:10px;background:#075c3b;color:#fff;font-weight:800">NAVIGA</button></div><div style="font-size:12px;color:#555;margin-top:7px">📍 ${formatDistance(item.distance)} dall’uscita · ${compatibilityText(item)}</div></div>`).join('');
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;position:sticky;top:0;background:#fff;padding-bottom:10px"><div><strong style="font-size:20px">🚛 Parcheggi</strong><div style="font-size:13px;color:#555">${esc(exit.nome || 'Uscita autostradale')} · ${state.parking.length} trovati</div></div><button id="chiudiParkingPanel" type="button" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px">×</button></div>${cards || '<p>Nessun parcheggio trovato.</p>'}<button id="chiudiParkingPanelBottom" type="button" style="width:100%;margin-top:14px;border:0;border-radius:12px;background:#075c3b;color:#fff;padding:12px;font-weight:800">CHIUDI</button>`;
    document.body.appendChild(panel);
    panel.querySelectorAll('#chiudiParkingPanel,#chiudiParkingPanelBottom').forEach(b => b.addEventListener('click', () => panel.remove()));
    panel.querySelectorAll('[data-parking-index]').forEach(b => b.addEventListener('click', () => {
      const item = state.parking[Number(b.dataset.parkingIndex)];
      if (!item) return;
      panel.remove();
      navigate(item);
    }));
  }

  async function searchParking(exit) {
    if (!exit || state.loading) return;
    state.loading = true;
    state.selectedExit = exit;
    busy($('mpNearestExit'), true, '🛣️ CERCO PARCHEGGI…', '🛣️ CERCA VICINO ALL’USCITA');
    status('Cerco parcheggi vicino a ' + (exit.nome || 'questa uscita') + '…');
    $('mpList').innerHTML = '<div class="mp-loading">⏳ Cerco i parcheggi intorno all’uscita…</div>';
    state.parkingLayer.clearLayers();
    try {
      const data = await overpass(parkingQuery(exit));
      const seen = new Set();
      state.parking = (data.elements || []).map(e => normalize(e, exit)).filter(Boolean).filter(item => {
        if (item.distance > PARKING_RADIUS || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }).sort((a, b) => (b.score - a.score) || (a.distance - b.distance)).slice(0, 80);
      renderParkingOnMap(exit);
      renderList(exit);
      status(state.parking.length + ' parcheggi trovati · ' + (exit.nome || 'uscita'));
    } catch (error) {
      console.error('Ricerca parcheggi:', error);
      state.parking = [];
      status('Errore ricerca parcheggi', true);
      $('mpList').innerHTML = `<div class="mp-empty"><strong>Non riesco a caricare i parcheggi.</strong><br>Il servizio OpenStreetMap non ha risposto. Riprova tra poco.</div>`;
      showMapMessage('Servizio parcheggi momentaneamente non disponibile. Riprova.', true);
    } finally {
      state.loading = false;
      busy($('mpNearestExit'), false, '', '🛣️ CERCA VICINO ALL’USCITA');
    }
  }

  function locate() {
    const button = $('mpLocate');
    busy(button, true, '📍 CERCO LA POSIZIONE…', '📍 USA LA MIA POSIZIONE');
    status('Acquisizione posizione GPS…');
    if (!navigator.geolocation) {
      status('GPS non supportato dal browser', true);
      busy(button, false, '', '📍 USA LA MIA POSIZIONE');
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      state.position = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      let best = null, bestDistance = Infinity;
      state.exits.forEach(exit => {
        const d = distance(state.position, { lat: Number(exit.lat), lon: Number(exit.lon) });
        if (d < bestDistance) { bestDistance = d; best = exit; }
      });
      if (!best) {
        status('Non trovo un’uscita vicina', true);
        return;
      }
      state.map.flyTo([Number(best.lat), Number(best.lon)], 13, { duration: 0.8 });
      searchParking(best);
    }, error => {
      const msg = error.code === 1 ? 'Posizione negata: abilita la localizzazione per questo sito.' : error.code === 3 ? 'Il GPS sta impiegando troppo tempo. Riprova.' : 'Posizione non disponibile.';
      status(msg, true);
    }, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
    setTimeout(() => busy(button, false, '', '📍 USA LA MIA POSIZIONE'), 31000);
  }

  function navigate(item) {
    const destination = { nome: item.name, lat: item.lat, lon: item.lon };
    if (typeof window.apriNavigazione === 'function') window.apriNavigazione(destination);
    else window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}&travelmode=driving`, '_blank');
  }

  function loadProfile() {
    const v = typeof window.getProfiloMezzoPesante === 'function' ? window.getProfiloMezzoPesante() : { tipo: 'Autoarticolato', lunghezza: 16.5, larghezza: 2.55, altezza: 4, peso: 40, rimorchio: true };
    if ($('mpTipo')) $('mpTipo').value = v.tipo || 'Autoarticolato';
    if ($('mpL')) $('mpL').value = v.lunghezza ?? 16.5;
    if ($('mpW')) $('mpW').value = v.larghezza ?? 2.55;
    if ($('mpH')) $('mpH').value = v.altezza ?? 4;
    if ($('mpP')) $('mpP').value = v.peso ?? 40;
    if ($('mpR')) $('mpR').checked = !!v.rimorchio;
  }

  function saveProfile() {
    const profile = {
      tipo: $('mpTipo')?.value || 'Autoarticolato',
      lunghezza: Number(String($('mpL')?.value || '').replace(',', '.')),
      larghezza: Number(String($('mpW')?.value || '').replace(',', '.')),
      altezza: Number(String($('mpH')?.value || '').replace(',', '.')),
      peso: Number(String($('mpP')?.value || '').replace(',', '.')),
      rimorchio: !!$('mpR')?.checked
    };
    const saved = $('mpSaved');
    const valid = profile.lunghezza > 0 && profile.larghezza > 0 && profile.altezza > 0 && profile.peso > 0;
    if (!valid) {
      saved.textContent = '⚠️ Inserisci tutte le dimensioni del mezzo.';
      saved.style.color = '#a52b23';
      return;
    }
    try {
      if (typeof window.salvaProfiloMezzoPesante === 'function') window.salvaProfiloMezzoPesante(profile);
      else localStorage.setItem('1km_mezzo_pesante_v2', JSON.stringify(profile));
      localStorage.setItem('1km-esimangia-mezzo', JSON.stringify({ lunghezzaM: profile.lunghezza, larghezzaM: profile.larghezza, altezzaM: profile.altezza, pesoKg: profile.peso * 1000 }));
      saved.textContent = '✓ MEZZO SALVATO — dimensioni memorizzate su questo dispositivo.';
      saved.style.color = '#176534';
    } catch (error) {
      console.error(error);
      saved.textContent = '❌ Non riesco a salvare i dati su questo dispositivo.';
      saved.style.color = '#a52b23';
    }
  }

  document.addEventListener('click', event => {
    const exitButton = event.target.closest && event.target.closest('[data-parcheggi-uscita]');
    if (exitButton) {
      event.preventDefault();
      const id = String(exitButton.getAttribute('data-parcheggi-uscita'));
      const exit = state.exits.find(e => String(e.id) === id);
      if (exit) {
        if (state.map) state.map.flyTo([Number(exit.lat), Number(exit.lon)], 14, { duration: 0.6 });
        searchParking(exit);
      }
      return;
    }

    const navButton = event.target.closest && event.target.closest('[data-naviga-parcheggio]');
    if (navButton) {
      const id = String(navButton.getAttribute('data-naviga-parcheggio'));
      const item = state.parking.find(p => p.id === id);
      if (item) navigate(item);
    }
  }, true);

  document.addEventListener('DOMContentLoaded', async () => {
    const ready = initMap();
    if (!ready) return;
    loadProfile();
    $('mpLocate')?.addEventListener('click', locate);
    $('mpNearestExit')?.addEventListener('click', async () => {
      if (state.selectedExit) return searchParking(state.selectedExit);
      // Su desktop/StackBlitz il Chromebook può non avere GPS: non blocchiamo
      // la funzione. Portiamo l'utente alla mappa e gli chiediamo di scegliere
      // un casello, che è il vero punto di partenza della ricerca.
      const mapEl = $('mpMap');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        status('Seleziona un’uscita sulla mappa per cercare i parcheggi vicini');
      }
    });
    $('mpRefresh')?.addEventListener('click', () => state.selectedExit ? searchParking(state.selectedExit) : loadExits());
    $('mpSave')?.addEventListener('click', saveProfile);
    await loadExits();
  });
})();
