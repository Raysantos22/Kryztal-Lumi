// =====================================================================
// Storefront copy for the launch product, Crystal Blush.
//
// Operational data (name, price, stock, limits, shipping, policies, FAQ)
// always comes from the database and is edited in /admin. This file holds
// the marketing copy for the home page and the product page sections, and
// only says what the supplied product material supports.
// Images live in ./assets.js.
// =====================================================================

export const LAUNCH_SLUG = 'crystal-blush'

// Claims seen in supplier material but not yet confirmed for this exact
// formula. Turn one on only with documentation for this product; it then
// appears in the feature lists on the home and product pages.
export const CLAIMS = {
  vegan: false,
  crueltyFree: false,
}

export const HERO = {
  eyebrow: 'Color-changing blush',
  title: ['A little color.', 'A little Lumi.'],
  text: 'Meet Crystal Blush, our color-changing blush.',
  primary: 'Shop Crystal Blush',
  secondary: 'Explore the shade',
}

export const MEET = {
  title: 'Meet Crystal Blush',
  paragraphs: [
    'A blush with a color-changing effect on application. In the compact, Crystal Blush is a pale, pearly pan with a fine shimmer.',
    'On your cheeks, the color develops into a pink flush. Discover its shade on your skin and blend it into your desired look.',
  ],
}

export const SHADE = {
  title: 'See the shade',
  intro: 'How Crystal Blush looks in the compact is different from how it looks on skin.',
  inCompact: 'In the compact',
  inCompactText: 'Pale and pearly, with a fine shimmer.',
  onSkin: 'On skin',
  onSkinText: 'The color develops into a pink flush.',
  developTitle: 'Just applied, color developed, blended finish',
  developNote: 'Illustrative concept, not actual stage photos.',
  stages: ['Just applied', 'Color developed', 'Blended finish'],
  note: 'Shade appearance may vary.',
}

// Feature list (home "Product details" + product page). `icon` is a key in
// FEATURE_ICONS (components/featureIcons.jsx).
const BASE_FEATURES = [
  { icon: 'change', title: 'Color-changing formula', text: 'The color develops on application, so it looks different on your cheeks than in the pan.' },
  { icon: 'compact', title: 'Compact format', text: 'A clear, round compact with the pan on show.' },
  { icon: 'cheeks', title: 'For cheeks', text: 'Apply to the cheeks and blend to the look you like.' },
]
const CLAIM_FEATURES = [
  CLAIMS.vegan && { icon: 'vegan', title: 'Vegan', text: 'Confirmed vegan formula.' },
  CLAIMS.crueltyFree && { icon: 'crueltyFree', title: 'Cruelty-free', text: 'Confirmed cruelty-free.' },
].filter(Boolean)
export const FEATURES = [...BASE_FEATURES, ...CLAIM_FEATURES]

export const LIFESTYLE = {
  eyebrow: 'On your vanity',
  title: 'A little color for every day',
  text: 'A clear compact and a soft flush of color. Keep it on your vanity or in your bag.',
}

// Fallback steps when the product has no "How to use" text in /admin.
export const HOW_TO = [
  { title: 'Tap', text: 'Lightly tap a fingertip or a soft brush on the pan.' },
  { title: 'Apply', text: 'Press onto your cheeks.' },
  { title: 'Blend', text: 'Blend out and build up gradually to the look you like.' },
]

export const CLOSING = {
  title: 'Ready for a little Lumi?',
  text: 'Order Crystal Blush online and pay when it arrives.',
}
