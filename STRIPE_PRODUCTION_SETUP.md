# Stripe Production Setup

## Database migration

Run `supabase/subscriptions.sql` once in the Supabase SQL Editor. It creates the
`public.subscriptions` table, enables Row Level Security, lets authenticated users
read only their own subscription row, and reserves writes for the server-side
service role.

The table stores:

- `stripe_customer_id`
- `stripe_subscription_id`
- `subscription_status`
- `stripe_price_id`
- `current_period_end`
- `cancel_at_period_end`
- `plan`

## Vercel environment variables

Configure these for Production and any Preview environment used for Stripe tests:

- `STRIPE_SECRET_KEY` — Stripe secret key for the matching mode.
- `STRIPE_PRICE_ID` — existing recurring Pro Price ID for the matching mode.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the deployed webhook endpoint.
- `HITTING_LOG_SUPABASE_URL` or `SUPABASE_URL` — Supabase project URL.
- `HITTING_LOG_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`, or
  `SUPABASE_PUBLISHABLE_KEY` — public key used to verify signed-in users.
- `HITTING_LOG_SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEY` — recommended
  server-only Supabase secret key. Legacy `HITTING_LOG_SUPABASE_SERVICE_ROLE_KEY`
  and `SUPABASE_SERVICE_ROLE_KEY` values are also supported.
- `APP_URL` — canonical application origin, such as `https://thehittinglog.com`.

Never expose `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`SUPABASE_SECRET_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## Stripe Dashboard setup

1. Enable and configure the Stripe Customer Portal.
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
consistent.

## Files in this integration

- `api/stripe-webhook.js` verifies and processes Stripe events.
- `api/create-portal-session.js` creates authenticated Billing Portal sessions.
- `api/create-checkout-session.js` preserves Checkout and prevents duplicate
  managed subscriptions.
- `lib/supabase-server.js` contains server-only authentication and database helpers.
- `supabase/subscriptions.sql` defines the subscription schema and RLS policy.
- `account.html` contains dynamic plan and billing UI targets.
- `scripts/stripe-checkout.js` loads subscription state and opens Checkout or Portal.
