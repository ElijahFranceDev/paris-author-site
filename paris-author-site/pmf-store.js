(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 const list=$("public-product-list"),status=$("store-status"),filter=$("product-filter"),feedback=$("cart-feedback");
 let products=[],cartEnabled=false;
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
   content.append(el("p","pmf-label",p.category.toUpperCase()+(p.preorder?" • LIMITED PREORDER":p.comingSoon?" • COMING SOON":!cartEnabled&&!p.canBuy?" • CHECKOUT SETUP":"")));
   content.append(el("h2","",p.title));
   if(p.author)content.append(el("p","pmf-muted",p.author));
   if(p.description){
     const desc=el("p","pmf-description",p.description);
     content.append(desc);
     if(p.description.length>260){
       desc.classList.add("pmf-clamped");
       const more=el("button","pmf-read-more","Read full description");
       more.type="button";
       more.setAttribute("aria-expanded","false");
       more.addEventListener("click",()=>{
         const expanded=desc.classList.toggle("pmf-expanded");
         more.textContent=expanded?"Show less":"Read full description";
         more.setAttribute("aria-expanded",String(expanded));
       });
       content.append(more);
     }
   }
   const bottom=el("div","pmf-product-bottom");
   bottom.append(el("strong","pmf-product-price",fmt(p.priceCents)));
   const ship=p.shipping==="free-us"?"Free U.S. shipping":p.shipping==="digital"?"Digital product":"Standard U.S. shipping at checkout";
   bottom.append(el("span","pmf-muted",ship));content.append(bottom);
   const available=!p.trackStock||p.stock>0;
   if(p.preorder||p.comingSoon){const upcoming=el("a","btn secondary pmf-product-buy",p.preorder?"Preorder Updates":"Release Updates");upcoming.href="newsletter.html";content.append(upcoming);}
   else if(!available){content.append(el("span","pmf-unavailable","Currently sold out"));}
   else if(cartEnabled && p.published && (p.trackStock || p.shipping==="digital")){
     const add=el("button","btn primary pmf-product-buy","Add to Cart");
     add.type="button";
     add.addEventListener("click",()=>{
       const result=window.PMF_CART.add(p.id,p.trackStock?p.stock:null);
       feedback.textContent=result.ok?(p.title+" added. View your cart to checkout together."):result.message;
       if(result.ok){add.textContent="Added ✓";setTimeout(()=>add.textContent="Add to Cart",1300);}
     });
     content.append(add);
   }
   else if(!cartEnabled && p.canBuy){
     const buy=el("a","btn primary pmf-product-buy","Buy Securely with Square");
     buy.href=p.squarePaymentUrl;buy.target="_blank";buy.rel="noopener noreferrer";content.append(buy);
   }
   else{content.append(el("span","pmf-unavailable",cartEnabled&&!p.trackStock&&p.shipping!=="digital"?"Confirm inventory in Admin to start checkout":"Secure checkout being activated"));}
   card.append(content);list.append(card);
  }
 }
 async function initialize(){
  try{
   const response=await fetch("/.netlify/functions/pmf-store-products",{cache:"no-store"});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Store unavailable");
   cartEnabled=body.cartEnabled===true;
   const cartUI=document.querySelector(".pmf-shop-controls");
   if(cartUI)cartUI.hidden=!cartEnabled;
   if(feedback)feedback.textContent=cartEnabled
     ?"Add available books and collectibles to one cart and check out once."
     :"Available items use secure Square payment links while combined-cart checkout completes testing.";
   const info=document.querySelector(".pmf-shop-info p");
   if(info && !cartEnabled)info.textContent="Available products use secure Square checkout links. Combined-cart checkout is being tested; preorders are not open yet.";
   document.dispatchEvent(new CustomEvent("pmf-cart-mode",{detail:{enabled:cartEnabled}}));
   products=body.products||[];render();
  }catch(err){status.textContent="The store catalog is temporarily unavailable. Please try again shortly.";}
 }
 filter.addEventListener("change",render);
 initialize();
})();