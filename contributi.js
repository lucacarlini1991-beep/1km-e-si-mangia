/* 1 KM E SI MANGIA - CONTRIBUTI UTENTE
 * Hub dal profilo per recensioni e segnalazione prezzi carburante.
 */
(function () {
  'use strict';

  function client() {
    return window.ReviewsAuth?.client || window.supabaseClient || null;
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function slug(v) {
    return String(v ?? '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  const styles = `
    #contributi1km-overlay{position:fixed;inset:0;z-index:40000;background:rgba(0,45,32,.48);display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box}
    #contributi1km-box{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:22px;padding:20px;color:#143d2c;box-shadow:0 20px 70px rgba(0,0,0,.35);box-sizing:border-box}
    .c1-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.c1-head h2{margin:0;font-size:23px}.c1-close{border:0;border-radius:50%;width:38px;height:38px;background:#edf3ef;color:#075c3b;font-size:24px;cursor:pointer}
    .c1-sub{margin:4px 0 16px;color:#65736d;font-size:14px}.c1-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .c1-cat{border:1px solid #d6e2db;background:#fff;border-radius:15px;padding:14px;text-align:left;color:#143d2c;cursor:pointer;font-weight:800;min-height:82px}.c1-cat:hover{background:#f4f8f5}.c1-cat strong{display:block;font-size:16px}.c1-cat span{display:block;margin-top:5px;font-size:12px;color:#718078;font-weight:600}
    .c1-back{border:0;background:transparent;color:#075c3b;font-weight:800;padding:4px 0 12px;cursor:pointer}.c1-label{display:block;font-size:13px;font-weight:800;margin:10px 0 5px}.c1-input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ccd8d2;border-radius:11px;font:inherit;background:#fff}.c1-results{display:grid;gap:7px;margin-top:8px;max-height:220px;overflow:auto}
    .c1-result{width:100%;border:1px solid #e0e8e3;background:#fff;border-radius:12px;padding:11px;text-align:left;cursor:pointer;color:#143d2c}.c1-result strong{display:block}.c1-result small{color:#718078}.c1-selected{padding:11px 12px;background:#f1f6f3;border-radius:12px;margin-top:10px;font-size:14px}
    .c1-stars{display:flex;gap:2px;margin:12px 0}.c1-stars button{border:0;background:none;color:#f2a516;font-size:35px;padding:0 3px;cursor:pointer}.c1-submit{width:100%;margin-top:12px;padding:14px;border:0;border-radius:12px;background:#075c3b;color:#fff;font-weight:900;font-size:15px;cursor:pointer}.c1-msg{min-height:20px;margin-top:8px;font-size:13px;font-weight:800}
    .c1-price-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.c1-price{border:1px solid #dce6e0;border-radius:13px;padding:10px}.c1-price label{display:block;font-size:12px;font-weight:900;margin-bottom:5px}.c1-price input{width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccd8d2;border-radius:9px;font:700 16px inherit}.c1-note{font-size:12px;color:#718078;margin:9px 0 0}.c1-search{margin-top:4px}.c1-empty{padding:10px;background:#f7f8f7;border-radius:10px;color:#718078;font-size:13px}
    @media(max-width:480px){.c1-grid,.c1-price-grid{grid-template-columns:1fr}.c1-head h2{font-size:21px}}
  `;
  if (!document.getElementById('contributi1km-style')) {
    const st=document.createElement('style');st.id='contributi1km-style';st.textContent=styles;document.head.appendChild(st);
  }

  function close() {
    document.getElementById('contributi1km-overlay')?.remove();
    document.body.style.overflow='';
  }

  function open() {
    if (!window.ReviewsAuth?.client) {
      document.getElementById('siteAccountButton')?.click();
      return;
    }
    close();
    const o=document.createElement('div');
    o.id='contributi1km-overlay';
    o.innerHTML='<section id="contributi1km-box"><div class="c1-head"><h2>🤝 Contribuisci a 1 KM E SI MANGIA</h2><button class="c1-close" type="button">×</button></div><p class="c1-sub">Aiuta gli altri viaggiatori con una recensione o con un prezzo carburante aggiornato.</p><div id="c1-content"></div></section>';
    document.body.appendChild(o);
    document.body.style.overflow='hidden';
    o.querySelector('.c1-close').onclick=close;
    o.addEventListener('click',e=>{if(e.target===o)close()});
    showCategories();
  }

  function showCategories() {
    const box=document.getElementById('c1-content'); if(!box)return;
    box.innerHTML='<div class="c1-grid">'+
      '<button class="c1-cat" data-c="restaurant">🍽️ <strong>Ristorante</strong><span>Valuta cucina e esperienza</span></button>'+
      '<button class="c1-cat" data-c="parking">🅿️ <strong>Parcheggio</strong><span>Racconta com’è davvero</span></button>'+
      '<button class="c1-cat" data-c="camper_service">🚐 <strong>Camper service</strong><span>Servizi, pulizia e comodità</span></button>'+
      '<button class="c1-cat" data-c="fuel">⛽ <strong>Prezzi carburante</strong><span>Segnala i prezzi che vedi oggi</span></button>'+
      '</div>';
    box.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>b.dataset.c==='fuel'?showFuel():showReview(b.dataset.c));
  }

  function reviewLabel(type) {
    return type==='restaurant'?'Ristorante':type==='parking'?'Parcheggio':'Camper service';
  }

  async function searchPlaces(type, term) {
    const s=client(); if(!s || !term.trim()) return [];
    const q='%'+term.trim().replace(/[%_]/g,'')+'%';
    let table='parcheggi';
    let name='nome', city='comune';
    if(type==='camper_service') table='camper_service';
    const {data,error}=await s.from(table).select('*').or(name+'.ilike.'+q+','+city+'.ilike.'+q).limit(12);
    if(error) { console.warn('Ricerca contributi:',error.message); return []; }
    return data||[];
  }

  function resultId(type,x) {
    if(type==='parking') return 'parking:'+String(x.id);
    if(type==='camper_service') return 'camper_service:'+String(x.id);
    return String(x.id||x.place_id||x.nome||x.name);
  }

  function resultName(type,x) {
    return x.nome||x.name||'Luogo';
  }

  function showReview(type) {
    const box=document.getElementById('c1-content'); if(!box)return;
    box.innerHTML='<button class="c1-back" type="button">← Torna alle categorie</button>'+
      '<h3 style="margin:0 0 4px">Recensisci '+reviewLabel(type)+'</h3>'+
      '<p class="c1-sub">Cerca il luogo oppure inseriscilo manualmente.</p>'+
      '<label class="c1-label">Nome del luogo</label>'+
      '<input id="c1-name" class="c1-input" placeholder="Es. Area di sosta..." autocomplete="off">'+
      '<label class="c1-label">Comune</label>'+
      '<input id="c1-city" class="c1-input" placeholder="Es. Busalla" autocomplete="off">'+
      '<div id="c1-results" class="c1-results"></div>'+
      '<div id="c1-selected"></div>'+
      '<div id="c1-review-form" style="display:none">'+
      '<div class="c1-stars" id="c1-stars">'+[1,2,3,4,5].map(n=>'<button type="button" data-star="'+n+'">☆</button>').join('')+'</div>'+
      '<label class="c1-label">La tua esperienza</label><textarea id="c1-comment" class="c1-input" style="min-height:110px;resize:vertical" maxlength="1000" placeholder="Scrivi cosa dovrebbe sapere un altro viaggiatore..."></textarea>'+
      '<button class="c1-submit" id="c1-review-submit" type="button">PUBBLICA RECENSIONE</button><div class="c1-msg" id="c1-review-msg"></div></div>';
    box.querySelector('.c1-back').onclick=showCategories;

    let selected=null,rating=0,timer=null;
    const nameEl=box.querySelector('#c1-name'),cityEl=box.querySelector('#c1-city'),results=box.querySelector('#c1-results');

    async function doSearch(){
      const term=(nameEl.value+' '+cityEl.value).trim();
      if(!term){results.innerHTML='';return}
      results.innerHTML='<div class="c1-empty">Cerco...</div>';
      const rows=await searchPlaces(type,term);
      results.innerHTML=rows.length?rows.map(x=>'<button class="c1-result" type="button" data-id="'+esc(resultId(type,x))+'"><strong>'+esc(resultName(type,x))+'</strong><small>'+esc(x.comune||x.indirizzo||x.provincia||'')+'</small></button>').join(''):'<div class="c1-empty">Nessun risultato nel database. Puoi comunque inserire il luogo manualmente.</div>';
      results.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{
        const x=rows.find(v=>resultId(type,v)===b.dataset.id); if(!x)return;
        selected={id:resultId(type,x),name:resultName(type,x)};
        nameEl.value=selected.name; if(x.comune)cityEl.value=x.comune;
        results.innerHTML='';box.querySelector('#c1-selected').innerHTML='<div class="c1-selected">📍 <strong>'+esc(selected.name)+'</strong> · '+esc(cityEl.value)+'</div>';
        box.querySelector('#c1-review-form').style.display='block';
      });
    }
    [nameEl,cityEl].forEach(el=>el.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(doSearch,350)}));

    function prepareManual(){
      selected={id:(type==='restaurant'?'restaurant:':'')+slug(nameEl.value)+'-'+slug(cityEl.value),name:nameEl.value.trim()||reviewLabel(type)};
      box.querySelector('#c1-selected').innerHTML='<div class="c1-selected">📍 <strong>'+esc(selected.name)+'</strong> · '+esc(cityEl.value||'Comune non indicato')+'</div>';
      box.querySelector('#c1-review-form').style.display='block';
    }
    nameEl.addEventListener('blur',()=>{if(!selected&&nameEl.value.trim())prepareManual()});

    box.querySelectorAll('[data-star]').forEach(b=>b.onclick=()=>{rating=Number(b.dataset.star);box.querySelectorAll('[data-star]').forEach(x=>x.textContent=Number(x.dataset.star)<=rating?'★':'☆')});
    box.querySelector('#c1-review-submit').onclick=async()=>{
      const u=await window.ReviewsAuth.getUser();const msg=box.querySelector('#c1-review-msg');
      const comment=box.querySelector('#c1-comment').value.trim();
      if(!u){msg.textContent='Accedi per pubblicare.';return}
      if(!selected){msg.textContent='Seleziona o inserisci un luogo.';return}
      if(!rating||comment.length<3){msg.textContent='Scegli le stelle e scrivi almeno 3 caratteri.';return}
      const {error}=await client().from('reviews').upsert({user_id:u.id,place_type:type,place_id:selected.id,rating,comment,status:'published'},{onConflict:'user_id,place_type,place_id'});
      if(error){msg.textContent='Non pubblicata: '+error.message;return}
      msg.textContent='Recensione pubblicata!';
      setTimeout(close,700);
    };
  }

  async function searchStations(term) {
    const s=client();if(!s||!term.trim())return[];
    const q='%'+term.trim().replace(/[%_]/g,'')+'%';
    const {data,error}=await s.from('fuel_stations').select('mimit_id,name,brand,address,municipality,province').or('name.ilike.'+q+',brand.ilike.'+q+',municipality.ilike.'+q).limit(15);
    if(error){console.warn('Ricerca distributori:',error.message);return[]}
    return data||[];
  }

  function showFuel() {
    const box=document.getElementById('c1-content');if(!box)return;
    box.innerHTML='<button class="c1-back" type="button">← Torna alle categorie</button>'+
      '<h3 style="margin:0 0 4px">⛽ Segnala i prezzi carburante</h3>'+
      '<p class="c1-sub">Scegli il distributore e inserisci solo i numeri che leggi sulla colonnina. Il formato è già pronto.</p>'+
      '<label class="c1-label">Cerca distributore</label><input id="c1-fuel-search" class="c1-input" placeholder="Nome, marca o comune" autocomplete="off"><div id="c1-fuel-results" class="c1-results"></div>'+
      '<div id="c1-fuel-selected"></div><div id="c1-fuel-form" style="display:none;margin-top:12px">'+
      '<div class="c1-price-grid">'+
      ['benzina_self:Benzina · self','benzina_servito:Benzina · servito','gasolio_self:Gasolio · self','gasolio_servito:Gasolio · servito','gpl_self:GPL · self','gpl_servito:GPL · servito','metano_self:Metano · self','metano_servito:Metano · servito'].map(x=>{const [id,label]=x.split(':');return '<div class="c1-price"><label for="c1-'+id+'">'+label+'</label><input id="c1-'+id+'" inputmode="decimal" type="text" autocomplete="off" placeholder="0,000" pattern="[0-9]+([,.][0-9]{1,3})?"></div>'}).join('')+
      '</div><p class="c1-note">Lascia vuote le categorie che non sono disponibili. Inserisci €/litro (metano in €/kg se indicato).</p><button class="c1-submit" id="c1-fuel-submit" type="button">PUBBLICA PREZZI VISTI ORA</button><div class="c1-msg" id="c1-fuel-msg"></div></div>';
    box.querySelector('.c1-back').onclick=showCategories;
    let selected=null,timer=null;
    const search=box.querySelector('#c1-fuel-search'),results=box.querySelector('#c1-fuel-results');
    async function doSearch(){
      if(!search.value.trim()){results.innerHTML='';return}
      results.innerHTML='<div class="c1-empty">Cerco...</div>';
      const rows=await searchStations(search.value);
      results.innerHTML=rows.length?rows.map(x=>'<button class="c1-result" type="button" data-id="'+esc(x.mimit_id)+'"><strong>'+esc(x.brand||x.name||'Distributore')+'</strong><small>'+esc([x.address,x.municipality,x.province].filter(Boolean).join(' · '))+'</small></button>').join(''):'<div class="c1-empty">Nessun distributore trovato.</div>';
      results.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{
        const x=rows.find(v=>v.mimit_id===b.dataset.id);if(!x)return;
        selected=x;results.innerHTML='';box.querySelector('#c1-fuel-selected').innerHTML='<div class="c1-selected">⛽ <strong>'+esc(x.brand||x.name||'Distributore')+'</strong><br><small>'+esc([x.address,x.municipality].filter(Boolean).join(' · '))+'</small></div>';box.querySelector('#c1-fuel-form').style.display='block';
      });
    }
    search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(doSearch,350)});

    box.querySelector('#c1-fuel-submit').onclick=async()=>{
      const u=await window.ReviewsAuth.getUser(),msg=box.querySelector('#c1-fuel-msg');
      if(!u){msg.textContent='Accedi per pubblicare i prezzi.';return}
      if(!selected){msg.textContent='Seleziona prima un distributore.';return}
      const payload={user_id:u.id,station_mimit_id:selected.mimit_id};
      let count=0;
      ['benzina_self','benzina_servito','gasolio_self','gasolio_servito','gpl_self','gpl_servito','metano_self','metano_servito'].forEach(k=>{
        const raw=(box.querySelector('#c1-'+k)?.value||'').trim().replace(',','.');
        if(raw!==''){const n=Number(raw);if(Number.isFinite(n)&&n>=0.1&&n<=10){payload[k]=n;count++}else payload[k]='__invalid__'}
      });
      if(Object.values(payload).includes('__invalid__')){msg.textContent='Controlla i prezzi: usa numeri come 1,739.';return}
      if(!count){msg.textContent='Inserisci almeno un prezzo.';return}
      const {error}=await client().from('user_fuel_price_reports').insert(payload);
      if(error){msg.textContent='Segnalazione non pubblicata: '+error.message;return}
      msg.textContent='Prezzi inviati. Grazie!';setTimeout(close,900);
    };
  }

  window.Contributi={open,close};
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-action="contribute"]');
    if(b){e.preventDefault();e.stopPropagation();open();}
  },true);
})();