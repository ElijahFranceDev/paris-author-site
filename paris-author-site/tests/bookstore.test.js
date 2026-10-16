const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const originalLoad = Module._load;
let lastCheckout;
const fakeStripe = { checkout:{ sessions:{ create:async data => { lastCheckout=data; return {url:"https://checkout.stripe.com/test"}; } } } };
Module._load = function(request,...args) {
  if (request === "stripe") return () => fakeStripe;
  return originalLoad.call(this,request,...args);
};
process.env.STRIPE_SECRET_KEY="sk_test_dummy";
process.env.SITE_URL="https://parisfrance.shop";
delete process.env.SMILE_BOX_PREORDERS_ENABLED;
delete process.env.STORE_STANDARD_US_SHIPPING_CENTS;
const handler = require("../netlify/functions/create-checkout").handler;
const call = async (cart) => {
  const response=await handler({httpMethod:"POST",body:JSON.stringify({cart})});
  return {status:response.statusCode,data:JSON.parse(response.body)};
};
test("Cannot override server price and The Quiet Days has free US shipping",async()=>{
  const r=await call([{bookId:"quiet-days",quantity:1,price:0}]);
  assert.equal(r.status,200);
  assert.equal(lastCheckout.line_items[0].price_data.unit_amount,2800);
  assert.equal(lastCheckout.shipping_options[0].shipping_rate_data.fixed_amount.amount,0);
  assert.deepEqual(lastCheckout.shipping_address_collection.allowed_countries,["US"]);
});
test("Mystery box preorders are closed by default",async()=>{
  assert.equal((await call([{bookId:"smile-box",quantity:1}])).status,409);
});
test("Unknown titles and invalid quantities are rejected",async()=>{
  assert.equal((await call([{bookId:"missing",quantity:1}])).status,400);
  assert.equal((await call([{bookId:"quiet-days",quantity:0}])).status,400);
  assert.equal((await call([{bookId:"quiet-days",quantity:11}])).status,400);
});
test("Unconfigured shipping for older titles does not invent a shipping fee",async()=>{
  assert.equal((await call([{bookId:"if-love",quantity:1}])).status,503);
});
test("The mystery box price is 2199 cents when manually enabled",async()=>{
  process.env.SMILE_BOX_PREORDERS_ENABLED="true";
  const r=await call([{bookId:"smile-box",quantity:2}]);
  assert.equal(r.status,200);
  assert.equal(lastCheckout.line_items[0].price_data.unit_amount,2199);
  assert.equal(lastCheckout.metadata.smile_box_quantity,"2");
  delete process.env.SMILE_BOX_PREORDERS_ENABLED;
});
test.after(()=>{Module._load=originalLoad;});
