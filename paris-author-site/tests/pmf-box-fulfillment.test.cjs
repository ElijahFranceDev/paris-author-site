const test=require("node:test");
const assert=require("node:assert/strict");
const {KEY,BOX_ID,TERMS,appendMysteryBoxTerms}=require("../netlify/lib/pmf-box-fulfillment.js");
const base={id:BOX_ID,sku:"PMF-SFM-FRMB-001",title:"Smile For Me — Founding Reader Mystery Box",description:"Author copy about the novel and mystery items.",stock:25,priceCents:2199,shipping:"free-us",preorder:true,comingSoon:false,squarePaymentUrl:"",imageId:""};
function store(product){
 const values=new Map([["products/"+BOX_ID,product]]);
 return {values,async get(k){return values.get(k)||null;},async setJSON(k,v){values.set(k,v);}};
}
test("append release and shipping terms preserving author-edited description and stock",async()=>{
 const s=store({...base});
 await appendMysteryBoxTerms(s,true);
 const b=s.values.get("products/"+BOX_ID);
 assert.ok(b.description.startsWith(base.description));
 assert.match(b.description,/November 7, 2026/);
 assert.match(b.description,/7–10 days after each preorder is placed/);
 assert.equal(b.stock,25);assert.equal(b.priceCents,2199);assert.equal(b.preorder,true);
 assert.equal(b.squarePaymentUrl,"");
 await appendMysteryBoxTerms(s,true);
 assert.equal(s.values.get("products/"+BOX_ID).description,b.description);
 assert.ok(s.values.has(KEY));
});
test("leave preview untouched and do not duplicate terms",async()=>{
 const s=store({...base,description:base.description+"\n\n"+TERMS});
 await appendMysteryBoxTerms(s,false);
 assert.equal(s.values.has(KEY),false);
 await appendMysteryBoxTerms(s,true);
 assert.equal(s.values.get("products/"+BOX_ID).description,base.description+"\n\n"+TERMS);
});
