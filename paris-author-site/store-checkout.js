// Stripe Checkout Sessions + Elements. The merchant owns this page; Stripe secures card data.
// This is a staged implementation: a test payment and Netlify env configuration are required.
(() => {
  const $ = (id) => document.getElementById(id);
  const message = $("checkout-message");
  const payButton = $("pay-button");
  const error = $("payment-message");
  const form = $("checkout-payment-form");
  const showError = (text) => { error.textContent = text; message.textContent = text; };
  const fmt = (cents) => (cents / 100).toLocaleString("en-US", {style: "currency", currency: "USD"});

  async function initialize() {
    const cart = getCart();
    if (!cart.length) {
      message.textContent = "Your shopping cart is empty. Add books before checking out.";
      return;
    }
    // The server recalculates the authoritative price; this summary is a preview only.
    const container = $("checkout-items");
    container.replaceChildren();
    cart.forEach(item => {
      const product = PMF_PRODUCTS[item.bookId];
      const row = document.createElement("div");
      row.className = "store-total-line";
      const name = document.createElement("span");
      const amount = document.createElement("strong");
      name.textContent = item.quantity + " × " + product.name;
      amount.textContent = fmt(item.quantity * product.cents);
      row.append(name, amount);
      container.append(row);
    });
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    $("checkout-count").textContent = count + (count === 1 ? " item" : " items");
    $("checkout-subtotal").textContent = fmt(cart.reduce((sum, item) => sum + PMF_PRODUCTS[item.bookId].cents * item.quantity, 0));
    const hasPreorder = cart.some(item => item.bookId === "smile-box");
    $("checkout-preorder").hidden = !hasPreorder;
    try {
      const response = await fetch("/.netlify/functions/store-settings", {cache:"no-store"});
      const settings = await response.json();
      if (!response.ok || !/^pk_(test|live)_/.test(settings.publishableKey || "")) {
        throw new Error("The bookstore payment account is not connected yet. Please return to the cart and try again later.");
      }
      if (typeof Stripe !== "function") throw new Error("Secure payments could not load. Please reload the page.");
      const stripe = Stripe(settings.publishableKey);

      // Checkout is created server-side, so the browser can never set the price or bypass product restrictions.
      const secretResponse = await fetch("/.netlify/functions/create-checkout", {
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({uiMode:"elements",cart:cart.map(({bookId,quantity})=>({bookId,quantity}))})
      });
      const body = await secretResponse.json();
      if (!secretResponse.ok || !body.clientSecret) throw new Error(body.error || "Unable to initialize secure checkout.");

      const checkout = stripe.initCheckoutElementsSdk({
        clientSecret: Promise.resolve(body.clientSecret),
        elementsOptions: {
          appearance: {
            theme:"night",
            variables: {
              colorPrimary:"#ab4c5b",
              colorBackground:"#101014",
              colorText:"#f0ece4",
              colorDanger:"#ff9197",
              colorTextSecondary:"#aaa49b",
              colorTextPlaceholder:"#777078",
              borderRadius:"12px",
              fontFamily:"Inter, system-ui, sans-serif"
            }
          }
        }
      });
      const contact = checkout.createContactDetailsElement();
      contact.mount("#contact-details-element");
      const shipping = checkout.createShippingAddressElement();
      shipping.mount("#shipping-address-element");
      const payment = checkout.createPaymentElement({
        layout:{type:"accordion",visibleAccordionItemsCount:0},
        ...(hasPreorder ? {wallets:{link:"never"}} : {})
      });
      payment.mount("#payment-element");
      // Express buttons render only on supported devices and eligible transactions.
      const express = checkout.createExpressCheckoutElement({
        buttonHeight:48,
        layout:{maxColumns:2,maxRows:3},
        paymentMethods:{applePay:"always",googlePay:"always",...(hasPreorder ? {link:"never"} : {})}
      });
      express.on("ready", ({availablePaymentMethods}) => {
        if (!availablePaymentMethods || Object.keys(availablePaymentMethods).length===0) {
          $("express-area").hidden = true;
        }
      });
      express.mount("#express-checkout-element");
      $("checkout-form").hidden = false;
      message.textContent = "Your address and payment options are securely handled by Stripe.";
      checkout.on("change", (session) => {
        payButton.disabled = !session.canConfirm;
        if (session.total?.total?.amount) {
          payButton.textContent = "Pay " + session.total.total.amount + " securely";
        }
      });
      const loaded = await checkout.loadActions();
      if (loaded.type === "error") throw new Error(loaded.error?.message || "Unable to activate checkout.");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        error.textContent = "";
        payButton.disabled = true;
        payButton.textContent = "Processing secure payment…";
        try {
          const result = await loaded.actions.confirm();
          if (result.type === "error") {
            error.textContent = result.error?.message || "Payment could not be completed.";
          }
          // Stripe redirects to our verified return page on a successful confirmation.
        } catch (err) {error.textContent = err.message || "Payment was not completed.";}
        finally {payButton.disabled = false;payButton.textContent = "Complete Secure Payment";}
      });
    } catch (err) {showError(err.message || "Checkout is unavailable. Please try again later.");}
  }
  document.addEventListener("DOMContentLoaded", initialize);
})();
