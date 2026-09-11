(function(){
  const NS='http://www.w3.org/2000/svg';
  const icons={
    food:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="5"/><path d="M3 3v7"/><path d="M1.5 3v4a1.5 1.5 0 0 0 3 0V3"/><path d="M3 10v11"/><path d="M21 3v18"/><path d="M18 3v7a3 3 0 0 0 3 3"/></svg>',
    map:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>',
    truck:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M3 18h2m4 0h7"/></svg>',
    road:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21 9 3h6l4 18"/><path d="M12 6v3m0 3v3m0 3v3"/></svg>',
    mail:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    soon:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/><path d="m12 13 .8 1.7 1.9.2-1.4 1.3.4 1.8-1.7-.9-1.7.9.4-1.8-1.4-1.3 1.9-.2L12 13Z"/></svg>',
    info:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7h.01"/></svg>'
  };
  const byPath={
    'uscite.html':'food','uscita2.html':'map','parcheggi.html':'truck',
    'come-funziona.html':'road','contatti.html':'mail',
    'coming-soon.html':'soon','fonti-licenze.html':'info'
  };
  function cleanLabel(text){
    return text.replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u,'').trim();
  }
  function apply(){
    document.querySelectorAll('a.menu-link, .menu-links a').forEach(a=>{
      const raw=(a.getAttribute('href')||'').split('/').pop().split('?')[0];
      const key=byPath[raw];
      if(!key) return;
      const strong=a.querySelector('strong');
      if(!strong || strong.querySelector('.nav-icon')) return;
      strong.querySelectorAll('.uscite-logo-mark').forEach(el=>el.remove());
      const label=cleanLabel(strong.textContent||'');
      strong.textContent='';
      const wrap=document.createElement('span');
      wrap.className='nav-icon nav-icon-'+key;
      wrap.setAttribute('aria-hidden','true');
      wrap.innerHTML=icons[key];
      strong.appendChild(wrap);
      strong.appendChild(document.createTextNode(label));
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply);
  else apply();
})();