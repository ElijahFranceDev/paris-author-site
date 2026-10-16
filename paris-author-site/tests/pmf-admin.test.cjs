const test=require("node:test");
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const store=require("../netlify/lib/pmf-store");
const auth=require("../netlify/lib/pmf-admin-auth");
const base={title:"The Quiet Days",category:"book",format:"Paperback",priceCents:2800,
 description:"Dark psychological thriller.",author:"Paris M. France",sku:"PMF-TQD",
 shipping:"free-us",trackStock:true,stock:15,preorder:false,published:true,
 squarePaymentUrl:"https://square.link/u/example",imageId:""};
test("validates book product and preserves exact price",()=>{
 const product=store.normalize(base);
 assert.equal(product.priceCents,2800);
 assert.equal(product.stock,15);
 assert.match(product.id,/^[0-9a-f-]{36}$/);
});
test("rejects malicious external payment URLs",()=>{
 for(const link of ["javascript:alert(1)","https://not-square.link/pay","http://square.link/u/test","https://square.link.evil.example/pay"])
  assert.throws(()=>store.normalize({...base,squarePaymentUrl:link}),/Square payment/);
});
test("disallows invalid inventory or negative prices",()=>{
 assert.throws(()=>store.normalize({...base,priceCents:-1}),/Price/);
 assert.throws(()=>store.normalize({...base,stock:-1}),/stock/);
});
test("archived/draft and preorder items do not become purchasable",()=>{
 const draft=store.display(store.normalize({...base,published:false}));
 const preorder=store.display(store.normalize({...base,preorder:true}));
 assert.equal(draft.canBuy,false);
 assert.equal(preorder.canBuy,false);
});
test("scrypt password verification and private signed cookie work",()=>{
 const salt=crypto.randomBytes(16),password="example_password_used_only_for_tests";
 process.env.PMF_ADMIN_PASSWORD_HASH="scrypt:"+salt.toString("hex")+":"+crypto.scryptSync(password,salt,64).toString("hex");
 process.env.PMF_ADMIN_SESSION_SECRET=crypto.randomBytes(40).toString("hex");
 assert.equal(auth.verifyPassword(password),true);
 assert.equal(auth.verifyPassword("wrong"),false);
 const cookie=auth.createCookie().split(";")[0];
 const request={headers:{cookie,origin:"https://parisfrance.shop",host:"parisfrance.shop"}};
 assert.equal(auth.authorized(request),true);
 assert.equal(auth.sameOrigin(request),true);
 assert.equal(auth.sameOrigin({headers:{origin:"https://evil.example",host:"parisfrance.shop"}}),false);
 assert.equal(auth.authorized({headers:{cookie:cookie.replace(/.$/,"x")}}),false);
});
