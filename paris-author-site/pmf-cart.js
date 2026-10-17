(() => {
  "use strict";
  const byId=id=>document.getElementById(id);
  const root=byId("pmf-cart-lines"),status=byId("pmf-cart-status"),
        count=byId("pmf-cart-count"),subtotal=byId("pmf-cart-subtotal"),
        shippingLabel=byId("pmf-cart-shipping"),estimatedTotal=byId("pmf-cart-total"),
        button=byId("pmf-checkout-button"),error=byId("pmf-checkout-error");
  let catalog=[],busy=false,cartEnabled=false;
  const money=c=>(c/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
  const el=(tag,cls,txt)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(txt!==undefined)node.textContent=txt;
    return node;
  };
  const cart=()=>window.PMF_CART.load();
  const getProduct=id=>catalog.find(p=>p.id===id);
  function render(){
    const items=cart();
    root.replaceChildren();
    let quantity=0,sum=0,problems=[],hasPaidShipping=false;
    if(!items.length){
      status.textContent="Your cart is empty. Find your next read in the Author Store.";
      button.disabled=true;
    }else{
      status.textContent=cartEnabled?"Review quantities before continuing to one Square checkout.":"Combined checkout is undergoing final testing. You can save your selections, but payments are not open yet.";
      for(const item of items){
        const product=getProduct(item.id);
        if(!product||!product.published||product.preorder){
          problems.push("One product is unavailable. Please remove it.");
        }else if(product.trackStock&&item.quantity>product.stock){
          problems.push(product.title+" is available in a smaller quantity.");
        }
        const line=el("div","pmf-cart-item");
        if(product?.imageUrl){
          const image=el("img","pmf-cart-thumb");image.src=product.imageUrl;image.alt=product.title;line.append(image);
        }
        const details=el("div","pmf-cart-item-content");
        details.append(el("h3","",product?.title||"Unavailable product"));
        if(product){
          if(product.shipping==="square-calculated")hasPaidShipping=true;
          details.append(el("p","pmf-muted",money(product.priceCents)+" each"));
          const total=item.quantity*product.priceCents;
          sum+=total;
          details.append(el("strong","",money(total)));
        }
        const controls=el("div","pmf-cart-item-controls");
        const label=el("label","pmf-quantity-label","Quantity ");
        const input=el("input","pmf-cart-qty");
        input.type="number";input.min="1";input.max=String(Math.min(10,product?.trackStock?product.stock:10));
        input.step="1";input.value=String(item.quantity);
        input.setAttribute("aria-label","Quantity for "+(product?.title||"product"));
        input.addEventListener("change",()=>{
          try{window.PMF_CART.setQuantity(item.id,Number(input.value),product?.trackStock?product.stock:null);error.textContent="";render();}
          catch(e){error.textContent=e.message;input.value=String(item.quantity);}
        });
        label.append(input);controls.append(label);
        const remove=el("button","pmf-minor","Remove");remove.type="button";
        remove.addEventListener("click",()=>{window.PMF_CART.setQuantity(item.id,0);render();});
        controls.append(remove);details.append(controls);line.append(details);root.append(line);
        quantity+=item.quantity;
      }
      button.disabled=!cartEnabled||busy||problems.length>0;
    }
    count.textContent=String(quantity);
    subtotal.textContent=money(sum);
    // All-free-shipping carts cost $0 to ship; paid-shipping items add $3.99
    // ONCE for the whole cart, not per product or per unit.
    const shippingCents=hasPaidShipping?399:0;
    shippingLabel.textContent=items.length&&!problems.length?money(shippingCents):"—";
    estimatedTotal.textContent=items.length&&!problems.length?money(sum+shippingCents):"—";
    if(problems.length){error.textContent=problems.join(" ");}
  }
  async function load(){
    try{
      const response=await fetch("/.netlify/functions/pmf-store-products",{cache:"no-store"});
      if(!response.ok)throw Error("Unable to load current product prices.");
      const body=await response.json();
      cartEnabled=body.cartEnabled===true;
      catalog=body.products||[];
      render();
    }catch(e){status.textContent="Your cart cannot be checked right now. Please try again later.";button.disabled=true;}
  }
  async function checkout(){
    if(busy||!cartEnabled||!cart().length)return;
    busy=true;button.disabled=true;error.textContent="";button.textContent="Preparing your Square order…";
    try{
      const response=await fetch("/.netlify/functions/pmf-square-checkout",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cart:cart()})
      });
      const data=await response.json();
      if(!response.ok||!data.url)throw Error(data.error||"Could not create checkout.");
      const url=new URL(data.url);
      const h=url.hostname.toLowerCase();
      if(url.protocol!=="https:"||!(h==="square.link"||h.endsWith(".square.link")||
         h==="square.site"||h.endsWith(".square.site")||
         h==="squareup.com"||h.endsWith(".squareup.com")))throw Error("Square checkout returned an invalid address.");
      window.location.assign(url.toString());
    }catch(e){
      error.textContent=e.message||"Unable to prepare checkout. Please try again.";
      busy=false;button.textContent="Continue to Square Checkout";render();
    }
  }
  button.addEventListener("click",checkout);
  window.addEventListener("storage",render);
  load();
})();