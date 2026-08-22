/* 1 KM E SI MANGIA — PROFILO MEZZO PESANTE */
(function(){
  'use strict';
  const KEY='1km_mezzo_pesante_v2';
  const defaults={tipo:'Autoarticolato',lunghezza:16.5,larghezza:2.55,altezza:4,peso:40,rimorchio:true};
  const tipi=['Autocarro','Autoarticolato','Autobus','Furgone','Altro'];
  function load(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return Object.assign({},defaults);}}
  function save(v){localStorage.setItem(KEY,JSON.stringify(v));window.dispatchEvent(new CustomEvent('1km-mezzo-updated',{detail:v}));}
  function numeric(v){const n=Number(v);return Number.isFinite(n)?n:null;}
  function firstNumber(p,keys){for(const k of keys){const n=numeric(p&&p[k]);if(n!==null)return n;}return null;}
  function compat(p){
    const v=load(); if(!p)return {ok:null,reason:'Dati non disponibili'};
    const maxH=firstNumber(p,['maxheight','altezza_max_m','altezza_max','height_max_m']);
    const maxL=firstNumber(p,['maxlength','lunghezza_max_m','lunghezza_max','length_max_m']);
    const maxW=firstNumber(p,['maxwidth','larghezza_max_m','larghezza_max','width_max_m']);
    const maxP=firstNumber(p,['maxweight','peso_max_t','peso_max','max_weight_t']);
    const checks=[];
    if(maxH!==null)checks.push(v.altezza<=maxH);
    if(maxL!==null)checks.push(v.lunghezza<=maxL);
    if(maxW!==null)checks.push(v.larghezza<=maxW);
    if(maxP!==null)checks.push(v.peso<=maxP);
    if(!checks.length)return {ok:null,reason:'Limiti dimensionali non pubblicati'};
    return checks.every(Boolean)?{ok:true,reason:'Dimensioni compatibili'}:{ok:false,reason:'Almeno un limite non è compatibile'};
  }
  window.getProfiloMezzoPesante=load;
  window.salvaProfiloMezzoPesante=save;
  window.verificaCompatibilitaParcheggio=compat;
  window._tipiMezzoPesante=tipi;
  window._defaultMezzoPesante=defaults;
})();
