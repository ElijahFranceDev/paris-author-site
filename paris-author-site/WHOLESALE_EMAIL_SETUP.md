# Wholesale email notifications

The site stores a wholesale request before sending two transactional messages. Resend is the selected provider. No invoice, charge, inventory reservation, or marketing email is created. Preview deploys never send emails. Orders remain available in the author portal if email is not configured or sending fails.

## Production-only setup

1. In Resend, add and verify your sending domain (or a dedicated subdomain). Follow the DNS records shown in Resend; do not replace existing MX or other mail records.
2. Create a sending-only API key restricted to that domain.
3. In Netlify project **parismfrancebooks**, set the following environment variables for the Production deploy context and Functions scope (not public client code or GitHub):
   - PMF_WHOLESALE_RESEND_API_KEY: the sending-only secret key
   - PMF_WHOLESALE_FROM_EMAIL: a sender on the verified domain (plain email address)
   - PMF_WHOLESALE_OWNER_EMAIL: the author's real notification inbox (plain email address)
4. Redeploy the site, then sign in to the author portal and refresh Wholesale Orders. Configuration should be marked configured. With the author's approval, submit a real test order using the author's own email and verify both messages are received. Mark the test order Cancelled.
5. Check Resend delivery logs for bounces. The portal status "Accepted" means the provider accepted the request, not that it reached the inbox. Failed messages require manual follow-up; previous orders are not retroactively emailed.

The customer message omits submitted notes and shipping address, and the author message includes complete order details. Each role uses a distinct idempotency key. The function has an IP/domain rate limit; consider stronger anti-bot protection if abuse occurs. Do not paste the API key into chat or commit it.
