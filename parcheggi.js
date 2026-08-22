/* 1 KM E SI MANGIA — PARCHEGGI MEZZI PESANTI */
(function () {
  'use strict';

  const OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];
  const SEARCH_RADIUS = 20000;
  const EXIT_RADIUS = 12000;
  const GPS_TIMEOUT = 60000;
  const state = { pos: null, exits: [], results: [], map: null, markers: null, searchCenter: null, searchMode: 'near' };
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  function dist(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const la = a.lat * rad, lb = b.lat * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function fmt(m) {
    if (!Number.isFinite(m)) return '—';
    return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  }

  function coord(e) {
    if (typeof e.lat === 'number' && typeof e.lon === 'number') return { lat: e.lat, lon: e.lon };
    if (e.center && typeof e.center.lat === 'number' && typeof e.center.lon === 'number') return { lat: e.center.lat, lon: e.center.lon };
    return null;
  }

  function setStatus(text, error) {
    const el = $('mpStatus');
    if (!el) return;
    el.textContent = text;
    el.style.color = error ? '#a52b23' : '';
  }

  function setButtonBusy(button, busy, busyText, normalText) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
  }

  function queryFor(pos, radius) {
    const lat = pos.lat, lon = pos.lon;
    return `[out:json][timeout:45];(
      nwr["amenity"="parking"]["hgv"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["access:hgv"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["goods"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["capacity:hgv"](around:${radius},${lat},${lon});
      nwr["amenity"="parking"]["motorcar"](around:${radius},${lat},${lon});
      nwr["highway"="services"](around:${radius},${lat},${lon});
    );out center tags;`;
  }

  async function overpass(q) {
    let last = null;
    for (const url of OVERPASS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 50000);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(q),
          signal: controller.signal
        });
        clearTimeout(timer);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
      } catch (e) {
        last = e;
      }
    }
    throw last || new Error('Servizio mappe non disponibile');
  }

  async function loadExits() {
    try {
      const response = await fetch('uscite.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      state.exits = Array.isArray(data)
        ? data.filter(x => Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lon)))
        : [];
      return state.exits.length > 0;
    } catch (e) {
      console.error('Uscite:', e);
      state.exits = [];
      return false;
    }
  }

  function nearestExit(p) {
    let best = null, bestD = Infinity;
    for (const e of state.exits) {
      const d = dist(p, { lat: Number(e.lat), lon: Number(e.lon) });
      if (d < bestD) { bestD = d; best = e; }
    }
    return best ? { data: best, distance: bestD } : null;
  }

  function tagBool(v) {
    return ['yes', 'designated', 'permissive', 'true', '1'].includes(String(v || '').toLowerCase());
  }

  function parkingName(tags) {
    return tags.name || tags.operator || (tags.highway === 'services' ? 'Area di servizio' : 'Parcheggio mezzi pesanti');
  }

  function services(tags) {
    const out = [];
    if (tagBool(tags.toilets)) out.push('WC');
    if (tagBool(tags.shower)) out.push('Doccia');
    if (tagBool(tags.lit)) out.push('Illuminato');
    if (tagBool(tags.surveillance)) out.push('Videosorveglianza');
    if (tags.fee === 'yes') out.push('A pagamento');
    if (tags.capacity_hgv || tags['capacity:hgv']) out.push('Posti TIR: ' + (tags.capacity_hgv || tags['capacity:hgv']));
    return out;
  }

  function limits(tags) {
    return {
      maxheight: tags.maxheight || tags['maxheight:physical'] || null,
      maxwidth: tags.maxwidth || null,
      maxlength: tags.maxlength || null,
      maxweight: tags.maxweight || null
    };
  }

  function truckScore(tags) {
    let score = 0;
    if (tags.highway === 'services') score += 5;
    if (tagBool(tags.hgv)) score += 5;
    if (tagBool(tags['access:hgv'])) score += 4;
    if (tagBool(tags.goods)) score += 4;
    if (tags['capacity:hgv']) score += 4;
    if (tags.capacity_hgv) score += 4;
    if (tags['hgv:lanes']) score += 2;
    if (tags.motorway) score += 1;
    if (tags.truck) score += 3;
    if (tags['parking:lane:hgv']) score += 3;
    if (tags['access:hgv'] === 'no' || tags.hgv === 'no') score -= 20;
    return score;
  }

  function normalize(e, referencePos) {
    const tags = e.tags || {}, p = coord(e);
    if (!p) return null;
    const score = truckScore(tags);
    if (score <= 0) return null;
    const exit = nearestExit(p);
    const lim = limits(tags);
    const compat = window.verificaCompatibilitaParcheggio
      ? window.verificaCompatibilitaParcheggio(lim)
      : null;
    return {
      id: e.type + '-' + e.id,
      lat: p.lat,
      lon: p.lon,
      tags,
      name: parkingName(tags),
      distance: referencePos ? dist(referencePos, p) : Infinity,
      exit,
      limits: lim,
      compat,
      services: services(tags),
      truckScore: score
    };
  }

  function renderMap() {
    if (!state.map || !window.L) return;
    state.map.invalidateSize();
    if (state.markers) state.markers.clearLayers();
    else state.markers = L.layerGroup().addTo(state.map);
    const pts = [];
    if (state.searchCenter) {
      const m = L.marker([state.searchCenter.lat, state.searchCenter.lon]);
      m.bindPopup(state.searchMode === 'exit' ? '<b>Uscita autostradale</b>' : '<b>La tua posizione</b>');
      state.markers.addLayer(m);
      pts.push([state.searchCenter.lat, state.searchCenter.lon]);
    }
    for (const r of state.results) {
      const color = r.compat && r.compat.ok === true ? '#176534' : r.compat && r.compat.ok === false ? '#9a2929' : '#8a5a00';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"><div style="transform:rotate(45deg);color:#fff;text-align:center;font-weight:800;font-size:14px;line-height:23px">🚛</div></div>`,
        iconSize: [34, 34], iconAnchor: [17, 30]
      });
      const m = L.marker([r.lat, r.lon], { icon });
      m.bindPopup(`<b>${esc(r.name)}</b><br>${fmt(r.distance)}${r.exit ? `<br>Uscita ${esc(r.exit.data.nome || '')} · ${fmt(r.exit.distance)}` : ''}`);
      state.markers.addLayer(m);
      pts.push([r.lat, r.lon]);
    }
    if (pts.length === 1) state.map.setView(pts[0], 12);
    else if (pts.length > 1) state.map.fitBounds(pts, { padding: [30, 30] });
  }

  function card(r, i) {
    const c = r.compat;
    const chip = c && c.ok === true
      ? '<span class="mp-chip good">🟢 Compatibile</span>'
      : c && c.ok === false
        ? '<span class="mp-chip bad">🔴 Non compatibile</span>'
        : '<span class="mp-chip warn">🟡 Da verificare</span>';
    const lim = [];
    if (r.limits.maxheight) lim.push('H max ' + esc(r.limits.maxheight) + ' m');
    if (r.limits.maxwidth) lim.push('Larg. max ' + esc(r.limits.maxwidth) + ' m');
    if (r.limits.maxlength) lim.push('Lung. max ' + esc(r.limits.maxlength) + ' m');
    if (r.limits.maxweight) lim.push('Peso max ' + esc(r.limits.maxweight));
    const serv = r.services.length ? r.services.join(' · ') : 'Servizi non indicati';
    return `<article class="mp-card"><h3>${esc(r.name)}</h3><div class="mp-meta"><span class="mp-chip">📍 ${fmt(r.distance)}</span>${r.exit ? `<span class="mp-chip">🛣️ ${fmt(r.exit.distance)} dall'uscita ${esc(r.exit.data.nome || '')}</span>` : ''}${chip}</div><div class="mp-services">${esc(serv)}${lim.length ? '<br><strong>Limiti dichiarati:</strong> ' + lim.join(' · ') : '<br><span>Limiti dimensionali non pubblicati.</span>'}</div><div class="mp-card-actions"><button class="mp-btn dark" type="button" data-nav-index="${i}">🧭 NAVIGA</button><button class="mp-btn" type="button" data-map-index="${i}">📍 MAPPA</button></div></article>`;
  }

  function renderList() {
    const list = $('mpList');
    if (!list) return;
    if (!state.results.length) {
      list.innerHTML = '<div class="mp-empty">Nessun parcheggio adatto a mezzi pesanti trovato nell’area cercata. Prova con un’altra posizione o con l’uscita autostradale più vicina.</div>';
      return;
    }
    list.innerHTML = state.results.map(card).join('');
    list.querySelectorAll('[data-nav-index]').forEach(b => b.onclick = () => {
      const r = state.results[Number(b.dataset.navIndex)];
      if (window.apriNavigazione) window.apriNavigazione({ nome: r.name, lat: r.lat, lon: r.lon });
      else window.open(`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}&travelmode=driving`, '_blank');
    });
    list.querySelectorAll('[data-map-index]').forEach(b => b.onclick = () => {
      const r = state.results[Number(b.dataset.mapIndex)];
      if (!state.map) return;
      state.map.setView([r.lat, r.lon], 16);
      if (state.markers) state.markers.eachLayer(m => {
        if (m.getLatLng && Math.abs(m.getLatLng().lat - r.lat) < 1e-7 && Math.abs(m.getLatLng().lng - r.lon) < 1e-7) m.openPopup();
      });
    });
  }

  async function search(center, mode, referencePos) {
    state.searchCenter = center;
    state.searchMode = mode;
    state.pos = referencePos || state.pos || center;
    setStatus(mode === 'exit' ? 'Cerco parcheggi vicino all’uscita…' : 'Cerco parcheggi…');
    $('mpList').innerHTML = '<div class="mp-loading">⏳ Ricerca dei parcheggi per mezzi pesanti in corso…</div>';
    try {
      const data = await overpass(queryFor(center, mode === 'exit' ? EXIT_RADIUS : SEARCH_RADIUS));
      const arr = (data.elements || [])
        .map(e => normalize(e, mode === 'exit' ? center : state.pos))
        .filter(Boolean);
      const seen = new Set();
      state.results = arr
        .filter(x => { if (seen.has(x.id)) return false; seen.add(x.id); return true; })
        .sort((a, b) => (b.truckScore - a.truckScore) || (a.distance - b.distance))
        .slice(0, 60);
      setStatus(state.results.length + ' risultati');
      renderList();
      renderMap();
    } catch (e) {
      console.error('Parcheggi:', e);
      setStatus('Errore ricerca', true);
      $('mpList').innerHTML = '<div class="mp-empty">Non riesco a contattare il servizio dati dei parcheggi in questo momento. Riprova tra poco.</div>';
    }
  }

  function initMap() {
    if (!window.L || !$('mpMap')) return;
    state.map = L.map('mpMap', { zoomControl: true }).setView([41.9, 12.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(state.map);
    setTimeout(() => state.map.invalidateSize(), 150);
  }

  function positionError(error) {
    if (!error) return 'Posizione non disponibile.';
    if (error.code === 1) return 'Posizione negata. Su iPhone abilita la Localizzazione per questo sito e la Posizione precisa.';
    if (error.code === 2) return 'Posizione non disponibile. Controlla GPS/Localizzazione e riprova.';
    if (error.code === 3) return 'Il GPS sta impiegando troppo tempo. Tieni la pagina aperta e riprova.';
    return 'Impossibile ottenere la posizione.';
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!window.isSecureContext) return reject(new Error('La geolocalizzazione richiede HTTPS.'));
      if (!navigator.geolocation) return reject(new Error('Geolocalizzazione non supportata dal browser.'));
      setStatus('Acquisizione posizione GPS…');
      navigator.geolocation.getCurrentPosition(
        p => {
          const accuracy = Number(p.coords.accuracy);
          if (!Number.isFinite(accuracy) || accuracy <= 0) return reject(new Error('Posizione GPS non valida.'));
          resolve({ lat: Number(p.coords.latitude), lon: Number(p.coords.longitude), accuracy });
        },
        e => reject(new Error(positionError(e))),
        { enableHighAccuracy: true, timeout: GPS_TIMEOUT, maximumAge: 0 }
      );
    });
  }

  async function locate() {
    const button = $('mpLocate');
    setButtonBusy(button, true, '📍 RICERCA POSIZIONE…', '📍 USA LA MIA POSIZIONE');
    try {
      const pos = await getPosition();
      state.pos = pos;
      setStatus(`Posizione trovata · precisione circa ${Math.round(pos.accuracy)} m`);
      await search(pos, 'near', pos);
    } catch (e) {
      console.error('GPS parcheggi:', e);
      setStatus(e.message || 'Posizione non disponibile', true);
      $('mpList').innerHTML = `<div class="mp-empty">${esc(e.message || 'Non riesco a ottenere la tua posizione.')}<br><br>Controlla la Localizzazione del browser e riprova.</div>`;
    } finally {
      setButtonBusy(button, false, '', '📍 USA LA MIA POSIZIONE');
    }
  }

  async function nearestExitSearch() {
    const button = $('mpNearestExit');
    setButtonBusy(button, true, '🛣️ CERCO L’USCITA…', '🛣️ CERCA VICINO ALL’USCITA');
    try {
      if (!state.exits.length) {
        const ok = await loadExits();
        if (!ok) throw new Error('Non riesco a caricare l’elenco delle uscite autostradali.');
      }
      const pos = state.pos || await getPosition();
      state.pos = pos;
      const nearest = nearestExit(pos);
      if (!nearest) throw new Error('Non trovo un’uscita autostradale vicina.');
      const e = nearest.data;
      const exitPos = { lat: Number(e.lat), lon: Number(e.lon) };
      setStatus(`Uscita più vicina: ${e.nome || 'uscita'} · ${fmt(nearest.distance)}`);
      await search(exitPos, 'exit', pos);
    } catch (e) {
      console.error('Ricerca uscita:', e);
      setStatus(e.message || 'Impossibile cercare vicino all’uscita', true);
      $('mpList').innerHTML = `<div class="mp-empty">${esc(e.message || 'Impossibile cercare vicino all’uscita.')}<br><br>Riprova.</div>`;
    } finally {
      setButtonBusy(button, false, '', '🛣️ CERCA VICINO ALL’USCITA');
    }
  }

  function loadProfile() {
    const v = window.getProfiloMezzoPesante ? window.getProfiloMezzoPesante() : { tipo: 'Autoarticolato', lunghezza: 16.5, larghezza: 2.55, altezza: 4, peso: 40, rimorchio: true };
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
    const valid = profile.lunghezza > 0 && profile.lunghezza <= 30 && profile.larghezza > 0 && profile.larghezza <= 5 && profile.altezza > 0 && profile.altezza <= 6 && profile.peso > 0 && profile.peso <= 100;
    if (!valid) {
      if (saved) { saved.textContent = '⚠️ Controlla lunghezza, larghezza, altezza e peso.'; saved.style.color = '#a52b23'; saved.style.display = 'block'; }
      return;
    }
    try {
      if (window.salvaProfiloMezzoPesante) window.salvaProfiloMezzoPesante(profile);
      else localStorage.setItem('1km_mezzo_pesante_v2', JSON.stringify(profile));
      localStorage.setItem('1km-esimangia-mezzo', JSON.stringify({ lunghezzaM: profile.lunghezza, larghezzaM: profile.larghezza, altezzaM: profile.altezza, pesoKg: profile.peso * 1000 }));
      if (saved) { saved.textContent = '✓ MEZZO SALVATO — dimensioni memorizzate su questo dispositivo.'; saved.style.color = '#176534'; saved.style.display = 'block'; }
      if (state.results.length && window.verificaCompatibilitaParcheggio) {
        state.results = state.results.map(r => Object.assign(r, { compat: window.verificaCompatibilitaParcheggio(r.limits) }));
        renderList(); renderMap();
      }
    } catch (e) {
      console.error('Salvataggio mezzo:', e);
      if (saved) { saved.textContent = '❌ Non riesco a salvare i dati su questo dispositivo.'; saved.style.color = '#a52b23'; saved.style.display = 'block'; }
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    loadProfile();
    $('mpLocate')?.addEventListener('click', locate);
    $('mpNearestExit')?.addEventListener('click', nearestExitSearch);
    $('mpRefresh')?.addEventListener('click', () => state.pos ? search(state.searchCenter || state.pos, state.searchMode, state.pos) : locate());
    $('mpSave')?.addEventListener('click', saveProfile);
    await loadExits();
  });
})();
