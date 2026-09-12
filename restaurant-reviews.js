(function(){
  const TYPE='restaurant';
  const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const client=()=>window.ReviewsAuth?.client||window.supabaseClient||null;
  const pid=r=>String(r?.id||r?.osm_id||r?.place_id||r?.nome||'restaurant');
  const stars=n=>'★'.repeat(Math.max(0,Math.min(5,Math.round(Number(n)||0))))+'☆'.repeat(5-Math.max(0,Math.min(5,Math.round(Number(n)||0))));
  const withTimeout=(p,ms=8000)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Tempo scaduto nel caricamento recensioni')),ms))]);

  async function viewer(){
    const s=client(); if(!s) return null;
    try{
      const {data:{user}}=await withTimeout(s.auth.getUser(),5000);
      if(!user) return null;
      let name=user.user_metadata?.display_name||'';
      if(!name){
        const {data}=await s.from('profiles').select('display_name').eq('id',user.id).maybeSingle();
        name=data?.display_name||'';
      }
      return {id:user.id,name:name||user.email?.split('@')[0]||'Utente'};
    }catch(e){ console.warn('Utente recensioni:',e.message); return null; }
  }

  async function load(r){
    const s=client(); if(!s) return {rows:[],error:'Servizio recensioni non disponibile'};
    try{
      const q=s.from('reviews').select('user_id,rating,comment,created_at,status').eq('place_type',TYPE).eq('place_id',pid(r)).eq('status','published').order('created_at',{ascending:false});
      const {data,error}=await withTimeout(q,8000);
      if(error) throw error;
      const rows=Array.isArray(data)?data:[];
      /* Recuperiamo prima l'utente attualmente autenticato.
         Se una recensione è sua, il nome mostrato DEVE essere quello del suo
         account corrente (non un vecchio valore rimasto in profiles). */
      const me=await viewer();
      const ids=[...new Set(rows.map(x=>x.user_id).filter(Boolean))];
      const names={};
      if(ids.length){
        const {data:profiles,error:pe}=await withTimeout(s.from('profiles').select('id,display_name').in('id',ids),5000);
        if(!pe) (profiles||[]).forEach(p=>{if(p.display_name) names[p.id]=p.display_name;});
      }
      if(me?.id&&me?.name) names[me.id]=me.name;
      return {rows:rows.map(x=>({
        ...x,
        display_name:(me?.id===x.user_id&&me?.name)||names[x.user_id]||'Utente'
      })),error:null};
    }catch(e){
      console.warn('Recensioni:',e.message||e);
      return {rows:[],error:e.message||'Impossibile caricare le recensioni'};
    }
  }

  const summary=rows=>!rows.length?{avg:null,count:0}:{avg:rows.reduce((a,x)=>a+Number(x.rating||0),0)/rows.length,count:rows.length};

  async function openForm(r,detail){
    const s=client();
    const u=await viewer();
    if(!s||!u){ document.getElementById('siteAccountButton')?.click(); return; }

    document.getElementById('unifiedRestaurantReview')?.remove();
    const m=document.createElement('div');
    m.id='unifiedRestaurantReview';
    m.innerHTML='<div class="urr-bg"></div><div class="urr-box"><button class="urr-x">×</button><h2>⭐ La tua recensione</h2><b>'+esc(r.nome||'Ristorante')+'</b><div class="urr-user">Stai recensendo come <strong>'+esc(u.name)+'</strong></div><div class="urr-stars">'+[1,2,3,4,5].map(n=>'<button data-s="'+n+'">☆</button>').join('')+'</div><textarea maxlength="1000" placeholder="Racconta la tua esperienza..."></textarea><button class="urr-send">PUBBLICA RECENSIONE</button><div class="urr-msg"></div></div>';
    document.body.appendChild(m);
    let rating=0;
    m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{rating=+b.dataset.s;m.querySelectorAll('[data-s]').forEach(x=>x.textContent=+x.dataset.s<=rating?'★':'☆')});
    const close=()=>m.remove();
    m.querySelector('.urr-x').onclick=close;m.querySelector('.urr-bg').onclick=close;
    m.querySelector('.urr-send').onclick=async()=>{
      const comment=m.querySelector('textarea').value.trim(),msg=m.querySelector('.urr-msg');
      if(!rating||comment.length<3){msg.textContent='Scegli le stelle e scrivi almeno 3 caratteri.';return;}
      const {error}=await s.from('reviews').upsert({user_id:u.id,place_type:TYPE,place_id:pid(r),rating,comment,status:'published'},{onConflict:'user_id,place_type,place_id'});
      if(error){msg.textContent='Non pubblicata: '+error.message;return;}
      msg.textContent='Recensione pubblicata con il nome '+u.name+'!';
      setTimeout(async()=>{close();if(detail)await refreshDetail(r,detail);window._ristorantiRefresh?.();},650);
    };
  }

  function renderRows(rows){
    if(!rows.length) return '<p class="rr-empty">Nessuna esperienza ancora. Sii il primo.</p>';
    return rows.map(x=>{
      const date=x.created_at?new Date(x.created_at).toLocaleDateString('it-IT'):'';
      return '<article class="rr-item"><div class="rr-item-stars">'+stars(x.rating)+'</div><div class="rr-comment">'+esc(x.comment||'')+'</div><small><b>'+esc(x.display_name||'Utente')+'</b>'+(date?' · '+date:'')+'</small></article>';
    }).join('');
  }

  async function refreshDetail(r,box){
    const result=await load(r),rows=result.rows,s=summary(rows);
    const sum=box.querySelector('.rr-summary'),list=box.querySelector('.rr-list');
    if(sum) sum.innerHTML=result.error?'<span class="rr-error">⚠ '+esc(result.error)+'</span>':s.count?'<span class="rr-gold">'+stars(s.avg)+'</span> <b>'+s.avg.toFixed(1)+'/5</b> · '+s.count+' recension'+(s.count===1?'e':'i'):'Ancora nessuna valutazione';
    if(list) list.innerHTML=result.error?'<p class="rr-empty">Riprova tra qualche secondo.</p>':renderRows(rows);
  }

  async function openDetail(r){
    document.getElementById('restaurantDetailReview')?.remove();
    const u=await viewer();
    const o=document.createElement('div');
    o.id='restaurantDetailReview';
    o.innerHTML='<div class="rr-overlay"></div><section class="rr-detail"><button class="rr-close">×</button><div class="rr-kicker">1 KM E SI MANGIA</div><h2>'+esc(r.nome||'Ristorante')+'</h2><div class="rr-summary">Caricamento recensioni...</div><button class="rr-review-btn">'+(u?'⭐ RECENSISCI COME '+esc(u.name):'👤 ACCEDI PER RECENSIRE')+'</button><div class="rr-readonly">'+(u?'La tua recensione verrà pubblicata con il tuo nome utente.':'Puoi leggere tutte le recensioni. Per scriverne una devi prima accedere.')+'</div><h3>Esperienze degli utenti</h3><div class="rr-list"><p class="rr-empty">Caricamento...</p></div><small class="rr-note">Le recensioni sono visibili a tutti e riportano il nome utente del recensore.</small></section>';
    document.body.appendChild(o);
    const close=()=>o.remove();
    o.querySelector('.rr-close').onclick=close;o.querySelector('.rr-overlay').onclick=close;
    o.querySelector('.rr-review-btn').onclick=()=>u?openForm(r,o):document.getElementById('siteAccountButton')?.click();
    refreshDetail(r,o);
  }

  function findRestaurant(id){const list=window._ristorantiVisualizzati||window._ristorantiCorrenti||[];return list.find(x=>pid(x)===String(id));}
  function restaurantFromElement(el){
    const card=el?.closest?.('.rr-card-clickable')||el?.closest?.('[data-recensione-id]')?.parentElement||el?.closest?.('[data-restaurant-id]')||el;
    const reviewEl=card?.matches?.('[data-recensione-id]')?card:card?.querySelector?.('[data-recensione-id]');
    const id=String(card?.dataset?.restaurantId||el?.dataset?.restaurantId||reviewEl?.dataset?.recensioneId||'');
    if(!id)return null;
    const nameEl=card?.querySelector?.('strong,h3,h2');
    return {id,nome:(nameEl?.textContent||'Ristorante').trim().replace(/^\d+\.\s*/,'')};
  }

  document.addEventListener('click',function(e){
    const detail=e.target.closest('[data-restaurant-detail-id]');
    if(detail){e.preventDefault();e.stopImmediatePropagation();const r=findRestaurant(detail.dataset.restaurantDetailId)||restaurantFromElement(detail);if(r)openDetail(r);return;}
    const review=e.target.closest('[data-recensione-id]');
    if(review){e.preventDefault();e.stopImmediatePropagation();const r=findRestaurant(review.dataset.recensioneId)||restaurantFromElement(review);if(r)openDetail(r);return;}
    const card=e.target.closest('.rr-card-clickable');
    if(card&&!e.target.closest('button,a,input,textarea,select,[data-recensione-id],[data-naviga-ristorante],[data-ristorante-index]')){e.preventDefault();e.stopImmediatePropagation();const r=findRestaurant(card.dataset.restaurantId)||restaurantFromElement(card);if(r)openDetail(r);return;}
    const name=e.target.closest('.rr-name-link');
    if(name){e.preventDefault();e.stopImmediatePropagation();const r=findRestaurant(name.dataset.restaurantId)||restaurantFromElement(name);if(r)openDetail(r);}
  },true);

  let decorating=false;
  async function decorate(){
    if(decorating) return;
    const panel=document.getElementById('ristorantiMapPanel');if(!panel)return;
    decorating=true;
    try{
      const list=window._ristorantiVisualizzati||window._ristorantiCorrenti||[];
      for(const rb of [...panel.querySelectorAll('[data-recensione-id]')]){
        /* IMPORTANTE: il MutationObserver richiama decorate anche per le nostre modifiche.
           Una scheda già preparata NON deve rilanciare altre richieste a Supabase. */
        if(rb.dataset.rrReady==='1') continue;
        rb.dataset.rrReady='1';

        const rawId=String(rb.dataset.recensioneId||rb.dataset.restaurantId||'');
        let r=list.find(x=>pid(x)===rawId)||restaurantFromElement(rb);
        let card=rb.parentElement;
        while(card&&card!==panel){
          if(card.querySelectorAll('[data-recensione-id]').length===1&&card.querySelector('strong')&&(card.querySelector('[data-ristorante-index],[data-naviga-ristorante]')||card.parentElement===panel))break;
          card=card.parentElement;
        }
        if(!card||card===panel)card=rb.parentElement;
        const title=[...card.querySelectorAll('strong,h3,h2')][0];
        if(!r)r={id:rawId||('card-'+Math.random().toString(36).slice(2)),nome:(title?.textContent||'Ristorante').trim().replace(/^\d+\.\s*/,'')};
        card.classList.add('rr-card-clickable');card.dataset.restaurantId=pid(r);card.title='Apri il ristorante e leggi le recensioni';
        if(title){title.classList.add('rr-name-link');title.dataset.restaurantId=pid(r);}

        let p=card.querySelector('.rr-preview[data-review-place="'+CSS.escape(pid(r))+'"]');
        if(!p){p=document.createElement('div');p.className='rr-preview';p.dataset.reviewPlace=pid(r);(title||rb).insertAdjacentElement('afterend',p);}
        p.textContent='Caricamento valutazione...';

        load(r).then(result=>{
          const sum=summary(result.rows);
          if(result.error){
            console.warn('Recensioni non disponibili per',pid(r),result.error);
            p.innerHTML='<span class="rr-error">⚠ Recensioni non disponibili</span>';
            return;
          }
          p.innerHTML=sum.count
            ? '<span class="rr-gold">'+stars(sum.avg)+'</span> <span><b>'+sum.avg.toFixed(1)+'/5</b> · '+sum.count+' recension'+(sum.count===1?'e':'i')+'</span>'
            : '<span class="rr-muted">☆☆☆☆☆ · Ancora nessuna recensione</span>';
        });

        if(!rb.dataset.rrDecorated){rb.dataset.rrDecorated='1';rb.textContent='⭐ RECENSISCI QUESTO RISTORANTE';}
        let db=card.querySelector('[data-restaurant-detail-id="'+CSS.escape(pid(r))+'"]');
        if(!db){
          db=document.createElement('button');
          db.type='button';
          db.className='rr-detail-open-btn';
          db.dataset.restaurantDetailId=pid(r);
          db.innerHTML='📋 SCHEDA RISTORANTE <span>›</span>';
          rb.insertAdjacentElement('afterend',db);
        }
        /* Collego direttamente il pulsante: non dipendiamo più dalla delega click
           della pagina, che può essere intercettata dal pannello ristoranti. */
        if(db.dataset.rrBound!=='1'){
          db.dataset.rrBound='1';
          db.addEventListener('click',function(ev){
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            const rr=list.find(x=>pid(x)===db.dataset.restaurantDetailId)||r||restaurantFromElement(db);
            if(rr) openDetail(rr).catch(err=>console.error('Errore apertura scheda ristorante',err));
          },true);
          db.addEventListener('touchend',function(ev){
            ev.preventDefault();
            const rr=list.find(x=>pid(x)===db.dataset.restaurantDetailId)||r||restaurantFromElement(db);
            if(rr) openDetail(rr).catch(err=>console.error('Errore apertura scheda ristorante',err));
          },{passive:false});
        }
      }
    } finally {
      decorating=false;
    }
  }
  const observer=new MutationObserver(()=>setTimeout(decorate,0));observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,400));
  document.addEventListener('reviews-auth-changed',()=>{setTimeout(decorate,50);});

  const st=document.createElement('style');
  st.textContent='.rr-card-clickable{cursor:pointer;position:relative}.rr-card-clickable:hover{box-shadow:0 4px 14px rgba(20,61,44,.14)}.rr-name-link{cursor:pointer;color:#143d2c}.rr-name-link:hover{text-decoration:underline}.rr-preview{font-size:12px;margin-top:4px;color:#65736e}.rr-gold{color:#f5a719;letter-spacing:1px}.rr-muted{color:#9aa7a2}.rr-error{color:#b23b32;font-weight:700}.rr-detail-open-btn{width:100%;min-height:42px;margin-top:8px;border:1px solid #1d6048;background:#fff;color:#174b39;border-radius:14px;font-weight:900;font-size:14px;letter-spacing:.4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px}.rr-detail-open-btn span{font-size:24px;line-height:1}.rr-overlay,.urr-bg{position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:30000}.rr-detail,.urr-box{position:fixed;z-index:30001;left:50%;top:50%;transform:translate(-50%,-50%);width:min(540px,92vw);max-height:86vh;overflow:auto;background:#fff;padding:24px;border-radius:20px;color:#143d2c;box-shadow:0 20px 70px rgba(0,0,0,.35)}.rr-close,.urr-x{position:absolute;right:16px;top:16px;border:0;background:#eef1ef;border-radius:50%;width:38px;height:38px;font-size:24px;cursor:pointer}.rr-kicker{font-size:12px;font-weight:900;letter-spacing:2px;color:#c88718}.rr-detail h2{margin:6px 45px 8px 0;font-size:26px}.rr-summary{padding:12px 0;border-bottom:1px solid #e5ebe7;color:#65736e}.rr-review-btn,.urr-send{width:100%;margin:16px 0 8px;border:0;border-radius:11px;background:#075c3b;color:#fff;padding:14px;font-weight:900;cursor:pointer}.rr-readonly{font-size:13px;color:#65736e;margin-bottom:16px}.rr-detail h3{margin:8px 0}.rr-item{padding:13px 0;border-bottom:1px solid #e7ece9}.rr-item-stars{color:#f5a719;letter-spacing:1px}.rr-comment{margin:5px 0;color:#40524b}.rr-item small,.rr-note{color:#82908a;font-size:12px}.rr-empty{color:#687772}.urr-box h2{margin:0 0 8px}.urr-user{margin:8px 0;color:#65736e}.urr-stars{margin:10px 0}.urr-stars button{border:0;background:none;font-size:36px;color:#f5a719;padding:2px;cursor:pointer}.urr-box textarea{width:100%;box-sizing:border-box;min-height:110px;padding:11px;border:1px solid #ccd8d2;border-radius:10px;font:inherit}.urr-msg{margin-top:8px;font-weight:700;font-size:13px}';
  document.head.appendChild(st);
})();