/* 1 KM E SI MANGIA - RIENTRO IN AUTOSTRADA */
(function(){
  'use strict';

  const BUTTON_ATTR = 'data-rientro-autostrada';

  function getUscita(ristorante){
    const u = window._uscitaCorrente || ristorante?.uscita || ristorante?.uscita_autostrada;
    if (!u) return null;
    const lat = Number(u.lat);
    const lon = Number(u.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { ...u, lat, lon };
  }

  function apri(ristorante){
    const u = getUscita(ristorante);
    if (!u) {
      alert('Coordinate del casello non disponibili.');
      return;
    }

    const destinazione = {
      nome: 'Rientro in autostrada - ' + (u.nome || 'uscita'),
      lat: u.lat,
      lon: u.lon,
      rientro_autostrada: true,
      uscita: u
    };

    // Usa il navigatore interno del progetto se disponibile.
    if (typeof window.apriNavigazione === 'function') {
      window.apriNavigazione(destinazione);
      return;
    }

    // Fallback: apre direttamente Google Maps con le coordinate del casello.
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(u.lat + ',' + u.lon)}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function creaPulsante(ristorante, indice){
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute(BUTTON_ATTR, '');
    b.dataset.ristoranteIndex = String(indice);
    b.textContent = '🔄 RIENTRA IN AUTOSTRADA';
    b.style.cssText = [
      'box-sizing:border-box',
      'min-width:180px',
      'height:42px',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'gap:6px',
      'border:1px solid #075c3b',
      'border-radius:10px',
      'background:#fff',
      'color:#075c3b',
      'padding:8px 12px',
      'font-weight:700',
      'cursor:pointer',
      'white-space:nowrap'
    ].join(';');
    b.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      apri(ristorante);
    });
    return b;
  }

  function trovaCard(indice){
    const selettori = [
      `[data-ristorante-index="${indice}"]`,
      `[data-restaurant-index="${indice}"]`
    ];
    for (const selettore of selettori) {
      const el = document.querySelector(selettore);
      if (el) return el.closest('div[style*="border:1px solid"]') || el.closest('article') || el.parentElement?.parentElement;
    }
    return null;
  }

  function listaRistoranti(){
    if (Array.isArray(window._ristorantiCorrenti)) return window._ristorantiCorrenti;
    if (Array.isArray(window.ristorantiCorrenti)) return window.ristorantiCorrenti;
    return [];
  }

  function inject(){
    const lista = listaRistoranti();
    if (!lista.length) return;

    lista.forEach((ristorante, indice) => {
      const u = getUscita(ristorante);
      if (!u) return;
      const card = trovaCard(indice);
      if (!card || card.querySelector(`[${BUTTON_ATTR}]`)) return;

      const contenitore = card.querySelector('[data-ristorante-actions]') || card.querySelector('div:last-child') || card;
      contenitore.appendChild(creaPulsante(ristorante, indice));
    });
  }

  window.apriRientroAutostrada = apri;
  window.rientraInAutostrada = apri;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once:true });
  } else {
    inject();
  }

  const observer = new MutationObserver(() => inject());
  observer.observe(document.body, { childList:true, subtree:true });
})();
