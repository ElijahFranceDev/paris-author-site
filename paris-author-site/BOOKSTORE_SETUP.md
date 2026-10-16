# P.M. France Bookstore — Deployment & Fulfillment Checklist

STATUS: Draft code in a review branch. Not live and not cleared to take preorder money.

## Included in the implementation
- Server-verified book prices, cart, quantity adjustments, Stripe-hosted payment.
- U.S. shipping address and free standard shipping for The Quiet Days ($28.00) and the Smile For Me Mystery Box ($21.99).
- Preorder display page; 25-box first run is a plan, not enforced inventory.
- Payment confirmation only after Stripe verifies paid status; saved order reference.
- Reader order tracking by full checkout session reference plus checkout email.
- Private fulfillment management through /manage-bookstore.html (status, carrier, tracking number, link).

## Netlify settings before launch
Confirm the Netlify base/publish directory points to the intended first-level paris-author-site folder. Other nested copies and backups exist in the repository.
Set STRIPE_SECRET_KEY to the merchant's Stripe TEST key first. The code continues the previous Stripe integration; it does not connect a Square account or transfer Square balances.
Set BOOKSTORE_ADMIN_TOKEN to a randomly generated secret of at least 24 characters, in Netlify environment variables only. Never commit it.
Set STORE_STANDARD_US_SHIPPING_CENTS to a merchant-approved US shipping amount in cents for older titles. Without it, orders containing those titles are blocked; free-shipping books still work.
Optional: SITE_URL=https://parisfrance.shop if Netlify URL is not appropriate.
Optional: STRIPE_AUTOMATIC_TAX_ENABLED=true only after Stripe Tax configuration and relevant tax obligations are confirmed.
Keep SMILE_BOX_PREORDERS_ENABLED unset or false until production and inventory systems are finished.

## Preorders require additional work
The $21.99 founding-reader offer includes standard US shipping. Planned first run: 25 boxes with paperback, collectible, two mystery items and distinctive packaging. The October 31, 2026 publication target is not a shipping guarantee.
The implemented feature flag blocks sales by default. No reliable atomic inventory reservation currently exists, so the site must NOT enable the switch or advertise a guaranteed 25-unit limit before a reliable stock counter/reservation service is integrated and tested.
Complete: confirmed manuscript/cover and proof, product quantity, shipping window, cancellation/refund terms, stock reservations, failed-payment handling, cancellations, and refund release handling. Golden Envelope prize is not advertised.

## End-to-end checklist
1. Test checkout with Stripe test credentials and an authorized US address.
2. Confirm the checkout total uses server prices, not prices modified in browser storage.
3. Confirm checkout cancel retains the cart, while a verified paid success clears the cart.
4. Turn on Stripe customer receipts and test email delivery. The site does not send shipping emails by itself.
5. Test order lookup with the checkout email and full order reference.
6. Enter a private token on /manage-bookstore.html, update status to Preparing and then Shipped and add a real carrier tracking URL, verify reader view.
7. Review privacy policy, refund/cancellation terms, delivery commitments, tax, and business contact information before accepting live orders.
8. Only after testing, set merchant live Stripe key and run a small authorized payment/refund.

## Operational limitations
Orders and statuses are stored with Stripe Checkout Sessions and PaymentIntent metadata; the existing Paris Supabase membership project is inactive and not used in the new store flow.
The owner list scans the 100 most recent checkout sessions. Use Stripe Dashboard for full history, refunds/disputes, and shipping addresses.
Tracking is manually entered and then surfaced to readers; this version does NOT auto-fetch carrier scans or email tracking notifications.
The Stripe subscription webhook is not changed; maintain it separately.
Order numbers are full Stripe checkout session references, not short custom numbers. Customers should copy/save these at confirmation.
Netlify deployment settings and payment secrets have not been verified here, so the system is not guaranteed production-ready.