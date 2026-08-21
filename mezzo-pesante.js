/* 1 KM E SI MANGIA - PROFILO MEZZO PESANTE */
(function(){
  'use strict';
  const KEY='1km_mezzo_pesante_v1';
  const defaults={tipo:'Autoarticolato',lunghezza:16.5,larghezza:2.55,altezza:4,peso:40,rimorchio:true};
  const tipi=['Autocarro','Autoarticolato','Autobus','Furgone','Altro'];
  function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){return {...defaults}}}
  function save(v){localStorage.setItem(KEY,JSON.stringify(v)); window.dispatchEvent(new CustomEvent('1km-mezzo-updated',{detail:v}));}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function compat(p){
    const v=load(); if(!p) return {ok:null,reason:'Dati non disponibili'};
    const maxH=Number(p.altezza_max_m ?? p.altezza_max ?? p.height_max_m);
    const maxL=Number(p.lunghezza_max_m ?? p.lunghezza_max ?? p.length_max_m);
    const maxW=Number(p.larghezza_max_m ?? p.larghezza_max ?? p.width_max_m);
    const checks=[];
    if(Number.isFinite(maxH)) checks.push(v.altezza<=maxH);
    if(Number.isFinite(maxL)) checks.push(v.lunghezza<=maxL);
    if(Number.isFinite(maxW)) checks.push(v.larghezza<=maxW);
    if(!checks.length) return {ok:null,reason:'Dimensioni del parcheggio non verificate'};
    return checks.every(Boolean)?{ok:true,reason:'Dimensioni compatibili'}:{ok:false,reason:'Dimensioni del mezzo superiori ai limiti disponibili'};
  }
  function open(){
    let v=load();
    const o=document.createElement('div'); o.id='mezzoPesanteOverlay';
    o.innerHTML=`<div class="mp-box"><div class="mp-head"><div><div class="mp-eyebrow">1 KM E SI MANGIA</div><h2>🚛 IL MIO MEZZO</h2></div><button type="button" data-mp-close>×</button></div><p class="mp-intro">Inserisci le dimensioni del mezzo. Le useremo per aiutarti a valutare parcheggi e accessi.</p><label>Tipo<select id="mpTipo">${tipi.map(x=>`<option ${x===v.tipo?'selected':''}>${x}</option>`).join('')}</select></label><div class="mp-grid"><label>Lunghezza (m)<input id="mpL" type="number" step="0.01" min="0" value="${v.lunghezza}"></label><label>Larghezza (m)<input id="mpW" type="number" step="0.01" min="0" value="${v.larghezza}"></label><label>Altezza (m)<input id="mpH" type="number" step="0.01" min="0" value="${v.altezza}"></label><label>Peso (t)<input id="mpP" type="number" step="0.1" min="0" value="${v.peso}"></label></div><label class="mp-check"><input id="mpR" type="checkbox" ${v.rimorchio?'checked':''}> Ho un rimorchio</label><button type="button" class="mp-save" id="mpSave">SALVA IL MIO MEZZO</button><div class="mp-saved" id="mpSaved"></div></div>`;
    document.body.appendChild(o);
    const close=()=>o.remove(); o.querySelector('[data-mp-close]').onclick=close; o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('#mpSave').onclick=()=>{v={tipo:o.querySelector('#mpTipo').value,lunghezza:Number(o.querySelector('#mpL').value)||0,larghezza:Number(o.querySelector('#mpW').value)||0,altezza:Number(o.querySelector('#mpH').value)||0,peso:Number(o.querySelector('#mpP').value)||0,rimorchio:o.querySelector('#mpR').checked};save(v);o.querySelector('#mpSaved').textContent='✓ Dati salvati su questo dispositivo';};
  }
  function inject(){
    if(document.getElementById('mpFloating')) return;
    const b=document.createElement('button'); b.id='mpFloating'; b.type='button'; b.textContent='🚛 IL MIO MEZZO'; b.onclick=open; document.body.appendChild(b);
  }
  window.apriProfiloMezzoPesante=open; window.getProfiloMezzoPesante=load; window.verificaCompatibilitaParcheggio=compat;
  const style=document.createElement('style'); style.textContent=`#mpFloating{position:fixed;right:16px;bottom:16px;z-index:9998;border:0;border-radius:999px;background:#075c3b;color:#fff;padding:12px 16px;font-weight:800;box-shadow:0 6px 22px rgba(0,0,0,.22);cursor:pointer}#mezzoPesanteOverlay{position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif}.mp-box{width:min(94vw,520px);background:#fff;border-radius:20px;padding:20px;box-shadow:0 15px 50px rgba(0,0,0,.35)}.mp-head{display:flex;justify-content:space-between;align-items:flex-start}.mp-head h2{margin:3px 0 0}.mp-head button{border:0;border-radius:50%;width:38px;height:38px;font-size:24px;cursor:pointer}.mp-eyebrow{font-size:12px;font-weight:800;letter-spacing:2px;color:#075c3b}.mp-intro{color:#566;line-height:1.45}.mp-box label{display:block;font-weight:700;font-size:13px;margin-top:12px}.mp-box input,.mp-box select{width:100%;margin-top:6px;padding:11px;border:1px solid #ccd8d2;border-radius:10px;font:inherit}.mp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mp-check{display:flex!important;align-items:center;gap:8px}.mp-check input{width:auto!important;margin:0!important}.mp-save{width:100%;margin-top:16px;padding:13px;border:0;border-radius:12px;background:#075c3b;color:#fff;font-weight:800}.mp-saved{text-align:center;color:#075c3b;font-weight:700;margin-top:10px}@media(max-width:480px){.mp-grid{grid-template-columns:1fr}#mpFloating{bottom:12px;right:12px}}`; document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();
