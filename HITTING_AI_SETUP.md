# Hitting AI setup

The Hitting AI endpoint uses the existing Supabase and Stripe environment variables plus one required server-only variable:

- `OPENAI_API_KEY` — required; add it to the Vercel project environment variables for Production and any Preview environments that should support Hitting AI.
- `HITTING_AI_MODEL` — optional; defaults to `gpt-5-mini`.

Do not expose either value in a browser script or rename it with a public/client-side prefix.

After adding the key, redeploy the application. No database migration is required for this feature.

The endpoint calculates statistics from the authenticated user's `hitting_log_games` payloads before calling OpenAI. It does not send raw games, player names, email addresses, subscription records, or authentication data to the model.
