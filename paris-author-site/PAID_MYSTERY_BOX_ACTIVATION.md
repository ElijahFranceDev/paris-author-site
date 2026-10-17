# P.M. France — Paid Mystery Box Preorder Launch

**Owner-approved offer**
- Smile For Me release date: **November 7, 2026**
- Prepaid Founding Reader Mystery Box: **$21.99**, including free standard U.S. shipping
- Quantity: **25 total**
- Order placed and payment charged: **when secure Square checkout opens**
- Boxes **SHIP November 14–17, 2026** (7–10 calendar days **after release**, not after individual preorder)
- Shipping date is the carrier handoff window, **not** an estimated arrival guarantee.
- The standard Smile For Me paperback remains Coming Soon; older available titles can be purchased when Square cart checkout is activated.

## Merchant payment activation checklist

1. Confirm the **production** Netlify Functions environment has `PMF_INVENTORY_DATABASE_URL` pointing to the main P.M. France bookstore Neon database (never the sandbox branch).
2. In Square Developer Console, create the production webhook subscription for `payment.created` and `payment.updated`, notification URL **exactly** `https://parisfrance.shop/.netlify/functions/pmf-square-inventory-webhook`.
3. Set the subscription's production **signature key** in Netlify `PMF_SQUARE_WEBHOOK_SIGNATURE_KEY` and the exact URL in `PMF_SQUARE_WEBHOOK_NOTIFICATION_URL`. Keep the secret in Netlify only.
4. Confirm existing `SQUARE_ENVIRONMENT=production`, `SQUARE_LOCATION_ID`, and `SQUARE_ACCESS_TOKEN` **production** values are correct (preview uses Sandbox credentials). Do not replace production with Sandbox.
5. With a sandbox preview database and webhook, test: 1 prepaid Mystery Box, 2 different ready-to-ship books, canceled checkout, simultaneous last-unit orders, refusal to mix preorder with available books, shipping fee $3.99 once for paid-shipping carts, and the verified payment webhook moving reserved stock to sold. Confirm the Square order line item shows **PREORDER ships Nov 14–17, 2026**.
6. Review Square's U.S. shipping destination restrictions, expected taxes, card availability and refunds. Ensure accurate inventory across any independently shared Square Payment Links or external channels.
7. Sign in to `https://parisfrance.shop/admin.html` and open **Check Square Readiness**. The private endpoint reports safe boolean configuration checks; it never reveals actual credentials. A green readiness result **alone is not a completed payment test**.
8. Only after successful tests, set these Netlify **production** environment variables:
   - `PMF_SQUARE_CART_ENABLED=true` to permit existing in-stock titles
   - `PMF_MYSTERY_PREORDER_ENABLED=true` to also permit only the approved Mystery Box as a **prepaid preorder**
   Then trigger a fresh Netlify production deploy.
9. Open a real $21.99 checkout in a clean browser, confirm free shipping, November 14–17 ship window, terms checkbox and complete Square payment before announcing the preorder. Ensure the Neon reservation moves from reserved to sold.
10. Keep the production switch OFF if any webhook or inventory test fails.

## Customer safeguards
- All Square checkout prices and stock are validated server-side. A cart cannot edit the price or purchase an unavailable product.
- Mystery Box checkout is allowed only if the product has the specific protected UUID and SKU, the explicit preorder switch is on, the customer accepts November 14–17 shipping and inventory can reserve the requested quantity.
- Mixing shipped-now books and delayed preorder boxes is blocked. Both still use the same multi-item cart for compatible items.
- Order line item and payment note both identify the delayed fulfillment.
- The Square return page **does not prove the payment completed**; inventory is sold only after Square webhook signature validation and a direct Square Payments API lookup.

## Fulfillment obligations
- Ship by Nov 17 if this remains the advertised ship window. Under the FTC Mail, Internet, or Telephone Order Rule, if unable to ship as promised, offer the required consent-to-delay or refund procedure promptly.
- Keep enough books, box contents, packaging and cash for the entire initial 25-box run, and prevent external sales from overselling the same 25 slots.
