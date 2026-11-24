(()=>{"use strict";
 const workspace=document.getElementById("admin-workspace"),panels=Array.from(workspace.querySelectorAll("[data-aw-panel]")),links=Array.from(workspace.querySelectorAll("[data-aw-view]"));
 const known=new Set(panels.map(p=>p.dataset.awPanel)),aliases={"editor-panel":"catalog","aw-inventory":"catalog","wholesale-admin":"wholesale","author-analytics":"sales","gift-admin":"giveaway"};
 function route(scroll=true){const hash=location.hash.slice(1),view=known.has(hash)?hash:aliases[hash]||"overview";
  panels.forEach(p=>p.hidden=p.dataset.awPanel!==view);links.forEach(a=>{if(a.dataset.awView===view)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  if(scroll&&!workspace.hidden){const target=aliases[hash]?document.getElementById(hash):document.getElementById("aw-content");if(target)requestAnimationFrame(()=>target.scrollIntoView({block:"start",behavior:"auto"}));}
 }
 window.addEventListener("hashchange",()=>route());
 document.addEventListener("pmf-auth",e=>{if(e.detail.authenticated)route(false);else{history.replaceState(null,"",location.pathname+location.search);route(false);}});
 route(false);
 // Copy text only from existing metrics, with no new data requests or duplicated IDs.
 const metrics=[["stat-total","Catalog products"],["stat-published","Published titles / products"],["stat-drafts","Drafts & scheduled"],["analytics-orders","Paid website orders"],["analytics-revenue","Website order total"],["analytics-downloads","Ebook download requests"]];
 const root=document.getElementById("aw-overview-metrics");
 for(const [id,label] of metrics){const source=document.getElementById(id),card=document.createElement("article"),name=document.createElement("span"),value=document.createElement("strong");card.className="aw-stat";name.textContent=label;const sync=()=>{value.textContent=source.textContent;};sync();new MutationObserver(sync).observe(source,{childList:true,characterData:true,subtree:true});card.append(name,value);root.append(card);}
})();