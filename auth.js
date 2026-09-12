(function(){
  const cfg=window.SUPABASE_CONFIG;
  if(!cfg||!window.supabase)return;

  const s=window.supabase.createClient(cfg.url,cfg.key,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const redirectUrl=window.location.origin+window.location.pathname;

  const style=document.createElement('style');
  style.textContent=`
  .auth-fab{position:fixed;right:18px;bottom:18px;z-index:9999;border:0;border-radius:999px;background:#f5a719;color:#004d36;padding:13px 18px;font:800 16px 'Roboto Condensed',sans-serif;box-shadow:0 8px 22px rgba(0,0,0,.22);cursor:pointer}
  .auth-modal{position:fixed;inset:0;z-index:10000;background:rgba(0,45,32,.45);display:none;align-items:center;justify-content:center;padding:16px}.auth-modal.open{display:flex}
  .auth-box{width:min(430px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:24px;color:#143d2c;box-shadow:0 20px 50px rgba(0,0,0,.28)}
  .auth-box h2{margin:0 0 6px}.auth-box p{color:#65736d}.auth-box input{width:100%;box-sizing:border-box;padding:13px;margin:7px 0;border:1px solid #ccd8d2;border-radius:10px;font:inherit}
  .auth-box button{width:100%;padding:13px;border:0;border-radius:10px;background:#075c3b;color:#fff;font:800 16px inherit;cursor:pointer;margin-top:8px}.auth-box .alt{background:#edf3ef;color:#075c3b}.auth-box .danger{background:#f8e9e7;color:#a22}
  .auth-msg{min-height:20px;font-weight:700;font-size:14px;margin-top:10px}.auth-close{float:right;width:auto!important;background:transparent!important;color:#075c3b!important;font-size:26px!important;margin:0!important}
  .auth-link{display:block;background:transparent!important;color:#075c3b!important;text-decoration:underline;font-size:14px!important;padding:8px 0!important;margin:4px 0!important}.auth-divider{height:1px;background:#e3ebe6;margin:15px 0}
  `;
  document.head.appendChild(style);

  const fab=document.createElement('button');
  fab.className='auth-fab';
  fab.type='button';
  fab.setAttribute('aria-label','Accedi o apri il tuo account');
  document.body.appendChild(fab);

  const modal=document.createElement('div');
  modal.className='auth-modal';
  modal.innerHTML=`<div class="auth-box" role="dialog" aria-modal="true">
    <button class="auth-close" type="button" aria-label="Chiudi">×</button>
    <h2 id="authTitle">Accedi</h2><p id="authText">Accedi per lasciare recensioni.</p>
    <div id="authFields"></div>
    <button id="authSubmit" type="button">ACCEDI</button>
    <button id="authSwitch" class="alt" type="button">REGISTRATI</button>
    <button id="authForgot" class="auth-link" type="button">Password dimenticata?</button>
    <div class="auth-msg" id="authMsg" aria-live="polite"></div>
  </div>`;
  document.body.appendChild(modal);

  let mode='login';
  const q=x=>modal.querySelector(x);
  const msg=t=>q('#authMsg').textContent=t||'';
  const fields=()=>q('#authFields');
  const esc=v=>String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function input(id,type,placeholder,value=''){
    return `<input id="${id}" type="${type}" placeholder="${placeholder}" value="${esc(value)}" autocomplete="${type==='password'?'new-password':'on'}">`;
  }

  async function currentUser(){
    const {data:{session}}=await s.auth.getSession();
    if(session&&session.user)return session.user;
    const {data:{user}}=await s.auth.getUser();
    return user||null;
  }

  async function refresh(){
    const user=await currentUser();
    fab.textContent=user?'👤 '+(user.user_metadata?.display_name||user.email.split('@')[0]):'👤 ACCEDI';
    document.dispatchEvent(new CustomEvent('reviews-auth-changed',{detail:{user}}));
    return user;
  }

  async function render(){
    msg('');
    const user=await currentUser();
    const title=q('#authTitle'),text=q('#authText'),submit=q('#authSubmit'),sw=q('#authSwitch'),forgot=q('#authForgot');

    if(mode==='account'&&user){
      title.textContent='Il mio account';
      text.textContent='Sei già autenticato. Qui puoi gestire il tuo profilo.';
      fields().innerHTML=input('authName','text','Nome visualizzato',user.user_metadata?.display_name||'');
      submit.textContent='SALVA NOME';submit.style.display='block';
      sw.textContent='CAMBIA PASSWORD';sw.style.display='block';
      forgot.style.display='none';
      logout.style.display='block';
      return;
    }
    if(mode==='register'){
      title.textContent='Registrati';
      text.textContent='Crea il tuo account per lasciare recensioni.';
      fields().innerHTML=input('authName','text','Nome visualizzato')+input('authEmail','email','Email')+input('authPassword','password','Password (min. 6 caratteri)');
      submit.textContent='REGISTRATI';sw.textContent='HO GIÀ UN ACCOUNT';
      submit.style.display=sw.style.display='block';forgot.style.display='none';logout.style.display='none';return;
    }
    if(mode==='forgot'){
      title.textContent='Recupera password';
      text.textContent='Inserisci la tua email: ti invieremo un link per scegliere una nuova password.';
      fields().innerHTML=input('authEmail','email','Email');
      submit.textContent='INVIA EMAIL';sw.textContent='TORNA ALL’ACCESSO';
      submit.style.display=sw.style.display='block';forgot.style.display='none';logout.style.display='none';return;
    }
    if(mode==='reset'){
      title.textContent='Nuova password';
      text.textContent='Scegli una nuova password per il tuo account.';
      fields().innerHTML=input('authPassword','password','Nuova password (min. 6 caratteri)');
      submit.textContent='SALVA NUOVA PASSWORD';sw.style.display='none';forgot.style.display='none';logout.style.display='none';return;
    }
    title.textContent='Accedi';text.textContent='Accedi per lasciare recensioni.';
    fields().innerHTML=input('authEmail','email','Email')+input('authPassword','password','Password');
    submit.textContent='ACCEDI';sw.textContent='REGISTRATI';
    submit.style.display=sw.style.display=forgot.style.display='block';logout.style.display='none';
  }

  async function open(){
    msg('');
    const user=await currentUser();
    mode=user?'account':'login';
    modal.classList.add('open');
    await render();
  }
  function close(){modal.classList.remove('open');msg('')}

  fab.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();await open()});
  q('.auth-close').onclick=close;
  modal.addEventListener('click',e=>{if(e.target===modal)close()});

  q('#authSwitch').onclick=async()=>{
    if(mode==='login')mode='register';
    else if(mode==='register'||mode==='forgot')mode='login';
    else if(mode==='account')mode='forgot';
    await render();
  };
  q('#authForgot').onclick=async()=>{mode='forgot';await render()};

  q('#authSubmit').onclick=async()=>{
    msg('');
    const email=(q('#authEmail')?.value||'').trim();
    const password=q('#authPassword')?.value||'';
    const name=(q('#authName')?.value||'').trim();
    try{
      if(mode==='login'){
        if(!email||!password){msg('Inserisci email e password.');return}
        const r=await s.auth.signInWithPassword({email,password});
        if(r.error)throw r.error;
        msg('Accesso effettuato!');await refresh();setTimeout(close,700);return;
      }
      if(mode==='register'){
        if(!email||password.length<6||name.length<2){msg('Inserisci nome, email e una password di almeno 6 caratteri.');return}
        const r=await s.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:redirectUrl}});
        if(r.error)throw r.error;
        if(r.data.user)await s.from('profiles').upsert({id:r.data.user.id,display_name:name});
        msg('Registrazione completata! Controlla la tua email e conferma l’account prima di accedere.');
        return;
      }
      if(mode==='forgot'){
        if(!email){msg('Inserisci la tua email.');return}
        const r=await s.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl+'?resetPassword=1'});
        if(r.error)throw r.error;
        msg('Email inviata! Controlla la posta e clicca sul link per scegliere una nuova password.');
        return;
      }
      if(mode==='reset'){
        if(password.length<6){msg('La password deve avere almeno 6 caratteri.');return}
        const r=await s.auth.updateUser({password});
        if(r.error)throw r.error;
        msg('Password aggiornata con successo!');await refresh();setTimeout(close,900);return;
      }
      if(mode==='account'){
        if(name.length<2){msg('Inserisci un nome valido.');return}
        const r=await s.auth.updateUser({data:{display_name:name}});
        if(r.error)throw r.error;
        const user=await currentUser();
        if(user)await s.from('profiles').upsert({id:user.id,display_name:name});
        msg('Nome account aggiornato!');await refresh();return;
      }
    }catch(e){msg(e?.message||'Si è verificato un errore. Riprova.')}
  };

  const logout=document.createElement('button');
  logout.type='button';logout.className='danger';logout.id='authLogout';logout.textContent='ESCI DALL’ACCOUNT';
  q('.auth-box').appendChild(logout);
  logout.onclick=async()=>{await s.auth.signOut();mode='login';await refresh();await render();msg('Sei uscito dal tuo account.')};

  s.auth.onAuthStateChange(async(event,session)=>{
    await refresh();
    if(event==='PASSWORD_RECOVERY'){
      mode='reset';modal.classList.add('open');await render();
    }
    if((event==='SIGNED_IN'||event==='TOKEN_REFRESHED')&&session?.user&&modal.classList.contains('open')){
      mode='account';await render();
    }
  });

  refresh();
  if(new URLSearchParams(window.location.search).get('resetPassword')==='1'){
    mode='reset';modal.classList.add('open');render();
  }

  window.ReviewsAuth={client:s,open,refresh,getUser:currentUser};
})();