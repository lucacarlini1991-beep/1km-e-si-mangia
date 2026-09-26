/* 1 KM E SI MANGIA - RIENTRO IN AUTOSTRADA
 *
 * Modulo volutamente leggero:
 * - il pulsante identifica il casello associato al ristorante;
 * - apre un piccolo riepilogo, senza finestre tecniche;
 * - la scelta Google Maps / Waze / Apple Maps resta affidata
 *   al modulo navigazione.js già presente nel sito.
 */
(function () {
  'use strict';

  const BUTTON_ATTR = 'data-rientro-autostrada';

  function coordinateValide(obj) {
    const lat = Number(obj?.lat);
    const lon = Number(obj?.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  }

  function getUscita(ristorante) {
    const associata = ristorante?.uscita || ristorante?.uscita_autostrada;
    const coordAssociate = coordinateValide(associata);
    if (associata && coordAssociate) return { ...associata, ...coordAssociate };

    const corrente = window._uscitaCorrente;
    const stessoId =
      associata?.id != null &&
      corrente?.id != null &&
      String(associata.id) === String(corrente.id);

    if (corrente && (!associata || stessoId)) {
      const coord = coordinateValide(corrente);
      if (coord) return { ...corrente, ...coord };
    }

    if (associata && corrente) {
      const coord = coordinateValide(corrente);
      if (coord) return { ...corrente, ...associata, ...coord };
    }

    return null;
  }

  function getIngresso(ristorante, uscita) {
    const sorgenti = [
      ristorante?.ingresso_autostrada,
      ristorante?.casello_ingresso,
      ristorante?.ingresso,
      ristorante?.rientro,
      uscita?.ingresso_autostrada,
      uscita?.casello_ingresso,
      uscita?.ingresso,
      uscita?.rientro
    ];

    for (const punto of sorgenti) {
      const coord = coordinateValide(punto);
      if (coord) return { ...punto, ...coord };
    }

    const coppie = [
      ['ingresso_lat', 'ingresso_lon'],
      ['entrata_lat', 'entrata_lon'],
      ['casello_ingresso_lat', 'casello_ingresso_lon'],
      ['rientro_lat', 'rientro_lon']
    ];

    for (const fonte of [ristorante, uscita]) {
      for (const [latKey, lonKey] of coppie) {
        const lat = Number(fonte?.[latKey]);
        const lon = Number(fonte?.[lonKey]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
      }
    }

    return null;
  }

  function nomeCasello(uscita) {
    const nome = String(uscita?.nome || '').trim();
    const autostrada = String(uscita?.autostrada || '').trim();

    if (nome && autostrada) return nome + ' • ' + autostrada;
    if (nome) return nome;
    if (autostrada) return autostrada;
    return 'Casello autostradale';
  }

  function queryIngresso(uscita) {
    const parti = ['Ingresso autostradale'];
    if (uscita?.nome) parti.push(uscita.nome);
    if (uscita?.autostrada) parti.push(uscita.autostrada);
    return parti.join(' ');
  }

  function distanzaKm(a, b) {
    if (!a || !b) return null;

    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function creaDestinazione(ristorante) {
    const uscita = getUscita(ristorante);
    if (!uscita) return null;

    const ingresso = getIngresso(ristorante, uscita);
    const punto = ingresso || coordinateValide(uscita);

    if (!punto) return null;

    const destinazione = {
      ...punto,
      nome: 'Ingresso autostradale - ' + nomeCasello(uscita),
      rientro_autostrada: true,
      destinazione_tipo: 'ingresso_autostrada',
      uscita
    };

    // Se il DB non contiene ancora il punto preciso dell'ingresso,
    // usiamo una ricerca testuale del casello invece di presentare
    // il punto dell'uscita come se fosse l'ingresso.
    if (!ingresso) {
      destinazione.navigazioneQuery = queryIngresso(uscita);
      destinazione.coordinateApprossimative = true;
    }

    return destinazione;
  }

  function chiudiPannello() {
    const el = document.getElementById('rientro-overlay-1km');
    if (el) el.remove();
    document.body.style.overflow = '';
  }

  function apriNavigatore(destinazione) {
    chiudiPannello();

    if (typeof window.apriNavigazione === 'function') {
      window.apriNavigazione(destinazione);
      return;
    }

    const target =
      destinazione.navigazioneQuery ||
      destinazione.lat + ',' + destinazione.lon;

    const url =
      'https://www.google.com/maps/dir/?api=1' +
      '&destination=' + encodeURIComponent(target) +
      '&travelmode=driving';

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function mostraPannello(ristorante) {
    const destinazione = creaDestinazione(ristorante);

    if (!destinazione) {
      alert('Casello di rientro non disponibile.');
      return;
    }

    chiudiPannello();

    const overlay = document.createElement('div');
    overlay.id = 'rientro-overlay-1km';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:1000000',
      'display:flex',
      'align-items:flex-end',
      'justify-content:center',
      'padding:12px',
      'background:rgba(0,0,0,.45)',
      'box-sizing:border-box'
    ].join(';');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) chiudiPannello();
    });

    const box = document.createElement('div');
    box.style.cssText = [
      'width:min(480px,100%)',
      'background:#fff',
      'border-radius:22px 22px 18px 18px',
      'box-shadow:0 -8px 35px rgba(0,0,0,.22)',
      'padding:18px',
      'box-sizing:border-box',
      'font-family:Arial,Helvetica,sans-serif'
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:14px';

    const icon = document.createElement('div');
    icon.textContent = '↩';
    icon.style.cssText = [
      'width:46px',
      'height:46px',
      'border-radius:14px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:#075c3b',
      'color:#fff',
      'font-size:25px',
      'font-weight:800',
      'flex:0 0 46px'
    ].join(';');

    const testi = document.createElement('div');
    const titolo = document.createElement('div');
    titolo.textContent = 'Rientra in autostrada';
    titolo.style.cssText = 'font-size:19px;font-weight:800;color:#075c3b';

    const sottotitolo = document.createElement('div');
    sottotitolo.textContent = nomeCasello(destinazione.uscita);
    sottotitolo.style.cssText = 'font-size:14px;color:#666;margin-top:3px';

    testi.appendChild(titolo);
    testi.appendChild(sottotitolo);
    header.appendChild(icon);
    header.appendChild(testi);

    const info = document.createElement('div');
    info.style.cssText = [
      'background:#f5f7f6',
      'border-radius:14px',
      'padding:12px 14px',
      'margin-bottom:12px',
      'font-size:14px',
      'line-height:1.4',
      'color:#333'
    ].join(';');

    const distanza = distanzaKm(
      coordinateValide(ristorante),
      { lat: destinazione.lat, lon: destinazione.lon }
    );

    if (destinazione.coordinateApprossimative) {
      info.innerHTML =
        '<strong>Casello di rientro</strong><br>' +
        'Il punto preciso dell’ingresso non è presente nel database: ' +
        'il navigatore cercherà direttamente l’ingresso del casello.';
    } else {
      info.innerHTML =
        '<strong>Casello di rientro</strong><br>' +
        (distanza != null
          ? 'Circa ' + distanza.toFixed(1) + ' km dal ristorante.'
          : 'Destinazione disponibile.');
    }

    const vai = document.createElement('button');
    vai.type = 'button';
    vai.textContent = '🧭  SCEGLI NAVIGATORE';
    vai.style.cssText = [
      'width:100%',
      'height:48px',
      'border:0',
      'border-radius:13px',
      'background:#075c3b',
      'color:#fff',
      'font-size:15px',
      'font-weight:800',
      'cursor:pointer'
    ].join(';');
    vai.addEventListener('click', function () {
      apriNavigatore(destinazione);
    });

    const annulla = document.createElement('button');
    annulla.type = 'button';
    annulla.textContent = 'Annulla';
    annulla.style.cssText = [
      'width:100%',
      'margin-top:8px',
      'height:42px',
      'border:0',
      'border-radius:12px',
      'background:#eee',
      'color:#333',
      'font-size:14px',
      'font-weight:700',
      'cursor:pointer'
    ].join(';');
    annulla.addEventListener('click', chiudiPannello);

    box.appendChild(header);
    box.appendChild(info);
    box.appendChild(vai);
    box.appendChild(annulla);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  function creaPulsante(ristorante, indice) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute(BUTTON_ATTR, '');
    b.dataset.ristoranteIndex = String(indice);

    const inglese = window.I18N?.getLang?.() === 'en';
    b.textContent = inglese ? '↩ RETURN TO MOTORWAY' : '↩ RIENTRA IN AUTOSTRADA';

    b.style.cssText = [
      'box-sizing:border-box',
      'width:100%',
      'min-height:44px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'gap:7px',
      'border:1px solid #075c3b',
      'border-radius:11px',
      'background:#fff',
      'color:#075c3b',
      'padding:9px 12px',
      'font-weight:800',
      'font-size:13px',
      'cursor:pointer',
      'white-space:nowrap'
    ].join(';');

    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      mostraPannello(ristorante);
    });

    return b;
  }

  function trovaCard(indice) {
    const selettori = [
      '[data-ristorante-index="' + indice + '"]',
      '[data-restaurant-index="' + indice + '"]'
    ];

    for (const selettore of selettori) {
      const el = document.querySelector(selettore);
      if (el) {
        return (
          el.closest('div[style*="border:1px solid"]') ||
          el.closest('article') ||
          el.parentElement?.parentElement
        );
      }
    }

    return null;
  }

  function listaRistoranti() {
    if (Array.isArray(window._ristorantiCorrenti)) return window._ristorantiCorrenti;
    if (Array.isArray(window.ristorantiCorrenti)) return window.ristorantiCorrenti;
    return [];
  }

  function inject() {
    const lista = listaRistoranti();
    if (!lista.length) return;

    lista.forEach((ristorante, indice) => {
      if (!getUscita(ristorante)) return;

      const card = trovaCard(indice);
      if (!card || card.querySelector('[' + BUTTON_ATTR + ']')) return;

      const contenitore =
        card.querySelector('[data-ristorante-actions]') ||
        card.querySelector('div:last-child') ||
        card;

      contenitore.appendChild(creaPulsante(ristorante, indice));
    });
  }

  window.apriRientroAutostrada = mostraPannello;
  window.rientraInAutostrada = mostraPannello;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }

  const observer = new MutationObserver(inject);
  observer.observe(document.body, { childList: true, subtree: true });
})();
