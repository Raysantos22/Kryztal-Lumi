// Builds every web image from the client's source files in _client/.
//   npm run images
// Outputs (public/):
//   images/logo.webp|png          clean transparent logo (trimmed, faint halo removed)
//   images/logo-sm.webp           header size
//   favicon.svg                   4-point sparkle (vector, from the logo)
//   favicon-32.png, apple-touch-icon.png, icon-512.png
//   images/product-box.webp       crisp render of the Crystal Blush box (black + rose-gold foil)
//   images/product-pan.webp       illustrated blush pan (placeholder until real photos)
//   images/product-mockup.webp    the client's packaging mockup (front + back)
//   images/product-back.webp      back of the box (ingredients), cropped from the mockup
//   og-image.jpg                  1200×630 social share image
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (...p) => join(root, '_client', ...p)
const out = (...p) => join(root, 'public', ...p)
mkdirSync(out('images'), { recursive: true })

const BLUSH = { r: 254, g: 228, b: 232 } // sampled from the packaging mockup backdrop
const ROSE = ['#f3cfc8', '#d99a95', '#b8706b', '#f6dcd5', '#9e5a57']

// ------------------------------------------------------------------ logo ---
// The source PNG is already transparent but carries a faint near-invisible
// halo (alpha 1–10). Drop it so the logo sits cleanly on blush and on black.
async function cleanLogo() {
  const { data, info } = await sharp(src('brand', 'logo-rose-gold.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    data[i + 3] = a < 12 ? 0 : Math.min(255, Math.round(((a - 12) / 243) * 255))
  }
  const cleaned = sharp(data, { raw: info }).trim({ threshold: 1 })
  const png = await cleaned.png().toBuffer()
  const meta = await sharp(png).metadata()
  await sharp(png).png({ compressionLevel: 9 }).toFile(out('images', 'logo.png'))
  await sharp(png).webp({ quality: 90, alphaQuality: 100 }).toFile(out('images', 'logo.webp'))
  await sharp(png).resize({ width: 420 }).webp({ quality: 90, alphaQuality: 100 }).toFile(out('images', 'logo-sm.webp'))
  console.log('logo', meta.width, '×', meta.height)
  return png
}

// --------------------------------------------------------------- sparkle ---
// Concave 4-point star, like the one above the wordmark (taller than wide).
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

const roseGradient = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${ROSE[0]}"/><stop offset=".38" stop-color="${ROSE[1]}"/>
  <stop offset=".55" stop-color="${ROSE[3]}"/><stop offset=".78" stop-color="${ROSE[2]}"/>
  <stop offset="1" stop-color="${ROSE[4]}"/></linearGradient>`

function sparkleSvg(size, { background = null, scale = 0.86 } = {}) {
  const c = size / 2
  const h = (size / 2) * scale
  const w = h * 0.82
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<defs>${roseGradient('g')}</defs>
${background ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${background}"/>` : ''}
<path d="${sparklePath(c, c, w, h)}" fill="url(#g)" stroke="#9e5a57" stroke-opacity=".35" stroke-width="${size / 96}"/>
</svg>`
}

async function favicons() {
  writeFileSync(out('favicon.svg'), sparkleSvg(64))
  await sharp(Buffer.from(sparkleSvg(32, { scale: 0.94 }))).png().toFile(out('favicon-32.png'))
  await sharp(Buffer.from(sparkleSvg(180, { background: '#121012', scale: 0.62 }))).png().toFile(out('apple-touch-icon.png'))
  await sharp(Buffer.from(sparkleSvg(512, { background: '#121012', scale: 0.62 }))).png().toFile(out('icon-512.png'))
}

// ----------------------------------------------------------- product box ---
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
  ${roseGradient('rg')}
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<rect x="${x0}" y="${y0}" width="${box}" height="${box}" rx="18" fill="url(#lid)" filter="url(#sh)"/>
<rect x="${x0 + 2}" y="${y0 + 2}" width="${box - 4}" height="${box - 4}" rx="16" fill="none" stroke="#ffffff" stroke-opacity=".06" stroke-width="3"/>
<text x="${S / 2}" y="${y0 + box * 0.79}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="44" letter-spacing="3" fill="url(#rg)">crystal blush</text>
</svg>`
  const logoW = Math.round(box * 0.6)
  const logo = await sharp(logoPng).resize({ width: logoW }).toBuffer()
  const lm = await sharp(logo).metadata()
  const img = await sharp(Buffer.from(bg))
    .composite([{ input: logo, left: Math.round((S - logoW) / 2), top: Math.round(y0 + box * 0.36 - lm.height / 2) }])
    .flatten({ background: BLUSH })
    .toBuffer()
  await sharp(img).resize(1200).webp({ quality: 86 }).toFile(out('images', 'product-box.webp'))
  await sharp(img).resize(700).webp({ quality: 84 }).toFile(out('images', 'product-box-700.webp'))
  // Box alone on transparent background for the hero (CSS supplies the backdrop)
  const boxOnly = `<svg xmlns="http://www.w3.org/2000/svg" width="${box + 40}" height="${box + 40}">
<defs><linearGradient id="lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2628"/><stop offset=".5" stop-color="#151314"/><stop offset="1" stop-color="#0b0a0b"/></linearGradient>${roseGradient('rg')}</defs>
<rect x="20" y="20" width="${box}" height="${box}" rx="18" fill="url(#lid)"/>
<rect x="22" y="22" width="${box - 4}" height="${box - 4}" rx="16" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="3"/>
<text x="${(box + 40) / 2}" y="${20 + box * 0.79}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="44" letter-spacing="3" fill="url(#rg)">crystal blush</text>
</svg>`
  const hero = await sharp(Buffer.from(boxOnly))
    .composite([{ input: logo, left: Math.round((box + 40 - logoW) / 2), top: Math.round(20 + box * 0.36 - lm.height / 2) }])
    .png()
    .toBuffer()
  await sharp(hero).resize(900).webp({ quality: 88, alphaQuality: 90 }).toFile(out('images', 'hero-box.webp'))
  await sharp(hero).resize(520).webp({ quality: 86, alphaQuality: 90 }).toFile(out('images', 'hero-box-520.webp'))
  return img
}

