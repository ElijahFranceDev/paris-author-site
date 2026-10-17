"use strict";
const crypto=require("node:crypto");

class CartError extends Error { constructor(message,status=400){super(message);this.name="CartError";this.status=status;} }
const money=(cents)=>({amount:cents,currency:"USD"});
const parseCart=(raw)=>{
 if(!Array.isArray(raw)||!raw.length||raw.length>20)throw new CartError("Your cart must have 1–20 different products.");
 const seen=new Set(),cart=[];
 let units=0;
 for(const item of raw){
   if(!item||typeof item!=="object"||typeof item.id!=="string"||!/^[-a-f0-9]{36}$/i.test(item.id)||
      !Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>10||
      seen.has(item.id))throw new CartError("Your cart contains an invalid product or quantity.");
   seen.add(item.id);units+=item.quantity;
   cart.push({id:item.id,quantity:item.quantity});
 }
 if(units>40)throw new CartError("Please contact the author for orders over 40 items.");
 return cart;
};
const calculateOrder=(cart,products,{flatShippingCents,atomicStock=false}={})=>{
 const byId=new Map(products.map(p=>[p.id,p]));
 let subtotal=0,physical=0,shippingProfile="free-us";
 const items=[];
 for(const c of cart){
   const p=byId.get(c.id);
   if(!p||!p.published)throw new CartError("An item in your cart is no longer listed. Please refresh.");
   if(p.preorder)throw new CartError("Preorders cannot be purchased until officially opened.");
   if(p.trackStock && p.stock<c.quantity)throw new CartError(p.title+" has fewer units available than requested.");
   if(atomicStock && p.shipping!=="digital" && !p.trackStock)throw new CartError("Please set up stock tracking for "+p.title+" before checkout.",503);
   if(p.trackStock&&!atomicStock)throw new CartError(p.title+" requires a protected stock reservation.",503);
   if(!Number.isSafeInteger(p.priceCents)||p.priceCents<0)throw new CartError("An item has an invalid price.",503);
   if(!["free-us","square-calculated","digital"].includes(p.shipping))throw new CartError("An item has no shipping rules.",503);
   if(p.shipping!=="digital")physical++;
   if(p.shipping==="square-calculated")shippingProfile="square-calculated";
   const line=p.priceCents*c.quantity; subtotal+=line;
   if(!Number.isSafeInteger(subtotal)||subtotal>1000000)throw new CartError("Your order total exceeds online checkout limits.");
   items.push({id:c.id,name:p.title,qty:c.quantity,cents:p.priceCents,shipping:p.shipping});
 }
 if(physical>0 && physical!==items.length)throw new CartError("Digital and shipped products must be ordered separately for now.");
 let shippingCents=0;
 if(shippingProfile==="square-calculated"){
   if(!Number.isSafeInteger(flatShippingCents)||flatShippingCents<0||flatShippingCents>25000)
     throw new CartError("Shipping for this combination is not configured yet. Please contact the author.",503);
   shippingCents=flatShippingCents;
 }
 return {items,subtotalCents:subtotal,shippingCents,totalCents:subtotal+shippingCents,
   needsShipping:physical>0};
};
const squareRequest=(order,locationId,siteOrigin,requestId=crypto.randomUUID())=>{
 const link={
   idempotency_key:requestId,
   description:"P.M. France Author Bookstore multi-item order",
   order:{
     location_id:locationId,
     line_items:order.items.map(i=>({
       name:i.name,
       quantity:String(i.qty),
       base_price_money:money(i.cents)
     }))
   },
   checkout_options:{
     allow_tipping:false,
     ask_for_shipping_address:order.needsShipping,
     enable_coupon:false,
     redirect_url:siteOrigin+"/square-return.html"
   },
   payment_note:"P.M. France author-direct web store"
 };
 if(order.shippingCents>0)link.checkout_options.shipping_fee={
   name:"Standard U.S. shipping",
   charge:money(order.shippingCents)
 };
 return link;
};
module.exports={CartError,parseCart,calculateOrder,squareRequest};
