// =====================================================================
// Central image map for the storefront.
//
// Every photo and graphic the site shows is listed here once, with its
// source file in _client/, an optional crop, the responsive widths that
// `npm run images` generates into public/images/cb/, its alt text and where
// it is used. Both the site and scripts/build-images.mjs read this file.
//
// To replace an image: drop the new file into _client/, point `source` at
// it (update width/height to the source size, or to the crop size), run
// `npm run images`, and check the page. Originals in _client/ are never
// modified.
// =====================================================================

export const ASSETS = {
  // ---- Main product photographs (clear round compact) ----------------
  compactTop: {
    slug: 'compact-top',
    source: 'photos/compact-top-white.png',
    width: 1254,
    height: 1254,
    widths: [480, 800, 1254],
    alt: 'Crystal Blush in its clear round compact, seen from above: a pearly, shimmering pan printed with the dusty-rose kryztal lumi logo and CRYSTAL BLUSH',
    placements: ['Product gallery 1 (main photo)', 'Shop card / bag thumbnail fallback', 'Home: shade section "In the compact" fallback'],
  },
  compactAngle: {
    slug: 'compact-angle',
    source: 'photos/compact-angle-white.png',
    width: 1254,
    height: 1254,
    widths: [480, 800, 1254],
    alt: 'Crystal Blush compact at an angle on a white surface, showing the clear round case and hinge',
    placements: ['Product gallery 2 (alternate angle)', 'Home: product details'],
  },
  panCloseup: {
    slug: 'pan-closeup',
    source: 'photos/compact-closeup-pan.png',
    width: 1254,
    height: 1254,
    widths: [480, 800, 1254],
    alt: 'Close-up of the Crystal Blush pan: pearly white with fine shimmer, under the dusty-rose kryztal lumi logo',
    placements: ['Product gallery 3 (texture close-up)', 'Home: Meet Crystal Blush'],
  },

  // ---- Shade and swatch references ------------------------------------
  // Cropped from graphics/compact-vs-skin.png (the embedded labels are left
  // out and shown as HTML captions instead).
  inCompact: {
    slug: 'in-compact',
    source: 'graphics/compact-vs-skin.png',
    crop: { left: 24, top: 234, width: 600, height: 840 },
    width: 600,
    height: 840,
    widths: [400, 600],
    alt: 'Crystal Blush in the compact: a pale, shimmering pan',
    placements: ['Home: shade section "In the compact"'],
  },
  onSkin: {
    slug: 'on-skin',
    source: 'graphics/compact-vs-skin.png',
    crop: { left: 642, top: 234, width: 600, height: 840 },
    width: 600,
    height: 840,
    widths: [400, 600],
    alt: 'Crystal Blush swatched on an arm: a pink flush with a soft shimmer',
    placements: ['Home: shade section "On skin"'],
  },
  compactVsSkin: {
    slug: 'compact-vs-skin',
    source: 'graphics/compact-vs-skin.png',
    width: 1254,
    height: 1254,
    widths: [480, 800, 1254],
    alt: 'Side by side: Crystal Blush in the compact (pale and shimmering) and on skin (a pink flush). Shade appearance may vary.',
    placements: ['Product gallery 4 (compact vs. on skin)'],
  },
  colorDevelop: {
    slug: 'color-develop',
    source: 'graphics/color-develop-illustrative.png',
    width: 1254,
    height: 1254,
    widths: [480, 800, 1254],
    alt: 'Illustrative concept, not actual stage photos: three arm swatches labelled Just applied, Color developed and Blended finish',
    illustrative: true,
    placements: ['Home: shade section (illustrative)', 'Product gallery 5 (blended finish, illustrative)'],
  },

  // ---- Lifestyle -------------------------------------------------------
  heroPodium: {
    slug: 'hero-podium',
    source: 'photos/compact-podium-pink.png',
    width: 1122,
    height: 1402,
    widths: [480, 800, 1122],
    alt: 'Crystal Blush clear round compact standing on an ivory podium against a soft blush-pink backdrop',
    placements: ['Home hero (loaded first)', 'Product gallery 6 (lifestyle)', 'Social share image'],
  },
  lifestyleBrush: {
    slug: 'lifestyle-brush',
    source: 'photos/lifestyle-brush-ribbon.jpg',
    width: 1672,
    height: 941,
    widths: [800, 1200, 1672],
    alt: 'Crystal Blush compact on an ivory surface in soft sunlight, beside a blush brush and a pink satin ribbon',
    placements: ['Home: lifestyle section'],
  },

  // ---- Product description graphics ------------------------------------
  featureGraphic: {
    slug: 'feature-graphic',
    source: 'graphics/meet-crystal-blush-features.png',
    width: 1254,
    height: 1254,
    widths: [480, 800, 1254],
    alt: 'Meet Crystal Blush graphic: color-changing formula, compact format, for cheeks, with an arm swatch',
    placements: ['Product gallery 7 (feature graphic; the same points are in the page text)'],
  },
}

// Supplied files that are deliberately kept out of the shopping experience.
export const UNUSED = {
  'graphics/promo-a-little-color.png':
    'Promotional poster. Its headline is already the home hero (as real text), and its embedded "Shop now" button is not clickable on a web page.',
  'graphics/meet-crystal-blush-vegan.png':
    'Shows "Vegan" and "Cruelty-free". These claims stay off until documentation confirms them for this formula (see CLAIMS in crystalBlush.js).',
  'brand/logo-rose-gold.png': 'Older rose-gold serif logo, replaced by the dusty-rose wordmark.',
  'brand/logo-crystal-blush-pink.jpg': 'Glossy pink logo from the black outer carton. Only used for the generated carton render (legacy product image).',
  'mockups/crystal-blush-packaging.png': 'Older black carton mockup. Only kept for the legacy product images still stored in the database.',
}

// Brand marks (processed by `npm run images`; recoloured to the exact logo
// rose and cleaned of stray semi-transparent pixels, proportions untouched).
export const BRAND = {
  wordmark: { source: 'brand/wordmark-kryztal-lumi.png', alt: 'Kryztal Lumi' },
  monogram: { source: 'brand/monogram-kl.png', alt: 'Kryztal Lumi' },
  color: '#b45a5c',
}

// Gallery order for the launch product when the database still only has
// the old placeholder images (see productImages() in lib/catalog.js).
export const LAUNCH_GALLERY = ['compactTop', 'compactAngle', 'panCloseup', 'compactVsSkin', 'colorDevelop', 'heroPodium', 'featureGraphic']

const variantUrl = (a, w) => `/images/cb/${a.slug}-${w}.webp`

// <img> props for an asset: src (largest), srcSet, sizes, width, height, alt.
export function img(key, sizes = '100vw') {
  const a = ASSETS[key]
  if (!a) throw new Error(`Unknown image asset "${key}"`)
  const max = a.widths[a.widths.length - 1]
  return {
    src: variantUrl(a, max),
    srcSet: a.widths.map((w) => `${variantUrl(a, w)} ${w}w`).join(', '),
    sizes,
    width: a.width,
    height: a.height,
    alt: a.alt,
  }
}

// Largest generated file for an asset (what product_images rows point to).
export const assetUrl = (key) => img(key).src

// Look up the asset behind a product image URL, so images stored in the
// database still get responsive srcsets.
const BY_URL = new Map(Object.keys(ASSETS).flatMap((key) => ASSETS[key].widths.map((w) => [variantUrl(ASSETS[key], w), key])))
export const assetKeyForUrl = (url) => BY_URL.get(url) || null