// ------------------------------------------------------------ blush pan ---
// Illustration of the tone-adapt pan: a deep crystal rose that blooms into a
// soft flush. Marked as an illustration in alt text wherever it is used.
function panSvg(S, { transparent = false } = {}) {
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
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3cfc8"/><stop offset=".45" stop-color="#b8706b"/><stop offset=".6" stop-color="#f6dcd5"/><stop offset="1" stop-color="#8f4f4d"/></linearGradient>
  <filter id="sh"><feDropShadow dx="0" dy="${S * 0.025}" stdDeviation="${S * 0.03}" flood-color="#5a2a33" flood-opacity=".3"/></filter>
</defs>
${transparent ? '' : `<rect width="100%" height="100%" fill="url(#bg)"/>`}
<circle cx="${c}" cy="${c}" r="${r + S * 0.03}" fill="url(#rim)" filter="url(#sh)"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="url(#pan)"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="url(#gloss)"/>
${sparkles.map(([x, y, s]) => `<path d="${sparklePath(S * x, S * y, S * s * 0.8, S * s)}" fill="#fff" fill-opacity=".9"/>`).join('\n')}
</svg>`
}

async function pan() {
  await sharp(Buffer.from(panSvg(1200))).webp({ quality: 86 }).toFile(out('images', 'product-pan.webp'))
  await sharp(Buffer.from(panSvg(700, { transparent: true }))).webp({ quality: 86, alphaQuality: 90 }).toFile(out('images', 'pan-transparent.webp'))
}

// --------------------------------------------------------- mockup crops ---
async function mockups() {
  const m = sharp(src('mockups', 'crystal-blush-packaging.png')).flatten({ background: BLUSH })
  await m.clone().webp({ quality: 86 }).toFile(out('images', 'product-mockup.webp'))
  // Back of the box (ingredients) — upscaled 2× with Lanczos for product pages.
  await m
    .clone()
    .extract({ left: 400, top: 88, width: 345, height: 345 })
    .resize(900, 900, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6 })
    .webp({ quality: 86 })
    .toFile(out('images', 'product-back.webp'))
}

// -------------------------------------------------------------- OG image ---
async function ogImage(logoPng) {
  const W = 1200
  const H = 630
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><radialGradient id="bg" cx=".75" cy=".5" r=".8"><stop offset="0" stop-color="#fff3f4"/><stop offset="1" stop-color="rgb(${BLUSH.r},${BLUSH.g},${BLUSH.b})"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<text x="80" y="420" font-family="Georgia, serif" font-style="italic" font-size="46" fill="#4f2b2c">Crystal Blush</text>
<text x="80" y="470" font-family="Arial, sans-serif" font-size="18" letter-spacing="3" fill="#824746">TONE-ADAPT COLOUR-CHANGING BLUSH</text>
<text x="80" y="540" font-family="Georgia, serif" font-size="40" fill="#121012">₱399</text>
</svg>`
  const logo = await sharp(logoPng).resize({ width: 470 }).toBuffer()
  const box = await sharp(out('images', 'hero-box.webp')).resize(470).toBuffer()
  await sharp(Buffer.from(bg))
    .composite([
      { input: box, left: W - 470 - 70, top: 80 },
      { input: logo, left: 70, top: 90 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(out('og-image.jpg'))
}

const logoPng = await cleanLogo()
await favicons()
await productBox(logoPng)
await pan()
await mockups()
await ogImage(logoPng)
console.log('✔ images built')
