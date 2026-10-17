const test=require("node:test");
const assert=require("node:assert/strict");
const pricing=require("../netlify/lib/pmf-square-cart.js");
test("tracked product enters protected reservation pathway",()=>{
 const p={id:"0ca10d9e-841e-4d28-8582-c817c6c2c801",title:"Test Book",published:true,
 priceCents:1000,preorder:false,trackStock:true,stock:4,shipping:"free-us"};
 const cart=pricing.parseCart([{id:p.id,quantity:2}]);
 const order=pricing.calculateOrder(cart,[p],{atomicStock:true});
 assert.equal(order.totalCents,2000);
});
