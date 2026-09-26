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
function popup(s){return '<div style="min-width:220px"><b style="font-size:16px">'+(s.brand||s.name||'Distributore')+'</b><br><small>'+[s.address,s.municipality].filter(Boolean).join(' · ')+'</small><div style="margin:10px 0;display:grid;gap:5px"><div>🟢 Benzina <b>'+money(s.benzina)+'</b></div><div>🟡 Gasolio <b>'+money(s.gasolio)+'</b></div><div>🔵 GPL <b>'+money(s.gpl)+'</b></div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px"><a href="'+navLinks(s.lat,s.lon).google+'" target="_blank" rel="noopener" style="display:block;text-align:center;background:#075c3b;color:#fff;padding:9px 4px;border-radius:8px;text-decoration:none;font-weight:800;font-size:12px">Google</a><a href="'+navLinks(s.lat,s.lon).waze+'" target="_blank" rel="noopener" style="display:block;text-align:center;background:#33b5e5;color:#fff;padding:9px 4px;border-radius:8px;text-decoration:none;font-weight:800;font-size:12px">Waze</a><a href="'+navLinks(s.lat,s.lon).apple+'" target="_blank" rel="noopener" style="display:block;text-align:center;background:#222;color:#fff;padding:9px 4px;border-radius:8px;text-decoration:none;font-weight:800;font-size:12px">Mappe</a></div></div>'}
async function load(){if(!userPos)return;statusEl.textContent='⛽ Cerco i distributori e i prezzi aggiornati...';stationLayer.clearLayers();stationsEl.innerHTML='';
try{const u=API+'?lat='+userPos.lat+'&lon='+userPos.lng+'&radius='+radius+'&limit=150';const r=await fetch(u);const d=await r.json();if(!r.ok)throw new Error(d.error||'Errore API');const list=d.stations||[];const reports=await communityReports(list);countEl.textContent=list.length;statusEl.textContent='✓ '+list.length+' distributori nel raggio di '+radius+' km';list.forEach(s=>{L.marker([s.lat,s.lon],{icon:icon(s)}).addTo(stationLayer).bindPopup(popup(s));const card=document.createElement('article');card.className='station-card';card.innerHTML='<div><h3>'+((s.brand||s.name||'Distributore'))+'</h3><p>'+[s.address,s.municipality].filter(Boolean).join(' · ')+' · 📍 '+Number(s.distance_km).toFixed(1).replace('.',',')+' km</p><div class="prices"><span class="price">🟢 Benzina '+money(s.benzina)+'</span><span class="price">🟡 Gasolio '+money(s.gasolio)+'</span><span class="price">🔵 GPL '+money(s.gpl)+'</span></div>'+(communityLabel(reports[s.mimit_id])?'<div style="margin-top:8px;font-size:12px;color:#075c3b;font-weight:800">'+communityLabel(reports[s.mimit_id])+'</div>':'')+'</div><a class="nav-btn" target="_blank" href="'+navLinks(s.lat,s.lon).google+'" target="_blank" rel="noopener">NAVIGA →</a>';card.onclick=e=>{if(e.target.tagName!=='A')map.setView([s.lat,s.lon],16)};stationsEl.appendChild(card)});if(list.length){const bounds=L.latLngBounds(list.map(s=>[s.lat,s.lon]));bounds.extend([userPos.lat,userPos.lng]);map.fitBounds(bounds,{padding:[45,45],maxZoom:14})}}catch(e){statusEl.textContent='⚠️ '+e.message}}
function goToMyPosition(){if(userPos){map.flyTo(userPos,15,{animate:true,duration:.7});userMarker?.openPopup()}else locate()}
function locate(){statusEl.textContent='📍 Sto localizzando la tua posizione...';navigator.geolocation.getCurrentPosition(p=>{userPos=L.latLng(p.coords.latitude,p.coords.longitude);if(userMarker)map.removeLayer(userMarker);userMarker=L.circleMarker(userPos,{radius:11,color:'#fff',weight:4,fillColor:'#2474d6',fillOpacity:1}).addTo(map).bindPopup('📍 Tu sei qui');goToMyPosition();load()},e=>{statusEl.textContent='⚠️ Non riesco ad accedere alla posizione. Controlla i permessi del browser.'},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
document.getElementById('locateBtn').onclick=locate;
document.getElementById('recenter').onclick=goToMyPosition;
document.querySelectorAll('[data-radius]').forEach(b=>b.onclick=()=>{radius=Number(b.dataset.radius);document.querySelectorAll('[data-radius]').forEach(x=>x.classList.toggle('active',x===b));load()});