const test=require("node:test");
const assert=require("node:assert/strict");
const {products,MARKER,seedAdditionalCatalog}=require("../netlify/lib/pmf-expand-catalog.js");
const {calculateOrder,parseCart}=require("../netlify/lib/pmf-square-cart.js");
const existingQuiet={
 id:"0ca10d9e-841e-4d28-8582-c817c6c2c801",
 title:"The Quiet Days",sku:"PMF-TQD-001",
 priceCents:2899,shipping:"free-us",published:true,preorder:false,
 trackStock:true,stock:100
};
function mockStore(existing=[]){
 const data=new Map(existing.map(p=>["products/"+p.id,p]));
 return {
  data,
  async get(key){return data.get(key)||null;},
  async setJSON(key,value){data.set(key,value);},
  async list({prefix}={}){
    return {blobs:Array.from(data.keys()).filter(k=>k.startsWith(prefix||"")).map(key=>({key}))};
  }
 };
}
test("author inventory starts with 100 regular units and only 25 boxes",()=>{
 assert.equal(products.length,4);
 const standard=products.filter(p=>p.category==="book");
 assert.equal(standard.length,3);
 assert.ok(standard.every(p=>p.stock===100&&p.trackStock&&p.comingSoon&&!p.preorder));
 const box=products.find(p=>p.category==="bundle");
 assert.equal(box.stock,25);
 assert.equal(box.priceCents,2199);
 assert.equal(box.preorder,true);
 assert.equal(box.comingSoon,false);
 assert.equal(box.shipping,"free-us");
});
test("catalog expansion adds four records but preserves existing Quiet Days at $28.99 and 100 copies",async()=>{
 const handle=mockStore([existingQuiet]);
 await seedAdditionalCatalog(handle,true);
 assert.equal(handle.data.size,6); // five products + one migration marker
 assert.deepEqual(handle.data.get("products/"+existingQuiet.id),existingQuiet);
 assert.equal(Array.from(handle.data.values()).filter(x=>x.id&&x.title).length,5);
 const stored=handle.data.get("products/"+products.find(p=>p.category==="bundle").id);
 assert.equal(stored.priceCents,2199);
 assert.equal(stored.squarePaymentUrl,"");
 await seedAdditionalCatalog(handle,true);
 assert.equal(handle.data.size,6);
 assert.ok(handle.data.has(MARKER));
});
test("no changes to preview or author-existing title even with different ID",async()=>{
 const copy={...products[0],id:"af01c68b-30cf-4abe-a289-eb760a5b9b2d",stock:72};
 const preview=mockStore();
 await seedAdditionalCatalog(preview,false);
 assert.equal(preview.data.size,0);
 const live=mockStore([existingQuiet,copy]);
 await seedAdditionalCatalog(live,true);
 assert.deepEqual(live.data.get("products/"+copy.id),copy);
 const matching=Array.from(live.data.values()).filter(p=>p.title===copy.title);
 assert.equal(matching.length,1);
});
test("upcoming book and mystery preorder cannot enter Square checkout",()=>{
 const coming=products.find(p=>p.category==="book");
 const box=products.find(p=>p.category==="bundle");
 assert.throws(()=>calculateOrder(parseCart([{id:coming.id,quantity:1}]),[coming],{atomicStock:true,flatShippingCents:399}),/coming soon/);
 assert.throws(()=>calculateOrder(parseCart([{id:box.id,quantity:1}]),[box],{atomicStock:true,flatShippingCents:399}),/preorder is not open/);
});
