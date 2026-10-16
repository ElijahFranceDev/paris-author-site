// Server-owned catalog and fulfillment policies for author-direct sales.
// Never accept prices or inventory flags from the browser.
const products = Object.freeze({
  "quiet-days": { name: "The Quiet Days — paperback (unsigned)", cents: 2800, type: "in-stock", freeUSShipping: true },
  "if-love": { name: "If Love Could Talk", cents: 1599, type: "in-stock", freeUSShipping: false },
  "summer-kings": { name: "Summer Kings", cents: 2599, type: "in-stock", freeUSShipping: false },
  "smile-box": { name: "Smile For Me — Founding Reader Mystery Box", cents: 2199, type: "preorder", freeUSShipping: true }
});
const enabled = (name) => process.env[name] === "true";
function allowProduct(id) {
  if (id === "smile-box") return enabled("SMILE_BOX_PREORDERS_ENABLED");
  return Object.hasOwn(products, id);
}
function origin() {
  const candidate = process.env.SITE_URL || process.env.URL || "https://parisfrance.shop";
  const url = new URL(candidate);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid site URL");
  return url.origin;
}
function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Payment processing is not configured");
  return require("stripe")(process.env.STRIPE_SECRET_KEY);
}
const json = (statusCode, data) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(data)
});
module.exports = { products, allowProduct, origin, stripeClient, json };
