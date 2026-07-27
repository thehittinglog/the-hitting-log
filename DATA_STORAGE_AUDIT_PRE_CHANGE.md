# Data Storage Audit — Pre-Change Report

Date: 2026-07-27

Scope: repository-wide static audit of browser persistence, Supabase reads/writes, authentication scoping, SQL migrations, dashboard/stat inputs, and login/logout data lifecycle. This report records the state of the project before cloud-first fixes were applied. Live Supabase catalog state was not available from the repository, so the RLS review is based on the checked-in SQL files.

## Executive finding

The cross-device failure is deterministic: all baseball/softball activity is persisted only in `localStorage`. Supabase is used for authentication, password recovery, subscription state, and waitlist submissions, but no Supabase table or query exists for athletes, games, tournaments, at-bats, pitches, spray locations, heat-map inputs, or calculated game data.

The stored game key is `hitting-log-games-<normalized email>`. Device B has a different browser storage area, so it correctly finds no games even when the same Supabase account is active.

Protected pages also trust `hitting-log-current-user` in `localStorage` as their route/session check. Most protected pages do not load the Supabase browser client or auth helper, so they cannot validate the session or load cloud data. Logout ignores Supabase sign-out errors and leaves all game/profile data on the device.

## Files involved

| File | Role before changes | Save location | Load location / behavior |
| --- | --- | --- | --- |
| `app.js` | Authentication marker, local account/profile records, game CRUD orchestration, tournament metadata, at-bat/pitch editing, dashboard and advanced-stat calculation | `localStorage` keys `hitting-log-current-user`, `hitting-log-accounts`, and `hitting-log-games[-email]` | Reads the same local keys synchronously at page bootstrap; dashboards and advanced stats receive this local array |
| `scripts/data-store.js` | Shared game/chart store and chart projection helpers | `localStorage` key `hitting-log-games[-email]` | Reads local games; derives at-bats, pitches, heat-map buckets, and chart matches in memory |
| `charts.js` | Heat-map and spray-chart rendering | No independent persistence | Calls `window.getSavedGames()`, so chart data comes from the local game array |
| `scripts/supabase-client.js` | Creates Supabase browser client | Supabase Auth client persists its own session using the library default browser auth storage | Loads public project configuration from `/api/supabase-config` |
| `scripts/auth.js` | Supabase signup, login, logout, session, password, and auth-metadata operations | Supabase Auth only | Supabase Auth only |
| `scripts/waitlist.js` | Waitlist submission | Supabase `public.waitlist` | No user activity data |
| `dashboard.html` | Dashboard shell | None | Does not include Supabase client/auth/data-store scripts |
| `games.html` | Game/tournament logging and review shell | Through `app.js` / `scripts/data-store.js` | Includes local data store, but not Supabase client/auth scripts |
| `all-games.html` | Full game list shell | Through shared code | Includes local data store, but not Supabase client/auth scripts |
| `advanced-stats.html` | Advanced statistics shell | None | Does not include Supabase client/auth/data-store scripts |
| `charts.html` | Heat map and spray chart shell | Through shared code | Includes local data store, but not Supabase client/auth scripts |
| `account.html` | Athlete profile/account shell | Auth metadata plus duplicated local account entry | Loads Supabase Auth metadata, then mirrors it into `hitting-log-accounts` |
| `login.html`, `signup.html`, `forgot-password.html`, `reset-password.html` | Auth pages | Supabase Auth plus local current-user/account markers in `app.js` | Login/signup populate local markers |
| `supabase/subscriptions.sql` | Subscription table and RLS | Supabase `public.subscriptions` | User can select own row; writes are server/service-role only |
| `supabase/waitlist.sql` | Waitlist table and RLS | Supabase `public.waitlist` | Insert-only public form |
| `api/subscription-status.js`, `api/create-checkout-session.js`, `api/create-portal-session.js`, `api/stripe-webhook.js`, `lib/supabase-server.js` | Subscription/auth server operations | Supabase subscription rows and Stripe | Not used by gameplay data |

No use of `sessionStorage`, IndexedDB, the Cache Storage API, a service worker, or explicit browser-cache persistence was found. Temporary JavaScript arrays/maps/objects are used for page state and calculated views, but the permanent-data defect is the `localStorage` game/account store.

## Object-by-object storage map

| Object | Representation before changes | Permanent save | Load / derivation | Cloud verified? |
| --- | --- | --- | --- | --- |
| Athletes | One local account object per email (`athleteName`, `sportType`); partially duplicated in Supabase Auth `user_metadata` | `app.js:saveAccounts`; Auth metadata on account-page edits | `getCurrentAccount`; account page later overlays Auth metadata | Partial only; no athlete database row |
| Games | Game object containing metadata, at-bats, and calculated stats | `app.js:saveGames`, `app.js:upsertSavedGame`, `scripts/data-store.js:saveGame` | `app.js:loadGames`, `loadRawGames`, `scripts/data-store.js:getSavedGames` | No |
| Tournaments | Not an independent record; `tournamentId`, name, game number, and completion flag are embedded in every game | Same whole-game local save | Grouped from local games using in-memory `Map` objects | No |
| At Bats | Nested `game.atBats[]` | Same whole-game local save after create/edit | Flattened or calculated from loaded local games | No |
| Pitches | Nested `atBat.pitches[]` | Same whole-game local save after create/edit | Flattened by `getAllPitches` | No |
| Spray Chart locations | Coordinates/details embedded in batted-ball pitch/at-bat data | Same whole-game local save | `charts.js` derives spray entries from local games | No |
| Heat Map data | Pitch location IDs and pitch outcomes embedded in pitches | Same whole-game local save | `scripts/data-store.js:getChartDataForFilter` creates buckets in memory from local games | No |
| Calculated statistics | Recalculated by normalization/stat functions and also copied into each normalized game as `stats` and display fields | Copied into the locally saved game object | Dashboard, tournament, all-games, and advanced-stat functions calculate from the local game/at-bat array | No |

