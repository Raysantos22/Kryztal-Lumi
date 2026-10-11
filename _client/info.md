# Kryztal Lumi — client brief

Personal online beauty & fashion shop. Online only (no physical store, no pickup).

## Brand
- Name: **Kryztal Lumi** (logo: `brand/logo-rose-gold.png` — rose-gold serif wordmark with a 4-point sparkle)
- Tagline: none yet → propose 2–3 options, use one as placeholder
- Look: black packaging + rose-gold foil logo on soft blush pink (see `mockups/crystal-blush-packaging.png`).
  Palette suggestion: rose gold, blush pink, ivory/white, black accents. Luxurious, minimal, glowing ("crystal / lumi" = light).
- Socials: none yet (Facebook / Instagram / TikTok coming later) → links must be configurable in admin, hidden while empty
- Contact phone / Viber / WhatsApp: none yet → configurable, hidden while empty
- Email for site + new-order alerts: TBD → placeholder

## Catalogue
- Must be GENERIC: beauty, makeup, skincare, fashion, accessories — any product type later.
  Categories, variants and attributes are optional and configurable (none required now).
- Starting with ONE product:
  - **Crystal Blush** — tone-adapt, colour-changing crystal blush
  - Price: **₱399**
  - Stock: **50**
  - Net wt: 1.8 g / 0.063 oz · compact 53 × 53 mm · cruelty-free · 12M after opening
  - Ingredients (from packaging): Caprylic/Capric Triglyceride, Octyldodecanol, Tridecyl Trimellitate,
    Diisostearyl Malate, Hydrogenated Polyisobutene, C12-15 Alkyl Benzoate, Microcrystalline Wax,
    Polyisobutene, Synthetic Wax, Paraffin, Black Iron Oxide (CI 77499), Phenoxyethanol, Isostearic Acid,
    D&C Red No.22 (CI 45380), Ethylhexylglycerin, Tocopherol.
  - No shades (single product that adapts to skin tone)
- Product photos: not yet → use the packaging mockup + tasteful placeholders; owner uploads real ones in admin
- Track stock: YES (show "Only X left" when low, "Sold out" at 0)

## Delivery & payment
- Ship nationwide (Philippines). Shipping must be configurable in admin:
  zones with fees (placeholders: Metro Manila ₱100 · Luzon ₱120 · Visayas ₱150 · Mindanao ₱170),
  optional FREE shipping (globally or above an amount), optional minimum order.
- Courier: J&T / LBC / etc. — admin enters courier + tracking number per order; customer sees it on Track Order.
- Delivery time per zone shown to customers (placeholders: Metro Manila 2–3 days, Luzon 3–5, Visayas/Mindanao 5–7).
- Payment: **Cash on Delivery** AND **GCash prepaid** (manual: show GCash QR/number uploaded in admin,
  customer enters reference no. and can message proof; owner marks "payment received").

## Orders & policies (defaults accepted)
- New-order alerts: email
- Return/exchange: placeholder ("Exchange within 7 days for damaged or wrong items")
- Anti-spam: max 3 unconfirmed orders per phone number (+ TODO captcha)
- Customer SMS on shipping: no (optional later)
