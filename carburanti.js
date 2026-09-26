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
const fuelNavStyle=document.createElement('style');fuelNavStyle.textContent='.fuel-nav-backdrop{position:fixed;inset:0;background:rgba(3,69,45,.42);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}.fuel-nav-box{width:min(390px,100%);background:#fff;border-radius:26px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.25);position:relative;text-align:center;border:1px solid rgba(7,92,59,.12)}.fuel-nav-close{position:absolute;right:12px;top:10px;border:0;background:#f2f5f3;width:38px;height:38px;border-radius:50%;font-size:27px;line-height:1;color:#075c3b;cursor:pointer}.fuel-nav-title{font-size:25px;font-weight:900;color:#075c3b;letter-spacing:.4px}.fuel-nav-subtitle{margin:5px 0 18px;color:#6b7771;font-size:15px}.fuel-nav-options{display:grid;gap:11px}.fuel-nav-options a{display:flex;align-items:center;justify-content:center;gap:12px;text-decoration:none;color:#fff;padding:14px;border-radius:14px;font-weight:900;font-size:16px;box-shadow:0 4px 10px rgba(0,0,0,.10)}.fuel-nav-options a svg{width:27px;height:27px;flex:0 0 27px}.fuel-nav-options a:nth-child(1){background:#075c3b}.fuel-nav-options a:nth-child(2){background:#33b5e5}.fuel-nav-options a:nth-child(3){background:#222}';document.head.appendChild(fuelNavStyle);
function ensureNavModal(){
  if(document.getElementById('fuelNavModal'))return;
  const d=document.createElement('div');
  d.id='fuelNavModal';
  d.innerHTML='<div class="fuel-nav-backdrop"><div class="fuel-nav-box"><button class="fuel-nav-close" aria-label="Chiudi">×</button><div class="fuel-nav-title">NAVIGA</div><div class="fuel-nav-subtitle">Scegli dove aprire il percorso</div><div class="fuel-nav-options"><a id="fuelNavGoogle" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M21.35 12.27c0-.73-.07-1.44-.2-2.12H12v4.01h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.27Z"/></svg>Google Maps</a><a id="fuelNavWaze" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M20.7 11.1c0-4.2-3.8-7.6-8.6-7.6-4.7 0-8.5 3.2-8.5 7.4 0 2.2 1 4.1 2.7 5.5-.1 1.1-.5 2-1.3 2.8 2 .2 3.7-.4 4.8-1.3 1.1.4 2.3.6 3.5.6 4.8 0 8.6-3.2 8.6-7.4Zm-11.8 1.2h-1.4v-1.5h1.4v1.5Zm4 0h-1.5v-1.5h1.5v1.5Zm4 0h-1.5v-1.5h1.5v1.5Z"/></svg>Waze</a><a id="fuelNavApple" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M16.8 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.7-.7 3.2-.7s1.9.7 3.2.7c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.9-1.1-2.9-3.2ZM15.1 6.2c.6-.8 1-1.9.9-3-1 .1-2.1.7-2.7 1.5-.6.7-1.1 1.8-.9 2.8 1 .1 2.1-.5 2.7-1.3Z"/></svg>Mappe</a></div></div></div>';
  document.body.appendChild(d);
  d.querySelector('.fuel-nav-close').onclick=()=>d.remove();
  d.querySelector('.fuel-nav-backdrop').onclick=e=>{if(e.target===e.currentTarget)d.remove()};
}
function openNavChooser(lat,lon){
  ensureNavModal();
  const n=navLinks(lat,lon);
  document.getElementById('fuelNavGoogle').href=n.google;
  document.getElementById('fuelNavWaze').href=n.waze;
  document.getElementById('fuelNavApple').href=n.apple;
}
function popup(s){return '<div style="min-width:220px"><b style="font-size:16px">'+(s.brand||s.name||'Distributore')+'</b><br><small>'+[s.address,s.municipality].filter(Boolean).join(' · ')+'</small><div style="margin:10px 0;display:grid;gap:5px"><div>🟢 Benzina <b>'+money(s.benzina)+'</b></div><div>🟡 Gasolio <b>'+money(s.gasolio)+'</b></div><div>🔵 GPL <b>'+money(s.gpl)+'</b></div></div><button type="button" onclick="openNavChooser('+Number(s.lat)+','+Number(s.lon)+')" style="width:100%;border:0;background:#075c3b;color:#fff;padding:11px 10px;border-radius:10px;font-weight:900;font-size:14px;cursor:pointer">NAVIGA →</button><button type="button" onclick="window.Contributi?.open('fuel')" style="width:100%;margin-top:8px;border:1px solid #075c3b;background:#fff;color:#075c3b;padding:10px;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer">✏️ SEGNALA PREZZI TROVATI</button></div>'}

