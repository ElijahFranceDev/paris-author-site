(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 const list=$("public-product-list"),status=$("store-status"),filter=$("product-filter");
 let products=[];
 const fmt=c=>(c/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
 const el=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
 function render(){
  list.replaceChildren();
  const category=filter.value;
  const visible=products.filter(p=>category==="all"||p.category===category);
  status.textContent=visible.length?"Explore the latest releases and collectible goods.":"No products are available in this category yet.";
  for(const p of visible){
   const card=el("article","pmf-product-card");
   if(p.imageUrl){const image=el("img","pmf-product-photo");image.src=p.imageUrl;image.alt=p.title+" product photo";image.loading="lazy";card.append(image);}
   else{card.append(el("div","pmf-product-no-photo","P.M. FRANCE"));}
   const content=el("div","pmf-product-detail");
   content.append(el("p","pmf-label",p.category.toUpperCase()+(p.preorder?" • UPCOMING PREORDER":"")));
   content.append(el("h2","",p.title));
   if(p.author)content.append(el("p","pmf-muted",p.author));
   if(p.description)content.append(el("p","pmf-description",p.description));
   const bottom=el("div","pmf-product-bottom");
   bottom.append(el("strong","pmf-product-price",fmt(p.priceCents)));
   const ship=p.shipping==="free-us"?"Free U.S. shipping":p.shipping==="digital"?"Digital product":"Shipping calculated by Square";
   bottom.append(el("span","pmf-muted",ship));content.append(bottom);
   const available=!p.trackStock||p.stock>0;
   if(p.preorder){const upcoming=el("a","btn secondary pmf-product-buy","Preorder Updates");upcoming.href="newsletter.html";content.append(upcoming);}
   else if(!available){content.append(el("span","pmf-unavailable","Currently sold out"));}
   else if(p.canBuy){const buy=el("a","btn primary pmf-product-buy","Buy Securely with Square");buy.href=p.squarePaymentUrl;buy.target="_blank";buy.rel="noopener noreferrer";content.append(buy);}
   else{content.append(el("span","pmf-unavailable","Not yet available for purchase"));}
   card.append(content);list.append(card);
  }
 }
 async function initialize(){
  try{
   const response=await fetch("/.netlify/functions/pmf-store-products",{cache:"no-store"});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Store unavailable");
   products=body.products||[];render();
  }catch(err){status.textContent="The store catalog is temporarily unavailable. Please try again shortly.";}
 }
 filter.addEventListener("change",render);
 initialize();
})();