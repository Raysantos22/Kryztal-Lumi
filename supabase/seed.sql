-- =====================================================================
-- Seed data for Kryztal Lumi (client brief, Oct 2026).
-- Lines marked PLACEHOLDER are listed in TODO_FOR_CLIENT.md; almost all
-- of them can be changed later in /admin.
-- Safe to re-run: fixed ids + upserts. Re-running does NOT reset stock.
-- =====================================================================

insert into public.store_settings (
  id, store_name, tagline, about, contact_email, contact_phone, viber, whatsapp,
  facebook_url, instagram_url, tiktok_url, messenger_id,
  announcement_enabled, announcement_text, currency, timezone,
  cod_enabled, gcash_enabled, gcash_name, gcash_number, gcash_qr_url, gcash_instructions, gcash_expiry_hours,
  free_shipping_mode, free_shipping_threshold, min_order_amount, max_unconfirmed_per_phone, low_stock_threshold,
  shipping_policy, returns_policy, faq
) values (
  1,
  'Kryztal Lumi',
  'A little color. A little Lumi.',                                               -- PLACEHOLDER tagline (options in TODO)
  'Kryztal Lumi is a small Filipino beauty label built around one idea: makeup should catch the light the way crystal does — and look like you, only glowing. We start with a single product we love, the Crystal Blush, and add new pieces slowly and carefully.', -- PLACEHOLDER
  null,                                                                           -- PLACEHOLDER contact email
  null, null, null,                                                               -- PLACEHOLDER phone / Viber / WhatsApp
  null, null, null, null,                                                         -- socials: hidden while empty
  true,
  'Nationwide shipping · Cash on delivery',
  'PHP',
  'Asia/Manila',
  true,
  false,                                                                          -- GCash off: cash on delivery only (Admin → Settings can turn it on)
  null,                                                                           -- PLACEHOLDER GCash account name
  null,                                                                           -- PLACEHOLDER GCash number
  '/placeholders/gcash-qr.svg',                                                   -- PLACEHOLDER GCash QR
  'Scan the QR code (or send to the GCash number) for the exact order total, then type the reference number from your GCash receipt. We''ll confirm your order as soon as we see the payment.',
  24,
  'off',
  0,
  0,
  3,
  5,
  'We ship nationwide from the Philippines with trusted couriers such as J&T Express and LBC. Orders are packed within 1–2 working days after confirmation. Delivery times depend on your area (see the table below). Once your order ships you''ll get the courier and tracking number on the Track Order page.', -- PLACEHOLDER
  'Exchange within 7 days of delivery for damaged or wrong items. Please message us with your order number and a photo or unboxing video. For hygiene reasons we can''t accept returns of opened or used makeup.', -- PLACEHOLDER (accepted default)
  '[
    {"q": "What is Crystal Blush?", "a": "Crystal Blush is our color-changing blush for the cheeks, in a clear round compact. In the compact it looks pale and pearly with a fine shimmer; on application the color develops into a pink flush."},
    {"q": "Will it look the same on everyone?", "a": "Shade appearance may vary from person to person. Start with a little, then blend and build up to the look you like."},
    {"q": "How do I apply it?", "a": "Lightly tap a fingertip or a soft brush on the pan, press onto your cheeks, then blend out and build up gradually."},
    {"q": "How do I pay?", "a": "Cash on Delivery: just fill in the order form and pay the rider in cash when your parcel arrives. No card or online payment needed."},
    {"q": "How long is delivery?", "a": "Metro Manila 2–3 days, Luzon 3–5 days, Visayas and Mindanao 5–7 days after your order ships. You can follow your parcel on the Track Order page."},
    {"q": "Can I return or exchange?", "a": "We exchange damaged or wrong items within 7 days of delivery. Message us with your order number and a photo or unboxing video."}
  ]'::jsonb
)
on conflict (id) do nothing;

