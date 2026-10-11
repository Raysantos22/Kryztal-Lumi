// Screenshot every page at phone, tablet (portrait + landscape) and desktop
// widths against the demo dev server, and report horizontal overflow.
//   npx vite --port 5174 (demo mode)   then   npm run screenshots [-- page1,page2] [-- --full]
// Output: screenshots/<page>-<width>.png
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:5174'
const WIDTHS = [
  { w: 390, h: 844 },
  { w: 820, h: 1180 },
  { w: 1180, h: 820 },
  { w: 1440, h: 900 },
]
const args = process.argv.slice(2)
const full = args.includes('--full')
const only = args.find((a) => !a.startsWith('--'))?.split(',')

mkdirSync('screenshots', { recursive: true })
const browser = await chromium.launch()

// One order (GCash, awaiting payment) and one shipped COD order to show the
// order pages in their interesting states.
async function seedOrders(page) {
  await page.goto(`${BASE}/shop`)
  await page.waitForSelector('[data-testid=product-card]', { timeout: 90_000 })
  return page.evaluate(async () => {
    const { api } = await import('/src/lib/api/index.js')
    const products = await api.listProducts()
    const p = products[0]
    const customer = {
      name: 'Maria Santos', phone: '0917 123 4567', email: 'maria@example.com', address_line: '12 Sampaguita St.',
      barangay: 'San Antonio', city: 'Pasig City', province: 'Metro Manila', zip: '1600', landmark: 'Near the chapel',
    }
    const gcash = await api.createOrder({ items: [{ product_id: p.id, quantity: 2 }], customer: { ...customer, phone: '0917 555 0101' }, payment_method: 'gcash' })
    const cod = await api.createOrder({ items: [{ product_id: p.id, quantity: 1 }], customer: { ...customer, phone: '0917 555 0202' }, payment_method: 'cod' })
    await api.signInWithPassword('admin@demo.test', 'demo1234')
    await api.setOrderStatus(cod.id, 'confirmed')
    await api.setOrderStatus(cod.id, 'shipped', { courier: 'J&T Express', trackingNo: 'JT0123456789' })
    await api.signOut()
    return { gcash: gcash.order_no, cod: cod.order_no }
  })
}

// One context for everything: the demo database lives in this context's IndexedDB.
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
const setupPage = await ctx.newPage()
const orders = await seedOrders(setupPage)
await setupPage.close()

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'product', path: '/product/crystal-blush' },
  { name: 'bag', path: '/bag', bag: true },
  { name: 'drawer', path: '/shop', bag: true, action: async (p) => p.locator('[data-testid=bag-button]:visible').first().click() },
  { name: 'checkout', path: '/checkout', bag: true, action: async (p) => {
      await p.getByLabel('Province').selectOption('Cebu')
      await p.getByLabel('GCash').check()
    } },
  { name: 'order-placed', path: `/order/${orders.gcash}`, session: [orders.gcash, '0917 555 0101'] },
  { name: 'track', path: `/track?order=${orders.cod}`, action: async (p) => {
      await p.getByLabel('Mobile number').fill('0917 555 0202')
      await p.getByRole('button', { name: 'Find order' }).click()
      await p.getByTestId('order-details').waitFor()
    } },
  { name: 'about', path: '/about' },
  { name: 'faq', path: '/faq' },
  { name: 'shipping', path: '/shipping-returns' },
  { name: 'contact', path: '/contact' },
  { name: '404', path: '/nope' },
  { name: 'admin-login', path: '/admin' },
  { name: 'admin-dashboard', path: '/admin', admin: true },
  { name: 'admin-orders', path: '/admin/orders', admin: true },
  { name: 'admin-order', path: '/admin/orders', admin: true, action: async (p) => {
      await p.locator('[data-testid=admin-order-row]').first().click()
      await p.getByTestId('admin-order-detail').waitFor()
    } },
  { name: 'admin-products', path: '/admin/products', admin: true },
  { name: 'admin-product-edit', path: '/admin/products', admin: true, action: async (p) => {
      await p.getByRole('link', { name: /Edit Crystal Blush/ }).click()
      await p.getByRole('heading', { name: /Crystal Blush/ }).first().waitFor()
    } },
  { name: 'admin-shipping', path: '/admin/shipping', admin: true },
  { name: 'admin-settings', path: '/admin/settings', admin: true },
].filter((p) => !only || only.includes(p.name))

const problems = []
for (const vp of WIDTHS) {
  for (const pg of PAGES) {
    const page = await ctx.newPage()
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await page.addInitScript(
      ({ bag, admin, session }) => {
        if (bag) localStorage.setItem('kl-bag-v1', JSON.stringify([{ product_id: 'c0000000-0000-4000-8000-000000000001', variant_id: null, quantity: 2 }]))
        else localStorage.removeItem('kl-bag-v1')
        if (admin) localStorage.setItem('kl-demo-session', JSON.stringify({ user: { id: 'dddddddd-0000-4000-8000-000000000001', email: 'admin@demo.test' }, demo: true }))
        else localStorage.removeItem('kl-demo-session')
        if (session) sessionStorage.setItem(`kl-order:${session[0]}`, session[1])
      },
      { bag: !!pg.bag, admin: !!pg.admin, session: pg.session || null },
    )
    await page.goto(`${BASE}${pg.path}`)
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => !document.querySelector('[role=status]'), null, { timeout: 60_000 }).catch(() => {})
    if (pg.action) await pg.action(page)
    await page.waitForTimeout(400)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 1) problems.push(`${pg.name}@${vp.w}: horizontal overflow ${overflow}px`)
    await page.screenshot({ path: `screenshots/${pg.name}-${vp.w}.png`, fullPage: full || !pg.action })
    await page.close()
  }
}
await browser.close()
console.log(problems.length ? problems.join('\n') : '✔ no horizontal overflow')
console.log('orders', orders)
