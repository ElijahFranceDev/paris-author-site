# Frontline Forge Solutions Carrier Command Portal — Premium v2

This package upgrades the working FFS carrier portal with:

- Premium carrier onboarding and account controls
- Carrier-owner and driver logins
- Trucks and drivers
- Expanded load records
- Admin and driver document uploads
- BOL/POD uploads
- Live portal refresh through Supabase Realtime
- In-app and optional email notifications
- Document and compliance expiration reminders
- Automated weekly and monthly PDF reports
- On-demand custom reports
- Dispatch invoice generation and PDF archive
- Fuel and mileage tracking
- Carrier profile and compliance overview
- Support requests
- Activity timeline
- Improved dashboard metrics

## Safe upgrade order

1. Back up your current local portal folder and Supabase database.
2. Copy your existing `.env.local` into this new project folder.
3. In Supabase SQL Editor, run `supabase/premium_upgrade.sql` once.
4. In this project folder, run:

```bat
npm install
npm run build
```

5. Link this folder to the existing Vercel project if needed:

```bat
npx vercel link
```

Choose the existing `frontline-forge-carrier-portal` project.

6. Confirm these production environment variables exist in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://portal.frontlinesf.com`
- `SUPABASE_SECRET_KEY`
- `CRON_SECRET` — create a random string at least 16 characters long

Optional for real email delivery:

- `RESEND_API_KEY`
- `EMAIL_FROM=Frontline Forge Solutions <portal@frontlinesf.com>`

Without Resend, all portal notifications still work in-app; email sending is skipped cleanly.

7. Deploy:

```bat
npx vercel --prod
```

## Presentation-ready workflow

- Admin adds a premium carrier and owner login from `/admin`.
- Admin adds trucks and driver logins from `/fleet`.
- Admin adds expanded loads from `/admin`.
- Carrier or driver uploads BOL/POD from `/documents`.
- Carrier records fuel and mileage from `/fuel-mileage`.
- Admin generates reports from `/reports` and invoices from `/invoices`.
- Support requests and activity history remain visible in the portal.

## Automation

`vercel.json` schedules:

- Weekly reports every Monday
- Monthly reports on the first day of each month
- Daily expiration-reminder checks

Vercel cron requests are protected by `CRON_SECRET`.

## Important security notes

- Never expose `SUPABASE_SECRET_KEY` in browser code or use a `NEXT_PUBLIC_` prefix for it.
- Keep carrier signups disabled; create accounts through the FFS admin portal.
- Test Elijah’s admin login, Edward’s owner login, and one driver login in an incognito browser before the presentation.
