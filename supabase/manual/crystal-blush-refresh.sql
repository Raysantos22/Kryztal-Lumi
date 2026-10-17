-- =====================================================================
-- Crystal Blush content refresh (redesign, Oct 2026). NOT a migration:
-- `supabase db push` does not run it. Review it, then run it once in the
-- Supabase SQL editor (Kryztal Lumi project only) before or right after
-- deploying the redesign.
--
-- What it changes (price, stock, limits, orders and settings stay as they are):
--   1. Crystal Blush copy: subtitle, description, how-to-use, highlights.
--      The old ingredient list and specs (1.8 g, 53 × 53 mm, 12 months,
--      cruelty-free) described the older black-compact version, so they are
--      cleared until confirmed for the current formula. Re-enter them in
--      Admin → Products once you have the product documentation.
--   2. Product photos: replaces the four placeholder images (black carton
--      render, illustrated pan, carton mockup, carton back) with the seven
--      supplied photos. Photos you uploaded yourself in Admin are kept.
--   3. (Optional, commented out) the FAQ: removes the "tone-adapt / adapts
--      to your undertone" and "cruelty-free, 12 months" answers. Only run it
--      if you have not written your own FAQ in Admin → Settings.
-- Everything runs in one transaction.
-- =====================================================================
begin;

update public.products set
  subtitle    = 'Color-changing blush',
  description = E'A blush with a color-changing effect on application. In the compact, Crystal Blush is a pale, pearly pan with a fine shimmer, in a clear round compact.\n\nOn your cheeks, the color develops into a pink flush. Discover its shade on your skin and blend it into your desired look. Shade appearance may vary.',
  details     = E'1. Lightly tap a fingertip or a soft brush on the pan.\n2. Press onto your cheeks.\n3. Blend out and build up gradually to the look you like.',
  ingredients = null,
  specs       = '[]'::jsonb,
  highlights  = array['Color-changing formula', 'Compact format', 'For cheeks', 'Cash on delivery']
where id = 'c0000000-0000-4000-8000-000000000001';

delete from public.product_images
where product_id = 'c0000000-0000-4000-8000-000000000001'
  and url in ('/images/product-box.webp', '/images/product-pan.webp', '/images/product-mockup.webp', '/images/product-back.webp');

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

-- 3. Optional FAQ refresh (uncomment to run). Keeps your payment, delivery
--    and returns answers as they are in the seed.
-- update public.store_settings set faq = '[
--   {"q": "What is Crystal Blush?", "a": "Crystal Blush is our color-changing blush for the cheeks, in a clear round compact. In the compact it looks pale and pearly with a fine shimmer; on application the color develops into a pink flush."},
--   {"q": "Will it look the same on everyone?", "a": "Shade appearance may vary from person to person. Start with a little, then blend and build up to the look you like."},
--   {"q": "How do I apply it?", "a": "Lightly tap a fingertip or a soft brush on the pan, press onto your cheeks, then blend out and build up gradually."},
--   {"q": "How do I pay?", "a": "Cash on Delivery: just fill in the order form and pay the rider in cash when your parcel arrives. No card or online payment needed."},
--   {"q": "How long is delivery?", "a": "Metro Manila 2–3 days, Luzon 3–5 days, Visayas and Mindanao 5–7 days after your order ships. You can follow your parcel on the Track Order page."},
--   {"q": "Can I return or exchange?", "a": "We exchange damaged or wrong items within 7 days of delivery. Message us with your order number and a photo or unboxing video."}
-- ]'::jsonb
-- where id = 1;

commit;
