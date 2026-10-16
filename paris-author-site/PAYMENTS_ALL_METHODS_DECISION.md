# PAYMENT REQUIREMENTS DECISION — October 16, 2026

**This document supersedes the payment-provider recommendation in the older BOOKSTORE_ARCHITECTURE.md draft.** Do not deploy the earlier Helcim plan as if it satisfied the revised requirements. Preserve that document for alternative-provider research only.

## Non-negotiable merchant requirements
- Apple Pay, Stripe Link, Google Pay, cards, Klarna, Afterpay/Clearpay and room for other wallet/payment methods, subject to provider authorization and customer eligibility.
- Entire customer experience on parisfrance.shop, with secure third-party payment fields embedded in the custom P.M. France page.
- First-party cart, fulfillment, shipping, preorder stock control and customer tracking.

## Provider decision
**Stripe Payments + Checkout Sessions in Elements mode + Payment Element/Express Checkout Element.**

Why Stripe: Link is a Stripe wallet, while official HelcimPay.js methods list cards/ACH/EFT and Google Pay (not verified support for Link, Klarna or Afterpay). Adyen supports several methods but is not a direct substitute for Stripe Link. Stripe's own official sample documents the requested methods in Checkout/Elements.

## Current staged implementation
- /checkout.html and /store-checkout.js host on-site Contact Details, Shipping Address, Payment and Express Checkout Elements with burgundy/dark appearance.
- Netlify /create-checkout validates SKU, quantity, server-side price, shipping, and creates a Stripe Checkout Session with ui_mode=elements, returning a client secret. The secret merchant API key stays server-side.
- In-stock purchases use eligible payment methods enabled in Stripe Dashboard. Browser/amount/account/country eligibility may hide BNPL/wallet options.
- Preorder purchases: only card-based payments while Klarna/Link financing eligibility reviewed. Afterpay is prohibited for preorders under Stripe's official policy.
- Mystery Box acceptance remains OFF until capacity of 25 can be enforced transactionally. October 31 is a planned publication date, not a guaranteed shipping date.
- The present draft is NOT live and NOT production tested.

## Reliable order architecture (still to implement)
Browser /cart.html -> /checkout.html -> Netlify Checkout Session API -> Stripe Elements
-> **signed, verified Stripe webhook** -> idempotent Postgres order transaction
-> products / stock / reservations / orders / items / payment_events / shipments
-> authenticated author fulfillment dashboard -> carrier updates + transactional email.

**Inventory invariant:** a database transaction must atomically reserve units before checkout and release them on expiry/payment failure. On paid webhook, commit reservation to sold exactly once. A public flag alone cannot enforce a 25-box cap.

**Customer security:** never expose Stripe secret keys or store raw card data. Store shipping info server-side with restricted access; rate-limit order-status lookups. Prefer authenticated customer orders or opaque lookup tokens instead of only session ID + email for long-term production.

## Configuration and launch gates
1. Confirm Netlify deploy source directory and preview site.
2. Netlify env: STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY, matching TEST account; BOOKSTORE_ADMIN_TOKEN (temporary dashboard only); approved legacy-book shipping cost.
3. Activate methods in Stripe Dashboard and register parisfrance.shop as payment method domain for Apple Pay/express wallets.
4. Test mobile Safari Apple Pay, compatible Google Pay, Link, Klarna, Afterpay on an in-stock book. Test BNPL refusal for preorders and cart eligibility.
5. Complete database-backed inventory, signed webhook + idempotency, support/refund/delivery/tax policies and email receipts before the public launch.
6. Test paid flow and refund with Stripe test keys; validate existing subscriptions and member access after upgrading the Stripe SDK.
7. Obtain merchant approval separately to merge and publish. Never merge unfinished checkout to the live site.

Official references:
- https://docs.stripe.com/payments/quickstart
- https://docs.stripe.com/payments/afterpay-clearpay
- https://docs.stripe.com/payments/klarna
- https://docs.stripe.com/js/custom_checkout/create_express_checkout_element
- https://devdocs.helcim.com/docs/available-payment-types-and-methods-through-helcimpayjs
