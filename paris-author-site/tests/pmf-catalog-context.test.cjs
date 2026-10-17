const test = require("node:test");
const assert = require("node:assert/strict");
const catalog = require("../netlify/lib/pmf-store.js");
const {seedProductionCatalog} = require("../netlify/lib/pmf-seed.js");
function mockStore(initial=[]) {
 const map=new Map(initial.map(p=>["products/"+p.id,p]));
 return {
  map,
  async list(){return {blobs:[...map.keys()].map(key=>({key}))};},
  async get(key){return map.get(key)||null;},
  async setJSON(key,value){map.set(key,value);}
 };
}
test("trusted Netlify production context selects production",()=>{
 assert.equal(catalog.isProductionDeploy({deployContext:"production"}),true);
 assert.equal(catalog.isProductionDeploy({deployContext:"deploy-preview"}),false);
 assert.equal(catalog.isProductionDeploy({deployContext:"branch-deploy"}),false);
});
test("production starts with the authorized $28.99 Quiet Days listing, once",async()=>{
 const store=mockStore();
 await seedProductionCatalog(store,true);
 await seedProductionCatalog(store,true);
 assert.equal(store.map.size,1);
 const [item]=store.map.values();
 assert.equal(item.title,"The Quiet Days");
 assert.equal(item.priceCents,2899);
 assert.equal(item.squarePaymentUrl,"");
 assert.equal(item.published,true);
 assert.equal(item.shipping,"free-us");
});
test("preview never gets a copy of production book automatically",async()=>{
 const store=mockStore();
 await seedProductionCatalog(store,false);
 assert.equal(store.map.size,0);
});
test("existing published, draft, or archived products never get replaced",async()=>{
 const previous={id:"test-author-owned",title:"Existing Book",published:false};
 const store=mockStore([previous]);
 await seedProductionCatalog(store,true);
 assert.equal(store.map.size,1);
 assert.deepEqual(store.map.get("products/"+previous.id),previous);
});
