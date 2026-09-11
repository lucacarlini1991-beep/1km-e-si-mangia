(function(){
const TYPE='restaurant';
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const client=()=>window.ReviewsAuth?.client;
const pid=r=>String(r?.id||r?.osm_id||r?.place_id||r?.nome||'restaurant');
async function open(r){
 const s=client(); if(!s){document.querySelector('.auth-fab')?.click();return}
 const {data:{user}}=await s.auth.getUser();if(!user){document.querySelector('.auth-fab')?.click();return}
 document.getElementById('unifiedRestaurantReview')?.remove();
 const m=document.createElement('div');m.id='unifiedRestaurantReview';m.innerHTML='<div class="urr-bg"></div><div class="urr-box"><button class="urr-x">×</button><h2>⭐ Recensione</h2><b>'+esc(r.nome||'Ristorante')+'</b><div class="urr-stars">'+[1,2,3,4,5].map(n=>'<button data-s="'+n+'">☆</button>').join('')+'</div><textarea maxlength="1000" placeholder="Racconta la tua esperienza..."></textarea><button class="urr-send">PUBBLICA RECENSIONE</button><div class="urr-msg"></div></div>';document.body.appendChild(m);let rating=0;
 m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{rating=+b.dataset.s;m.querySelectorAll('[data-s]').forEach(x=>x.textContent=+x.dataset.s<=rating?'★':'☆')});
 m.querySelector('.urr-x').onclick=()=>m.remove();m.querySelector('.urr-bg').onclick=()=>m.remove();
 m.querySelector('.urr-send').onclick=async()=>{const comment=m.querySelector('textarea').value.trim(),msg=m.querySelector('.urr-msg');if(!rating||comment.length<3){msg.textContent='Scegli le stelle e scrivi almeno 3 caratteri.';return}const {error}=await s.from('reviews').upsert({user_id:user.id,place_type:TYPE,place_id:pid(r),rating,comment,status:'published'},{onConflict:'user_id,place_type,place_id'});if(error){msg.textContent='Non pubblicata: '+error.message;return}msg.textContent='Recensione pubblicata!';setTimeout(()=>{m.remove();window._ristorantiRefresh?.()},600)}
}
document.addEventListener('click',function(e){const b=e.target.closest('[data-recensione-id]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const id=String(b.dataset.recensioneId);const list=window._ristorantiVisualizzati||[];const r=list.find(x=>String(x.id||x.osm_id||x.nome)===id)||{id,nome:b.closest('div')?.querySelector('strong')?.textContent||'Ristorante'};open(r)},true);
const st=document.createElement('style');st.textContent='.urr-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:30000}.urr-box{position:fixed;z-index:30001;left:50%;top:50%;transform:translate(-50%,-50%);width:min(500px,90vw);background:#fff;padding:22px;border-radius:18px;color:#143d2c}.urr-x{float:right;border:0;background:#eee;border-radius:50%;width:36px;height:36px;font-size:22px}.urr-stars button{border:0;background:none;font-size:35px;color:#f5a719;padding:2px}.urr-box textarea{width:100%;box-sizing:border-box;min-height:110px;padding:10px;border:1px solid #ccd8d2;border-radius:10px;font:inherit}.urr-send{width:100%;margin-top:10px;padding:13px;border:0;border-radius:10px;background:#075c3b;color:#fff;font-weight:800}.urr-msg{margin-top:8px;font-weight:700;font-size:13px}';document.head.appendChild(st);
})();