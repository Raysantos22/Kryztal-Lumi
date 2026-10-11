import { expect } from '@playwright/test'

// 1x1 transparent PNG
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

export const PRODUCT_ID = 'c0000000-0000-4000-8000-000000000001'

// Fail the test on uncaught errors / console errors from our own code.
export function watchErrors(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    const loc = msg.location()?.url || ''
    if (/fonts\.g(oogleapis|static)/i.test(text + loc)) return
    errors.push(`console: ${text} @ ${loc}`)
  })
  return errors
}

export const visible = (locator) => locator.filter({ visible: true }).first()

export async function waitForApp(page) {
  await expect(visible(page.getByRole('link', { name: 'Kryztal Lumi — home' }))).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 60_000 })
}

export async function expectNoHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, 'page should not scroll horizontally').toBeLessThanOrEqual(1)
}

export const bagButton = (page) => visible(page.getByTestId('bag-button'))

export const CUSTOMER = {
  name: 'E2E Customer',
  phone: '0917 555 1234',
  email: 'e2e@example.com',
  address: '12 Sampaguita St.',
  barangay: 'San Antonio',
  city: 'Pasig City',
  province: 'Metro Manila',
  zip: '1600',
}

// Fill the checkout form and place the order. Returns the order number.
export async function checkout(page, { payment = 'cod', reference = '', ...overrides } = {}) {
  const c = { ...CUSTOMER, ...overrides }
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()
  await page.getByLabel('Full name').fill(c.name)
  await page.getByLabel('Mobile number').fill(c.phone)
  if (c.email) await page.getByLabel(/^Email/).fill(c.email)
  await page.getByLabel('House / unit no. and street').fill(c.address)
  await page.getByLabel('Barangay').fill(c.barangay)
  await page.getByLabel('City / municipality').fill(c.city)
  await page.getByLabel('Province', { exact: true }).selectOption(c.province)
  if (c.zip) await page.getByLabel(/^ZIP code/).fill(c.zip)
  await page.getByRole('radio', { name: payment === 'cod' ? /Cash on delivery/ : /GCash/ }).check()
  if (reference) await page.getByLabel(/^GCash reference no/).fill(reference)
  await page.getByRole('button', { name: /^Place order/ }).click()
  await expect(page.getByRole('heading', { name: /^Thank you/ })).toBeVisible()
  return (await page.getByTestId('placed-order-no').textContent()).trim()
}

// Home → Order now → checkout → order placed.
export async function orderNow(page, opts = {}) {
  await page.goto('/')
  await waitForApp(page)
  await page.getByRole('button', { name: 'Order now' }).first().click()
  return checkout(page, opts)
}

export async function adminLogin(page, path = '/admin') {
  await page.goto(path)
  const login = page.getByRole('heading', { name: 'Owner login' })
  const nav = page.getByRole('navigation', { name: 'Admin' })
  await expect(login.or(nav)).toBeVisible({ timeout: 60_000 })
  if (await nav.isVisible()) return // already signed in
  // Demo credentials are pre-filled.
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText('Owner login')
}

// Call the API inside the running app (same demo database).
export function api(page, fn, arg) {
  return page.evaluate(
    async ({ src, arg }) => {
      const { api } = await import('/src/lib/api/index.js')
      // eslint-disable-next-line no-new-func
      return new Function('api', 'arg', `return (${src})(api, arg)`)(api, arg)
    },
    { src: fn.toString(), arg },
  )
}