async function load(){if(!userPos)return;statusEl.textContent='⛽ Cerco i distributori e i prezzi aggiornati...';stationLayer.clearLayers();stationsEl.innerHTML='';
try{const u=API+'?lat='+userPos.lat+'&lon='+userPos.lng+'&radius='+radius+'&limit=150';const r=await fetch(u);const d=await r.json();if(!r.ok)throw new Error(d.error||'Errore API');const list=d.stations||[];const reports=await communityReports(list);countEl.textContent=list.length;statusEl.textContent='✓ '+list.length+' distributori nel raggio di '+radius+' km';list.forEach(s=>{L.marker([s.lat,s.lon],{icon:icon(s)}).addTo(stationLayer).bindPopup(popup(s));const card=document.createElement('article');card.className='station-card';card.innerHTML='<div><h3>'+((s.brand||s.name||'Distributore'))+'</h3><p>'+[s.address,s.municipality].filter(Boolean).join(' · ')+' · 📍 '+Number(s.distance_km).toFixed(1).replace('.',',')+' km</p><div class="prices"><span class="price">🟢 Benzina '+money(s.benzina)+'</span><span class="price">🟡 Gasolio '+money(s.gasolio)+'</span><span class="price">🔵 GPL '+money(s.gpl)+'</span></div>'+(communityLabel(reports[s.mimit_id])?'<div style="margin-top:8px;font-size:12px;color:#075c3b;font-weight:800">'+communityLabel(reports[s.mimit_id])+'</div>':'')+'</div><a class="nav-btn" href="#" rel="noopener">NAVIGA →</a>';card.querySelector('.nav-btn').onclick=e=>{e.preventDefault();openNavChooser(s.lat,s.lon)};card.onclick=e=>{if(e.target.tagName!=='A')map.setView([s.lat,s.lon],16)};stationsEl.appendChild(card)});if(list.length){const bounds=L.latLngBounds(list.map(s=>[s.lat,s.lon]));bounds.extend([userPos.lat,userPos.lng]);map.fitBounds(bounds,{padding:[45,45],maxZoom:14})}}catch(e){statusEl.textContent='⚠️ '+e.message}}
function goToMyPosition(){if(userPos){map.flyTo(userPos,15,{animate:true,duration:.7});userMarker?.openPopup()}else locate()}
function locate(){statusEl.textContent='📍 Sto localizzando la tua posizione...';navigator.geolocation.getCurrentPosition(p=>{userPos=L.latLng(p.coords.latitude,p.coords.longitude);if(userMarker)map.removeLayer(userMarker);userMarker=L.circleMarker(userPos,{radius:11,color:'#fff',weight:4,fillColor:'#2474d6',fillOpacity:1}).addTo(map).bindPopup('📍 Tu sei qui');goToMyPosition();load()},e=>{statusEl.textContent='⚠️ Non riesco ad accedere alla posizione. Controlla i permessi del browser.'},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
document.getElementById('locateBtn').onclick=locate;
document.getElementById('recenter').onclick=goToMyPosition;
document.querySelectorAll('[data-radius]').forEach(b=>b.onclick=()=>{radius=Number(b.dataset.radius);document.querySelectorAll('[data-radius]').forEach(x=>x.classList.toggle('active',x===b));load()});