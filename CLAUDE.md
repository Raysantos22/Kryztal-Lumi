# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Online shop for Kryztal Lumi (Filipino beauty brand; launches with one product, Crystal Blush ₱399). React 19 + Vite 8 + Tailwind 4 + React Router 7 SPA on Supabase (Postgres, Auth, Storage, Edge Functions). Customers never log in; only the owner uses `/admin`. Full docs are in `README.md`; open client inputs/placeholders are tracked in `TODO_FOR_CLIENT.md` (add any new placeholder there). The original brief is `_client/PROMPT.md` + `_client/info.md`.

## Hard rules

- Supabase: only ever use the Kryztal Lumi project. **Never touch project `khdedzylobgcoitzdbfg`** (Nails by An, a different live client).
- Do not modify anything in `C:\Users\ADMIN\Documents\Client\nails by an` — it is the reference project this one's stack and patterns were copied from (read-only).
- Prices, stock, shipping and totals are computed only in SQL (`create_order()`), never trusted from the browser.
- Product claims: say only what the client's material supports. No vegan/cruelty-free (gated by `CLAIMS` in `src/content/crystalBlush.js`), no undertone matching, no invented specs, ratings, reviews or timings. Don't change production records without the client's go-ahead (`supabase/manual/` holds reviewed one-off SQL for them to run).

## Commands

```bash
npm run dev                 # http://localhost:5173 — demo mode automatically if VITE_SUPABASE_URL is unset
npm run build               # throws unless VITE_SUPABASE_URL is set (see vite.config.js)
npm run build:demo          # explicit demo build (.env.demo sets VITE_DEMO_MODE=true)
npm run lint                # oxlint src tests scripts

npm run test:db             # vitest: Postgres tests on PGlite with the real migrations
npx vitest run tests/db/orders.test.js -t "part of test name"   # single DB test
npm run test:functions      # Deno tests for edge-function shared code (npx deno@2)
npm run check:functions     # deno type-check of the three edge functions
npm run test:e2e            # Playwright, desktop + Pixel 7, starts vite on :5174 in demo mode
npx playwright test tests/e2e/public.spec.js -g "name" --project=desktop   # single e2e test
npm test                    # db + functions + e2e

npm run images              # rebuild public/images (+ images/cb/) from _client/ sources with sharp
npm run screenshots         # needs a demo-mode vite on :5174; WIDTHS=390,1440 to limit; args: page names
```

First e2e run needs `npx playwright install chromium`. Local Supabase (Docker): `npx supabase start`, `npx supabase db reset`, `npm run create-admin` (reads `.env.local`), `npm run functions:serve`.

## Architecture

**One API surface, two backends.** All data access goes through `api` from `src/lib/api/index.js`, a Proxy that lazily loads either `supabaseApi.js` (production) or `demoApi.js` (demo). Both must export the same function names — when adding an API function, implement it in both. `DEMO_MODE` (`src/lib/config.js`) is on when `VITE_DEMO_MODE=true` or no Supabase URL is set.

**Demo mode runs the real SQL.** `demoApi.js` boots PGlite in the browser with `src/lib/api/demo/supabase-stubs.sql` (fakes `auth`, `storage`, roles, etc.), then every file in `supabase/migrations/` in order, then `supabase/seed.sql`. Consequences:
- Migrations must stay PGlite-compatible; if a migration uses a new Supabase-only object, add a stub to `supabase-stubs.sql`.
- Data persists in IndexedDB under `DB_NAME` (`idb://kryztal-lumi-demo-vN`). Bump the version when schema/seed changes so existing browsers start fresh.
- PGlite doesn't persist on commit; writes are flushed via `syncToFs()` when the SQL matches `WRITE_SQL`. Add any new mutating RPC name to that regex.
- Auth, storage uploads and emails are simulated (emails logged as "skipped"). Demo admin: `admin@demo.test` / `demo1234`.