insert into public.store_private (id, notify_email) values (1, null)           -- PLACEHOLDER new-order alert email
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Shipping zones (PLACEHOLDER fees / delivery times from the brief)
-- ---------------------------------------------------------------------
insert into public.shipping_zones (id, name, fee, delivery_time, provinces, sort_order) values
  ('a1000000-0000-4000-8000-000000000001', 'Metro Manila', 100, '2–3 days', array['Metro Manila'], 1),
  ('a1000000-0000-4000-8000-000000000002', 'Luzon',        120, '3–5 days', array['Abra', 'Albay', 'Apayao', 'Aurora', 'Bataan', 'Batanes', 'Batangas', 'Benguet', 'Bulacan', 'Cagayan', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Cavite', 'Ifugao', 'Ilocos Norte', 'Ilocos Sur', 'Isabela', 'Kalinga', 'La Union', 'Laguna', 'Marinduque', 'Masbate', 'Mountain Province', 'Nueva Ecija', 'Nueva Vizcaya', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Pampanga', 'Pangasinan', 'Quezon', 'Quirino', 'Rizal', 'Romblon', 'Sorsogon', 'Tarlac', 'Zambales'], 2),
  ('a1000000-0000-4000-8000-000000000003', 'Visayas',      150, '5–7 days', array['Aklan', 'Antique', 'Biliran', 'Bohol', 'Capiz', 'Cebu', 'Eastern Samar', 'Guimaras', 'Iloilo', 'Leyte', 'Negros Occidental', 'Negros Oriental', 'Northern Samar', 'Samar', 'Siquijor', 'Southern Leyte'], 3),
  ('a1000000-0000-4000-8000-000000000004', 'Mindanao',     170, '5–7 days', array['Agusan del Norte', 'Agusan del Sur', 'Basilan', 'Bukidnon', 'Camiguin', 'Cotabato', 'Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental', 'Dinagat Islands', 'Lanao del Norte', 'Lanao del Sur', 'Maguindanao del Norte', 'Maguindanao del Sur', 'Misamis Occidental', 'Misamis Oriental', 'Sarangani', 'South Cotabato', 'Sultan Kudarat', 'Sulu', 'Surigao del Norte', 'Surigao del Sur', 'Tawi-Tawi', 'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'], 4)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Product: Crystal Blush (₱399, 50 in stock, no variants)
-- ---------------------------------------------------------------------
insert into public.products (
  id, slug, name, subtitle, description, details, ingredients, highlights, specs,
  price, stock, track_stock, max_per_order, is_active, is_featured, badge_new, sort_order
) values (
  'c0000000-0000-4000-8000-000000000001',
  'crystal-blush',
  'Crystal Blush',
  'Color-changing blush',
  E'A blush with a color-changing effect on application. In the compact, Crystal Blush is a pale, pearly pan with a fine shimmer, in a clear round compact.\n\nOn your cheeks, the color develops into a pink flush. Discover its shade on your skin and blend it into your desired look. Shade appearance may vary.',
  E'1. Lightly tap a fingertip or a soft brush on the pan.\n2. Press onto your cheeks.\n3. Blend out and build up gradually to the look you like.',
  null,                                                                           -- ingredients: to be confirmed for the current formula (TODO)
  array['Color-changing formula', 'Compact format', 'For cheeks', 'Cash on delivery'],
  '[]'::jsonb,                                                                    -- specs (net wt, size, shelf life): to be confirmed (TODO)
  399,
  50,
  true,
  10,
  true,
  true,
  true,
  1
)
on conflict (id) do update set
  slug = excluded.slug, name = excluded.name, subtitle = excluded.subtitle, description = excluded.description,
  details = excluded.details, ingredients = excluded.ingredients, highlights = excluded.highlights, specs = excluded.specs, price = excluded.price,
  max_per_order = excluded.max_per_order, is_featured = excluded.is_featured, badge_new = excluded.badge_new;

-- Images: the supplied Crystal Blush photos, in gallery order (files are
-- generated by `npm run images`; see src/content/assets.js). The owner can
-- reorder, replace or add photos in Admin → Products.
insert into public.product_images (id, product_id, url, alt, sort_order) values
  ('b2000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '/images/cb/compact-top-1254.webp',
   'Crystal Blush in its clear round compact, seen from above: a pearly, shimmering pan printed with the dusty-rose kryztal lumi logo and CRYSTAL BLUSH', 1),
  ('b2000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', '/images/cb/compact-angle-1254.webp',
   'Crystal Blush compact at an angle on a white surface, showing the clear round case and hinge', 2),
  ('b2000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', '/images/cb/pan-closeup-1254.webp',
   'Close-up of the Crystal Blush pan: pearly white with fine shimmer, under the dusty-rose kryztal lumi logo', 3),
  ('b2000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', '/images/cb/compact-vs-skin-1254.webp',
   'Side by side: Crystal Blush in the compact (pale and shimmering) and on skin (a pink flush). Shade appearance may vary.', 4),
  ('b2000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', '/images/cb/color-develop-1254.webp',
   'Illustrative concept, not actual stage photos: three arm swatches labelled Just applied, Color developed and Blended finish', 5),
  ('b2000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', '/images/cb/hero-podium-1122.webp',
   'Crystal Blush clear round compact standing on an ivory podium against a soft blush-pink backdrop', 6),
  ('b2000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000001', '/images/cb/feature-graphic-1254.webp',
   'Meet Crystal Blush graphic: color-changing formula, compact format, for cheeks, with an arm swatch', 7)
on conflict (id) do nothing;
