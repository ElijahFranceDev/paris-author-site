# P.M. FRANCE — Bookstore Platform Architecture (Draft v1)

Decision date: 2026-10-16. Status: design approved in principle; production payment gateway, order database, taxes, and inventory NOT deployed.

## Merchant checkout decision
- **Primary PSP**: HelcimPay.js. Frontend remains entirely P.M. France branded; card entry and payment interaction render in Helcim's secure iframe overlay.
- **Optional later**: PayPal Expanded Checkout as an independent payment method, not required to ship v1.
- Helcim onboarding/API access credentials and domain whitelist need to be completed by the merchant. Do not store credentials in source control.
- Helcim session starts via a server-only POST to `https://api.helcim.com/v2/helcim-pay/initialize` with `paymentType=purchase`, **server-computed** USD amount, and checkout order/invoice reference. Render the returned checkoutToken using HelcimPay.js; never expose API token or secretToken in browser.
- Use `paymentMethod=cc` at first and `allowPartial=0`. Use *purchase* (charge now) for preorders only after shipping and refunds disclosures; don't hold long-lived preauthorizations through release.
- Helcim webhooks: verify `webhook-id`, `webhook-timestamp`, `webhook-signature` (HMAC-SHA256, verifier token decoded from base64) over `<id>.<timestamp>.<raw body>`, check for reasonable timestamp tolerance, idempotently record event ID, fetch transaction from Helcim by ID, and verify `APPROVED`, order association and exact amount/currency before changing order to paid.
- A front-end payment success event is **not proof of payment**. Only backend verification/webhook reconciliation may mark paid. The checkout's `secretToken` can independently validate HelcimPay.js response hash server-side if that path is implemented.

## Platform layers
| Layer | Recommended technology | Role |
| --- | --- | --- |
| Storefront | Existing static HTML/CSS/JS on Netlify | Books, cart, checkout steps, reader account and tracking pages |
| API | Netlify Functions (Node.js) | Validate cart, shipping address, totals, start payment, process webhooks, status and admin APIs |
| Database | Netlify Database (PostgreSQL; check plan/credit availability) | Orders, payment attempts, inventory, reservation holds, fulfillment history, idempotency |
| Payments | HelcimPay.js | Card vault/modal, payment settlement, disputes, refunds via merchant tools |
| Customer email | Verified transactional email provider (TBD) | Order receipt, preorder changes, shipment notifications |
| Shipping | Manual USPS/UPS/FedEx fulfillment first, carrier APIs later | Labels, tracking URLs and fulfillment status |
| Admin | Auth-protected owner dashboard | Manage orders, change fulfillment statuses, CSV export |

Use `netlify/db/bookstore.sql` as a schema draft to review before applying to a Postgres database. Netlify Database is newly available on credit-based plans, so verify activation/cost rather than assuming every plan includes it.

## Order sequence (without holding raw card data)
1. Reader adds books to browser cart; browser may display approximate prices only.
2. Reader enters name, verified-format email and U.S. shipping address into P.M. France checkout form. No card numbers collected on our pages.
3. Server validates each SKU, qty, sale eligibility, shipping policy, and tax settings; calculates amounts in integer cents using server catalog.
4. DB transaction creates `pending_payment` order and `pending` reservations. Row-lock inventory for finite items, reject if available units insufficient. Each reservation has expiration (e.g. 60 min) and cannot consume more than on-hand stock.
5. Backend creates a HelcimPay.js session, links checkout token/invoice reference to payment attempt, and returns only checkoutToken to browser.
6. Browser renders Helcim-hosted card iframe. Reader pays; show only a **processing** screen until server has confirmed payment.
7. Signed payment webhook + API transaction lookup confirms paid amount/currency and order, performs idempotent update and converts reservation into sold units; repeated webhook must not double-decrement inventory.
8. Paid order gets an opaque reader reference and email confirmation; staff dashboard shows `Paid / Preorder` or `Paid / Awaiting fulfillment`.
9. Staff enters carrier and tracking number, status moves through `Preparing` → `Shipped` → `Delivered`. Reader can check progress by order reference plus email (with rate limiting), without exposing full address or financial data.
10. Refund/cancellation explicitly reverses paid/reserved units as policy permits, with audit trail; never claim a refund before processor confirms.