**DB tests use the same pipeline.** `tests/db/harness.js` `createDb()` loads stubs + migrations + seed into PGlite; `as(db, role, userId, fn)` runs queries as `anon`/`authenticated`/a specific user to test RLS and grants. Tests assert that no function is executable by `anon` unless intended — new functions need explicit grants/revokes.

**Database is the business logic** (`supabase/migrations/`): schema → RLS → order functions → storage/cron/notify trigger → community posts. Orders are unreadable via RLS; customers read them only through `get_order(order_no, phone)`. Admin actions are `security definer` functions (`admin_*`) gated on `admin_users`. `create_order()` in one transaction: validates, locks on the customer's phone and enforces `max_unconfirmed_per_phone`, re-reads prices, decrements stock with a guarded `UPDATE ... where stock >= qty` (lines in fixed order), picks shipping zone from province, snapshots customer/address/product data, generates `KL-XXXXXX`. Status machine: `new`/`awaiting_payment` → `confirmed` → `packed` → `shipped` (requires courier + tracking) → `delivered`; `cancelled`/`returned` restock once via `stock_released`. `admin_set_stock()` is compare-and-set. pg_cron runs `expire_unpaid_orders()` for GCash.

**Edge functions** (`supabase/functions/`, Deno): `create-order` validates payload shape, calls `create_order()`, sends owner alert + customer "order received" email; `send-order-update` is called by a DB trigger via pg_net (shared secret `NOTIFY_WEBHOOK_SECRET` / Vault `notify_webhook_secret`) on confirmed/shipped; `expire-unpaid-orders` is a fallback scheduler. Notifications live in `_shared/notifications/` behind a `NotificationProvider` interface (Resend email on; Twilio SMS stub off unless `NOTIFY_CHANNELS` includes `sms`). Sends are deduped via `claim_notification()` and logged to `notifications_log`.

**Frontend**: `src/App.jsx` routes public pages and `/admin/*` (`pages/admin/AdminApp.jsx` is the login gate). Global state in `src/lib/StoreContext.jsx` (catalogue + settings), `BagContext.jsx`, `AuthContext.jsx`. The home page is a launch page for the product with `LAUNCH_SLUG` (`src/content/crystalBlush.js`); otherwise it falls back to the shop grid. The one-step `OrderForm` lives only on the product page, opened by "Order now", with quantity/variant controlled by the page so buy box, form, sticky bar and "Add to bag" stay in sync; Bag/Checkout handles multi-item orders. Drawers and dialogs use `useDialog` (focus trap, Escape, scroll lock). Province/city data is in `src/lib/ph.js`.

**Content and images**: operational data (price, stock, product text, photos, FAQ, policies) comes from the DB and is edited in /admin. Launch-page marketing copy is in `src/content/crystalBlush.js`. Every storefront image is declared once in `src/content/assets.js` (source in `_client/`, crop, widths, alt, placements); `scripts/build-images.mjs` imports it to generate `public/images/cb/<slug>-<w>.webp`, and components use `img(key, sizes)` for srcset/width/height/alt. `productImages()` in `lib/catalog.js` hides the four legacy seed images (old black carton) and falls back to `LAUNCH_GALLERY` until the DB has real photos. Design tokens (ivory/blush/dusty rose `#b45a5c`, DM Serif Display + Outfit) are in `src/index.css`; shared utility names (`btn-solid`, `btn-outline`, `photo-frame`, …) are also used by the admin.

**Payments**: currently COD only. GCash (QR + reference, `awaiting_payment` until owner marks paid) is fully built but switched off in Admin → Settings → Payments.

## Deploy

Frontend on Vercel (`vercel.json` SPA rewrite) with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`. Backend: `npx supabase link --project-ref <ref>`, `npx supabase db push`, `npm run functions:deploy`; secrets listed in `.env.example`; extra one-time steps (pg_cron/pg_net, Vault secrets, seed, disabling signups) in README §4.
