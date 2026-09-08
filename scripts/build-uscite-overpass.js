/**
 * ESPLORA USCITE - Database nazionale delle uscite autostradali.
 * Estrae gli svincoli motorway_junction italiani da OpenStreetMap.
 * Uso: node scripts/build-uscite-overpass.js
 */
const fs=require("fs"),https=require("https");
const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
const query=`[out:json][timeout:240];
area["ISO3166-1"="IT"][admin_level=2]->.it;
node["highway"="motorway_junction"](area.it);
out tags;`;
function post(url,body){return new Promise((resolve,reject)=>{const q=https.request(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body),"User-Agent":"1KM-e-si-mangia-data-bot"},res=>{let d="";res.on("data",x=>d+=x);res.on("end",()=>res.statusCode===200?resolve(d):reject(Error("HTTP "+res.statusCode)));});q.on("error",reject);q.write(body);q.end();});}
function slug(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function road(t){return t.ref||t.motorway||t.destination:it||t.destination||"Autostrada";}
(async()=>{
 let raw,last;
 for(const ep of endpoints){try{raw=await post(ep,"data="+encodeURIComponent(query));console.log("Fonte:",ep);break}catch(e){last=e;console.warn("Endpoint KO:",ep)}}
 if(!raw)throw last;
 const seen=new Set,items=JSON.parse(raw).elements.map(x=>{
   const t=x.tags||{},name=t.name||t.exit_to||t.destination:it||t.destination;
   if(!name||!x.lat||!x.lon)return null;
   const key=Math.round(x.lat*100000)+":"+Math.round(x.lon*100000);
   if(seen.has(key))return null;seen.add(key);
   return {id:slug(name)+"-"+x.id,name:name.trim(),road:road(t),city:(t["addr:city"]||t.destination||name).trim(),lat:x.lat,lng:x.lon,source:"OpenStreetMap",osm_id:x.id};
 }).filter(Boolean).sort((a,b)=>a.road.localeCompare(b.road,"it")||a.name.localeCompare(b.name,"it"));
 const out={version:"2.0",source:"OpenStreetMap motorway_junction",updated_at:new Date().toISOString(),description:"Database nazionale delle uscite e svincoli autostradali italiani per Esplora Uscite.",items};
 fs.writeFileSync("data/uscite.json",JSON.stringify(out,null,2));
 console.log("Create",items.length,"uscite");
})();