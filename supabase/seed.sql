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
  'Blush that becomes you.',                                                      -- PLACEHOLDER tagline (options in TODO)
  'Kryztal Lumi is a small Filipino beauty label built around one idea: makeup should catch the light the way crystal does — and look like you, only glowing. We start with a single product we love, the Crystal Blush, and add new pieces slowly and carefully.', -- PLACEHOLDER
  null,                                                                           -- PLACEHOLDER contact email
  null, null, null,                                                               -- PLACEHOLDER phone / Viber / WhatsApp
  null, null, null, null,                                                         -- socials: hidden while empty
  true,
  'Fast nationwide shipping · Cash on delivery',
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
    {"q": "How does a tone-adapt blush change colour?", "a": "Crystal Blush uses a colour-changing pigment that develops on contact with your skin. It looks deep and dark in the compact, then blooms into a soft, rosy flush that is personal to you. Build it up with light taps until you love the shade."},
    {"q": "Will it suit my skin tone?", "a": "That''s the idea. Because the colour develops on your skin, it adapts to your own undertone. Start with a little and build up, from a barely-there glow to a stronger flush."},
    {"q": "How do I apply it?", "a": "Tap a finger or a soft brush lightly on the pan, then press and blend onto the apples of your cheeks. Wait a minute or two for the colour to develop before adding more."},
    {"q": "Is it cruelty-free?", "a": "Yes. Crystal Blush is cruelty-free. Use within 12 months after opening."},
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
  'Tone-adapt colour-changing blush',
  'A deep crystal in the compact, your own rosy flush on the cheek. Crystal Blush develops on contact with your skin and adapts to your undertone, so every wearer gets a shade that looks naturally theirs. Silky, buildable and long-wearing, in a slim black compact finished in rose-gold foil.',
  E'1. Tap a fingertip or soft brush lightly on the pan.\n2. Press onto the apples of your cheeks and blend upwards.\n3. Wait 1–2 minutes while the colour develops, then build up if you want more.\n\nTip: a little goes a long way. Start sheer.',
  'Caprylic/Capric Triglyceride, Octyldodecanol, Tridecyl Trimellitate, Diisostearyl Malate, Hydrogenated Polyisobutene, C12-15 Alkyl Benzoate, Microcrystalline Wax, Polyisobutene, Synthetic Wax, Paraffin, Black Iron Oxide (CI 77499), Phenoxyethanol, Isostearic Acid, D&C Red No.22 (CI 45380), Ethylhexylglycerin, Tocopherol.',
  array['Tone-adapt colour', 'One shade for every skin tone', 'Buildable & long-wearing', 'Cruelty-free', 'Fast delivery', 'Cash on delivery'],
  '[
    {"label": "Net wt", "value": "1.8 g / 0.063 oz"},
    {"label": "Compact", "value": "53 × 53 mm"},
    {"label": "Shade", "value": "Tone-adapt (one shade for every skin tone)"},
    {"label": "Cruelty-free", "value": "Yes"},
    {"label": "After opening", "value": "Use within 12 months"}
  ]'::jsonb,
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

-- Images: crisp render of the box, illustrated pan, the client's mockup and
-- the back of the box. PLACEHOLDER until real product photos are uploaded.
insert into public.product_images (id, product_id, url, alt, sort_order) values
  ('b1000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '/images/product-box.webp',
   'Crystal Blush compact: black box with rose-gold Kryztal Lumi foil logo', 1),
  ('b1000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', '/images/product-pan.webp',
   'Illustration of the Crystal Blush pan in a rose-gold rim', 2),
  ('b1000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', '/images/product-mockup.webp',
   'Crystal Blush box, front and back, 53 × 53 mm', 3),
  ('b1000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', '/images/product-back.webp',
   'Back of the Crystal Blush box with the full ingredient list', 4)
on conflict (id) do nothing;