## Initial product decisions
- The Quiet Days: $28.00, unsigned paperback, **free standard U.S. shipping**. Confirm actual author stock before marking in stock.
- Smile For Me Founding Reader Mystery Box: $21.99, **free standard U.S. shipping**, planned initial run 25, paperback + collectible + two mystery items + special packaging. It is **not live**; there is no guaranteed shipping date. Publication target 2026-10-31 is not a shipment promise.
- Smile For Me general retail paperback: $26.99 list price (retailer/distribution reference), **not an active direct-checkout item** until separately approved.
- If Love Could Talk: website legacy display $15.99; Summer Kings: $25.99; keep only after fulfillment and shipping policies confirmed.
- U.S. shipping only for the first release. Mixed in-stock/preorder carts must clearly disclose split fulfillment; v1 may block mixed carts until handling is finalized.

## Preorder inventory rules
- Initialize planned capacity 25 but do not mark 25 physically available until proof, author copies, packing, and shipping policies are ready.
- Sale is disabled by default. Create an inventory row with `on_hand=0`, then owner must explicitly stock up to 25 and switch `accepting_orders=true` after approvals.
- Within a database transaction acquire the inventory row `FOR UPDATE`; only reserve if `on_hand - sold - reserved >= requested`. This guarantees capacity in concurrent checkouts.
- Expired unpaid reservations require an audited cleanup task (Netlify scheduled function) and a payment reconciliation check first.
- A webhook received after reservation expiry requires manual exception/refund rather than an unauthorized oversell.
- Charge-at-preorder and cancellation/ship-by details must be disclosed before card capture; confirm legal and payment processor terms.

## Security, fraud and reliability requirements
- HTTPS-only. CSP permitting Helcim iframe domain only. API keys and HMAC verifier token in Netlify runtime env (Functions scope), never in public JS.
- All prices, inventory, discounts, tax, shipping and order totals calculated on backend; never trust `localStorage` totals.
- Customer lookup uses unguessable reference + checkout email and per-IP/account rate limits. Do not display delivery address on unauthenticated tracking lookups.
- Strong admin sign-in, role checks, CSRF protections, no shared static token as final production owner authentication.
- Payment endpoints idempotent. Verify webhook signatures, transaction status, amount, currency, order reference and vendor metadata against records.
- Limit logs containing PII, do not log card data, retain only necessary shipping data, publish privacy/returns/fulfillment policies.
- Refunds and chargebacks may occur outside website; reconcile against merchant dashboard or provider notifications.
- Incomplete payments remain `pending_payment` or `expired`, not confirmed. An error or timeout must never create a false order confirmation.

## Go-live gate and rollback
1. Merchant creates Helcim test account, whitelists a Netlify preview domain, obtains test API access + webhook verifier token.
2. Confirm Netlify deploy base/publish directory for the repository's first-level `paris-author-site` folder. No change to main or live site until preview works.
3. Provision Postgres only after merchant understands availability/credit costs; apply reviewed migration and confirm backups/access.
4. Implement and test full Helcim session, signed webhook, reservation race, receipt delivery, refund, tax, and shipping flows.
5. Switch customer-facing code from Stripe to Helcim **only after** a complete test journey. Maintain old payment account and transaction history for existing buyers.
6. Test customer purchases on mobile and desktop; launch in stages: The Quiet Days first, Smile For Me box later.
7. Keep rollback path to known-good previous Netlify deploy; preserve new DB orders and ensure outstanding transactions remain fulfilled.

## Primary verification references
- https://devdocs.helcim.com/docs/overview-of-helcimpayjs
- https://devdocs.helcim.com/docs/initialize-helcimpayjs
- https://devdocs.helcim.com/docs/webhooks
- https://devdocs.helcim.com/reference/getcardtransaction
- https://www.helcim.com/interchange-plus/
- https://docs.netlify.com/build/data-and-storage/netlify-database/

Next implementation milestone: finalize merchant account and Postgres deployment, then connect the payment adapter and shipping steps in the existing draft PR. **Never merge the existing Stripe checkout draft unchanged as the Helcim migration.**