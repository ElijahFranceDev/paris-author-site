# P.M. France — Automatic Inventory Launch Checklist

**Status:** Implementation staged; Square payment activation remains OFF until tested.

## Dedicated Neon database
- Project: P.M. France Bookstore Inventory
- Project ID: flat-poetry-10796808
- Database: pmf_bookstore
- Schema: sql/001_pmf_inventory.sql (already created)
- Not shared with FFS databases.

## Netlify private environment configuration
Set the following in Project configuration > Environment variables > Functions, with **separate production and preview settings**:

- PMF_INVENTORY_DATABASE_URL: Copy the dedicated Neon PostgreSQL connection URI from the Neon Console, or from your private connection settings. Never paste it into chat, GitHub, or frontend files.
- SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID: existing Square merchant credentials. Verify OAuth scopes ORDERS_READ, ORDERS_WRITE, PAYMENTS_WRITE and PAYMENTS_READ.
- SQUARE_ENVIRONMENT: sandbox in Deploy Previews, production in Production.
- PMF_SQUARE_WEBHOOK_SIGNATURE_KEY: secret key for your Square developer webhook subscription.
- PMF_SQUARE_WEBHOOK_NOTIFICATION_URL: the EXACT webhook endpoint URL used when creating the subscription. It must match Square's configured URL byte for byte.
- PMF_STANDARD_US_SHIPPING_CENTS: 399 (optional; current approved default).
- PMF_SQUARE_CART_ENABLED: leave unset/false until sandbox checkout and inventory testing pass.

Use a separate Neon database or branch with its own URI for preview testing. Do not share production inventory with preview deploys.

## Configure Square
1. In the Square Developer Console, use **Sandbox** application credentials for preview, create a webhook subscription for payment.created and payment.updated at:
   https://deploy-preview-[PR-NUMBER]--parismfrancebooks.netlify.app/.netlify/functions/pmf-square-inventory-webhook
2. Record the exact notification URL and signature key in the Deploy Preview environment (private variables).
3. Confirm the developer application's production permissions and configure a separate production webhook subscription at:
   https://parisfrance.shop/.netlify/functions/pmf-square-inventory-webhook
4. After sandbox passes, test an order containing two different books or products, check the Square order, receipt, location, U.S. shipping address, shipping fee, applicable tax, declined/canceled payment flow and wallet availability.
5. Confirm old externally shared individual Square payment links are not selling the same tracked stock outside this inventory ledger, or build an import/reconciliation service. Otherwise inventory cannot be accurate across channels.
6. Check the scheduled Netlify function pmf-reconcile-checkouts runs and cancels expired Square links before releasing reserved units.
7. Confirm order status in the Neon database changes from awaiting_payment to paid on real confirmed Square test payments.
8. Only then set PMF_SQUARE_CART_ENABLED=true in Production Functions and deploy. Existing Square single-product links are the fallback while it remains false.

## Important
- The browser's return page does not prove a payment. Only a verified payment callback can update stock_sold.
- Reservations are atomic and fail closed on errors. A stalled Square checkout remains held until a verified cancellation; this can temporarily make stock unavailable, but avoids overselling.
- Refunds are **not** automatically restocked: inspect the returned goods and manually approve restocking.
- Tax calculation and restriction to U.S. delivery are not guaranteed by the custom frontend; confirm merchant Square checkout configuration before launch.
- The admin dashboard's stock field reports *available* units (total minus sold/reserved). Revision checks reject stale edits.
- Transactional order reporting, fraud controls, rate limits and reader-facing tracking should be added before high-volume campaigns.

## Sandbox connection verification
After changing Deploy Preview environment variables in Netlify, redeploy this draft preview so the functions use the new scoped values. Verify the storefront's product API responds successfully and the Square webhook endpoint responds with Method Not Allowed to GET before configuring the Sandbox webhook subscription. Never switch on Production cart during this verification.
