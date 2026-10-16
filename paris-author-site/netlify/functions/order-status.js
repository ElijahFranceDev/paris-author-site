const { stripeClient, json } = require("./_store");
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    if (!event.body || event.body.length > 1000) return json(400, { error: "Invalid lookup" });
    const { order, email } = JSON.parse(event.body);
    if (typeof order !== "string" || !/^cs_(test_|live_)[a-zA-Z0-9]{12,}$/.test(order) ||
        typeof email !== "string" || email.length > 255 || !/^\S+@\S+\.\S+$/.test(email)) {
      return json(400, { error: "Enter a valid order reference and checkout email." });
    }
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(order, { expand: ["payment_intent"] });
    if (session.metadata?.storefront !== "pm-france-books" ||
        session.payment_status !== "paid" ||
        session.customer_details?.email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return json(404, { error: "We couldn't verify that order and email combination." });
    }
    const payment = session.payment_intent;
    const meta = typeof payment === "object" ? payment.metadata || {} : {};
    const items = await stripe.checkout.sessions.listLineItems(order, { limit: 20 });
    const allowedStatuses = ["received", "preordered", "preparing", "shipped", "delivered", "cancelled"];
    const status = allowedStatuses.includes(meta.fulfillment_status) ? meta.fulfillment_status : (session.metadata.contains_preorder === "true" ? "preordered" : "received");
    const trackingUrl = typeof meta.tracking_url === "string" && /^https:\/\//i.test(meta.tracking_url) ? meta.tracking_url : null;
    return json(200, {
      order: session.id, status, paid: true,
      containsPreorder: session.metadata.contains_preorder === "true",
      placedAt: new Date(session.created * 1000).toISOString(),
      items: items.data.map(i => ({ name: i.description, quantity: i.quantity })),
      carrier: meta.carrier || null,
      trackingNumber: meta.tracking_number || null,
      trackingUrl
    });
  } catch (err) {
    console.error("Order lookup failed", err);
    return json(404, { error: "Order not found. Verify your checkout email and order reference." });
  }
};
