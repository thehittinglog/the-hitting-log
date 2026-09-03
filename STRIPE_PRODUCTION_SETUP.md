# Stripe Production Setup

## Database migration

Run `supabase/subscriptions.sql`, then `supabase/hitting-log-data.sql`, in the Supabase SQL Editor. They safely create or update the
membership and hitting-log tables, enable Row Level Security, let authenticated users
read only their own subscription row, and reserve subscription writes for the server-side
service role. The hitting-log migration adds the trusted Free 10-game insert limit.

The table stores:

- `stripe_customer_id`
- `stripe_subscription_id`
- `subscription_status`
- `stripe_price_id`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `plan`

## Vercel environment variables

Configure these for Production and any Preview environment used for Stripe tests:

- `STRIPE_SECRET_KEY` — Stripe secret key for the matching mode.
- `STRIPE_PRO_PRICE_ID` — the current Pro recurring Price ID from the same Stripe mode as the secret key.
- `STRIPE_PRO_PLUS_PRICE_ID` — the current Pro Plus recurring Price ID from the same Stripe mode as the secret key.
- `STRIPE_PRO_PRICE_IDS` — optional comma-separated legacy/alternate Pro Price IDs accepted for existing subscriptions.
- `STRIPE_PRO_PLUS_PRICE_IDS` — optional comma-separated legacy/alternate Pro Plus Price IDs accepted for existing subscriptions.
- `STRIPE_PRICE_ID` — legacy Pro alias supported during migration. Keep it only until `STRIPE_PRO_PRICE_ID` is configured.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the deployed webhook endpoint.
- `HITTING_LOG_SUPABASE_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, or
  `VITE_SUPABASE_URL` — Supabase project URL.
- `HITTING_LOG_SUPABASE_ANON_KEY`, `HITTING_LOG_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_SUPABASE_ANON_KEY`, or `VITE_SUPABASE_PUBLISHABLE_KEY` — public key used
  by the browser and authenticated user-facing API routes.
- `HITTING_LOG_SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEY` — recommended
  server-only Supabase secret key. Legacy `HITTING_LOG_SUPABASE_SERVICE_ROLE_KEY`
  and `SUPABASE_SERVICE_ROLE_KEY` values are also supported. These server-only
  keys are required for webhook database writes, not Checkout authentication.
- `APP_URL` — canonical application origin, such as `https://thehittinglog.com`.

Never expose `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`SUPABASE_SECRET_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## Stripe Dashboard setup

1. Enable and configure the Stripe Customer Portal, including both the Pro and Pro Plus monthly prices as available subscription-update products.
2. Create a webhook endpoint at:
   `https://thehittinglog.com/api/stripe-webhook`
3. Subscribe it to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy that endpoint's signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel.
5. Redeploy after adding or changing environment variables.

Stripe test-mode and live-mode keys, Price IDs, webhook endpoints, and webhook
signing secrets are separate. Keep each deployment environment internally
consistent. Do not copy Price IDs from source code or another Stripe mode; the
environment mapping is authoritative and the two configured prices must be distinct.

## Files in this integration

- `api/stripe-webhook.js` verifies and processes Stripe events.
- `api/create-portal-session.js` creates authenticated Billing Portal sessions.
- `api/create-checkout-session.js` preserves Checkout and prevents duplicate
  managed subscriptions.
- `lib/supabase-server.js` contains server-only authentication and database helpers.
- `lib/membership.js` maps trusted Stripe Price IDs and statuses to entitlements.
- `lib/stripe-subscription.js` normalizes Stripe subscription items into the canonical `free`, `pro`, or `pro_plus` tier.
- `lib/subscription-reconciliation.js` periodically and on billing returns reconciles Stripe into Supabase so missed webhooks self-heal.
- `supabase/subscriptions.sql` defines the subscription schema and RLS policy.
- `supabase/hitting-log-data.sql` enforces the Free 10-game limit for direct authenticated inserts.
- `account.html` contains dynamic plan and billing UI targets.
- `scripts/stripe-checkout.js` loads subscription state and opens Checkout or Portal.

Subscription status responses are private and uncached. Checkout and Billing Portal
returns force an immediate Stripe reconciliation; otherwise a valid local record is
rechecked after five minutes. The webhook and reconciliation paths emit a structured
`subscription_sync` log without payment details or secrets.
