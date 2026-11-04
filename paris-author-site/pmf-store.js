(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 const list=$("public-product-list"),status=$("store-status"),filter=$("product-filter"),feedback=$("cart-feedback");
 let products=[],cartEnabled=false,preorderEnabled=false;
 const fmt=c=>(c/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
 const el=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
 const normalize=value=>String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

 function shippingLabel(p){
   return p.shipping==="free-us"?"Free U.S. shipping":p.shipping==="digital"?"Digital product":"Standard U.S. shipping at checkout";
 }

 function appendPurchaseControl(container,p,sourceButton){
   const available=!p.trackStock||p.stock>0;
   if(p.comingSoon||(p.preorder&&!preorderEnabled)){
     const upcoming=el("a","btn secondary pmf-product-buy",p.preorder?"Preorder Updates":"Release Updates");
     upcoming.href="newsletter.html";
     container.append(upcoming);
   } else if(!available){
     container.append(el("span","pmf-unavailable","Currently sold out"));
   } else if(cartEnabled && p.published && (p.trackStock || p.shipping==="digital")){
     const add=el("button","btn primary pmf-product-buy",p.preorder?"Preorder — Add to Cart":"Add to Cart");
     add.type="button";
     add.addEventListener("click",event=>{
       event.stopPropagation();
       const result=window.PMF_CART.add(p.id,p.trackStock?p.stock:null);
       feedback.textContent=result.ok?(p.title+" added. View your cart to checkout together."):result.message;
       if(result.ok){
         add.textContent="Added ✓";
         if(sourceButton)sourceButton.textContent="Added ✓";
         setTimeout(()=>{
           add.textContent=p.preorder?"Preorder — Add to Cart":"Add to Cart";
           if(sourceButton)sourceButton.textContent=p.preorder?"Preorder — Add to Cart":"Add to Cart";
         },1300);
       }
     });
     container.append(add);
   } else if(!cartEnabled && p.canBuy){
     const buy=el("a","btn primary pmf-product-buy","Buy Securely with Square");
     buy.href=p.squarePaymentUrl;
     buy.target="_blank";
     buy.rel="noopener noreferrer";
     container.append(buy);
   } else {
     container.append(el("span","pmf-unavailable",cartEnabled&&!p.trackStock&&p.shipping!=="digital"?"Confirm inventory in Admin to start checkout":"Secure checkout being activated"));
   }
 }

 function closeProductModal(){
   const modal=document.querySelector(".pmf-product-modal");
   if(!modal)return;
   modal.remove();
   document.body.classList.remove("pmf-modal-open");
   const url=new URL(window.location.href);
   if(url.searchParams.has("product")){
     url.searchParams.delete("product");
     history.replaceState({},"",url.pathname+(url.searchParams.toString()?"?"+url.searchParams.toString():"")+url.hash);
   }
 }

 function openProduct(p,{syncUrl=true}={}){
   closeProductModal();
   const overlay=el("div","pmf-product-modal");
   overlay.setAttribute("role","dialog");
   overlay.setAttribute("aria-modal","true");
   overlay.setAttribute("aria-label",p.title+" product details");

   const panel=el("div","pmf-product-modal-panel");
   const close=el("button","pmf-product-modal-close","×");
   close.type="button";
   close.setAttribute("aria-label","Close product details");

   const media=el("div","pmf-product-modal-media");
   if(p.imageUrl){
     const image=el("img","pmf-product-modal-image");
     image.src=p.imageUrl;
     image.alt=p.title+" cover";
     media.append(image);
   } else {
     media.append(el("div","pmf-product-no-photo","P.M. FRANCE"));
   }

   const detail=el("div","pmf-product-modal-detail");
   detail.append(el("p","pmf-label",p.category.toUpperCase()+(p.preorder?" • LIMITED PREORDER":p.comingSoon?" • COMING SOON":"")));
   detail.append(el("h2","",p.title));
   if(p.author)detail.append(el("p","pmf-muted",p.author+(p.format?" • "+p.format:"")));
   if(p.description)detail.append(el("p","pmf-product-modal-description",p.description));

   const priceRow=el("div","pmf-product-modal-price-row");
   priceRow.append(el("strong","pmf-product-price",fmt(p.priceCents)));
   priceRow.append(el("span","pmf-muted",shippingLabel(p)));
   detail.append(priceRow);
   appendPurchaseControl(detail,p);

   panel.append(close,media,detail);
   overlay.append(panel);
   document.body.append(overlay);
   document.body.classList.add("pmf-modal-open");

   close.addEventListener("click",closeProductModal);
   overlay.addEventListener("click",event=>{if(event.target===overlay)closeProductModal();});
   document.addEventListener("keydown",function esc(event){
     if(event.key==="Escape"&&document.body.contains(overlay)){
       closeProductModal();
       document.removeEventListener("keydown",esc);
     }
   });

   if(syncUrl){
     const url=new URL(window.location.href);
     url.searchParams.set("product",p.title);
     history.replaceState({},"",url.pathname+"?"+url.searchParams.toString()+url.hash);
   }
   close.focus();
 }

 function render(){
  list.replaceChildren();
  const category=filter.value;
  const visible=products.filter(p=>category==="all"||p.category===category);
  status.textContent=visible.length?"Explore the latest releases and collectible goods. Click any product to open full details.":"No products are available in this category yet.";

  for(const p of visible){
   const card=el("article","pmf-product-card pmf-product-card-clickable");
   card.tabIndex=0;
   card.setAttribute("role","button");
   card.setAttribute("aria-label","Open "+p.title+" details");

   if(p.imageUrl){
     const image=el("img","pmf-product-photo");
     image.src=p.imageUrl;
     image.alt=p.title+" product photo";
     image.loading="lazy";
     card.append(image);
   } else {
     card.append(el("div","pmf-product-no-photo","P.M. FRANCE"));
   }

   const content=el("div","pmf-product-detail");
   content.append(el("p","pmf-label",p.category.toUpperCase()+(p.preorder?" • LIMITED PREORDER":p.comingSoon?" • COMING SOON":!cartEnabled&&!p.canBuy?" • CHECKOUT SETUP":"")));
   content.append(el("h2","",p.title));
   if(p.author)content.append(el("p","pmf-muted",p.author));
   if(p.description){
     const desc=el("p","pmf-description pmf-clamped",p.description);
     content.append(desc);
   }

   const openHint=el("span","pmf-open-product","Open details →");
   content.append(openHint);

   const bottom=el("div","pmf-product-bottom");
   bottom.append(el("strong","pmf-product-price",fmt(p.priceCents)));
   bottom.append(el("span","pmf-muted",shippingLabel(p)));
   content.append(bottom);

   const actionWrap=el("div","pmf-card-action");
   appendPurchaseControl(actionWrap,p);
   content.append(actionWrap);

   card.append(content);
   card.addEventListener("click",event=>{
     if(event.target.closest("a,button,input,select,textarea"))return;
     openProduct(p);
   });
   card.addEventListener("keydown",event=>{
     if((event.key==="Enter"||event.key===" ")&&!event.target.closest("a,button,input,select,textarea")){
       event.preventDefault();
       openProduct(p);
     }
   });

   list.append(card);
  }
 }

 async function initialize(){
  try{
   const response=await fetch("/.netlify/functions/pmf-store-products",{cache:"no-store"});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Store unavailable");
   cartEnabled=body.cartEnabled===true;
   preorderEnabled=cartEnabled && body.preorderEnabled===true;
   const cartUI=document.querySelector(".pmf-shop-controls");
   if(cartUI)cartUI.hidden=!cartEnabled;
   if(feedback)feedback.textContent=cartEnabled
     ?"Add available books and collectibles to one cart and check out once. Mystery Box preorders ship November 14–17, 2026."
     :"Available items use secure Square payment links while combined-cart checkout completes testing.";
   const info=document.querySelector(".pmf-shop-info p");
   if(info && !cartEnabled)info.textContent="Available products use secure Square checkout links. Combined-cart checkout is being tested; preorders are not open yet.";
   document.dispatchEvent(new CustomEvent("pmf-cart-mode",{detail:{enabled:cartEnabled}}));
   products=body.products||[];
   render();

   const requested=new URLSearchParams(window.location.search).get("product");
   if(requested){
     const needle=normalize(requested);
     const match=products.find(p=>p.id===requested||p.sku===requested||normalize(p.title)===needle);
     if(match)openProduct(match,{syncUrl:false});
   }
  }catch(err){
   status.textContent="The store catalog is temporarily unavailable. Please try again shortly.";
  }
 }

 filter.addEventListener("change",render);
 initialize();
})();