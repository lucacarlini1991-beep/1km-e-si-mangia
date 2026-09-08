/**
 * 1 KM E SI MANGIA - Uscita 2.0
 * Estrae servizi camper da OpenStreetMap tramite Overpass e genera data/camper.json.
 * Uso: node scripts/build-camper-overpass.js
 */
const fs=require("fs"),https=require("https");
const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
const query=`[out:json][timeout:180];
area["ISO3166-1"="IT"][admin_level=2]->.italy;
(
 nwr["tourism"="caravan_site"](area.italy);
 nwr["amenity"="sanitary_dump_station"](area.italy);
 nwr["amenity"="drinking_water"](area.italy);
 nwr["amenity"="toilets"](area.italy)["toilets:disposal"="yes"];
 nwr["amenity"="motorhome_service"](area.italy);
);
out center tags;`;
function req(url,body){return new Promise((resolve,reject)=>{const q=https.request(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body)}},res=>{let d="";res.on("data",x=>d+=x);res.on("end",()=>res.statusCode===200?resolve(d):reject(Error("HTTP "+res.statusCode)));});q.on("error",reject);q.write(body);q.end();});}
function c(x){return x.type==="node"?{lat:x.lat,lng:x.lon}:{lat:x.center?.lat,lng:x.center?.lon};}
function services(t){const s=[];if(t.tourism==="caravan_site"||t.caravan==="yes")s.push("area");if(t.amenity==="drinking_water"||t.drinking_water==="yes")s.push("water");if(t.amenity==="sanitary_dump_station"||t.sanitary_dump_station==="yes"||t["toilets:disposal"]==="yes"){s.push("grey","wc","service");}if(t.amenity==="motorhome_service")s.push("service");if(t.electricity==="yes"||t["power_supply"]==="yes")s.push("electricity");return [...new Set(s)];}
(async()=>{let raw,last;for(const ep of endpoints){try{raw=await req(ep,"data="+encodeURIComponent(query));console.log("Scaricato da",ep);break}catch(e){last=e;console.warn("Endpoint non disponibile:",ep)}}if(!raw)throw last;const items=JSON.parse(raw).elements.map(x=>{const p=c(x),t=x.tags||{},sv=services(t);if(!p.lat||!p.lng||!sv.length)return null;return{id:`${x.type}-${x.id}`,name:t.name||"Servizio camper",lat:p.lat,lng:p.lng,services:sv,access:t.access||null,fee:t.fee||null,source:"OpenStreetMap",osm_type:x.type,osm_id:x.id};}).filter(Boolean);fs.writeFileSync("data/camper.json",JSON.stringify({version:"1.1",source:"OpenStreetMap / Overpass",updated_at:new Date().toISOString(),items},null,2));console.log("Creati",items.length,"servizi camper");})();