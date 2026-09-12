(function(){
  const cfg=window.SUPABASE_CONFIG;
  if(!cfg||!window.supabase)return;
  const s=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const redirectUrl=window.location.origin+window.location.pathname;

  const style=document.createElement('style');
  style.textContent=`
  .auth-fab{position:fixed;right:18px;bottom:18px;z-index:9999;border:0;border-radius:999px;background:#fff;color:#075c3b;padding:7px 14px 7px 7px;font:800 16px 'Roboto Condensed',sans-serif;box-shadow:0 8px 22px rgba(0,0,0,.18);cursor:pointer;display:flex;align-items:center;gap:8px}
  .auth-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#eaf2ed;display:inline-flex;align-items:center;justify-content:center;font-size:18px}
  .auth-menu{position:fixed;z-index:10001;display:none;width:220px;background:#fff;border:1px solid #dce7e0;border-radius:15px;padding:7px;box-shadow:0 14px 35px rgba(0,0,0,.2)}
  .auth-menu.open{display:block}.auth-menu button{width:100%;text-align:left;border:0;background:transparent;padding:12px 13px;border-radius:10px;color:#143d2c;font:800 15px inherit;cursor:pointer}.auth-menu button:hover{background:#edf5f0}.auth-menu .logout{color:#a22}
  .auth-modal{position:fixed;inset:0;z-index:10000;background:rgba(0,45,32,.45);display:none;align-items:center;justify-content:center;padding:16px}.auth-modal.open{display:flex}
  .auth-box{width:min(460px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:24px;color:#143d2c;box-shadow:0 20px 50px rgba(0,0,0,.28)}
  .auth-box h2{margin:0 0 6px}.auth-box p{color:#65736d}.auth-box input{width:100%;box-sizing:border-box;padding:13px;margin:7px 0;border:1px solid #ccd8d2;border-radius:10px;font:inherit}
  .auth-box button{width:100%;padding:13px;border:0;border-radius:10px;background:#075c3b;color:#fff;font:800 16px inherit;cursor:pointer;margin-top:8px}.auth-box .alt{background:#edf3ef;color:#075c3b}.auth-box .danger{background:#f8e9e7;color:#a22}
  .auth-msg{min-height:20px;font-weight:700;font-size:14px;margin-top:10px}.auth-close{float:right;width:auto!important;background:transparent!important;color:#075c3b!important;font-size:26px!important;margin:0!important}
  .auth-link{display:block;background:transparent!important;color:#075c3b!important;text-decoration:underline;font-size:14px!important;padding:8px 0!important;margin:4px 0!important}.auth-divider{height:1px;background:#e3ebe6;margin:15px 0}
  .avatar-editor{display:flex;align-items:center;gap:14px;padding:12px 0 16px}.avatar-editor img,.avatar-placeholder{width:76px;height:76px;border-radius:50%;object-fit:cover;background:#edf4ef;border:1px solid #d7e4dc}.avatar-placeholder{display:flex;align-items:center;justify-content:center;font-size:32px}.avatar-actions{flex:1}.avatar-actions label{display:block;padding:10px 12px;background:#edf3ef;color:#075c3b;border-radius:10px;font-weight:800;text-align:center;cursor:pointer}.avatar-actions input{display:none!important}.avatar-note{font-size:12px;color:#718078;margin-top:6px}
  .my-review{padding:12px 0;border-bottom:1px solid #e4ece7}.my-review:last-child{border-bottom:0}.my-review .stars{color:#e39a10;font-size:18px}.my-review .date{font-size:12px;color:#718078;margin-top:5px}
  `;document.head.appendChild(style);

  const fab=document.createElement('button');fab.className='auth-fab';fab.type='button';fab.setAttribute('aria-label','Accedi o apri il tuo account');document.body.appendChild(fab);
  const menu=document.createElement('div');menu.className='auth-menu';menu.innerHTML='<button data-action="profile">👤 Il mio profilo</button><button data-action="reviews">⭐ Le mie recensioni</button><button data-action="name">✏️ Modifica username</button><button class="logout" data-action="logout">🚪 Esci</button>';document.body.appendChild(menu);

  const modal=document.createElement('div');modal.className='auth-modal';
  modal.innerHTML='<div class="auth-box" role="dialog" aria-modal="true"><button class="auth-close" type="button" aria-label="Chiudi">×</button><h2 id="authTitle">Accedi</h2><p id="authText">Accedi per lasciare recensioni.</p><div id="authFields"></div><button id="authSubmit" type="button">ACCEDI</button><button id="authSwitch" class="alt" type="button">REGISTRATI</button><button id="authForgot" class="auth-link" type="button">Password dimenticata?</button><div class="auth-msg" id="authMsg" aria-live="polite"></div></div>';
  document.body.appendChild(modal);

  let mode='login',profileCache=null;
  const q=x=>modal.querySelector(x), msg=t=>q('#authMsg').textContent=t||'', fields=()=>q('#authFields');
  const esc=v=>String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const input=(id,type,placeholder,value='')=>'<input id="'+id+'" type="'+type+'" placeholder="'+placeholder+'" value="'+esc(value)+'" autocomplete="'+(type==='password'?'new-password':'on')+'">';

  async function currentUser(){const {data:{session}}=await s.auth.getSession();if(session?.user)return session.user;const {data:{user}}=await s.auth.getUser();return user||null}
  async function getProfile(user){
    user=user||await currentUser();if(!user)return null;
    const {data}=await s.from('profiles').select('id,display_name,avatar_url').eq('id',user.id).maybeSingle();
    profileCache=data||{id:user.id,display_name:user.user_metadata?.display_name||user.email?.split('@')[0]||'Profilo',avatar_url:user.user_metadata?.avatar_url||null};
    return profileCache;
  }
  function avatarHTML(p){return p?.avatar_url?'<img class="auth-avatar" src="'+esc(p.avatar_url)+'" alt="">':'<span class="auth-avatar">👤</span>'}
  async function refresh(){
    const user=await currentUser();profileCache=user?await getProfile(user):null;
    const name=profileCache?.display_name||user?.user_metadata?.display_name||user?.email?.split('@')[0]||'ACCEDI';
    fab.innerHTML=(user?avatarHTML(profileCache):'<span class="auth-avatar">👤</span>')+'<span>'+esc(name)+'</span>';
    document.dispatchEvent(new CustomEvent('reviews-auth-changed',{detail:{user,profile:profileCache}}));
    document.dispatchEvent(new CustomEvent('profile-changed',{detail:{user,profile:profileCache}}));
    return user;
  }
  async function render(){
    msg('');const user=await currentUser(),title=q('#authTitle'),text=q('#authText'),submit=q('#authSubmit'),sw=q('#authSwitch'),forgot=q('#authForgot');
    if(mode==='account'&&user){const p=await getProfile(user);title.textContent='Il mio profilo';text.textContent='Il tuo nome e la foto saranno visibili insieme alle tue recensioni.';
      const av=p?.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="Foto profilo">':'<div class="avatar-placeholder">👤</div>';
      fields().innerHTML='<div class="avatar-editor">'+av+'<div class="avatar-actions"><label for="authAvatar">📷 Carica foto profilo<input id="authAvatar" type="file" accept="image/jpeg,image/png,image/webp"></label><div class="avatar-note">JPG, PNG o WEBP · max 5 MB</div></div></div>'+input('authName','text','Nome visualizzato',p?.display_name||'');
      q('#authAvatar').onchange=uploadAvatar;submit.textContent='SALVA PROFILO';submit.style.display='block';sw.textContent='CAMBIA PASSWORD';sw.style.display='block';forgot.style.display='none';logout.style.display='block';return}
    if(mode==='myreviews'&&user){title.textContent='Le mie recensioni';text.textContent='Tutte le recensioni pubblicate dal tuo account.';submit.style.display=sw.style.display=forgot.style.display=logout.style.display='none';fields().innerHTML='<div id="myReviews">Caricamento...</div>';loadMyReviews(user);return}
    if(mode==='register'){title.textContent='Registrati';text.textContent='Crea il tuo account per lasciare recensioni.';fields().innerHTML=input('authName','text','Nome visualizzato')+input('authEmail','email','Email')+input('authPassword','password','Password (min. 6 caratteri)');submit.textContent='REGISTRATI';sw.textContent='HO GIÀ UN ACCOUNT';submit.style.display=sw.style.display='block';forgot.style.display=logout.style.display='none';return}
    if(mode==='forgot'){title.textContent='Recupera password';text.textContent='Inserisci la tua email: ti invieremo un link per scegliere una nuova password.';fields().innerHTML=input('authEmail','email','Email');submit.textContent='INVIA EMAIL';sw.textContent='TORNA ALL’ACCESSO';submit.style.display=sw.style.display='block';forgot.style.display=logout.style.display='none';return}
    if(mode==='reset'){title.textContent='Nuova password';text.textContent='Scegli una nuova password per il tuo account.';fields().innerHTML=input('authPassword','password','Nuova password (min. 6 caratteri)');submit.textContent='SALVA NUOVA PASSWORD';sw.style.display=forgot.style.display=logout.style.display='none';submit.style.display='block';return}
    title.textContent='Accedi';text.textContent='Accedi per lasciare recensioni.';fields().innerHTML=input('authEmail','email','Email')+input('authPassword','password','Password');submit.textContent='ACCEDI';sw.textContent='REGISTRATI';submit.style.display=sw.style.display=forgot.style.display='block';logout.style.display='none';
  }
  async function uploadAvatar(){
    const file=q('#authAvatar')?.files?.[0],user=await currentUser();if(!file||!user)return;
    if(file.size>5242880){msg('La foto deve essere massimo 5 MB.');return}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){msg('Usa JPG, PNG o WEBP.');return}
    msg('Caricamento foto...');const ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path=user.id+'/avatar.'+ext;
    const up=await s.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'});if(up.error){msg(up.error.message);return}
    const {data:urlData}=s.storage.from('avatars').getPublicUrl(path);const avatar_url=urlData.publicUrl+'?v='+Date.now();
    const a=await s.auth.updateUser({data:{avatar_url}});if(a.error){msg(a.error.message);return}
    const p=await s.from('profiles').upsert({id:user.id,display_name:profileCache?.display_name||user.user_metadata?.display_name||'Utente',avatar_url});if(p.error){msg(p.error.message);return}
    profileCache={...(profileCache||{}),id:user.id,avatar_url};msg('Foto profilo aggiornata!');await refresh();await render();
  }
  async function loadMyReviews(user){const box=q('#myReviews');if(!box)return;const {data,error}=await s.from('reviews').select('rating,comment,place_type,place_id,created_at').eq('user_id',user.id).order('created_at',{ascending:false});if(error){box.textContent='Impossibile caricare le recensioni.';return}if(!data?.length){box.textContent='Non hai ancora pubblicato recensioni.';return}box.innerHTML=data.map(r=>'<div class="my-review"><div class="stars">'+'★'.repeat(r.rating)+'☆'.repeat(5-r.rating)+'</div><div>'+esc(r.comment)+'</div><div class="date">'+new Date(r.created_at).toLocaleDateString('it-IT')+' · '+esc(r.place_type)+'</div></div>').join('')}
  async function open(which){msg('');const user=await currentUser();mode=which||(user?'account':'login');modal.classList.add('open');await render()}
  function close(){modal.classList.remove('open');msg('')}
  function closeMenu(){menu.classList.remove('open')}
  async function toggleMenu(){const user=await currentUser();if(!user){await open('login');return}const r=fab.getBoundingClientRect();menu.style.top=(r.bottom+8)+'px';menu.style.right=Math.max(12,window.innerWidth-r.right)+'px';menu.classList.toggle('open')}

  fab.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();await toggleMenu()});q('.auth-close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!fab.contains(e.target))closeMenu()});
  menu.addEventListener('click',async e=>{const a=e.target.closest('[data-action]');if(!a)return;closeMenu();const act=a.dataset.action;if(act==='logout'){await s.auth.signOut();mode='login';await refresh();return}if(act==='reviews')return open('myreviews');if(act==='name'||act==='profile')return open('account')});
  q('#authSwitch').onclick=async()=>{if(mode==='login')mode='register';else if(mode==='register'||mode==='forgot')mode='login';else if(mode==='account')mode='forgot';await render()};q('#authForgot').onclick=async()=>{mode='forgot';await render()};
  q('#authSubmit').onclick=async()=>{msg('');const email=(q('#authEmail')?.value||'').trim(),password=q('#authPassword')?.value||'',name=(q('#authName')?.value||'').trim();try{
    if(mode==='login'){if(!email||!password){msg('Inserisci email e password.');return}const r=await s.auth.signInWithPassword({email,password});if(r.error)throw r.error;msg('Accesso effettuato!');await refresh();setTimeout(close,500);return}
    if(mode==='register'){if(!email||password.length<6||name.length<2){msg('Inserisci nome, email e una password di almeno 6 caratteri.');return}const r=await s.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:redirectUrl}});if(r.error)throw r.error;if(r.data.user)await s.from('profiles').upsert({id:r.data.user.id,display_name:name});msg('Registrazione completata! Controlla la tua email e conferma l’account prima di accedere.');return}
    if(mode==='forgot'){if(!email){msg('Inserisci la tua email.');return}const r=await s.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl+'?resetPassword=1'});if(r.error)throw r.error;msg('Email inviata! Controlla la posta e clicca sul link per scegliere una nuova password.');return}
    if(mode==='reset'){if(password.length<6){msg('La password deve avere almeno 6 caratteri.');return}const r=await s.auth.updateUser({password});if(r.error)throw r.error;msg('Password aggiornata con successo!');await refresh();setTimeout(close,700);return}
    if(mode==='account'){if(name.length<2){msg('Inserisci un nome valido.');return}const r=await s.auth.updateUser({data:{display_name:name}});if(r.error)throw r.error;const user=await currentUser();if(user){const p=await getProfile(user);await s.from('profiles').upsert({id:user.id,display_name:name,avatar_url:p?.avatar_url||null});profileCache={...(p||{}),display_name:name}}msg('Profilo aggiornato!');await refresh();return}
  }catch(e){msg(e?.message||'Si è verificato un errore. Riprova.')}};
  const logout=document.createElement('button');logout.type='button';logout.className='danger';logout.id='authLogout';logout.textContent='ESCI DALL’ACCOUNT';q('.auth-box').appendChild(logout);logout.onclick=async()=>{await s.auth.signOut();mode='login';await refresh();await render();msg('Sei uscito dal tuo account.')};
  s.auth.onAuthStateChange(async(event,session)=>{profileCache=null;await refresh();if(event==='PASSWORD_RECOVERY'){mode='reset';modal.classList.add('open');await render()}if((event==='SIGNED_IN'||event==='TOKEN_REFRESHED')&&session?.user&&modal.classList.contains('open')){mode='account';await render()}});
  refresh();if(new URLSearchParams(window.location.search).get('resetPassword')==='1'){mode='reset';modal.classList.add('open');render()}
  window.ReviewsAuth={client:s,open,refresh,getUser:currentUser,getProfile};
})();