const API='/api/fuel-nearby';
let map,userMarker,stationLayer,userPos,radius=10;
const statusEl=document.getElementById('status'),stationsEl=document.getElementById('stations'),countEl=document.getElementById('count');
map=L.map('fuelMap',{zoomControl:true}).setView([42.5,12.5],6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
stationLayer=L.layerGroup().addTo(map);
function money(v){return v==null?'—':'€ '+Number(v).toFixed(3).replace('.',',')}
function navLinks(lat,lon){
  const q=encodeURIComponent(lat+','+lon);
  return {
    google:'https://www.google.com/maps/dir/?api=1&destination='+q,
    waze:'https://www.waze.com/ul?ll='+q+'&navigate=yes',
    apple:'https://maps.apple.com/?daddr='+q+'&dirflg=d'
  };
}
async function communityReports(list){
  const s=window.ReviewsAuth?.client;
  if(!s||!list.length)return {};
  const ids=list.map(x=>x.mimit_id).filter(Boolean);
  if(!ids.length)return {};
  const {data}=await s.from('user_fuel_price_reports').select('station_mimit_id,benzina_self,benzina_servito,gasolio_self,gasolio_servito,gpl_self,gpl_servito,metano_self,metano_servito,observed_at').in('station_mimit_id',ids).order('observed_at',{ascending:false}).limit(500);
  const out={};
  (data||[]).forEach(r=>{if(!out[r.station_mimit_id])out[r.station_mimit_id]=r});
  return out;
}
function communityLabel(r){
  if(!r)return '';
  const vals=[];
  if(r.benzina_self!=null)vals.push('Benzina '+Number(r.benzina_self).toFixed(3));
  if(r.gasolio_self!=null)vals.push('Gasolio '+Number(r.gasolio_self).toFixed(3));
  if(r.gpl_self!=null)vals.push('GPL '+Number(r.gpl_self).toFixed(3));
  if(r.metano_self!=null)vals.push('Metano '+Number(r.metano_self).toFixed(3));
  return vals.length?'👥 Segnalazione utenti: '+vals.join(' · '):'';
}
function icon(s){return L.divIcon({className:'fuel-marker',html:'<div style="background:#075c3b;color:#fff;border:3px solid #fff;box-shadow:0 2px 8px #555;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-weight:900">⛽</div>',iconSize:[42,42],iconAnchor:[21,21]})}
const fuelNavStyle=document.createElement('style');fuelNavStyle.textContent='.fuel-nav-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)}.fuel-nav-box{width:min(780px,calc(100vw - 36px));max-width:780px;background:#fff;border-radius:28px;padding:34px 34px 30px;box-shadow:0 25px 70px rgba(0,0,0,.28);position:relative}.fuel-nav-kicker{color:#b27a08;font-size:14px;font-weight:900;letter-spacing:3px;margin-bottom:4px}.fuel-nav-title{color:#075c3b;font-size:34px;line-height:1.05;font-weight:900;letter-spacing:.5px;margin:0 58px 8px}.fuel-nav-place{color:#66736d;font-size:18px;margin-bottom:20px}.fuel-nav-close{position:absolute;right:22px;top:20px;width:54px;height:54px;border:0;border-radius:50%;background:#f1f3f2;color:#222;font-size:38px;line-height:1;cursor:pointer}.fuel-nav-options{display:grid;gap:12px}.fuel-nav-option{display:flex;align-items:center;gap:22px;min-height:112px;padding:18px 24px;border:2px solid #e0e4e2;border-radius:22px;background:#fff;color:#222;text-decoration:none;box-shadow:0 2px 5px rgba(0,0,0,.04);transition:.18s}.fuel-nav-option:hover{border-color:#075c3b;transform:translateY(-1px)}.fuel-nav-icon{width:70px;height:70px;border-radius:18px;background:#f4f5f4;display:flex;align-items:center;justify-content:center;flex:0 0 70px}.fuel-nav-icon svg{width:52px;height:52px}.fuel-nav-option strong{display:block;font-size:24px;line-height:1.1;margin-bottom:6px}.fuel-nav-option small{display:block;color:#777;font-size:18px;line-height:1.2}.fuel-nav-cancel{width:100%;margin-top:14px;border:0;border-radius:18px;background:#eee;color:#222;padding:18px;font-size:20px;font-weight:900;cursor:pointer}.fuel-nav-cancel:hover{background:#e4e4e4}@media(max-width:700px){.fuel-nav-box{width:calc(100vw - 36px);padding:30px 16px 18px;border-radius:26px}.fuel-nav-kicker{font-size:12px;letter-spacing:2.5px;margin-left:20px}.fuel-nav-title{font-size:27px;margin-left:20px;margin-right:48px}.fuel-nav-place{font-size:16px;margin-left:20px;margin-bottom:18px}.fuel-nav-close{right:16px;top:16px;width:50px;height:50px;font-size:35px}.fuel-nav-option{min-height:112px;padding:14px 18px;gap:18px;border-radius:20px}.fuel-nav-icon{width:64px;height:64px;flex-basis:64px}.fuel-nav-icon svg{width:48px;height:48px}.fuel-nav-option strong{font-size:21px}.fuel-nav-option small{font-size:16px}.fuel-nav-cancel{font-size:18px;padding:16px;border-radius:16px}}';document.head.appendChild(fuelNavStyle);
function ensureNavModal(){
  if(document.getElementById('fuelNavModal'))return;
  const d=document.createElement('div');
  d.id='fuelNavModal';
  d.innerHTML=`<div class="fuel-nav-backdrop"><div class="fuel-nav-box" role="dialog" aria-modal="true" aria-labelledby="fuelNavTitle"><button class="fuel-nav-close" aria-label="Chiudi">×</button><div class="fuel-nav-kicker">1 KM E SI MANGIA</div><div id="fuelNavTitle" class="fuel-nav-title">COME VUOI NAVIGARE?</div><div id="fuelNavPlace" class="fuel-nav-place"></div><div class="fuel-nav-options"><a id="fuelNavGoogle" class="fuel-nav-option" target="_blank" rel="noopener"><span class="fuel-nav-icon google-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M24 9.5c3.54 0 6.38 1.22 8.68 3.6l6.36-6.2C35.16 3.64 30.02 1.5 24 1.5 14.73 1.5 6.73 6.82 2.82 14.56l7.4 5.75C12.08 14.04 17.5 9.5 24 9.5Z"/><path fill="#34A853" d="M46.5 24.5c0-1.63-.15-3.2-.43-4.71H24v9.02h12.63c-.54 2.91-2.2 5.37-4.69 7.03l7.56 5.87C43.9 37.57 46.5 31.6 46.5 24.5Z"/><path fill="#FBBC05" d="M10.22 28.31A14.5 14.5 0 0 1 9.5 24c0-1.5.25-2.95.72-4.31l-7.4-5.75A22.44 22.44 0 0 0 1.5 24c0 3.62.86 7.04 2.32 10.06l7.4-5.75Z"/><path fill="#EA4335" d="M24 46.5c6.02 0 11.07-1.99 14.76-5.39l-7.56-5.87c-2.04 1.37-4.65 2.19-7.2 2.19-6.5 0-11.92-4.54-13.78-10.81l-7.4 5.75C6.73 41.18 14.73 46.5 24 46.5Z"/></svg></span><span><strong>Google Maps</strong><small>Avvia indicazioni stradali</small></span></a><a id="fuelNavWaze" class="fuel-nav-option" target="_blank" rel="noopener"><span class="fuel-nav-icon waze-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#111" d="M39.6 25.2c0-10.6-9.2-19-20.7-19C8.8 6.2.7 13.8.7 23.4c0 5.1 2.4 9.6 6.4 12.7-.2 2.9-1.4 5.1-3.5 6.8 4.9.5 9-1.1 11.4-3.3 1.3.3 2.7.5 4.1.5 11.5 0 20.5-5.9 20.5-14.9Z"/><circle cx="16" cy="23" r="2.2" fill="#fff"/><circle cx="27" cy="23" r="2.2" fill="#fff"/><path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" d="M16 29c3.2 2.4 7.6 2.4 10.8 0"/></svg></span><span><strong>Waze</strong><small>Apri Waze e naviga</small></span></a><a id="fuelNavApple" class="fuel-nav-option" target="_blank" rel="noopener"><span class="fuel-nav-icon apple-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#111" d="M31.5 25.1c0-4.8 3.9-7.1 4.1-7.2-2.2-3.2-5.6-3.6-6.8-3.7-2.9-.3-5.7 1.7-7.2 1.7-1.5 0-3.8-1.7-6.2-1.7-3.2.1-6.2 1.9-7.9 4.8-3.4 5.9-.9 14.6 2.4 19.4 1.6 2.4 3.5 5 6 4.9 2.4-.1 3.3-1.6 6.2-1.6 2.9 0 3.8 1.6 6.3 1.5 2.6 0 4.2-2.4 5.8-4.8 1.8-2.8 2.5-5.5 2.6-5.6-.1 0-5.1-2-5.3-7.7ZM27.2 11.4c1.3-1.7 2.1-4.1 1.8-6.4-2 .1-4.4 1.4-5.7 3.1-1.2 1.5-2.2 3.9-1.9 6.1 2.2.2 4.5-1.1 5.8-2.8Z"/></svg></span><span><strong>Apple Maps</strong><small>Apri Mappe e naviga</small></span></a></div><button class="fuel-nav-cancel" type="button">ANNULLA</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector('.fuel-nav-close').onclick=()=>d.remove();
  d.querySelector('.fuel-nav-cancel').onclick=()=>d.remove();
  d.querySelector('.fuel-nav-backdrop').onclick=e=>{if(e.target===e.currentTarget)d.remove()};
}
function openNavChooser(lat,lon,place){
  ensureNavModal();
  const n=navLinks(lat,lon);
  document.getElementById('fuelNavGoogle').href=n.google;
  document.getElementById('fuelNavWaze').href=n.waze;
  document.getElementById('fuelNavApple').href=n.apple;
  document.getElementById('fuelNavPlace').textContent=place||'Distributore carburanti';
}
window.__fuelStationsById=window.__fuelStationsById||{};
window.openFuelReport=function(mimitId){const station=window.__fuelStationsById?.[String(mimitId)];if(station)window.Contributi?.open('fuel',station)};
function popup(s){return '<div style="min-width:220px"><b style="font-size:16px">'+(s.brand||s.name||'Distributore')+'</b><br><small>'+[s.address,s.municipality].filter(Boolean).join(' · ')+'</small><div style="margin:10px 0;display:grid;gap:5px"><div>🟢 Benzina <b>'+money(s.benzina)+'</b></div><div>🟡 Gasolio <b>'+money(s.gasolio)+'</b></div><div>🔵 GPL <b>'+money(s.gpl)+'</b></div></div><button type="button" onclick="openNavChooser('+Number(s.lat)+','+Number(s.lon)+','+JSON.stringify((s.brand||s.name||'Distributore')).replace(/'/g,"\\'")+')" style="width:100%;border:0;background:#075c3b;color:#fff;padding:11px 10px;border-radius:10px;font-weight:900;font-size:14px;cursor:pointer">NAVIGA →</button><button type="button" onclick="openFuelReport(\'+String(s.mimit_id)+\')" style="width:100%;margin-top:8px;border:1px solid #075c3b;background:#fff;color:#075c3b;padding:10px;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer">✏️ SEGNALA PREZZI TROVATI</button></div>'}

async function load(){if(!userPos)return;statusEl.textContent='⛽ Cerco i distributori e i prezzi aggiornati...';stationLayer.clearLayers();stationsEl.innerHTML='';
try{const u=API+'?lat='+userPos.lat+'&lon='+userPos.lng+'&radius='+radius+'&limit=150';const r=await fetch(u);const d=await r.json();if(!r.ok)throw new Error(d.error||'Errore API');const list=d.stations||[];list.forEach(s=>{if(s.mimit_id)window.__fuelStationsById[String(s.mimit_id)]=s});const reports=await communityReports(list);countEl.textContent=list.length;statusEl.textContent='✓ '+list.length+' distributori nel raggio di '+radius+' km';list.forEach(s=>{L.marker([s.lat,s.lon],{icon:icon(s)}).addTo(stationLayer).bindPopup(popup(s));const card=document.createElement('article');card.className='station-card';card.innerHTML='<div><h3>'+((s.brand||s.name||'Distributore'))+'</h3><p>'+[s.address,s.municipality].filter(Boolean).join(' · ')+' · 📍 '+Number(s.distance_km).toFixed(1).replace('.',',')+' km</p><div class="prices"><span class="price">🟢 Benzina '+money(s.benzina)+'</span><span class="price">🟡 Gasolio '+money(s.gasolio)+'</span><span class="price">🔵 GPL '+money(s.gpl)+'</span></div>'+(communityLabel(reports[s.mimit_id])?'<div style="margin-top:8px;font-size:12px;color:#075c3b;font-weight:800">'+communityLabel(reports[s.mimit_id])+'</div>':'')+'</div><a class="nav-btn" href="#" rel="noopener">NAVIGA →</a>';card.querySelector('.nav-btn').onclick=e=>{e.preventDefault();openNavChooser(s.lat,s.lon,(s.brand||s.name||'Distributore'))};card.onclick=e=>{if(e.target.tagName!=='A')map.setView([s.lat,s.lon],16)};stationsEl.appendChild(card)});if(list.length){const bounds=L.latLngBounds(list.map(s=>[s.lat,s.lon]));bounds.extend([userPos.lat,userPos.lng]);map.fitBounds(bounds,{padding:[45,45],maxZoom:14})}}catch(e){statusEl.textContent='⚠️ '+e.message}}
function goToMyPosition(){if(userPos){map.flyTo(userPos,15,{animate:true,duration:.7});userMarker?.openPopup()}else locate()}
function locate(){statusEl.textContent='📍 Sto localizzando la tua posizione...';navigator.geolocation.getCurrentPosition(p=>{userPos=L.latLng(p.coords.latitude,p.coords.longitude);if(userMarker)map.removeLayer(userMarker);userMarker=L.circleMarker(userPos,{radius:11,color:'#fff',weight:4,fillColor:'#2474d6',fillOpacity:1}).addTo(map).bindPopup('📍 Tu sei qui');goToMyPosition();load()},e=>{statusEl.textContent='⚠️ Non riesco ad accedere alla posizione. Controlla i permessi del browser.'},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
document.getElementById('locateBtn').onclick=locate;
document.getElementById('recenter').onclick=goToMyPosition;
document.querySelectorAll('[data-radius]').forEach(b=>b.onclick=()=>{radius=Number(b.dataset.radius);document.querySelectorAll('[data-radius]').forEach(x=>x.classList.toggle('active',x===b));load()});