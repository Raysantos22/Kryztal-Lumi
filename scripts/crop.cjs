// dev helper: node scripts/crop.cjs <png> <top> <height> <out>
const sharp = require('sharp')
const [f, top, h, out] = process.argv.slice(2)
sharp(f).metadata().then((m) => sharp(f).extract({ left: 0, top: +top, width: m.width, height: Math.min(+h, m.height - top) }).toFile(out))
