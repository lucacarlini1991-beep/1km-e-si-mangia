(()=>{
const exits=window.USCITE2||[];
const list=document.querySelector('#exitList'),chooser=document.querySelector('#chooser'),detail=document.querySelector('#detail'),input=document.querySelector('#exitSearch'),suggestions=document.querySelector('#suggestions'),clear=document.querySelector('#clearSearch'),locate=document.querySelector('#locateMe'),locationStatus=document.querySelector('#locationStatus'),chooserTitle=document.querySelector('#chooserTitle'),tabsEl=document.querySelector('#tabs'),roadName=document.querySelector('#roadName'),exitName=document.querySelector('#exitName'),exitDescription=document.querySelector('#exitDescription'),mapLink=document.querySelector('#mapLink');
let current=null,shownExits=exits.slice(),distanceLimit=5,zone='all',maxInitial=30;
const tabs={places:{icon:'✨',title:'Cosa offre l’uscita'},parking:{icon:'🅿️',title:'Parcheggi'},camper:{icon:'🚐',title:'Camper'}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km=(a,b,c,d)=>{const R=6371,q=x=>x*Math.PI/180,h=Math.sin(q(c-a)/2)**2+Math.cos(q(a))*Math.cos(q(c))*Math.sin(q(d-b)/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))};
const zoneOf=e=>e.lat>=44.5?'Nord':e.lat>=42?'Centro':e.lat>=39?'Sud':'Isole';
function filteredItems(){
  const q=input.value.trim().toLowerCase();
  let arr=shownExits.filter(e=>zone==='all'||zoneOf(e)===zone);
  if(q)arr=arr.filter(e=>(e.name+' '+e.road+' '+e.city).toLowerCase().includes(q));
  return arr;
}
function renderList(items=filteredItems(),limit=maxInitial){
  const total=items.length,visible=items.slice(0,limit);
  document.querySelector('#exitCount').textContent=(total>visible.length?visible.length+' di '+total:total)+' uscite';
  list.innerHTML=visible.map(e=>'<article class="exit-card" data-id="'+esc(e.id)+'"><span class="badge">'+esc(e.road)+'</span>'+(e.distance!=null?'<span class="distance">📍 '+e.distance.toFixed(1)+' km</span>':'')+'<h3>'+esc(e.name)+'</h3><p>'+esc(e.city)+'</p></article>').join('');
  list.querySelectorAll('.exit-card').forEach(x=>x.onclick=()=>openExit(x.dataset.id));
  const old=document.querySelector('#loadMoreExits');if(old)old.remove();
  if(visible.length<total){const b=document.createElement('button');b.id='loadMoreExits';b.className='load-more-exits';b.textContent='Mostra altre '+Math.min(30,total-visible.length)+' uscite';b.onclick=()=>renderList(items,Math.min(limit+30,total));list.after(b)}
}
function setupZoneFilter(){
  const host=document.createElement('div');host.className='exit-filters';
  host.innerHTML='<span class="filter-label">📍 Zona</span><div class="zone-pills">'+[['all','Tutta Italia'],['Nord','Nord'],['Centro','Centro'],['Sud','Sud'],['Isole','Isole']].map(([v,t])=>'<button type="button" class="zone-pill '+(v==='all'?'active':'')+'" data-zone="'+v+'">'+t+'</button>').join('')+'</div>';
  input.closest('.search').after(host);
  host.querySelectorAll('.zone-pill').forEach(b=>b.onclick=()=>{zone=b.dataset.zone;host.querySelectorAll('.zone-pill').forEach(x=>x.classList.toggle('active',x===b));renderList(filteredItems())});
}
function openExit(id){
  current=exits.find(x=>x.id===id);if(!current)return;
  suggestions.innerHTML='';input.value='';clear.hidden=true;
  chooser.classList.add('hidden');detail.classList.remove('hidden');
  roadName.textContent=current.road;exitName.textContent=current.name;
  exitDescription.textContent='Scopri prima cosa vedere e visitare, poi parcheggi e aree camper nei dintorni dell’uscita.';
  mapLink.href='https://www.google.com/maps/search/?api=1&query='+current.lat+','+current.lng;
  renderTabs('places');window.scrollTo({top:0,behavior:'smooth'});
}
function renderDistance(){
  let b=document.querySelector('#distanceFilter');
  if(!b){b=document.createElement('div');b.id='distanceFilter';b.className='distance-filter';tabsEl.before(b)}
  const L=[1,3,5,10,20,'all'];
  b.innerHTML='<span>📍 Distanza:</span>'+L.map(x=>'<button class="distance-pill '+(x===distanceLimit?'active':'')+'" data-d="'+x+'">'+(x==='all'?'Tutto':x+' km')+'</button>').join('');
  b.querySelectorAll('button').forEach(x=>x.onclick=()=>{distanceLimit=x.dataset.d==='all'?'all':+x.dataset.d;renderTabs(document.querySelector('.tab.active')?.dataset.tab||'parking')});
}
function renderTabs(active){
  renderDistance();
  tabsEl.innerHTML=Object.entries(tabs).map(([k,t])=>'<button class="tab '+(k===active?'active':'')+'" data-tab="'+k+'"><span class="tab-icon">'+t.icon+'</span>'+t.title+'</button>').join('');
  tabsEl.querySelectorAll('button').forEach(x=>x.onclick=()=>renderTabs(x.dataset.tab));
  const b=document.querySelector('#tabContent');
  if(active==='parking')return Uscita2Parking.render(current,b,distanceLimit);
  if(active==='camper')return Uscita2Camper.render(current,b,distanceLimit);
  return Uscita2Luoghi.render(current,b,distanceLimit);
}
function search(){
  const q=input.value.trim().toLowerCase();clear.hidden=!q;
  chooser.classList.remove('hidden');
  const f=exits.filter(e=>(e.name+' '+e.road+' '+e.city).toLowerCase().includes(q)).slice(0,8);
  suggestions.innerHTML=q?(f.length?f.map(e=>'<div class="suggestion" data-id="'+esc(e.id)+'"><b>'+esc(e.name)+'</b><span>'+esc(e.road)+' · '+esc(e.city)+'</span></div>').join(''):'<div class="suggestion no-results">Nessuna uscita trovata. Prova con un altro nome.</div>'):'';
  suggestions.querySelectorAll('[data-id]').forEach(x=>x.onclick=()=>openExit(x.dataset.id));
  renderList(filteredItems());
}
input.oninput=search;
input.onfocus=()=>{if(input.value.trim())search()};
clear.onclick=()=>{input.value='';search();input.focus()};
locate.onclick=()=>{
  if(!navigator.geolocation){locationStatus.textContent='La geolocalizzazione non è disponibile su questo dispositivo.';return}
  locate.disabled=true;locationStatus.textContent='Cerco le uscite più vicine...';
  navigator.geolocation.getCurrentPosition(p=>{
    shownExits=exits.map(e=>({...e,distance:km(p.coords.latitude,p.coords.longitude,e.lat,e.lng)})).sort((a,b)=>a.distance-b.distance).slice(0,20);
    chooserTitle.textContent='Uscite più vicine a te';renderList(shownExits,20);
    chooser.classList.remove('hidden');suggestions.innerHTML='';locationStatus.textContent='';
    locate.disabled=false;chooser.scrollIntoView({behavior:'smooth',block:'start'});
  },()=>{locationStatus.textContent='Non sono riuscito a rilevare la posizione. Controlla i permessi del browser.';locate.disabled=false;},{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
};
document.querySelector('#allExits').onclick=()=>{
  detail.classList.add('hidden');chooser.classList.remove('hidden');chooserTitle.textContent='Scegli la tua uscita';renderList(filteredItems());input.value='';clear.hidden=true;suggestions.innerHTML='';window.scrollTo({top:0,behavior:'smooth'});
};
setupZoneFilter();
chooserTitle.textContent='Scegli la tua uscita';
renderList(shownExits);
chooser.classList.remove('hidden');
})();