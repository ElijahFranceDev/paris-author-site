const { products, allowProduct, origin, stripeClient, json } = require("./_store");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    if (!event.body || event.body.length > 12000) return json(400, { error: "Invalid cart" });
    const input = JSON.parse(event.body);
    if (!Array.isArray(input.cart) || input.cart.length < 1 || input.cart.length > 12) {
      return json(400, { error: "Add a valid item to your cart" });
    }

    const quantities = new Map();
    for (const item of input.cart) {
      const id = item.bookId;
      const q = Number(item.quantity);
      if (typeof id !== "string" || !Object.hasOwn(products, id) || !Number.isSafeInteger(q) || q < 1 || q > 10) {
        return json(400, { error: "A cart item is invalid. Please refresh your cart." });
      }
      if (!allowProduct(id)) return json(409, { error: products[id].name + " is not open for orders yet." });
      const next = (quantities.get(id) || 0) + q;
      if (next > 10) return json(400, { error: "Maximum 10 copies per title in one order." });
      quantities.set(id, next);
    }

    const needsShippingCharge = [...quantities.keys()].some(id => !products[id].freeUSShipping);
    const fee = process.env.STORE_STANDARD_US_SHIPPING_CENTS;
    if (needsShippingCharge && (!/^\d+$/.test(fee || "") || Number(fee) > 5000)) {
      return json(503, { error: "Shipping for one of these titles has not been configured. Please contact the author before ordering." });
    }
    const preorders = [...quantities.keys()].filter(id => products[id].type === "preorder");

    const line_items = [...quantities.entries()].map(([id, quantity]) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: products[id].name,
          ...(products[id].type === "preorder" ? { description: "PREORDER — shipping begins after the book and mystery boxes are ready; date to be confirmed." } : {})
        },
        unit_amount: products[id].cents
      },
      quantity
    }));

    const shippingCost = needsShippingCharge ? Number(fee) : 0;
    const checkout = await stripeClient().checkout.sessions.create({
      mode: "payment",
      line_items,
      billing_address_collection: "auto",
      customer_creation: "always",
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { currency: "usd", amount: shippingCost },
          display_name: shippingCost ? "Standard U.S. shipping" : "Free standard U.S. shipping"
        }
      }],
      // Activate Stripe Tax only after the merchant configures tax settings.
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX_ENABLED === "true" },
      metadata: {
        storefront: "pm-france-books",
        contains_preorder: String(preorders.length > 0),
        smile_box_quantity: String(quantities.get("smile-box") || 0),
        items: [...quantities.entries()].map(([id, q]) => id + ":" + q).join(",")
      },
      payment_intent_data: {
        metadata: { storefront: "pm-france-books", fulfillment_status: preorders.length ? "preordered" : "received" }
      },
      custom_text: preorders.length ? {
        submit: { message: "This order includes a PREORDER. In-stock and preorder items may ship separately. We will send fulfillment updates when available." }
      } : undefined,
      success_url: origin() + "/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin() + "/cart.html?checkout=cancelled"
    });
    return json(200, { url: checkout.url });
  } catch (err) {
    console.error("Bookstore checkout failed", err);
    return json(500, { error: "We couldn't open secure checkout. Please try again or contact the author." });
  }
};
