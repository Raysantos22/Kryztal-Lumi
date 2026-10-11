Build the online shop website for my personal beauty brand **Kryztal Lumi**.
Work autonomously through every phase without stopping to ask; use clearly-marked
placeholders for anything missing and log them in TODO_FOR_CLIENT.md.

=== READ FIRST ===
1. ./_client/info.md — my full brief (brand, product, delivery, payments, policies). Follow it.
2. ./_client/brand/logo-rose-gold.png — my logo. ./_client/mockups/crystal-blush-packaging.png —
   my product packaging (black box, rose-gold foil logo, blush-pink backdrop). Derive the whole
   visual identity from these: rose gold, blush pink, ivory, black accents; luxurious, minimal,
   "glow / crystal light" feel. Make a clean transparent/web version of the logo and a favicon
   from the sparkle.
3. Reference project C:\Users\ADMIN\Documents\Client\nails by an — READ IT and reuse its stack
   and patterns instead of reinventing: Vite + React + Tailwind v4 + React Router; Supabase
   (migrations, RLS, security-definer SQL functions, edge functions, notification provider
   interface); src/lib/api data layer with a PGlite DEMO MODE that runs the real migrations in
   the browser (flush to IndexedDB after writes); vitest DB tests on PGlite; Playwright e2e on
   desktop + mobile; image optimisation to WebP with sharp; README / .env.example /
   TODO_FOR_CLIENT.md style. Reuse its editorial layout ideas (centered logo + split nav,
   full-screen hero with parallax image, big split panels, outlined buttons, floating Messenger
   button, responsive `split` variant for tablets) restyled in Kryztal Lumi colours.
   Do NOT modify anything inside the nails by an folder.

=== ACCOUNTS ===
- GitHub: https://github.com/Raysantos22/Kryztal-Lumi.git (empty; push to main)
- Supabase project ref: [PASTE NEW PROJECT REF HERE]. I'm logged in with `npx supabase login`.
  Use ONLY this project. NEVER touch project khdedzylobgcoitzdbfg (Nails by An, live).
  If the ref is still a placeholder, build everything in demo mode and tell me the exact
  commands to link + deploy at the end.
- Vercel: I'll import the repo myself — give me the env vars to set.

=== WHAT TO BUILD (online shop, no appointment booking) ===
1. Generic catalogue that works for ANY beauty/fashion product later: categories (optional),
   products, optional variants (shade/size/etc. with own price + stock), multiple images,
   description, details/ingredients, badges (New, Best seller, Low stock, Sold out).
   Seed with ONE product: Crystal Blush ₱399, stock 50 (details in info.md).
   Because there is only one product now, the Home page should sell it like a product launch
   (hero, how the tone-adapt colour change works, benefits, ingredients, reviews placeholder,
   FAQ, big "Order now" CTA). The Shop page must still work for many products later.
2. Pages: Home, Shop, Product, Bag (drawer + page), Checkout, Order placed, Track order
   (order no. + mobile: status timeline, courier + tracking no.), About, FAQ,
   Shipping & Returns, Contact, 404. Social links + Messenger button appear only when set.
3. Checkout (no accounts needed): full name, mobile, email (optional), house/street, barangay,
   city/municipality, province, ZIP, landmark, notes; shipping zone auto/selectable; show items,
   subtotal, shipping (or FREE), total.
   Payment options: Cash on Delivery, GCash prepaid (show GCash QR + number from admin settings,
   customer enters reference no.; order stays "awaiting payment" until owner confirms).
4. Orders go through an edge function `create-order` → SQL function that re-reads prices,
   stock, shipping rules from the DB (never trust browser totals), reserves/decrements stock
   atomically (no overselling under concurrency), creates order + items with snapshots of
   customer/address/product names/prices. Readable order numbers (e.g. KL-24A7F3).
   Anti-spam: max 3 unconfirmed orders per phone; leave a TODO for a captcha.
   Statuses: new / awaiting_payment → confirmed → packed → shipped (courier + tracking no.)
   → delivered; or cancelled / returned (restock). Unpaid GCash orders auto-cancel after
   a configurable time (pg_cron) and release stock.
5. Shipping rules in admin: zones by province/region with fee + delivery-time text,
   free-shipping toggle (all orders or above an amount), optional minimum order.
6. /admin (email + password login, role-gated): dashboard (new orders, orders this week,
   sales this month, COD to collect, GCash to verify, low stock), orders list + filters +
   detail + status buttons + courier/tracking entry + tap-to-call/email, mark GCash paid,
   products/variants/stock/images CRUD with uploads to Storage, categories, shipping zones,
   store settings (tagline, socials, contact, GCash QR/number, policies, announcement bar).
7. Notifications behind a provider interface: owner email (Resend) on every new order;
   customer email (if given) on confirmed/shipped; SMS provider stub (Twilio) disabled by default.
8. RLS: public reads only active catalogue + settings; customers can only look up their own
   order by order no. + phone; admins manage everything; storage writes admin-only.
9. Mobile-first, polished on phone, portrait/landscape tablet and desktop; no horizontal
   scroll; accessible labels; fast (optimised WebP images, lazy loading); SEO meta + Open Graph
   image + product structured data.

=== PHASES (commit after each phase) ===
1 Scaffold + design system + logo/favicon   2 Database + RLS + seed + DB tests
3 Public site + bag + checkout   4 Edge functions + order flow + stock safety
5 Admin   6 Notifications   7 Screenshot-check every page at 390, 820, 1180, 1440 px,
fix anything off; run lint, build, DB tests, function tests, e2e; independent code review
for security/correctness and fix findings; push migrations + deploy edge functions to the
Supabase project above (if set); push to GitHub; finalise README + TODO_FOR_CLIENT.md.
Finish with a short summary, the Vercel env vars to set, and what I still need to provide.
