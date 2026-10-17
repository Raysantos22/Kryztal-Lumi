# TODO for client — Kryztal Lumi

What I still need from you. ✏️ = you can change it yourself in **/admin** once you have your login.
🛠 = needs me / a one-time setup.

## ✅ Already done
- **Redesign (Oct 2026)** from your new assets: warm ivory, blush and dusty rose, your "kryztal lumi" wordmark
  in the header and emails, the "kl" monogram as the browser icon, and your Crystal Blush photos throughout.
- **Crystal Blush**: ₱399, 50 in stock, described as a *color-changing blush* in a clear round compact.
- **Cash on Delivery only** (GCash is built in but switched off; turn it on in Admin → Settings if you ever want it).
- One-step order form on the product page (opens with "Order now"); customers who enter their Gmail / email get
  their order confirmation emailed automatically (needs the Resend setup below).
- Shipping zones (placeholder fees): Metro Manila ₱100 (2–3 days) · Luzon ₱120 (3–5) · Visayas ₱150 (5–7)
  · Mindanao ₱170 (5–7).
- Return policy (accepted default): exchange within 7 days for damaged or wrong items.
- Max 3 unconfirmed orders per mobile number. Unpaid GCash orders are cancelled after 24 hours.
- Socials, phone, Viber, WhatsApp and Messenger stay hidden until you fill them in.

## Redesign: please review before it goes live
- [ ] 🛠 **Run the content refresh on the live database.** The live product still has the old copy ("deep
      crystal", "tone-adapt", black compact, 1.8 g, 53 × 53 mm, 12 months, cruelty-free, the old ingredient list)
      and the four old placeholder images. `supabase/manual/crystal-blush-refresh.sql` replaces them. Review it and
      say go, and I'll run it (or paste it into the Supabase SQL editor yourself). The new design already shows the
      new photos without it, but the product text and FAQ come from the database.
- [ ] **Specifications for the current product.** The old net weight (1.8 g), size (53 × 53 mm), shelf life
      (12 months after opening) and ingredient list may belong to the older black-compact version, so they are
      **not shown** on the redesigned site. Send the documentation for the clear-compact Crystal Blush and I'll
      add them (or enter them in Admin → Products → Details table / Ingredients).
- [ ] **Vegan and cruelty-free.** Your supplier material and one graphic say "Vegan" and "Cruelty-free". They
      stay off the site until you send documentation that they apply to this exact formula. Then I switch them on
      (`CLAIMS` in `src/content/crystalBlush.js`). No certification seals are used.
- [ ] **How to use.** The steps on the site are deliberately simple: tap, apply to cheeks, blend and build up.
      Please confirm or send your own (no timing claims such as "wait 1–2 minutes" until confirmed).
- [ ] **Swatch photos.** Please confirm the arm swatch in the "In the compact / On skin" graphic is a real photo
      of this product. The 3-stage "See the color develop" graphic is labelled *illustrative concept* and is shown
      that way.
- [ ] **Images not used.** The "A little color. A little Lumi." poster (its headline is now real text in the
      hero; its "Shop now" button can't be clicked on a web page) and the "Meet Crystal Blush" graphic that shows
      Vegan / Cruelty-free (see above). The older rose-gold logo, the glossy pink carton logo and the black
      carton mockup are replaced by the new branding.
- [ ] **Missing images that would help:** creator / model photos (someone wearing the blush) and vanity
      shots for the lifestyle section, photos of the actual application steps for "How to use", and a photo of
      the outer packaging if it ships in one. Send them and I'll add them; nothing is invented meanwhile.

## Must have before taking real orders
- [ ] 🛠 **Your admin login email** (and a strong password). I'll create it, or run `npm run create-admin`.
- [ ] ✏️ **Email for new-order alerts.** Admin → Settings → New-order alerts.
- [x] 🛠 **Supabase project.** Connected (project `ykhwzximekbwfafcgyzy`): database, edge functions and
      email trigger are set up.
- [ ] 🛠 **Sending email.** A Resend account plus a verified domain (or say if you'd rather use another
      provider). Without it, orders still work, but no emails are sent.
- [x] **Product photos.** Your Crystal Blush photos are in the shop. You can add or reorder photos in
      Admin → Products → Crystal Blush → Photos (square, at least 1200 × 1200).

## Please choose / confirm
- [ ] ✏️ **Tagline.** The demo uses *"A little color. A little Lumi."*; the live site still has *"Blush that
      becomes you."* Change it in Admin → Settings → Store.
- [ ] ✏️ **Shipping fees and delivery times** (placeholders above). Also: free shipping above an amount?
      Minimum order?
- [ ] ✏️ **Product wording.** The site now says only what your graphics say: a blush with a color-changing
      effect on application, pale and pearly in the compact, a pink flush on skin, "Shade appearance may vary."
      No undertone-matching promise. Please check it.
- [ ] **Supplier details.** Alibaba blocks automated access to your supplier page, so I couldn't read
      the full spec sheet. The listing title says *high pigment · vegan · custom logo*. I have **not**
      added "vegan" or "high pigment" to the site yet. Please paste the product description and specs, or
      send screenshots, and confirm the claims (vegan certification, finish, wear time, skin types,
      shelf life), and I'll add them to the product page.
- [ ] ✏️ **About text** (Admin → Settings → Store). The current text is a placeholder story.
- [ ] ✏️ **FAQ answers** (Admin → Settings → FAQ). In particular "How long is delivery?" should match
      your fees.
- [ ] ✏️ **Contact details:** email, phone, Viber, WhatsApp. All optional, and each one is shown only when
      it's filled in.
- [ ] ✏️ **Facebook / Instagram / TikTok links** and your **Messenger username** (this turns on the
      floating "Message us" button).
- [ ] ✏️ **Announcement bar text.** The live site says "Fast nationwide shipping · Cash on delivery". Keep
      "fast" only if your delivery times support it.
- [ ] ✏️ **Reviews & looks.** The home page shows a "From the community" section only once you add real
      ones in **Admin → Reviews** (written reviews, or photos / short videos up to 50 MB with the creator's
      @handle and a link to the post). Only post content you have permission to use. No fake reviews or filler
      cards are shown.

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
