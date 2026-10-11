// dev helper: node scripts/contact-sheet.cjs out.png width maxHeight scale page1 page2 ...
const sharp = require('sharp')
const [out, w, maxH, scale, ...pages] = process.argv.slice(2)
;(async () => {
  const tiles = []
  for (const p of pages) {
    const f = `screenshots/${p}-${w}.png`
    const m = await sharp(f).metadata()
    const h = Math.min(+maxH, m.height)
    const buf = await sharp(f).extract({ left: 0, top: 0, width: m.width, height: h }).resize(Math.round(m.width * +scale)).png().toBuffer()
    tiles.push({ buf, w: Math.round(m.width * +scale), h: Math.round(h * +scale) })
  }
  const W = tiles.reduce((n, t) => n + t.w + 10, 0)
  const H = Math.max(...tiles.map((t) => t.h))
  let x = 0
  const comps = tiles.map((t) => { const c = { input: t.buf, left: x, top: 0 }; x += t.w + 10; return c })
  await sharp({ create: { width: W, height: H, channels: 4, background: '#888' } }).composite(comps).png().toFile(out)
})()