## Save-operation audit

### Gameplay saves

`scripts/data-store.js:saveGame`, `app.js:saveGames`, and the fallback branches in `app.js:upsertSavedGame` call `localStorage.setItem`. They:

- never call Supabase;
- cannot await a database response;
- do not provide durable error handling (storage/JSON failures are generally uncaught or treated as an empty array);
- scope only by normalized email in a browser key, not by immutable Supabase user ID.

All create/edit flows eventually use those functions, including:

- completing an at-bat and autosaving its game;
- saving/finishing a game;
- changing tournament completion state;
- editing an at-bat;
- editing pitches and pitch sequences;
- editing game date/opponent;
- deleting a game.

Several UI paths use `try/catch`, but the underlying operation is still synchronous device storage. Some paths mutate the in-memory game before saving, which makes rollback incomplete if persistence fails.

### Athlete/profile saves

Signup/login create a local `hitting-log-accounts` record. Account edits await `auth.updateUser` and check its error, but the subsequent local account mirror is not a cloud database row. Signup explicitly logs that no athlete database record is created.

### Supabase saves unrelated to activity

- Waitlist insert is awaited and checks `error`.
- Subscription reconciliation/webhook operations are awaited and report failures.
- Supabase Auth signup/login/profile methods are awaited by their principal form handlers.

## Authentication and query scoping

There are no gameplay database records or gameplay Supabase queries to scope.

The only activity separation is an email-derived local key. Email is mutable and is not the authenticated Supabase UUID.

Existing subscription queries/policies use `user_id`. The checked-in subscription RLS policy filters SELECT by `auth.uid() = user_id`; subscription writes are intentionally denied to browser users and performed by trusted server code.

The route guard checks only the cached local email marker. It does not establish that a Supabase session exists or that the cached email matches the authenticated user. This can show protected pages after a stale/failed logout and can select the wrong local key after an account/session transition.

## RLS policy matrix from checked-in SQL

| Table | SELECT | INSERT | UPDATE | DELETE | Finding |
| --- | --- | --- | --- | --- | --- |
| `public.subscriptions` | Own-row policy present | No authenticated-user policy | No authenticated-user policy | No authenticated-user policy | Intentional server-managed table; grants explicitly deny authenticated writes |
| `public.waitlist` | Missing | Public validated insert policy present | Missing | Missing | Intentional insert-only waitlist; grants expose only INSERT |
| Athlete/game/tournament/at-bat/pitch/chart tables | N/A | N/A | N/A | N/A | No tables exist |

For the new user-owned gameplay/profile tables, explicit authenticated SELECT, INSERT, UPDATE, and DELETE policies are required. A live environment catalog check is still recommended after applying migrations because repository SQL cannot prove which migrations/policies were actually executed.

## Dashboard/stat/chart verification

Dashboard, all-games, tournament summaries, advanced statistics, heat maps, and spray charts are all generated from the array returned by local game loaders. Their formulas are calculated in memory, which is appropriate for derived values, but their source is device-only data. They are not generated from Supabase-loaded records.

`loadRawGames` is especially unsafe: it scans every `hitting-log-games*` key in the browser and merges them, potentially mixing data belonging to different locally used accounts.

## Logout/login verification

Logout attempts Supabase sign-out but suppresses every error with `.catch(() => {})`, removes only `hitting-log-current-user`, and redirects. It does not clear game/account keys.

Login sets the local current-user email and redirects. The destination immediately loads browser games; it performs no Supabase activity query. Therefore logging out/in on the same device reuses cached data, while another device has none.

## Bugs and risks found

1. Device-only persistence is the direct cross-device sync bug.
2. No activity/profile database schema or RLS exists.
3. Protected pages lack Supabase client/auth scripts.
4. Authorization is inferred from a mutable cached email instead of the active session UUID.
5. Game saves cannot await or validate a database response.
6. Save/load parse and storage errors are swallowed in multiple places.
7. Logout suppresses sign-out failures.
8. `loadRawGames` can combine local data across accounts.
9. Athlete data is split between local records and Auth metadata, with no user-owned profile table.
10. Tournaments, at-bats, pitches, spray points, and heat-map inputs have no independent durable storage; loss of the local game JSON loses all of them.
11. Normalized/calculated statistics are persisted locally, but all dashboard inputs remain device-local.
12. There is no consistent structured logging around every activity/profile save and load.

## Recommended fixes

1. Add the minimum necessary schema:
   - `hitting_log_profiles`, keyed by `user_id`;
   - `hitting_log_games`, keyed by `(user_id, game_id)`, with the existing game shape stored in `jsonb`.
2. Add explicit SELECT/INSERT/UPDATE/DELETE RLS policies using `auth.uid() = user_id` for both tables.
3. Load the Supabase client/auth/data store on every protected page.
4. Bootstrap protected pages from the active Supabase session, then load games from Supabase before rendering.
5. Keep only an in-memory page cache after cloud load; do not use browser persistence as the runtime source of truth.
6. Make every game/profile save asynchronous, await the Supabase response, validate returned rows, log success/failure, and surface/rollback errors.
7. Add an idempotent, user-scoped migration that uploads only the currently authenticated email's legacy local games/profile, then removes those legacy keys only after successful cloud writes.
8. Explicitly filter every game/profile query by `user_id` in addition to RLS.
9. Make logout await a successful Supabase sign-out, clear in-memory data, and stop using cached games after the session changes.
10. Continue calculating dashboard/chart statistics in memory, but only from the freshly Supabase-loaded game rows.

