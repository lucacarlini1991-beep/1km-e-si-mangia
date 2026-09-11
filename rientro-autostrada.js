/* 1 KM E SI MANGIA - RIENTRO IN AUTOSTRADA */
(function(){
  'use strict';

  const BUTTON_ATTR = 'data-rientro-autostrada';

  // L'uscita deve essere quella associata AL RISTORANTE, non quella
  // rimasta globalmente aperta in precedenza.
  function coordinateValide(obj){
    const lat=Number(obj?.lat);
    const lon=Number(obj?.lon);
    return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
  }

  function getUscita(ristorante){
    const associata=ristorante?.uscita||ristorante?.uscita_autostrada;
    const coordAssociate=coordinateValide(associata);
    if(associata&&coordAssociate) return {...associata,...coordAssociate};

    const corrente=window._uscitaCorrente;
    const stessoId=associata?.id!=null&&corrente?.id!=null&&String(associata.id)===String(corrente.id);
    if(corrente&&(!associata||stessoId)){
      const coordCorrenti=coordinateValide(corrente);
      if(coordCorrenti) return {...corrente,...coordCorrenti};
    }

    // Per i risultati Google Places spesso sono presenti solo id/nome
    // dell'uscita: in quel caso la schermata corrente è la relativa uscita.
    if(associata&&corrente&&(
      associata.id==null||
      corrente.id==null||
      String(associata.id)===String(corrente.id)
    )){
      const coordCorrenti=coordinateValide(corrente);
      if(coordCorrenti) return {...corrente,...associata,...coordCorrenti};
    }
    return null;
  }

  function getIngresso(ristorante, uscita){
    const sorgenti=[
      ristorante?.ingresso_autostrada,
      ristorante?.casello_ingresso,
      ristorante?.ingresso,
      ristorante?.rientro,
      uscita?.ingresso_autostrada,
      uscita?.casello_ingresso,
      uscita?.ingresso,
      uscita?.rientro
    ];
    for(const punto of sorgenti){
      const coord=coordinateValide(punto);
      if(coord) return {...punto,...coord};
    }

    const coppie=[
      ['ingresso_lat','ingresso_lon'],
      ['entrata_lat','entrata_lon'],
      ['casello_ingresso_lat','casello_ingresso_lon'],
      ['rientro_lat','rientro_lon']
    ];
    for(const fonte of [ristorante,uscita]){
      for(const [latKey,lonKey] of coppie){
        const lat=Number(fonte?.[latKey]),lon=Number(fonte?.[lonKey]);
        if(Number.isFinite(lat)&&Number.isFinite(lon)) return {lat,lon};
      }
    }
    return null;
  }

  function queryIngresso(uscita){
    const parti=['Ingresso autostradale'];
    if(uscita?.nome) parti.push(uscita.nome);
    if(uscita?.autostrada) parti.push(uscita.autostrada);
    return parti.join(' ');
  }

  function apri(ristorante){
    const u=getUscita(ristorante);
    if(!u){
      alert('Uscita associata al ristorante non disponibile.');
      return;
    }

    const ingresso=getIngresso(ristorante,u);
    const punto=ingresso||u;
    const destinazione={
      nome:'Ingresso autostrada - '+(u.nome||'casello'),
      lat:punto.lat,
      lon:punto.lon,
      rientro_autostrada:true,
      destinazione_tipo:'ingresso_autostrada',
      uscita:u
    };

    // Se nel database non abbiamo ancora le coordinate precise della
    // corsia di ingresso, chiediamo al navigatore il CASELLO DI INGRESSO
    // per nome invece di puntare ciecamente al lato di uscita.
    if(!ingresso){
      destinazione.navigazioneQuery=queryIngresso(u);
    }

    if(typeof window.apriNavigazione==='function'){
      window.apriNavigazione(destinazione);
      return;
    }

    const destinazioneGoogle=destinazione.navigazioneQuery||(
      destinazione.lat+','+destinazione.lon
    );
    const url='https://www.google.com/maps/dir/?api=1&destination='+
      encodeURIComponent(destinazioneGoogle)+'&travelmode=driving';
    window.open(url,'_blank','noopener,noreferrer');
  }

  function creaPulsante(ristorante, indice){
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute(BUTTON_ATTR, '');
    b.dataset.ristoranteIndex = String(indice);
    b.textContent = window.I18N?.getLang?.()==='en' ? '🔄 RETURN TO MOTORWAY' : '🔄 RIENTRA IN AUTOSTRADA';
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
