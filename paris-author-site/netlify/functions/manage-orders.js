// Protected owner-only fulfillment updates. Configure BOOKSTORE_ADMIN_TOKEN
// in Netlify environment variables. Never put this secret in public JS.
const crypto = require("node:crypto");
const { stripeClient, json } = require("../lib/store");
function authorized(header) {
  const token = process.env.BOOKSTORE_ADMIN_TOKEN;
  const supplied = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token.length < 24 || supplied.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(supplied));
}
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!authorized(event.headers.authorization || event.headers.Authorization)) return json(401, { error: "Not authorized" });
  try {
    if (!event.body || event.body.length > 8000) return json(400, { error: "Invalid input" });
    const body = JSON.parse(event.body);
    const stripe = stripeClient();
    if (body.action === "list") {
      const results = await stripe.checkout.sessions.list({ limit: 100, expand: ["data.payment_intent"] });
      const orders = results.data.filter(s => s.metadata?.storefront === "pm-france-books" && s.payment_status === "paid");
      return json(200, {
        orders: orders.map(s => ({
          order: s.id, email: s.customer_details?.email || "",
          created: new Date(s.created * 1000).toISOString(),
          amount: s.amount_total, currency: s.currency,
          containsPreorder: s.metadata.contains_preorder === "true",
          status: typeof s.payment_intent === "object" ? s.payment_intent.metadata?.fulfillment_status || "received" : "received",
          carrier: typeof s.payment_intent === "object" ? s.payment_intent.metadata?.carrier || "" : "",
          trackingNumber: typeof s.payment_intent === "object" ? s.payment_intent.metadata?.tracking_number || "" : "",
          trackingUrl: typeof s.payment_intent === "object" ? s.payment_intent.metadata?.tracking_url || "" : ""
        })),
        hasMore: results.has_more
      });
    }
    if (body.action === "update") {
      if (typeof body.order !== "string" || !/^cs_(test_|live_)[a-zA-Z0-9]{12,}$/.test(body.order)) return json(400, { error: "Invalid order" });
      const allowed = ["received", "preordered", "preparing", "shipped", "delivered", "cancelled"];
      if (!allowed.includes(body.status)) return json(400, { error: "Invalid status" });
      const carrier = (body.carrier || "").trim(), number = (body.trackingNumber || "").trim(), url = (body.trackingUrl || "").trim();
      if (carrier.length > 80 || number.length > 120 || url.length > 500 ||
          (url && !/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(url))) return json(400, { error: "Invalid tracking details" });
      const session = await stripe.checkout.sessions.retrieve(body.order, { expand: ["payment_intent"] });
      if (session.payment_status !== "paid" || session.metadata?.storefront !== "pm-france-books" || !session.payment_intent) {
        return json(404, { error: "Paid bookstore order not found" });
      }
      const payment = session.payment_intent;
      const paymentId = typeof payment === "string" ? payment : payment.id;
      const oldMeta = typeof payment === "string" ? (await stripe.paymentIntents.retrieve(payment)).metadata : payment.metadata;
      await stripe.paymentIntents.update(paymentId, {
        metadata: {
          ...oldMeta, fulfillment_status: body.status,
          carrier, tracking_number: number, tracking_url: url
        }
      });
      return json(200, { saved: true });
    }
    return json(400, { error: "Unknown action" });
  } catch (error) {
    console.error("Admin bookstore request failed", error);
    return json(500, { error: "Unable to load or update orders" });
  }
};
