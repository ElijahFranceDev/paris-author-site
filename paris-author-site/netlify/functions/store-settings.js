const { products, allowProduct, json } = require("../lib/store");
exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  return json(200, {
    currency: "USD",
    domesticOnly: true,
    products: Object.fromEntries(Object.entries(products).map(([id, product]) => [
      id, { name: product.name, cents: product.cents, type: product.type, available: allowProduct(id), freeUSShipping: product.freeUSShipping }
    ])),
    // A 25-box first run is planned, but inventory is NOT automatically reserved or enforced here.
    smileBoxFirstRun: 25
  });
};
