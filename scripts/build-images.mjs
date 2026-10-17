// Builds every web image from the client's source files in _client/.
//   npm run images
// Source files in _client/ are only read, never changed.
// Outputs (public/):
//   images/cb/<slug>-<width>.webp  responsive product / lifestyle / shade images,
//                                  one set per entry in src/content/assets.js
//   images/logo.webp|png           dusty-rose "kryztal lumi" wordmark (cleaned, trimmed)
//   images/logo-sm.webp            header size
//   images/logo-email.png          email header (PNG for mail clients)
//   images/monogram.webp           "kl" monogram
//   favicon-32.png, favicon-48.png, apple-touch-icon.png, icon-512.png   from the monogram
//   og-image.jpg                   1200×630 social share image
// Legacy (still referenced by product_images rows in the live database until
// supabase/manual/crystal-blush-refresh.sql is run; not used by the redesign):
//   images/product-box*.webp       render of the black outer carton with the pink logo
//   images/logo-product.webp|png   glossy pink carton logo, black keyed out
//   images/product-pan.webp        illustrated pan
//   images/product-mockup.webp, images/product-back.webp   the old carton mockup
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSETS, BRAND } from '../src/content/assets.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (...p) => join(root, '_client', ...p)
const out = (...p) => join(root, 'public', ...p)
mkdirSync(out('images', 'cb'), { recursive: true })

const IVORY = '#fbf5ef'
const BLUSH = { r: 254, g: 228, b: 232 } // backdrop of the old carton mockup (legacy images)
const ROSE = ['#f3cfc8', '#d99a95', '#b8706b', '#f6dcd5', '#9e5a57']
const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) })

// ----------------------------------------------------------- photographs ---
// Each asset → WebP at every width in its `widths` list (never upscaled),
// cropped first when the asset has a `crop`. Aspect ratio is always kept.
async function photos() {
  for (const [key, a] of Object.entries(ASSETS)) {
    let base = sharp(src(...a.source.split('/')))
    if (a.crop) base = base.extract(a.crop)
    const buf = await base.toBuffer()
    const meta = await sharp(buf).metadata()
    if (meta.width !== a.width || meta.height !== a.height) {
      throw new Error(`${key}: ${a.source} is ${meta.width}×${meta.height}, assets.js says ${a.width}×${a.height}`)
    }
    for (const w of a.widths) {
      await sharp(buf)
        .resize({ width: Math.min(w, a.width) })
        .webp({ quality: 82, effort: 5 })
        .toFile(out('images', 'cb', `${a.slug}-${w}.webp`))
    }
  }
  console.log('photos', Object.keys(ASSETS).length, 'assets')
}

// ------------------------------------------------------------ brand marks ---
// The supplied PNGs are flat dusty rose with a few stray, semi-transparent
// reddish pixels that show on dark backgrounds. Recolour every pixel to the
// exact logo rose and drop alpha below 48 (invisible on light backgrounds).
// Shapes and proportions are untouched.
async function cleanMark(file) {
  const { r, g, b } = hex(BRAND.color)
  const { data, info } = await sharp(src(...file.split('/'))).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    if (data[i + 3] < 48) data[i + 3] = 0
  }
  return sharp(data, { raw: info }).trim({ threshold: 1 }).png().toBuffer()
}

async function wordmark() {
  const png = await cleanMark(BRAND.wordmark.source)
  const meta = await sharp(png).metadata()
  await sharp(png).png({ compressionLevel: 9 }).toFile(out('images', 'logo.png'))
  await sharp(png).resize({ width: 1200 }).webp({ quality: 92, alphaQuality: 100 }).toFile(out('images', 'logo.webp'))
  await sharp(png).resize({ width: 480 }).webp({ quality: 92, alphaQuality: 100 }).toFile(out('images', 'logo-sm.webp'))
  // Emails: PNG (WebP support in mail clients is patchy), 2× for 150px display
  await sharp(png).resize({ width: 300 }).png({ compressionLevel: 9 }).toFile(out('images', 'logo-email.png'))
  console.log('wordmark', meta.width, '×', meta.height)
  return png
}

