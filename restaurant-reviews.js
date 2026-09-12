(function(){
  const TYPE = 'restaurant';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const client = () => window.ReviewsAuth?.client || window.supabaseClient || null;
  const pid = r => String(r?.id || r?.osm_id || r?.place_id || r?.nome || 'restaurant');
  const stars = n => '★'.repeat(Math.max(0, Math.min(5, Math.round(Number(n) || 0)))) + '☆'.repeat(5 - Math.max(0, Math.min(5, Math.round(Number(n) || 0))));

  async function load(r){
    const s = client();
    if(!s) return [];
    const {data, error} = await s.from('reviews')
      .select('rating,comment,created_at,status')
      .eq('place_type', TYPE)
      .eq('place_id', pid(r))
      .eq('status', 'published')
      .order('created_at', {ascending:false});
    if(error){ console.warn('Recensioni:', error.message); return []; }
    return Array.isArray(data) ? data : [];
  }

  function summary(rows){
    if(!rows.length) return {avg:null,count:0};
    return {avg: rows.reduce((a,x)=>a+Number(x.rating||0),0)/rows.length, count:rows.length};
  }

  async function openForm(r, detail){
    const s = client();
    if(!s){ document.querySelector('.auth-fab')?.click(); return; }
    const {data:{user}} = await s.auth.getUser();
    if(!user){ document.querySelector('.auth-fab')?.click(); return; }

    document.getElementById('unifiedRestaurantReview')?.remove();
    const m=document.createElement('div');
    m.id='unifiedRestaurantReview';
    m.innerHTML='<div class="urr-bg"></div><div class="urr-box"><button class="urr-x">×</button><h2>⭐ La tua recensione</h2><b>'+esc(r.nome||'Ristorante')+'</b><div class="urr-stars">'+[1,2,3,4,5].map(n=>'<button data-s="'+n+'">☆</button>').join('')+'</div><textarea maxlength="1000" placeholder="Racconta la tua esperienza..."></textarea><button class="urr-send">PUBBLICA RECENSIONE</button><div class="urr-msg"></div></div>';
    document.body.appendChild(m);
    let rating=0;
    m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{rating=+b.dataset.s;m.querySelectorAll('[data-s]').forEach(x=>x.textContent=+x.dataset.s<=rating?'★':'☆')});
    const close=()=>m.remove();
    m.querySelector('.urr-x').onclick=close;m.querySelector('.urr-bg').onclick=close;
    m.querySelector('.urr-send').onclick=async()=>{
      const comment=m.querySelector('textarea').value.trim(), msg=m.querySelector('.urr-msg');
      if(!rating||comment.length<3){msg.textContent='Scegli le stelle e scrivi almeno 3 caratteri.';return;}
      const {error}=await s.from('reviews').upsert(
        {user_id:user.id,place_type:TYPE,place_id:pid(r),rating,comment,status:'published'},
        {onConflict:'user_id,place_type,place_id'}
      );
      if(error){msg.textContent='Non pubblicata: '+error.message;return;}
      msg.textContent='Recensione pubblicata!';
      setTimeout(async()=>{
        close();
        if(detail) await refreshDetail(r, detail);
        window._ristorantiRefresh?.();
      },650);
    };
  }

  function renderRows(rows){
    if(!rows.length) return '<p class="rr-empty">Nessuna esperienza ancora. Sii il primo.</p>';
    return rows.map(x=>{
      const date=x.created_at?new Date(x.created_at).toLocaleDateString('it-IT'):'';
      return '<article class="rr-item"><div class="rr-item-stars">'+stars(x.rating)+'</div><div class="rr-comment">'+esc(x.comment||'')+'</div><small>Utente anonimo'+(date?' · '+date:'')+'</small></article>';
    }).join('');
  }

  async function refreshDetail(r, box){
    const rows=await load(r), s=summary(rows);
    const sum=box.querySelector('.rr-summary');
    const list=box.querySelector('.rr-list');
    if(sum) sum.innerHTML=s.count ? '<span class="rr-gold">'+stars(s.avg)+'</span> <b>'+s.avg.toFixed(1)+'/5</b> · '+s.count+' recension'+(s.count===1?'e':'i') : 'Ancora nessuna valutazione';
    if(list) list.innerHTML=renderRows(rows);
    decorate();
  }

  function openDetail(r){
    document.getElementById('restaurantDetailReview')?.remove();
    const o=document.createElement('div');
    o.id='restaurantDetailReview';
    o.innerHTML='<div class="rr-overlay"></div><section class="rr-detail"><button class="rr-close">×</button><div class="rr-kicker">1 KM E SI MANGIA</div><h2>'+esc(r.nome||'Ristorante')+'</h2><div class="rr-summary">Caricamento recensioni...</div><button class="rr-review-btn">⭐ RECENSISCI QUESTO RISTORANTE</button><h3>Esperienze degli utenti</h3><div class="rr-list"><p class="rr-empty">Caricamento...</p></div><small class="rr-note">Le recensioni sono pubblicate in forma anonima e condivise con gli altri utenti.</small></section>';
    document.body.appendChild(o);
    const close=()=>o.remove();
    o.querySelector('.rr-close').onclick=close;o.querySelector('.rr-overlay').onclick=close;
    o.querySelector('.rr-review-btn').onclick=()=>openForm(r,o);
    refreshDetail(r,o);
  }

  function findRestaurant(id){
    const list=window._ristorantiVisualizzati||window._ristorantiCorrenti||[];
    return list.find(x=>pid(x)===String(id));
  }

  document.addEventListener('click',function(e){
    const review=e.target.closest('[data-recensione-id]');
    if(review){
      e.preventDefault();e.stopImmediatePropagation();
      const r=findRestaurant(review.dataset.recensioneId);
      if(r) openForm(r,null);
      return;
    }
    const name=e.target.closest('.rr-name-link');
    if(name){
      e.preventDefault();e.stopImmediatePropagation();
      const r=findRestaurant(name.dataset.restaurantId);
      if(r) openDetail(r);
    }
  },true);

  async function decorate(){
    const panel=document.getElementById('ristorantiMapPanel');
    if(!panel) return;
    const buttons=[...panel.querySelectorAll('[data-ristorante-index]')];
    for(const b of buttons){
      const r=(window._ristorantiVisualizzati||[])[Number(b.dataset.ristoranteIndex)];
      if(!r) continue;
      const card=b.closest('div[style*="border:1px solid"]');
      if(!card) continue;
      const name=card.querySelector('strong');
      if(!name) continue;
      name.classList.add('rr-name-link');
      name.dataset.restaurantId=pid(r);
      if(card.querySelector('.rr-preview')) continue;
      const p=document.createElement('div');
      p.className='rr-preview';
      p.textContent='Caricamento valutazione...';
      name.insertAdjacentElement('afterend',p);
      load(r).then(rows=>{
        const s=summary(rows);
        p.innerHTML=s.count ? '<span class="rr-gold">'+stars(s.avg)+'</span> <span>'+s.avg.toFixed(1)+' · '+s.count+' recension'+(s.count===1?'e':'i')+'</span>' : '<span class="rr-muted">☆☆☆☆☆ · Nessuna recensione</span>';
      });
    }
  }

  const observer=new MutationObserver(()=>setTimeout(decorate,0));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,400));

  const st=document.createElement('style');
  st.textContent=`
    .rr-name-link{cursor:pointer;color:#143d2c}.rr-name-link:hover{text-decoration:underline}
    .rr-preview{font-size:12px;margin-top:4px;color:#65736e}.rr-gold{color:#f5a719;letter-spacing:1px}.rr-muted{color:#9aa7a2}
    .rr-overlay,.urr-bg{position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:30000}
    .rr-detail,.urr-box{position:fixed;z-index:30001;left:50%;top:50%;transform:translate(-50%,-50%);width:min(540px,92vw);max-height:86vh;overflow:auto;background:#fff;padding:24px;border-radius:20px;color:#143d2c;box-shadow:0 20px 70px rgba(0,0,0,.35)}
    .rr-close,.urr-x{position:absolute;right:16px;top:16px;border:0;background:#eef1ef;border-radius:50%;width:38px;height:38px;font-size:24px;cursor:pointer}
    .rr-kicker{font-size:12px;font-weight:900;letter-spacing:2px;color:#c88718}.rr-detail h2{margin:6px 45px 8px 0;font-size:26px}.rr-summary{padding:12px 0;border-bottom:1px solid #e5ebe7;color:#65736e}
    .rr-review-btn,.urr-send{width:100%;margin:16px 0;border:0;border-radius:11px;background:#075c3b;color:#fff;padding:14px;font-weight:900;cursor:pointer}
    .rr-detail h3{margin:8px 0}.rr-item{padding:13px 0;border-bottom:1px solid #e7ece9}.rr-item-stars{color:#f5a719;letter-spacing:1px}.rr-comment{margin:5px 0;color:#40524b}.rr-item small,.rr-note{color:#82908a;font-size:12px}.rr-empty{color:#687772}
    .urr-box h2{margin:0 0 8px}.urr-stars{margin:10px 0}.urr-stars button{border:0;background:none;font-size:36px;color:#f5a719;padding:2px;cursor:pointer}.urr-box textarea{width:100%;box-sizing:border-box;min-height:110px;padding:11px;border:1px solid #ccd8d2;border-radius:10px;font:inherit}.urr-msg{margin-top:8px;font-weight:700;font-size:13px}
  `;
  document.head.appendChild(st);
})();