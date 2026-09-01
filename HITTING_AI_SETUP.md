# Hitting Log AI setup

The Hitting Log AI endpoint uses the existing Supabase and Stripe environment variables plus one required server-only variable:

- `OPENAI_API_KEY` — required; add it to `.env.local` for local Vercel development and to the Vercel project environment variables for Production and any Preview environments that should support Hitting Log AI.
- `HITTING_AI_MODEL` — optional; defaults to `gpt-5-mini`.

## Safe connection diagnostic

Run `node --env-file=.env.local scripts/test-openai-connection.js` to send a minimal
`Reply with OK.` request through the same server-side Responses API client. The
test reports the HTTP status, model, and redacted OpenAI error fields, but never
prints the API key or authorization header.

Failed production requests write the same safe diagnostic fields to Vercel
function logs. Browser responses intentionally remain generic.

Do not expose either value in a browser script or rename it with a public/client-side prefix.

After adding the key, redeploy the application. No database migration is required for this feature.

The endpoint calculates statistics from the authenticated user's `hitting_log_games` payloads before calling OpenAI. It does not send raw games, player names, email addresses, subscription records, or authentication data to the model.
