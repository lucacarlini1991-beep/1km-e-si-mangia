/**
 * Uscita 2.0 - Luoghi da vedere
 * Estrae punti di interesse italiani da OpenStreetMap.
 * Il filtro distanza è sempre scelto dall'utente nel frontend.
 */
const fs=require("fs"),https=require("https");
const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
const query=`[out:json][timeout:180];
area["ISO3166-1"="IT"][admin_level=2]->.it;
(
 nwr["tourism"="viewpoint"](area.it);
 nwr["tourism"="attraction"](area.it);
 nwr["leisure"="park"](area.it);
 nwr["natural"="beach"](area.it);
 nwr["natural"="peak"](area.it);
 nwr["historic"="castle"](area.it);
 nwr["historic"="monument"](area.it);
 nwr["historic"="archaeological_site"](area.it);
 nwr["tourism"="museum"](area.it);
);
out center tags;`;
function post(url,body){return new Promise((resolve,reject)=>{const q=https.request(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body)}},res=>{let d="";res.on("data",x=>d+=x);res.on("end",()=>res.statusCode===200?resolve(d):reject(Error("HTTP "+res.statusCode)));});q.on("error",reject);q.write(body);q.end();});}
function coords(x){return x.type==="node"?{lat:x.lat,lng:x.lon}:{lat:x.center?.lat,lng:x.center?.lon};}
function category(t){if(t.leisure==="park"||t.natural==="beach"||t.natural==="peak")return"nature";if(t.historic==="castle"||t.historic==="monument"||t.historic==="archaeological_site"||t.tourism==="museum")return"culture";return"near";}
function interest(t,c){let n=5;if(c==="culture")n=7;if(t.tourism==="attraction"||t.historic==="castle")n=8;if(t.wikidata||t.wikipedia)n=Math.min(10,n+1);return n;}
(async()=>{let raw,last;for(const ep of endpoints){try{raw=await post(ep,"data="+encodeURIComponent(query));console.log("Fonte:",ep);break}catch(e){last=e;console.warn("Endpoint KO:",ep)}}if(!raw)throw last;const seen=new Set,items=JSON.parse(raw).elements.map(x=>{const p=coords(x),t=x.tags||{};if(!p.lat||!p.lng||!t.name)return null;const id=x.type+"-"+x.id;if(seen.has(id))return null;seen.add(id);const c=category(t);return{id,name:t.name,lat:p.lat,lng:p.lng,category:c,interest:interest(t,c),description:t.description||t["description:it"]||"",source:"OpenStreetMap",osm_type:x.type,osm_id:x.id,wikidata:t.wikidata||null};}).filter(Boolean);const out={version:"1.2",source:"OpenStreetMap + selezione 1 KM E SI MANGIA",updated_at:new Date().toISOString(),description:"Nessun limite imposto: l'utente sceglie la distanza in Esplora Uscite.",items};fs.writeFileSync("data/luoghi.json",JSON.stringify(out,null,2));console.log("Creati",items.length,"luoghi");})();