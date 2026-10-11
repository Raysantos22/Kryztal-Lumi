# TODO for client — Kryztal Lumi

What I still need from you. ✏️ = you can change it yourself in **/admin** once you have your login.
🛠 = needs me / a one-time setup.

## ✅ Already done (from your brief)
- Brand look from your logo and packaging: rose gold, blush pink, ivory and black. There's a clean
  transparent logo and a sparkle favicon.
- **Crystal Blush**: ₱399, 50 in stock, tone-adapt, net wt 1.8 g / 0.063 oz, 53 × 53 mm, cruelty-free,
  12 months after opening, and the full ingredient list from the box.
- Cash on Delivery and GCash (QR/number + reference no.). GCash orders wait until you mark them paid.
- Shipping zones (placeholder fees): Metro Manila ₱100 (2–3 days) · Luzon ₱120 (3–5) · Visayas ₱150 (5–7)
  · Mindanao ₱170 (5–7).
- Return policy (accepted default): exchange within 7 days for damaged or wrong items.
- Max 3 unconfirmed orders per mobile number. Unpaid GCash orders are cancelled after 24 hours.
- Socials, phone, Viber, WhatsApp and Messenger stay hidden until you fill them in.

## Must have before taking real orders
- [ ] ✏️ **GCash QR code + GCash number + account name.** The site shows a "SAMPLE QR" for now. Go to
      Admin → Settings → Payments.
- [ ] 🛠 **Your admin login email** (and a strong password). I'll create it, or run `npm run create-admin`.
- [ ] ✏️ **Email for new-order alerts.** Admin → Settings → New-order alerts.
- [ ] 🛠 **Supabase project.** The project ref in the brief is still a placeholder. Send me the new
      project's ref (never the Nails by An one) and I'll push the database and functions. The exact
      commands are in README §4.
- [ ] 🛠 **Sending email.** A Resend account plus a verified domain (or say if you'd rather use another
      provider). Without it, orders still work, but no emails are sent.
- [ ] ✏️ **Real product photos.** Upload them in Admin → Products → Crystal Blush → Photos. Square, at
      least 1200 × 1200, on a blush or white background. For now the shop uses a crisp render of your box,
      an illustrated pan and your packaging mockup.

## Please choose / confirm
- [ ] ✏️ **Tagline.** Placeholder: *"Blush that becomes you."* Other ideas:
      - *"Your glow, crystallised."*
      - *"Light that knows your shade."*
- [ ] ✏️ **Shipping fees and delivery times** (placeholders above). Also: free shipping above an amount?
      Minimum order?
- [ ] ✏️ **Product wording.** I described the colour change as "develops on contact with your skin and
      adapts to your undertone". Please check that it matches what your supplier says. Avoid medical or
      "100% natural" claims unless you can back them up.
- [ ] **Supplier details.** Alibaba blocks automated access to your supplier page, so I couldn't read
      the full spec sheet. The listing title says *high pigment · vegan · custom logo*. I have **not**
      added "vegan" or "high pigment" to the site yet. Please paste the product description and specs, or
      send screenshots, and confirm the claims (vegan certification, finish, wear time, skin types,
      shelf life), and I'll add them to the product page.
- [ ] ✏️ **Lifestyle / model photos.** The new design looks best with real photos (e.g. a face wearing the
      blush, hands holding the compact). Upload them in Admin → Products; the first photo becomes the main
      image.
- [ ] ✏️ **About text** (Admin → Settings → Store). The current text is a placeholder story.
- [ ] ✏️ **FAQ answers** (Admin → Settings → FAQ). In particular "How long is delivery?" should match
      your fees.
- [ ] ✏️ **Contact details:** email, phone, Viber, WhatsApp. All optional, and each one is shown only when
      it's filled in.
- [ ] ✏️ **Facebook / Instagram / TikTok links** and your **Messenger username** (this turns on the
      floating "Message us" button).
- [ ] ✏️ **Announcement bar text.** Currently "Nationwide shipping · Cash on delivery or GCash".
- [ ] ✏️ **Reviews & looks.** The home page "Glow notes" slideshow shows "your look here" cards until you
      add real ones in **Admin → Reviews** (written reviews, or photos / short videos up to 50 MB with the
      creator's @handle and a link to the post). Only post content you have permission to use. I didn't add
      fake ones.
- [ ] **Real product photography** for the home page banners and close-ups (currently generated from the
      packaging). Send them and I'll swap them in.

## Domain & launch
- [ ] 🛠 **Domain name** (e.g. kryztallumi.com / kryztallumi.ph). Vercel → Domains.
- [ ] 🛠 Vercel environment variables: see README §4 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
      `VITE_SITE_URL`).

## Later (optional)
- [ ] 🛠 **Captcha** on checkout (Cloudflare Turnstile, free). The per-phone limit already stops simple
      spam, and the code has `TODO(captcha)` markers where it goes.
- [ ] 🛠 **SMS on shipping.** The Twilio provider is built but switched off. It needs a Twilio account
      and sender ID.
- [ ] ✏️ **More products, shades or sizes.** Add them in Admin → Products. Variants (e.g. shades) each get
      their own price and stock, and categories appear as shop filters once used.
