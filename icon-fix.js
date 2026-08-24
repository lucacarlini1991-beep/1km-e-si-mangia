/* 1 KM E SI MANGIA - icone ufficiali */
(function(){
  const POS="assets/pin-posizione.png", TRUCK="assets/pin-camion.png";
  const make=(src,cls)=>{const i=document.createElement("img");i.src=src;i.alt="";i.setAttribute("aria-hidden","true");i.className=cls;return i;};
  function replaceText(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[]; let n; while(n=walker.nextNode()) nodes.push(n);
    for(const node of nodes){
      if(!node.nodeValue || (!node.nodeValue.includes("📍")&&!node.nodeValue.includes("🚛"))) continue;
      const parent=node.parentElement; if(!parent || parent.closest("script,style")) continue;
      const frag=document.createDocumentFragment();
      const parts=node.nodeValue.split(/(📍|🚛)/);
      for(const p of parts){
        if(p==="📍") frag.appendChild(make(POS,"ui-pin-position"));
        else if(p==="🚛") frag.appendChild(make(TRUCK,"ui-pin-camion"));
        else frag.appendChild(document.createTextNode(p));
      }
      node.replaceWith(frag);
    }
  }
  function init(){
    const style=document.createElement("style");
    style.textContent=`.ui-pin-position,.ui-pin-camion{width:28px;height:34px;object-fit:contain;display:inline-block;vertical-align:middle;flex:0 0 auto}.ui-pin-camion{width:30px;height:36px}.menu-link strong{display:inline-flex;align-items:center;gap:7px}#homeLocationButton,#locationButton,#mpLocate{display:inline-flex;align-items:center;justify-content:center;gap:8px}.contact-single{grid-template-columns:minmax(0,620px)!important;justify-content:center}.contact-card{width:100%}.contact-email a{color:#075c3b;font-weight:800;text-decoration:none;font-size:20px}.contact-notice{margin:20px auto;padding:16px 18px;max-width:480px;border-left:4px solid #f5a719;background:#fff8e8;display:grid;gap:5px;color:#4d5a54;line-height:1.45}.contact-notice strong:first-child{color:#075c3b;font-weight:800}`;
    document.head.appendChild(style);
    replaceText(document.body);
    new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)replaceText(n);else if(n.nodeType===3&&n.parentElement)replaceText(n.parentElement)}))).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
