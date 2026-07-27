# Data Storage Audit — Implemented State

Date: 2026-07-27

The required pre-change findings are preserved in `DATA_STORAGE_AUDIT_PRE_CHANGE.md`.

## Root cause

Games and their nested tournaments, at-bats, pitches, spray locations, heat-map inputs, and calculated statistics were saved only to a per-email `localStorage` key. Supabase authenticated the account but was not involved in gameplay persistence. Browser storage is device-specific, which is why the same account had no data on Device B.

## Cloud-first implementation

### Supabase schema

`supabase/hitting-log-data.sql` adds only the two tables needed to preserve the existing application model and user experience:

- `public.hitting_log_profiles`: one athlete profile per Supabase user;
- `public.hitting_log_games`: one row per game and user, with the existing game document in `jsonb`.

The game document continues to contain tournament metadata, at-bats, pitches, pitch locations, spray-chart coordinates, heat-map inputs, and calculated game fields. This avoids a UI/model redesign and a large normalization migration.

Both tables:

- reference `auth.users(id)` with cascade deletion;
- have RLS enabled;
- grant authenticated users CRUD table privileges;
- have separate SELECT, INSERT, UPDATE, and DELETE policies;
- constrain every policy with `auth.uid() = user_id`.

### Runtime storage

`scripts/data-store.js` is now the cloud persistence boundary:

- verifies the current user with `supabase.auth.getUser()`;
- loads profiles with an explicit `.eq("user_id", user.id)`;
- loads games with an explicit `.eq("user_id", user.id)`;
- writes `user_id` into every upserted profile/game row;
- awaits every query;
- checks every returned `error`;
- requests returned identifying rows and verifies Supabase confirmed the expected user/record count;
- explicitly filters game deletes and all load queries by the authenticated user ID;
- keeps only a temporary in-memory cache after the cloud load;
- emits structured start/success/failure console logs without logging game payloads.

`app.js` now:

- bootstraps protected pages from the active Supabase session;
- waits for the verified cloud data load before rendering;
- uses the Supabase user UUID for ownership/session-change checks;
- awaits game, at-bat, pitch, tournament, deletion, and profile mutations;
- rolls back local page state or shows an error when a cloud mutation fails;
- awaits logout, handles sign-out errors, and clears the in-memory store only after successful sign-out.

All protected page HTML files now load the Supabase client, auth helper, and cloud data store. `charts.js` waits for the shared cloud bootstrap before rendering.

## Legacy device-data migration

On the first authenticated protected-page load:

1. Cloud games and the cloud profile load first.
2. Only the legacy game key for the verified user's normalized email is read.
3. Legacy and cloud games are merged by game ID.
4. The merged rows are uploaded and Supabase must confirm success.
5. Only then is that user's legacy game key removed.
6. The matching local athlete/account record is migrated when needed and removed after the cloud profile is confirmed.
7. The obsolete local current-user marker is removed.

Keys belonging to a different local email are never read into or assigned to the active account.

Remaining `localStorage` references are confined to this one-time migration/cleanup path. There are no `sessionStorage`, IndexedDB, Cache Storage, or service-worker persistence paths.

## Data-source verification

| Feature | Source after changes |
| --- | --- |
| Athlete profile | `hitting_log_profiles`, with Auth metadata used only as first-time migration/default input |
| Games | `hitting_log_games.payload` loaded from Supabase |
| Tournaments | Grouped in memory from tournament metadata inside Supabase-loaded game payloads |
| At-bats | Nested in Supabase-loaded game payloads |
| Pitches | Nested in Supabase-loaded at-bats |
| Spray chart | Derived in memory from Supabase-loaded batted-ball data |
| Heat maps | Derived in memory from Supabase-loaded pitch locations/outcomes |
| Dashboard and advanced statistics | Calculated in memory exclusively from the Supabase-loaded game array |

Calculations remain client-side, but browser memory is now a disposable projection of cloud data rather than permanent storage.

## RLS report

Repository-visible policy coverage:

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `hitting_log_profiles` | Own row | Own row | Own row | Own row |
| `hitting_log_games` | Own rows | Own rows | Own rows | Own rows |
| `subscriptions` | Own row | Missing for authenticated users (intentional server-only writes) | Missing (intentional) | Missing (intentional) |
| `waitlist` | Missing (intentional insert-only form) | Public validated insert | Missing (intentional) | Missing (intentional) |

No other application-data table definitions are present in the repository. The live Supabase catalog should be checked after migration execution to confirm deployed state matches these files.

## Verification performed

- JavaScript syntax parsed successfully for `app.js`, `scripts/data-store.js`, `charts.js`, `scripts/auth.js`, and `scripts/supabase-client.js`.
- `git diff --check` passed.
- Every protected page was checked for correctly ordered Supabase/auth/data-store scripts.
- Every gameplay/profile Supabase SELECT and DELETE query was checked for an explicit authenticated `user_id` filter.
- Every gameplay/profile upsert was checked for a `user_id` value and RLS confirmation response.
- Repository-wide storage API search was rerun; only legacy migration/cleanup references remain.

## Required deployment step

Run `supabase/hitting-log-data.sql` in the existing Supabase project before deploying the browser changes. Until that migration is applied, protected pages will intentionally stop and report a cloud-load error rather than silently falling back to device-only data.
