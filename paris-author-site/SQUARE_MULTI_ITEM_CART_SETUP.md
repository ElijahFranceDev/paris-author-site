# P.M. France Multi-Item Square Cart — Preview-Only Draft

## Purpose

Return the shopping cart to `parisfrance.shop` so buyers can add multiple eligible books, adjust quantities, and pay for one Square **Order Checkout** instead of making multiple separate Square Payment Link purchases.

## Behavior

- **Books** (`/books.html`) stays editorial/exploration-only with no buy buttons.
- **Store** (`/store.html`) shows **Add to Cart** for published in-stock products; preorders stay announcement-only. Its cart indicator opens `/cart.html`.
- **Cart** saves product IDs and quantities in the customer's browser, reloads the public admin-managed catalog, and shows subtotal and quantities.
- A Netlify Function validates published status, non-preorder status, stock flags, server-owned cents, shipping profiles, and quantity limits.
- Square Checkout API `POST /v2/online-checkout/payment-links` receives an **`order` with multiple `line_items`**, one Square checkout link and one order. No raw card data reaches P.M. France.
- The Square return page is **neutral**: returning does NOT prove payment succeeded. A verified Square payment event is required for automatic confirmations and fulfillment.

## Existing merchant Netlify settings

- `SQUARE_ACCESS_TOKEN` — secret token with `ORDERS_READ`, `ORDERS_WRITE`, and `PAYMENTS_WRITE` permissions for Square Checkout API.
- `SQUARE_LOCATION_ID` — Square location accepting payment.
- `SQUARE_ENVIRONMENT` — either `sandbox` or `production` for each deployment context. Use **sandbox for all Deploy Previews** and preserve the existing production account setting.
- **New** `PMF_SQUARE_CART_ENABLED=true` — activates Square link creation. Keep **unset/false** on production until the go-live checks are complete.
- **Merchant-approved shipping policy:** Standard U.S. shipping is **$3.99 once per order (399 cents)** whenever the cart contains one or more paid-shipping products, even if the order also contains free-shipping items. A cart containing only free-shipping products has **$0** shipping.
- **Optional override:** `PMF_STANDARD_US_SHIPPING_CENTS` — leave unset to use the approved 399-cent default. Only change it with merchant approval; if set it must be a nonnegative integer in cents. The storefront/cart will need to be updated together if this value changes so estimates remain accurate.

## Critical operations rules

1. No Square Payment Links need to be pasted for new products; use admin product title, price, shipping profile and Published status. Existing individual Square Payment Links are retained in the admin record for potential rollback but are not used by the cart.
2. **Preorders always blocked**. The planned first 25 Smile For Me Founding Reader Mystery Boxes stay unavailable until manuscript/fulfillment terms and **atomic inventory reservations** are ready.
3. **All trackStock=true products are blocked from payment** in this initial implementation, even when a stock quantity is entered. Netlify Blobs/merchant-managed stock numbers do not reliably reserve quantities and Square does not automatically decrement this custom catalog. Add transactional reservation/expiry/payment-webhook processing before enabling those items.
4. Carts mixing digital and shipped items are blocked until shipping and fulfillment behavior is defined.
5. Shipping address collection is requested on Square for physical orders, but **country-specific shipping restriction is NOT implemented**. Merchant must configure/confirm U.S.-only eligibility and shipping workflow before enabling production. Never promise worldwide delivery.
6. Tax treatment, coupons and per-product shipping tiers need merchant approval; site should display applicable final amounts in Square Checkout. The site subtotal preview is not a receipt.
7. Manual testing must include a Square **sandbox** purchase with multiple different items, shipping, quantity changes, declined payments, cancellation, and return. Verify total charged and receipt line items in Square Sandbox Dashboard.
8. Proper paid-order history, status tracking, stock decrement and fulfillment emails require Square payment/order **webhook verification** and a transactional order database. This MVP does NOT create those mechanisms and must not claim a return page is proof of a completed sale.
9. Check desktop/mobile/cart keyboard inputs, published/unpublished products and prices changed in admin while carts are open. Do not activate production until merchant explicitly approves the merchant rules. The $3.99 rate is approved; verification of U.S.-only fulfillment, actual carrier costs, taxes and secure payment behavior remains outstanding.

## Developer testing

Run `npm test` inside the first-level `paris-author-site/` folder. The focused tests in `tests/pmf-square-cart.test.cjs` cover server-owned price authority, multi-line item checkout, shipping fee logic, preorders, stock restrictions and invalid quantities.

Square official documentation:
- https://developer.squareup.com/docs/checkout-api/square-order-checkout
- https://developer.squareup.com/reference/square/checkout/create-payment-link
- https://developer.squareup.com/docs/checkout-api/optional-checkout-configurations

## Rollout plan

- Keep this draft PR unmerged until approved and sandbox-tested.
- Preview site can test cart UI without an active gateway; API intentionally reports "Combined checkout is not open yet" until the enable flag is set and Square Sandbox credentials are configured.
- After sandbox verification and shipping-policy approval, enable production configuration and deploy together to avoid showing active cart controls with disabled checkout.
- Existing Square subscriptions and legacy payment functions remain untouched.
