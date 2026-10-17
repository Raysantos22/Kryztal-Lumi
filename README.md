# Kryztal Lumi — Online Shop

The online shop for **Kryztal Lumi**, a Filipino beauty brand. It launches with one product, the
**Crystal Blush** (a color-changing blush in a clear round compact, ₱399), and the catalogue is built to
hold any beauty or fashion product later.

It is a React + Vite + Tailwind front end on top of Supabase (Postgres, Auth, Storage, Edge Functions).

- **Customers** order without an account, straight from the **order form** on the home page or the product
  page (name, mobile, optional email, address, province / city / barangay, landmark), and pay
  **Cash on Delivery**. If they enter an email (e.g. Gmail), their order confirmation is emailed to them
  automatically. A bag + checkout page also exists for multi-item orders. They follow the order on
  **Track order** using the order number and their mobile number.
- **GCash** (QR / number + reference) is built in but **switched off** — the shop launches COD-only. The
  owner can turn it on in Admin → Settings → Payments.
- **The owner** runs everything in `/admin`: the order dashboard, status changes, courier and tracking
  numbers, marking GCash payments as paid, products, variants, stock and photos, categories, shipping
  zones and store settings.
- **Prices, stock and shipping are always worked out in the database**, never in the browser. Stock is
  reserved atomically, so the shop cannot oversell.

> Anything that still needs input from the client is listed in **[TODO_FOR_CLIENT.md](TODO_FOR_CLIENT.md)**.

---

## 1. Quick start (no backend needed: demo mode)

```bash
npm install
npm run dev          # http://localhost:5173
npm run build:demo   # a deployable demo build
```

`npm run build` refuses to build without `VITE_SUPABASE_URL`, so a live site can never silently fall back to
the in-browser demo. Set `VITE_DEMO_MODE=true` (or use `build:demo`) when you really want a demo build.

When `VITE_SUPABASE_URL` is not set, the shop runs in **demo mode**:

- The real SQL migrations and seed data run inside the browser in [PGlite](https://pglite.dev), which is
  Postgres compiled to WASM.
- Pricing, stock reservation, shipping rules, the per-phone order cap and GCash expiry therefore behave
  **exactly** as they will in production.
- Demo data is saved in that browser's IndexedDB. *Admin → Settings → Reset demo data* wipes it.
- The admin login is `admin@demo.test` / `demo1234`.
- Emails are not sent. They appear in each order's email log as "skipped".

Demo mode is a good way to show the client the shop before the Supabase project exists.

## 2. Architecture

```
React SPA (Vite 8, React 19, React Router 7, Tailwind 4)
  ├─ Public: Home (Crystal Blush launch page) · Shop · Product · Bag (drawer + page) · Checkout
  │          · Order placed · Track order · About · FAQ · Shipping & Returns · Contact · 404
  ├─ /admin (role-gated): Dashboard · Orders (list, filters, detail) · Products (+ variants, photos)
  │          · Reviews (community slideshow) · Categories · Shipping · Settings
  └─ src/lib/api/  ← one API surface, two implementations
        supabaseApi.js  (production)      demoApi.js (PGlite, same SQL)
                │
Supabase
  ├─ Postgres  supabase/migrations/*.sql
  │    tables: store_settings (public) · store_private (admin only) · admin_users · categories
  │            · products · product_variants · product_images · shipping_zones · orders
  │            · order_items · order_events · notifications_log · community_posts
  │    RLS: anyone reads the active catalogue, zones and public settings. Orders are invisible
  │         except through get_order(order_no, phone). Admins (admin_users) manage everything.
  │    functions: create_order · get_order · submit_gcash_reference · expire_unpaid_orders
  │               admin_list_orders · admin_get_order · admin_set_order_status · admin_mark_paid
  │               admin_update_tracking · admin_stats
  │    pg_cron: expire_unpaid_orders() every 10 min
  │    trigger: order → confirmed / shipped  ⇒  pg_net → send-order-update edge function
  ├─ Storage   bucket "media" (public read, admin-only writes): products/ · payment/
  ├─ Auth      email + password (owner only; customers never log in)
  └─ Edge Functions  supabase/functions/
       create-order          checks the payload's shape, calls create_order(), emails the owner
       send-order-update     emails the customer when the order is confirmed or shipped
       expire-unpaid-orders  fallback scheduler if pg_cron isn't available
```

### How an order is placed

`create_order()` runs in one transaction:

1. Validates the customer details and address.
2. Locks on the customer's phone number, then refuses the order if that number already has
   `max_unconfirmed_per_phone` (default 3) orders still `new` or `awaiting_payment`. This is the
   anti-spam rule.
3. Re-reads every product and variant: whether it is active, its price, its max per order, and whether a
   variant has to be chosen.
4. Takes stock with `update … set stock = stock - qty where id = … and stock >= qty`. That row lock means
   two customers can never buy the last unit. Lines are processed in a fixed order to avoid deadlocks.
5. Picks the shipping zone from the province (the first active zone that lists it). A province that is
   in no zone pays the highest active fee; the browser's suggestion is never used for pricing. Then it
   applies free shipping and the minimum order.
6. Inserts the order with a readable number (`KL-24A7F3`). It snapshots the customer, the address, the zone,
   and the product names and prices, so later catalogue edits never change past orders.

### Order statuses

```
COD:    new ──────────────┐
GCash:  awaiting_payment ─┴─(mark paid)─→ confirmed → packed → shipped → delivered
                                            ↘ cancelled (stock back)       ↘ returned (stock back)
```

- **Shipped** needs a courier and a tracking number. The customer sees both on Track order.
- **Delivered** marks a COD order as paid.
- **Cancelled** and **returned** put the stock back exactly once (`stock_released`).
- An unpaid GCash order is **auto-cancelled** after `gcash_expiry_hours` (default 24) and its stock is
  released. Orders where the customer entered a GCash reference get 48 more hours for the owner to
  verify it, so a fake reference can't hold stock forever. If a payment arrives late, *Mark GCash paid*
  still reinstates an auto-cancelled order, as long as the stock is still available.
- **Stock edits in the admin** go through `admin_set_stock()`, a compare-and-set. If orders or cancellations
  changed the stock while the form was open, the save is refused instead of overwriting live stock.

### Generic catalogue

The catalogue is not tied to the Crystal Blush:

- Products can have an optional category.
- **Variants are optional.** Each one (a shade, a size, …) has its own price, stock, SKU and swatch, and
  the option name is configurable per product.
- Products can have several photos, a description, how-to-use text, ingredients and a small details
  table.
- **Badges** are *New* and *Best seller* (both manual), plus *Only X left* and *Sold out* (both
  automatic, from stock).
- The home page is a launch page written for the Crystal Blush (`LAUNCH_SLUG` in
  `src/content/crystalBlush.js`). If another product is featured, the home page shows the regular shop grid.

### Where content lives

| What | Where | Edited by |
|---|---|---|
| Price, stock, variants, max per order, product name/subtitle/description/how-to-use/specs/ingredients, product photos | database (`products`, `product_images`) | owner in **Admin → Products** |
| Shipping zones, COD/GCash, FAQ, About text, policies, announcement bar, socials | database (`store_settings`, `shipping_zones`) | owner in **Admin → Settings / Shipping** |
| Home page marketing copy (hero, Meet Crystal Blush, shade, features, lifestyle, how to use, closing) and the vegan / cruelty-free claim switches (`CLAIMS`, both off) | `src/content/crystalBlush.js` | developer |
| Every storefront image: source file, crop, sizes, alt text, where it's used, and the list of supplied images that are not used | `src/content/assets.js` (+ `npm run images`) | developer |

While the database still holds only the four placeholder images from the first seed (the old black carton),
the product page and shop show the curated gallery from `assets.js` instead (`productImages()` in
`src/lib/catalog.js`). As soon as the product has any other photo in the database, the database wins.

## 3. Local development with Supabase (needs Docker)

```bash
npx supabase start                  # local Postgres, Auth, Storage, Edge runtime
npx supabase db reset               # runs supabase/migrations/* then supabase/seed.sql
cp .env.example .env.local          # VITE_SUPABASE_URL=http://127.0.0.1:54321, anon key,
                                    # SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
npm run create-admin                # creates the owner login
cp .env.example supabase/functions/.env   # keep only the edge-function secrets
npm run functions:serve             # in another terminal
npm run dev
```

## 4. Deploying

### Supabase (use only the Kryztal Lumi project)

```bash
npx supabase link --project-ref <KRYZTAL-LUMI-PROJECT-REF>
npx supabase db push                          # all migrations (tables, RLS, functions, bucket, cron job)
# first time only: paste supabase/seed.sql into the SQL editor and run it
# (or: psql "<connection string from Project Settings → Database>" -f supabase/seed.sql)
```

1. **Extensions.** Under *Database → Extensions*, enable `pg_cron` and `pg_net`. If `pg_cron` was not
   enabled when you ran `db push`, run the `cron.schedule(...)` block from migration 4 in the SQL editor.
2. **Edge function secrets.** The full list is in `.env.example`:
   ```bash
   npx supabase secrets set SITE_URL=https://your-domain.com ALLOWED_ORIGIN=https://your-domain.com \
     RESEND_API_KEY=re_... RESEND_FROM="Kryztal Lumi <orders@your-domain.com>" \
     NOTIFY_CHANNELS=email NOTIFY_WEBHOOK_SECRET=<long random string>
   npm run functions:deploy
   ```
3. **Let the database call the email function.** In the SQL editor:
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<same long random string as NOTIFY_WEBHOOK_SECRET>', 'notify_webhook_secret');
   ```
4. **Content refresh (once, for the redesign).** Review and run `supabase/manual/crystal-blush-refresh.sql` in
   the SQL editor. It replaces the old product copy and placeholder images with the current ones, clears the
   unconfirmed specs/ingredients, and has an optional FAQ block. Price, stock and orders are untouched. After a
   template change, redeploy the functions (`npm run functions:deploy`) so emails use the new design.
5. **Owner login.** Point `.env.local` at the cloud project, then run `npm run create-admin`. New-order
   alerts go to that email until the owner changes it in *Admin → Settings*.
6. **Auth.** Under *Authentication → Providers → Email*, turn **off** "Allow new users to sign up". Only
   the owner needs a login, and the admin role comes from `admin_users`. Set the Site URL to your domain.

### Vercel (frontend)

1. Import the GitHub repo. The framework preset is **Vite**. `vercel.json` already rewrites every route
   to the SPA.
2. Set these environment variables:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | the project's anon / publishable key |
   | `VITE_SITE_URL` | `https://your-domain.com` |

3. Add the custom domain, then set `SITE_URL` and `ALLOWED_ORIGIN` (function secrets) to the same address.

> **Before Supabase is connected**, set only `VITE_DEMO_MODE=true` on Vercel to publish a demo preview.
> Remove it once the three variables above are set, or the live shop would stay in demo mode.

## 5. Payments (no payment gateway)

- **COD:** the order starts as `new`. The owner confirms it, packs it and ships it. Marking it
  *Delivered* records the cash as collected.
- **GCash:**
  1. Checkout shows the QR code and GCash number from *Admin → Settings*, with the exact total.
  2. The customer enters the reference number at checkout, or later on the order and tracking pages. They
     can also send a screenshot on Messenger once a Messenger username is set.
  3. The order stays `awaiting_payment` until the owner sees the money arrive and clicks
     **Mark GCash paid**. The order is then confirmed and the customer gets an email.

## 6. Notifications

`supabase/functions/_shared/notifications/` defines a `NotificationProvider` interface (`isConfigured`,
`addressFor`, `send`). Two providers come with it:

| Provider | Channel | Status |
|---|---|---|
| Resend | email | **On.** It sends the owner alert for every new order, and the customer emails (if they gave an email): *order received* right away, then *confirmed* and *shipped*. |
| Twilio | sms | **Stub, off by default.** To turn it on, add `sms` to `NOTIFY_CHANNELS` and set the `TWILIO_*` secrets. |

Every attempt is logged in `notifications_log` and shown on the order page in the admin. Before sending,
each channel is claimed atomically (`claim_notification()`), so overlapping calls never send the same email
twice. The admin's *Resend email* button forces a resend.

## 7. Images

`npm run images` rebuilds every web image from `_client/` with sharp. The originals in `_client/` are never
changed.

- **Product, shade and lifestyle images:** one responsive WebP set per entry in `src/content/assets.js`, written to
  `public/images/cb/<slug>-<width>.webp`. To replace an image, put the new file in `_client/`, point the entry's
  `source` at it (update `width`/`height`, or the `crop`), run `npm run images`, and check the page.
- **Logo:** the dusty-rose "kryztal lumi" wordmark (`logo.webp`, `logo-sm.webp`, `logo-email.png`), recoloured
  to the exact logo rose (#b45a5c) and cleaned of stray semi-transparent pixels. Proportions are untouched.
- **Favicons** (`favicon-32/48.png`, `apple-touch-icon.png`, `icon-512.png`) and `monogram.webp`, from the "kl" monogram.
- **`og-image.jpg`:** the 1200×630 social share image.
- **Legacy:** renders of the old black carton (`product-box`, `product-pan`, `product-mockup`, `product-back`).
  They stay only while the live database still points at them; the refresh SQL removes those references.

Product photos the owner uploads go to Supabase Storage.

## 8. Tests

| Command | What it checks |
|---|---|
| `npm run test:db` | 49 Postgres tests on PGlite with the real migrations. They cover pricing from the DB, totals, zones and free shipping, minimum order, stock reservation and oversell refusal, multi-line rollback, variants, the anti-spam cap, GCash expiry and late-payment reinstatement, the status machine, restock-once, admin list and stats, RLS, column grants, storage policies, and a check that no function is executable by `anon` unless intended. |
| `npm run test:functions` | Deno tests for the email templates (escaping, content), the provider HTTP calls, phone formatting, channel selection, and create-order payload validation. |
| `npm run check:functions` | Type-checks the three edge functions. |
| `npm run test:e2e` | 15 Playwright flows × desktop and Pixel 7, against demo mode. They cover every public page, the gallery (thumbnails, zoom dialog, keyboard), quantity sync between the buy box, order form and bag, the phone menu and sticky buy bar, COD and GCash checkout, the bag drawer, validation, the order cap, low stock and sold out, the full admin order flow with tracking, mark-paid, cancel and restock, product, variant and photo CRUD, shipping zones, free shipping, settings, categories, and horizontal scroll. |
| `npm run lint` | oxlint |
| `npm run screenshots` | Screenshots every page at 360, 390, 768 and 1440 px into `screenshots/` (`WIDTHS=390,1440` to limit) (needs `npx vite --port 5174` running in demo mode). |

The first run needs `npx playwright install chromium`.

**Concurrency note:** PGlite has a single connection, so the DB tests check the stock-taking mechanism
(the guarded `UPDATE`) rather than racing two real connections. On Supabase, the row lock taken by that
`UPDATE` serialises concurrent orders for the same item.

## 9. Project structure

```
src/
  pages/            Home, Shop, Product, Bag, Checkout, OrderPlaced, Track, Info (About/FAQ/Shipping/Contact), NotFound
  pages/admin/      AdminApp (login gate + layout), Dashboard, Orders, Products, Categories, Shipping, Settings
  components/       Layout (header/menu/footer/announcement/Messenger), Gallery, OrderForm, BagDrawer, ProductCard, Features, Community, OrderDetails, GcashPayment, ui, icons
  content/          assets.js (image map) · crystalBlush.js (launch-product copy + claim switches)
  lib/              api/ (supabase + demo), StoreContext, BagContext, AuthContext, catalog, format, ph (provinces), useSeo, useDialog
supabase/
  migrations/       schema · RLS · order functions · storage + cron + notify trigger
  seed.sql          store settings, zones, Crystal Blush (placeholders marked)
  manual/           crystal-blush-refresh.sql (one-off content refresh for the live database; not a migration)
  functions/        create-order · send-order-update · expire-unpaid-orders · _shared · tests
scripts/            build-images · create-admin · screenshots · preview-emails
tests/db/           Postgres tests (vitest + PGlite)
tests/e2e/          Playwright
_client/            the client's brief and source images: brand/ (logos), photos/, graphics/, mockups/ (old carton)
```
