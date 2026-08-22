/* 1 KM E SI MANGIA — gps-camion.js
   GPS indipendente per Parcheggi Mezzi Pesanti.
   NON modifica e NON usa GPSManager/gps.js.
*/
(function () {
  'use strict';

  const STORAGE_KEY = '1km-posizione-camion';
  const options = {
    enableHighAccuracy: true,
    timeout: 60000,
    maximumAge: 0,
    maxAccuracy: 1000,
    zoom: 13
  };

  let map = null;
  let marker = null;
  let accuracyCircle = null;
  let watchId = null;
  let running = false;

  function normalize(position) {
    if (!position || !position.coords) return null;
    const lat = Number(position.coords.latitude);
    const lon = Number(position.coords.longitude);
    const accuracy = Number(position.coords.accuracy);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(accuracy)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    if (accuracy <= 0 || accuracy > options.maxAccuracy) return null;
    return { lat, lon, accuracy, timestamp: Date.now() };
  }

  function save(position) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch (_) {}
  }

  function read() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || !Number.isFinite(Number(value.lat)) || !Number.isFinite(Number(value.lon))) return null;
      return value;
    } catch (_) {
      return null;
    }
  }

  function icon() {
    if (!window.L) return null;
    return L.divIcon({
      className: 'gps-camion-location-icon',
      html: '<div style="width:42px;height:42px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#f6a916;border:4px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:21px">🚛</span></div>',
      iconSize: [42, 42],
      iconAnchor: [21, 42],
      popupAnchor: [0, -38]
    });
  }

  function draw(position, center) {
    if (!map || !window.L) return false;
    const latLng = [position.lat, position.lon];
    if (!marker) {
      marker = L.marker(latLng, { icon: icon(), zIndexOffset: 12000 }).addTo(map);
    } else {
      marker.setLatLng(latLng);
    }
    if (!accuracyCircle) {
      accuracyCircle = L.circle(latLng, {
        radius: position.accuracy,
        color: '#f6a916',
        weight: 2,
        fillColor: '#f6a916',
        fillOpacity: 0.10,
        interactive: false
      }).addTo(map);
    } else {
      accuracyCircle.setLatLng(latLng);
      accuracyCircle.setRadius(position.accuracy);
    }
    marker.bindPopup('<strong>🚛 POSIZIONE DEL MEZZO</strong><br>Precisione circa ' + Math.round(position.accuracy) + ' m');
    if (center) {
      map.setView(latLng, Math.max(12, Math.min(16, Number(options.zoom) || 13)), { animate: true });
    }
    return true;
  }

  function attachMap(leafletMap) {
    map = leafletMap || null;
    const saved = read();
    if (map && saved) draw(saved, false);
    return api;
  }

  function handle(position, callbacks, center) {
    const normalized = normalize(position);
    if (!normalized) {
      callbacks?.onError?.(new Error('La posizione GPS del mezzo non è valida.'));
      return false;
    }
    save(normalized);
    draw(normalized, center);
    callbacks?.onSuccess?.(normalized);
    return true;
  }

  function stop() {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
    running = false;
    return api;
  }

  function start(callbacks) {
    callbacks = callbacks || {};
    if (!window.isSecureContext) {
      const error = new Error('La geolocalizzazione richiede HTTPS.');
      error.code = 'INSECURE_CONTEXT';
      callbacks.onError?.(error);
      return false;
    }
    if (!navigator.geolocation) {
      const error = new Error('La geolocalizzazione non è disponibile su questo dispositivo.');
      error.code = 'NOT_SUPPORTED';
      callbacks.onError?.(error);
      return false;
    }

    stop();
    running = true;
    callbacks.onStart?.();

    navigator.geolocation.getCurrentPosition(
      function (position) {
        if (!handle(position, callbacks, true)) {
          running = false;
          return;
        }
        watchId = navigator.geolocation.watchPosition(
          function (next) { handle(next, callbacks, false); },
          function (error) { callbacks.onError?.(error); },
          {
            enableHighAccuracy: options.enableHighAccuracy,
            timeout: options.timeout,
            maximumAge: options.maximumAge
          }
        );
      },
      function (error) {
        running = false;
        callbacks.onError?.(error);
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge
      }
    );

    return true;
  }

  function getLastPosition() {
    return read();
  }

  function isRunning() {
    return running;
  }

  const api = { attachMap, start, stop, getLastPosition, isRunning, updateMap: draw };
  window.GPSCamionManager = api;
  console.log('GPS camion caricato.');
})();
