const test=require("node:test");
const assert=require("node:assert/strict");
const {KEY,CHANGES,publishUpdatedSmileTerms}=require("../netlify/lib/pmf-smile-release.js");
const originalProducts=require("../netlify/lib/pmf-expand-catalog.js").products;
function mockStore(initial){
 const records=new Map(initial.map(p=>["products/"+p.id,p]));
 return {records,async get(key){return records.get(key)||null;},async setJSON(key,v){records.set(key,v);}};
}
test("Nov 7 release, 7-10 day shipping and 25 box cap are preserved",async()=>{
 const items=CHANGES.map(c=>({...originalProducts.find(p=>p.id===c.id),description:c.previous}));
 const store=mockStore(items);
 await publishUpdatedSmileTerms(store,true);
 const regular=store.records.get("products/"+CHANGES[0].id);
 const box=store.records.get("products/"+CHANGES[1].id);
 assert.match(regular.description,/November 7, 2026/);
 assert.match(box.description,/November 7, 2026/);
 assert.match(box.description,/November 14–17, 2026/);
 assert.match(box.description,/checkout activates after secure Square setup/);
 assert.equal(regular.comingSoon,true);
 assert.equal(regular.preorder,false);
 assert.equal(box.preorder,true);
 assert.equal(box.stock,25);
 assert.equal(box.priceCents,2199);
 assert.equal(box.shipping,"free-us");
 assert.equal(box.squarePaymentUrl,undefined);
 assert.equal(store.records.get(KEY).completedAt!==undefined,true);
});
test("author-edited copy, image, price, stock, and flags are never overwritten",async()=>{
 const p=originalProducts.find(p=>p.id===CHANGES[1].id);
 const changed={...p,description:"My author-edited launch copy",stock:19,priceCents:2199,imageId:"cover-custom",squarePaymentUrl:""};
 const store=mockStore([changed]);
 await publishUpdatedSmileTerms(store,true);
 assert.deepEqual(store.records.get("products/"+p.id),changed);
 await publishUpdatedSmileTerms(store,true);
 assert.deepEqual(store.records.get("products/"+p.id),changed);
});
test("preview never receives production release-copy update",async()=>{
 const p={...originalProducts.find(p=>p.id===CHANGES[1].id)};
 const store=mockStore([p]);
 await publishUpdatedSmileTerms(store,false);
 assert.deepEqual(store.records.get("products/"+p.id),p);
 assert.equal(store.records.has(KEY),false);
});
