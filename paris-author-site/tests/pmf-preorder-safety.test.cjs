const test=require("node:test");
const assert=require("node:assert/strict");
const {correctPreorderFlags,MARKER,FIXES}=require("../netlify/lib/pmf-preorder-safety.js");
const upstream=require("../netlify/lib/pmf-expand-catalog.js").products;
const makeStore=items=>{const records=new Map(items.map(i=>["products/"+i.id,i]));return {
 records,async get(key){return records.get(key)||null},
 async setJSON(key,v){records.set(key,v)}
};};
test("only the 25-box listing is a preorder",async()=>{
 const wrong=upstream.map(p=>({...p,preorder:p.title==="Smile For Me",comingSoon:false}));
 const store=makeStore(wrong);
 await correctPreorderFlags(store,true);
 assert.equal(store.records.get("products/"+FIXES[0].id).preorder,false);
 assert.equal(store.records.get("products/"+FIXES[0].id).comingSoon,true);
 assert.equal(store.records.get("products/"+FIXES[1].id).preorder,true);
 assert.equal(store.records.get("products/"+FIXES[1].id).comingSoon,false);
 for(const p of wrong){
  const next=store.records.get("products/"+p.id);
  assert.equal(next.priceCents,p.priceCents);
  assert.equal(next.stock,p.stock);
  assert.equal(next.sku,p.sku);
 }
 assert.ok(store.records.has(MARKER));
});
test("test previews and subsequent runs never change records",async()=>{
 const wrong={...upstream.find(p=>p.title==="Smile For Me"),preorder:true,comingSoon:false};
 const store=makeStore([wrong]);
 await correctPreorderFlags(store,false);
 assert.deepEqual(store.records.get("products/"+wrong.id),wrong);
 await correctPreorderFlags(store,true);
 const once=store.records.get("products/"+wrong.id);
 await correctPreorderFlags(store,true);
 assert.deepEqual(store.records.get("products/"+wrong.id),once);
});
