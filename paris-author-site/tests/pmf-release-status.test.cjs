const test=require("node:test");
const assert=require("node:assert/strict");
const {CHANGES,KEY,setReadyForSale}=require("../netlify/lib/pmf-release-status");
const seeded=require("../netlify/lib/pmf-expand-catalog").products;
function makeStore(items=[]){
 const map=new Map(items.map(p=>["products/"+p.id,p]));
 return {map,
   async get(k){return map.get(k)||null},
   async setJSON(k,v){map.set(k,v);}
 };
}
test("availability changes only approved books",async()=>{
 const original=seeded.map(p=>({...p,squarePaymentUrl:"",updatedAt:"old"}));
 const store=makeStore(original);
 await setReadyForSale(store,true);
 for(const item of original){
   const next=store.map.get("products/"+item.id);
   if(["If Love Could Talk","Summer Kings"].includes(item.title)){
     assert.equal(next.comingSoon,false);
     assert.equal(next.description.startsWith("Coming soon."),false);
   }else{assert.deepEqual(next,item);}
   assert.equal(next.stock,item.stock);
   assert.equal(next.priceCents,item.priceCents);
   assert.equal(next.preorder,item.preorder);
   assert.equal(next.squarePaymentUrl,"");
 }
 assert.ok(store.map.has(KEY));
});
test("preserves author edits and is idempotent",async()=>{
 const old=seeded.find(p=>p.title==="Summer Kings");
 const edit={...old,description:"Author updated text",stock:63,squarePaymentUrl:""};
 const store=makeStore([edit]);
 await setReadyForSale(store,true);
 const updated=store.map.get("products/"+edit.id);
 assert.equal(updated.comingSoon,false);
 assert.equal(updated.description,"Author updated text");
 assert.equal(updated.stock,63);
 await setReadyForSale(store,true);
 assert.deepEqual(store.map.get("products/"+edit.id),updated);
});
test("does not migrate previews",async()=>{
 const old={...seeded.find(p=>p.title==="If Love Could Talk")};
 const store=makeStore([old]);
 await setReadyForSale(store,false);
 assert.deepEqual(store.map.get("products/"+old.id),old);
 assert.equal(store.map.has(KEY),false);
});
