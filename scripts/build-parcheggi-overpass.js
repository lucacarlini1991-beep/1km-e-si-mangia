/**
 * 1 KM E SI MANGIA - Uscita 2.0
 * Estrae parcheggi da OpenStreetMap tramite Overpass e genera data/parcheggi.json.
 * Uso: node scripts/build-parcheggi-overpass.js
 */
const fs=require("fs");
const https=require("https");
const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
const query=`[out:json][timeout:180];
area["ISO3166-1"="IT"][admin_level=2]->.italy;
(
 nwr["amenity"="parking"](area.italy);
 nwr["amenity"="parking_space"](area.italy);
 nwr["highway"="rest_area"](area.italy);
 nwr["highway"="services"](area.italy);
);
out center tags;`;
function request(url,body){return new Promise((resolve,reject)=>{const req=https.request(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body)}},res=>{let d="";res.on("data",x=>d+=x);res.on("end",()=>res.statusCode===200?resolve(d):reject(new Error("HTTP "+res.statusCode)));});req.on("error",reject);req.write(body);req.end();});}
function coords(x){return x.type==="node"?{lat:x.lat,lng:x.lon}:{lat:x.center?.lat,lng:x.center?.lon};}
function type(t){if(t.highway==="rest_area"||t.highway==="services")return"rest";if(t.fee==="no"||t.access==="yes"&&t.fee!=="yes")return"free";if(t.fee==="yes")return"paid";return"auto";}
(async()=>{let raw,last;for(const ep of endpoints){try{raw=await request(ep,"data="+encodeURIComponent(query));console.log("Scaricato da",ep);break;}catch(e){last=e;console.warn("Endpoint non disponibile:",ep);}}if(!raw)throw last;const json=JSON.parse(raw);const items=json.elements.map(x=>{const c=coords(x),t=x.tags||{};if(!c.lat||!c.lng)return null;return{id:`${x.type}-${x.id}`,name:t.name||"Parcheggio",lat:c.lat,lng:c.lng,type:type(t),capacity:t.capacity?Number(t.capacity):null,covered:t.covered==="yes",source:"OpenStreetMap",osm_type:x.type,osm_id:x.id};}).filter(Boolean);const out={version:"1.1",source:"OpenStreetMap / Overpass",updated_at:new Date().toISOString(),items};fs.writeFileSync("data/parcheggi.json",JSON.stringify(out,null,2));console.log("Creati",items.length,"parcheggi");})();