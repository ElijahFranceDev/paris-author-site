const test=require("node:test");
const assert=require("node:assert/strict");
const {parseCart,calculateOrder,squareRequest,CartError}=require("../netlify/lib/pmf-square-cart.js");
const book={id:"0ca10d9e-841e-4d28-8582-c817c6c2c801",title:"The Quiet Days",priceCents:2899,published:true,preorder:false,trackStock:false,shipping:"free-us"};
const merch={id:"f4abf206-86fa-4f1b-9e62-4cf1dd002345",title:"P.M. France Bookmark",priceCents:299,published:true,preorder:false,trackStock:false,shipping:"square-calculated"};
const item=(p,q=1)=>({id:p.id,quantity:q});
test("a five-item cart becomes one itemized Square checkout with verified prices",()=>{
 const items=parseCart([item(book,2),item(merch,3)]);
 const order=calculateOrder(items,[book,merch],{flatShippingCents:399});
 assert.equal(order.subtotalCents,6695);
 assert.equal(order.shippingCents,399);
 assert.equal(order.totalCents,7094);
 const request=squareRequest(order,"SQUARE_LOC","https://parisfrance.shop","test-idempotency-key");
 assert.equal(request.order.line_items.length,2);
 assert.deepEqual(request.order.line_items.map(i=>i.quantity),["2","3"]);
 assert.deepEqual(request.order.line_items.map(i=>i.base_price_money.amount),[2899,299]);
 assert.equal(request.checkout_options.shipping_fee.charge.amount,399);
 assert.equal(request.checkout_options.ask_for_shipping_address,true);
 assert.equal(request.idempotency_key,"test-idempotency-key");
});
test("free US shipping products together have no added shipping fee",()=>{
 const o=calculateOrder(parseCart([item(book,5)]),[book]);
 const payload=squareRequest(o,"location","https://parisfrance.shop","fake-request");
 assert.equal(o.subtotalCents,14495);
 assert.equal(o.shippingCents,0);
 assert.equal(payload.checkout_options.shipping_fee,undefined);
});
test("unconfigured calculation rejects non-approved fee instead of guessing",()=>{
 assert.throws(()=>calculateOrder(parseCart([item(merch)]),[merch]),/not configured/);
});
test("prices in browser are ignored and server catalog controls total",()=>{
 const raw=[{id:book.id,quantity:1,priceCents:1,price:-1000}];
 const order=calculateOrder(parseCart(raw),[book]);
 assert.equal(order.totalCents,2899);
});
test("unpublished and preorder products are never payable",()=>{
 assert.throws(()=>calculateOrder(parseCart([item(book)]),[{...book,published:false}]),/no longer listed/);
 assert.throws(()=>calculateOrder(parseCart([item(book)]),[{...book,preorder:true}]),/Preorders/);
});
test("tracked stock products are paused until reservations protect inventory",()=>{
 assert.throws(()=>calculateOrder(parseCart([item(book)]),[{...book,trackStock:true,stock:25}]),/limited stock/);
});
test("invalid quantities and duplicate IDs are rejected",()=>{
 assert.throws(()=>parseCart([item(book,11)]),/invalid product/);
 assert.throws(()=>parseCart([item(book),item(book)]),/invalid product/);
 assert.throws(()=>parseCart([]),/1–20/);
});
test("digital products cannot mix with shipped items before fulfillment rules",()=>{
 const digital={...merch,shipping:"digital"};
 assert.throws(()=>calculateOrder(parseCart([item(book),item(digital)]),[book,digital]),/separately/);
});

test("one $3.99 fee covers one or multiple paid-shipping items",()=>{
 const orderSingle=calculateOrder(parseCart([item(merch,1)]),[merch],{flatShippingCents:399});
 const orderMultiple=calculateOrder(parseCart([item(merch,7)]),[merch],{flatShippingCents:399});
 assert.equal(orderSingle.shippingCents,399);
 assert.equal(orderMultiple.shippingCents,399);
 assert.equal(orderMultiple.totalCents,7*299+399);
});
test("free-shipping items combined with paid-shipping items charge $3.99 once",()=>{
 const order=calculateOrder(parseCart([item(book,4),item(merch,2)]),[book,merch],{flatShippingCents:399});
 assert.equal(order.shippingCents,399);
 assert.equal(order.totalCents,4*2899+2*299+399);
});