async function monogram() {
  const png = await cleanMark(BRAND.monogram.source)
  await sharp(png).resize({ width: 400 }).webp({ quality: 92, alphaQuality: 100 }).toFile(out('images', 'monogram.webp'))
  // Tab icons: the mark alone (transparent) at 32/48; home-screen icons on ivory.
  const square = async (size, pad, background) => {
    const inner = Math.round(size * (1 - pad * 2))
    const mark = await sharp(png).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
    return sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: mark, gravity: 'center' }]).png()
  }
  const clear = { r: 0, g: 0, b: 0, alpha: 0 }
  await (await square(32, 0.02, clear)).toFile(out('favicon-32.png'))
  await (await square(48, 0.02, clear)).toFile(out('favicon-48.png'))
  await (await square(180, 0.14, IVORY)).toFile(out('apple-touch-icon.png'))
  await (await square(512, 0.14, IVORY)).toFile(out('icon-512.png'))
}

// --------------------------------------------------------------- OG image ---
async function ogImage(wordmarkPng) {
  const W = 1200
  const H = 630
  const photoW = 540
  const a = ASSETS.heroPodium
  const photo = await sharp(src(...a.source.split('/'))).resize({ width: photoW, height: H, fit: 'cover', position: 'centre' }).toBuffer()
  const logo = await sharp(wordmarkPng).resize({ width: 300 }).toBuffer()
  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="100%" height="100%" fill="${IVORY}"/>
<text x="80" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="62" fill="#4a2c2e">A little color.</text>
<text x="80" y="404" font-family="Georgia, 'Times New Roman', serif" font-size="62" fill="#4a2c2e">A little Lumi.</text>
<text x="82" y="470" font-family="Arial, Helvetica, sans-serif" font-size="25" fill="#8c4347">Meet Crystal Blush, our color-changing blush.</text>
</svg>`
  await sharp(Buffer.from(text))
    .composite([
      { input: logo, left: 80, top: 90 },
      { input: photo, left: W - photoW, top: 0 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(out('og-image.jpg'))
}

// ================================================================ legacy ===
// Images of the older black carton. The live database still points at them
// until the refresh SQL is run, so they keep being generated.
const sparklePath = (cx, cy, w, h, pinch = 0.3) => {
  const kx = w * pinch
  const ky = h * pinch
  return [
    `M${cx},${cy - h}`,
    `C${cx + kx * 0.35},${cy - ky} ${cx + kx},${cy - ky * 0.35} ${cx + w},${cy}`,
    `C${cx + kx},${cy + ky * 0.35} ${cx + kx * 0.35},${cy + ky} ${cx},${cy + h}`,
    `C${cx - kx * 0.35},${cy + ky} ${cx - kx},${cy + ky * 0.35} ${cx - w},${cy}`,
    `C${cx - kx},${cy - ky * 0.35} ${cx - kx * 0.35},${cy - ky} ${cx},${cy - h}Z`,
  ].join(' ')
}

// The glossy pink carton logo on solid black. Key the black out: alpha =
// brightest channel, then un-premultiply the colour.
async function productLogo() {
  const { data, info } = await sharp(src('brand', 'logo-crystal-blush-pink.jpg')).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let p = 0, q = 0; p < data.length; p += 3, q += 4) {
    const m = Math.max(data[p], data[p + 1], data[p + 2])
    const a = m < 14 ? 0 : Math.min(255, Math.round(((m - 14) / 241) * 255)) // JPEG noise floor
    if (a) {
      rgba[q] = Math.min(255, Math.round((data[p] * 255) / m))
      rgba[q + 1] = Math.min(255, Math.round((data[p + 1] * 255) / m))
      rgba[q + 2] = Math.min(255, Math.round((data[p + 2] * 255) / m))
    }
    rgba[q + 3] = a
  }
  const png = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer()
  await sharp(png).png({ compressionLevel: 9 }).toFile(out('images', 'logo-product.png'))
  await sharp(png).resize({ width: 900 }).webp({ quality: 90, alphaQuality: 100 }).toFile(out('images', 'logo-product.webp'))
  return png
}

const roseGradient = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${ROSE[0]}"/><stop offset=".38" stop-color="${ROSE[1]}"/>
  <stop offset=".55" stop-color="${ROSE[3]}"/><stop offset=".78" stop-color="${ROSE[2]}"/>
  <stop offset="1" stop-color="${ROSE[4]}"/></linearGradient>`

async function productBox(logoPng) {
  const S = 1400
  const box = 860
  const x0 = (S - box) / 2
  const y0 = (S - box) / 2 - 20
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
<defs>
  <radialGradient id="bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#fff3f4"/><stop offset=".6" stop-color="rgb(${BLUSH.r},${BLUSH.g},${BLUSH.b})"/><stop offset="1" stop-color="#f4cfd4"/></radialGradient>
  <linearGradient id="lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2628"/><stop offset=".5" stop-color="#151314"/><stop offset="1" stop-color="#0b0a0b"/></linearGradient>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="38" stdDeviation="38" flood-color="#5a2a33" flood-opacity=".32"/></filter>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<rect x="${x0}" y="${y0}" width="${box}" height="${box}" rx="18" fill="url(#lid)" filter="url(#sh)"/>
<rect x="${x0 + 2}" y="${y0 + 2}" width="${box - 4}" height="${box - 4}" rx="16" fill="none" stroke="#ffffff" stroke-opacity=".06" stroke-width="3"/>
</svg>`
  const logoW = Math.round(box * 0.8) // the carton logo already carries "crystal blush"
  const logo = await sharp(logoPng).resize({ width: logoW }).toBuffer()
  const lm = await sharp(logo).metadata()
  const img = await sharp(Buffer.from(bg))
    .composite([{ input: logo, left: Math.round((S - logoW) / 2), top: Math.round(y0 + box / 2 - lm.height / 2) }])
    .flatten({ background: BLUSH })
    .toBuffer()
  await sharp(img).resize(1200).webp({ quality: 86 }).toFile(out('images', 'product-box.webp'))
  await sharp(img).resize(700).webp({ quality: 84 }).toFile(out('images', 'product-box-700.webp'))
}

function panSvg(S) {
  const c = S / 2
  const r = S * 0.34
  const sparkles = [
    [0.36, 0.38, 0.018], [0.6, 0.33, 0.012], [0.66, 0.6, 0.016], [0.42, 0.64, 0.01], [0.53, 0.47, 0.008],
  ]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
<defs>
  <radialGradient id="bg" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#fff6f6"/><stop offset=".7" stop-color="rgb(${BLUSH.r},${BLUSH.g},${BLUSH.b})"/><stop offset="1" stop-color="#f3cdd3"/></radialGradient>
  <radialGradient id="pan" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#ffd9df"/><stop offset=".28" stop-color="#f08aa0"/><stop offset=".62" stop-color="#c94468"/><stop offset="1" stop-color="#7d1f3e"/></radialGradient>
  <radialGradient id="gloss" cx=".35" cy=".3" r=".45"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  ${roseGradient('rim')}
  <filter id="sh"><feDropShadow dx="0" dy="${S * 0.025}" stdDeviation="${S * 0.03}" flood-color="#5a2a33" flood-opacity=".3"/></filter>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<circle cx="${c}" cy="${c}" r="${r + S * 0.03}" fill="url(#rim)" filter="url(#sh)"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="url(#pan)"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="url(#gloss)"/>
${sparkles.map(([x, y, s]) => `<path d="${sparklePath(S * x, S * y, S * s * 0.8, S * s)}" fill="#fff" fill-opacity=".9"/>`).join('\n')}
</svg>`
}

async function legacy() {
  await productBox(await productLogo())
  await sharp(Buffer.from(panSvg(1200))).webp({ quality: 86 }).toFile(out('images', 'product-pan.webp'))
  const m = sharp(src('mockups', 'crystal-blush-packaging.png')).flatten({ background: BLUSH })
  await m.clone().webp({ quality: 86 }).toFile(out('images', 'product-mockup.webp'))
  await m
    .clone()
    .extract({ left: 400, top: 88, width: 345, height: 345 })
    .resize(900, 900, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6 })
    .webp({ quality: 86 })
    .toFile(out('images', 'product-back.webp'))
}

await photos()
const wordmarkPng = await wordmark()
await monogram()
await ogImage(wordmarkPng)
await legacy()
writeFileSync(out('images', 'cb', 'README.txt'), 'Generated by `npm run images` from _client/ (see src/content/assets.js). Do not edit by hand.\n')
console.log('✔ images built')
