const test=require("node:test");
const assert=require("node:assert/strict");
const {parseCart,calculateOrder,squareRequest,MYSTERY_BOX_ID}=require("../netlify/lib/pmf-square-cart");
const {OLD_SENTENCE,NEW_TERMS,updateMysteryBoxShipping}=require("../netlify/lib/pmf-shipping-window");
const mystery={id:MYSTERY_BOX_ID,sku:"PMF-SFM-FRMB-001",title:"Smile For Me — Founding Reader Mystery Box",
  category:"bundle",priceCents:2199,preorder:true,comingSoon:false,published:true,
  trackStock:true,stock:25,shipping:"free-us"};
const regular={id:"0ca10d9e-841e-4d28-8582-c817c6c2c801",sku:"PMF-TQD-001",
  title:"The Quiet Days",priceCents:2899,preorder:false,comingSoon:false,
  published:true,trackStock:true,stock:100,shipping:"free-us"};
const cart=(p,q=1)=>[{id:p.id,quantity:q}];
test("payment-disabled preorder cannot be charged",()=>{
  assert.throws(()=>calculateOrder(parseCart(cart(mystery)),[mystery],{atomicStock:true,
    preorderAccepted:true}),/not open/);
});
test("paid Mystery Box requires customer consent and server protection",()=>{
  assert.throws(()=>calculateOrder(parseCart(cart(mystery)),[mystery],{atomicStock:true,
    allowMysteryPreorder:true}),/confirm/);
  assert.throws(()=>calculateOrder(parseCart(cart(mystery)),[mystery],{
    atomicStock:false,allowMysteryPreorder:true,preorderAccepted:true
  }),/protected stock reservation/);
});
test("limited Mystery Box checkout is one payable Square order with shipping promise",()=>{
 const priced=calculateOrder(parseCart(cart(mystery,3)),[mystery],{
   atomicStock:true,allowMysteryPreorder:true,preorderAccepted:true,flatShippingCents:399
 });
 assert.equal(priced.subtotalCents,6597);assert.equal(priced.shippingCents,0);
 const payload=squareRequest(priced,"TESTLOC","https://parisfrance.shop","test-order");
 assert.equal(payload.order.line_items[0].quantity,"3");
 assert.match(payload.order.line_items[0].name,/PREORDER: ships Nov 14–17, 2026/);
 assert.match(payload.payment_note,/charged at checkout/);
 assert.equal(payload.checkout_options.ask_for_shipping_address,true);
 assert.equal(payload.checkout_options.shipping_fee,undefined);
});
test("mixed ready-to-ship and prepaid-preorder carts must be separate",()=>{
 assert.throws(()=>calculateOrder(parseCart([...cart(mystery),...cart(regular)]),[mystery,regular],{
   atomicStock:true,allowMysteryPreorder:true,preorderAccepted:true,flatShippingCents:399
 }),/separately/);
});
test("other unreleased editions cannot be charged by using Mystery Box flag",()=>{
 const fake={...mystery,id:"fbf596f2-cf8f-434d-a697-b0e322d5372c",sku:"PMF-SFM-001"};
 assert.throws(()=>calculateOrder(parseCart(cart(fake)),[fake],{
   atomicStock:true,allowMysteryPreorder:true,preorderAccepted:true
 }),/not open/);
});
test("Nov 7 release changes prior per-purchase promise without changing 25-unit stock",async()=>{
 const original="Original author description\n\n"+OLD_SENTENCE;
 const p={...mystery,description:original,imageId:"portrait",squarePaymentUrl:""};
 const data=new Map([["products/"+MYSTERY_BOX_ID,p]]);
 const store={
   async get(key){return data.get(key)||null},
   async setJSON(key,value){data.set(key,value)}
 };
 await updateMysteryBoxShipping(store,true);
 const updated=data.get("products/"+MYSTERY_BOX_ID);
 assert.ok(updated.description.startsWith("Original author description"));
 assert.ok(updated.description.includes(NEW_TERMS));
 assert.ok(!updated.description.includes(OLD_SENTENCE));
 assert.equal(updated.stock,25);assert.equal(updated.priceCents,2199);
 assert.equal(updated.preorder,true);assert.equal(updated.imageId,"portrait");
 await updateMysteryBoxShipping(store,true);
 assert.deepEqual(data.get("products/"+MYSTERY_BOX_ID),updated);
});
