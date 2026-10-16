# P.M. France — Private Store Manager (DRAFT)

## What changes and what does not
This feature adds `/admin.html` (owner product editor) and `/store.html` (public catalog).
Existing Square account, cart checkout code, payment integration and old individual book pages are untouched.
The owner can create products (book, bundle, merchandise, collectible, other), upload JPG/PNG/WebP covers,
set price, description, format, manual stock quantity, shipping label, publishing status, and paste
a **Square-hosted Payment Link** from Square Dashboard.

**This is product publishing, not a replacement for Square's payment/transaction system.**
The Buy button opens the saved Square link in a new tab. Create and test a matching item/link in Square
first, including its real charge, stock/shipping and return policy. Prices on our product listing do not
programmatically control the Square price: check that the two amounts match before publishing.
The first version doesn't synchronize Square sales, inventory or refunds, and it does not create
Square links automatically. To sell multiple new items in one checkout needs a future Square Orders
/ Checkout API integration.

## How to enable (Netlify)
1. Verify the deployed project uses the first-level `paris-author-site/` folder, not the nested backups.
2. Make sure Netlify installs dependencies in `paris-author-site/package.json`, including pinned `@netlify/blobs` 11.1.4. Preview builds must be tested first.
3. Run `node scripts/create-admin-credentials.cjs` from the `paris-author-site` directory on your own computer.
4. Save the generated admin password securely; copy **PMF_ADMIN_PASSWORD_HASH** and
   **PMF_ADMIN_SESSION_SECRET** into the Netlify project's **Environment Variables**. Do not paste values into GitHub, the website code, or a public chat.
5. Deploy to a preview and visit `/admin.html`. Sign in with the generated password.
6. Add a test *draft* product and upload a test cover. Then publish and check `/store.html`.
   Preview blobs use a **deploy-specific** store and are intentionally isolated from production.
   A new preview deploy may show an empty catalog; avoid putting real products in preview.
7. Merge only after verifying login, password-rejection, upload validation, cover display, drafts,
   publishing/unpublishing, and Square link checks.
8. Once live, sign in to `https://parisfrance.shop/admin.html` and create actual products.

## Square payment link process
Open Square Dashboard > Payment links > Create link > Sell an item.
Choose/create the corresponding item, set the price and options, verify shipping/customer data,
copy the hosted Square link, then paste that URL into the corresponding admin product.
Only `https://square.link`, `https://*.square.site` and Square-owned `squareup.com` URLs are accepted.
If a link is empty, the public listing has no Buy button. The product can still be published as a teaser.

## Safety and functionality
- Admin password is checked against a scrypt hash on a Netlify Function.
- Session uses a signed, Secure, HttpOnly, SameSite=Strict cookie with 6-hour expiry;
  write operations check the HTTPS same-origin header.
- No password, card details, Square token or other payment secrets are stored in the public JavaScript.
- Draft records are hidden from the public catalog; unpublish archives them without deleting.
- Uploaded files are limited to 3 MB and JPEG/PNG/WebP magic byte types; an image upload gets a random opaque ID.
- Products are stored as separate keys under Netlify Blobs. Production site-wide data persists across deploys.
- Deploy previews use an isolated deploy-specific store and **do not modify live catalog data**.
- The storefront labels *preorders as coming soon* and never links directly to a preorder charge.
  Especially do NOT accept payments on the 25-box Smile For Me project until fulfillment,
  cancellations and actual inventory limits have been approved.

## Limitations before a public production launch
- This is a simple owner-only MVP, **not multi-user staff management**. It has no password-reset email,
  administrator audit log, authentication rate limiter, or square-stock synchronization. Add
  rate limiting at Netlify/WAF and upgrade to individual accounts and role-based auth for staff.
- Netlify Blobs is suitable for modest catalogs and images; it is not transactional. Never use
  the manual stock field alone to enforce exact 25-box inventory during concurrent purchases.
- Images are stored through the site's Functions; public images become visible to anyone who knows
  their opaque image ID. Do not upload personal documents, ID cards or private files.
- The catalog is empty initially; **existing hard-coded titles stay on /books.html**, and must be
  manually added to /admin.html if you want them repeated in the new catalog.
- Confirm subscription/payment and old cart paths still function; they are deliberately unchanged.
- Confirm Netlify Blobs storage usage and bandwidth under your plan before publishing lots of images.
- Back up products/images from the Netlify Blobs UI regularly (Blobs isn't a substitute for inventory accounting).

## Updating your chosen admin password
After replacing `PMF_ADMIN_PASSWORD_HASH` in Netlify's Environment variables, trigger a fresh Deploy Preview build. Log in using the exact plain-language password you entered locally when generating that hash (never the hash itself). `PMF_ADMIN_SESSION_SECRET` does not need to change. Keep credentials private.
