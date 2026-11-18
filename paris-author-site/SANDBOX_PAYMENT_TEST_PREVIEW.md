# P.M. France Square Sandbox preview test

This draft pull request intentionally remains **open** so Netlify can build a fresh
`deploy-preview-<PR number>--parismfrancebooks.netlify.app` deployment with the
current **Deploy Previews** environment-variable values.

No customer checkout feature flags should be enabled in **Production** until
the isolated Sandbox test successfully completes.

## Netlify setup checklist

- Check private author `Check Square Readiness` endpoint on this *new* preview.
- `PMF_INVENTORY_DATABASE_URL` must point to the separate **Square Sandbox Inventory** Neon branch.
- `SQUARE_ENVIRONMENT=sandbox`, with the Sandbox Square token/location.
- `PMF_SQUARE_WEBHOOK_SIGNATURE_KEY` must use the Sandbox subscription's signature key.
- `PMF_SQUARE_WEBHOOK_NOTIFICATION_URL` must exactly match this new preview's
  `/.netlify/functions/pmf-square-inventory-webhook` URL.
- Update the **Square Sandbox** subscription to the new preview URL. The production
  webhook subscription and production settings must remain unchanged.
- Do not paste payment credentials or webhook signature keys in the PR or screenshots.
- **Before testing checkout:** populate the private preview catalog and check matching
  UUID SKU and stock row allocation in Sandbox only. Both test checkout feature
  switches default to disabled.
- Validate Square Sandbox payment completed, webhook signature verified, reservation
  moves to sold **exactly once** (including duplicate webhook delivery), and refunds/
  canceled checkout and shipping terms behave correctly.
- The private diagnostic's `sandboxOrderAndWebhookTestVerified` flag is static and
  will not automatically become true. Manually record successful test evidence.
- Keep this PR in **draft** state, unmerged, until testing finishes.
