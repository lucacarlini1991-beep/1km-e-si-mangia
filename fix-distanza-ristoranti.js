// 1 KM E SI MANGIA - ricerca ristoranti offline + distanza stradale robusta
(function(){
  "use strict";
  const MAX_ROAD=2000;
  const CANDIDATE_RADIUS=5000;
  const cache=new Map();
  let dbPromise=null;
  let uscitePromise=null;

  function dist(a,b,c,d){
    const R=6371000, p1=a*Math.PI/180, p2=c*Math.PI/180, dp=(c-a)*Math.PI/180, dl=(d-b)*Math.PI/180;
    const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
  }

  function loadExits(){
    if(!uscitePromise) uscitePromise=fetch("./uscite.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("uscite.json "+r.status);return r.json();});
    return uscitePromise;
  }

  function loadDB(){
    if(!dbPromise) dbPromise=fetch("./ristoranti.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("ristoranti.json "+r.status);return r.json();});
    return dbPromise;
  }

  function clean(r){
    const s=(String(r?.nome||"")+" "+String(r?.google_address||"")+" "+String(r?.cucina||"")).toLowerCase();
    return !/(autogrill|area di servizio|area servizio|stazione di servizio|gas station|distributore|tamoil|eni|agip|q8|esso|shell|ip\b)/i.test(s);
  }

  async function osrmTable(exit, candidates){
    const out=new Map();
    for(let start=0;start<candidates.length;start+=12){
      const chunk=candidates.slice(start,start+12);
      const coords=[`${exit.lon},${exit.lat}`,...chunk.map(r=>`${r.lon},${r.lat}`)].join(";");
      const dest=chunk.map((_,i)=>i+1).join(";");
      const urls=[
        `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=${dest}&annotations=distance`,
        `https://routing.openstreetmap.de/routed-car/table/v1/driving/${coords}?sources=0&destinations=${dest}&annotations=distance`
      ];
      let row=null;
      for(const url of urls){
        try{
          const r=await fetch(url,{cache:"no-store"});
          if(!r.ok)continue;
          const j=await r.json();
          if(Array.isArray(j?.distances?.[0]) && j.distances[0].length===chunk.length){row=j.distances[0];break;}
        }catch(e){}
      }
      if(row) chunk.forEach((r,i)=>{if(Number.isFinite(Number(row[i])))out.set(r,Number(row[i]));});
    }
    return out;
  }

  async function routeOne(exit,r){
    const key=`${exit.id}|${Number(r.lat).toFixed(6)}|${Number(r.lon).toFixed(6)}`;
    if(cache.has(key))return cache.get(key);
    const coords=`${exit.lon},${exit.lat};${r.lon},${r.lat}`;
    const urls=[`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`, `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=false`];
    for(const url of urls){
      try{const x=await fetch(url,{cache:"no-store"});if(!x.ok)continue;const j=await x.json();const d=Number(j?.routes?.[0]?.distance);if(Number.isFinite(d)){cache.set(key,d);return d;}}catch(e){}
    }
    return null;
  }

  function panel(){return document.getElementById("ristorantiMapPanel");}
  function close(){panel()?.remove();}
  function show(exit,items){
    close();
    const p=document.createElement("div");p.id="ristorantiMapPanel";p.style.cssText="position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,520px);max-height:80vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:18px;font-family:system-ui,sans-serif";
    const title=`🍴 Ristoranti · ${String(exit.nome||"").replace(/[<>]/g,"")}`;
    p.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><strong style="font-size:20px">${title}</strong><button id="chiudiRistorantiMap" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px">×</button></div>`;
    if(!items.length)p.innerHTML+=`<p style="line-height:1.5;color:#46544f">Nessun ristorante entro 2 km <b>di strada</b> da questa uscita.</p>`;
    items.forEach((r,i)=>{
      const d=Math.round(r._road); const el=document.createElement("div");el.style.cssText="border:1px solid #e5e5e5;border-radius:14px;padding:12px;margin-top:10px";
      el.innerHTML=`<strong>${i+1}. ${String(r.nome||"Ristorante").replace(/[<>]/g,"")}</strong><div style="margin-top:5px;color:#46544f">📍 ${d} m dall'uscita</div>${r.cucina?`<div style="font-size:13px">🍽️ ${String(r.cucina).replace(/[<>]/g,"")}</div>`:""}`;p.appendChild(el);
    });
    document.body.appendChild(p);p.querySelector("#chiudiRistorantiMap")?.addEventListener("click",close);
  }

  async function run(exit){
    try{
      const db=await loadDB();
      const candidates=db.filter(r=>clean(r)&&Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lon))&&dist(Number(exit.lat),Number(exit.lon),Number(r.lat),Number(r.lon))<=CANDIDATE_RADIUS);
      let roads=await osrmTable(exit,candidates);
      const missing=candidates.filter(r=>!roads.has(r));
      if(missing.length && missing.length<=8){for(const r of missing){const d=await routeOne(exit,r);if(d!=null)roads.set(r,d);}}
      const found=candidates.filter(r=>roads.has(r)&&roads.get(r)<=MAX_ROAD).map(r=>{r._road=roads.get(r);r.uscita={...(r.uscita||{}),id:exit.id,nome:exit.nome,distanza_m:Math.round(r._road)};return r;}).sort((a,b)=>a._road-b._road);
      show(exit,found);
      console.log("RICERCA OFFLINE ROBUSTA",{uscita:exit.nome,candidati:candidates.length,routeCalcolate:roads.size,risultati:found.length});
    }catch(e){console.error("Ricerca offline ristoranti:",e);show(exit,[]);}
  }

  document.addEventListener("click",function(e){
    const b=e.target.closest&&e.target.closest("[data-ristoranti-uscita]");
    if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const id=b.getAttribute("data-ristoranti-uscita");
    loadExits().then(list=>{const exit=(Array.isArray(list)?list:[]).find(x=>String(x.id||"")===String(id));if(exit)run(exit);}).catch(err=>{console.error("Uscite non disponibili:",err);});
  },true);
  window.__offlineRistorantiFix={run};
})();
