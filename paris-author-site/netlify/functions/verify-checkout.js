const { stripeClient, json } = require("../lib/store");
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const { session_id } = JSON.parse(event.body || "{}");
    if (typeof session_id !== "string" || !/^cs_(test_|live_)[a-zA-Z0-9]{12,}$/.test(session_id)) {
      return json(400, { error: "Invalid order reference" });
    }
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.metadata?.storefront !== "pm-france-books") return json(404, { error: "Order not found" });
    if (session.payment_status !== "paid") return json(200, { paid: false });
    const items = await stripe.checkout.sessions.listLineItems(session_id, { limit: 20 });
    return json(200, {
      paid: true, order: session.id, total: session.amount_total, currency: session.currency,
      containsPreorder: session.metadata.contains_preorder === "true",
      items: items.data.map(i => ({ name: i.description, quantity: i.quantity }))
    });
  } catch (error) {
    console.error("Order verification failed", error);
    return json(404, { error: "Order not found or not yet available" });
  }
};
