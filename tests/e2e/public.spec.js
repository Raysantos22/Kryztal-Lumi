import { test, expect } from '@playwright/test'
import { CUSTOMER, PRODUCT_ID, api, bagButton, checkout, expectNoHorizontalScroll, orderNow, visible, waitForApp, watchErrors } from './helpers.js'

test('every public page renders without errors or horizontal scroll', async ({ page }) => {
  const errors = watchErrors(page)

  await page.goto('/')
  await waitForApp(page)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Crystal')
  await expect(page.getByTestId('hero-price')).toHaveText('₱399')
  await expect(page.getByTestId('ingredients')).toContainText('D&C RED NO.22', { ignoreCase: true })
  await expect(page.getByTestId('banner-product')).toContainText('Crystal Blush')
  await expect(page.getByRole('heading', { name: 'Glow notes' })).toBeVisible()
  await expect(page.getByTestId('community-placeholder').first()).toBeVisible()
  await expect(page.getByText('How does a tone-adapt blush change colour?')).toBeVisible()
  await expect(page.getByTestId('announcement')).toContainText('Cash on delivery')
  // No socials / Messenger configured yet → hidden
  await expect(page.getByRole('link', { name: 'Message us on Facebook Messenger' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Instagram' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  await page.goto('/shop')
  await expect(page.getByTestId('product-card')).toHaveCount(1)
  await expect(page.getByTestId('badge-new')).toBeVisible()
  await expectNoHorizontalScroll(page)

  await page.goto('/product/crystal-blush')
  await expect(page.getByRole('heading', { level: 1, name: 'Crystal Blush' })).toBeVisible()
  await expect(page.getByTestId('product-price')).toHaveText('₱399')
  const ld = JSON.parse(await page.locator('#kl-jsonld').textContent())
  expect(ld).toMatchObject({ '@type': 'Product', name: 'Crystal Blush', offers: { price: '399.00', priceCurrency: 'PHP', availability: 'https://schema.org/InStock' } })
  await expect(page).toHaveTitle(/Crystal Blush/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /product-box\.webp$/)
  await expectNoHorizontalScroll(page)

  for (const [path, heading] of [
    ['/about', 'About Kryztal Lumi'],
    ['/faq', 'Frequently asked questions'],
    ['/shipping-returns', 'Shipping & Returns'],
    ['/contact', 'Contact us'],
    ['/track', 'Track your order'],
    ['/bag', /Your bag/],
    ['/nope', 'Page not found'],
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expectNoHorizontalScroll(page)
  }
  await page.goto('/shipping-returns')
  await expect(page.getByTestId('zones-table').locator('tbody tr')).toHaveCount(4)
  await expect(page.getByTestId('zones-table')).toContainText('Mindanao')
  await page.goto('/contact')
  await expect(page.getByTestId('contact-empty')).toBeVisible()

  expect(errors).toEqual([])
})

test('Order now → COD checkout → order placed → track with another phone format', async ({ page }) => {
  const errors = watchErrors(page)
  const orderNo = await orderNow(page)
  expect(orderNo).toMatch(/^KL-[0-9A-F]{6}$/)
  await expect(page.getByTestId('order-total')).toHaveText('₱499')
  await expect(page.getByText('Pay ₱499 in cash to the courier on delivery.')).toBeVisible()
  await expect(page.getByTestId('order-steps')).toContainText('Order placed')
  await expectNoHorizontalScroll(page)
  // Bag emptied
  await expect(bagButton(page)).toHaveAccessibleName('Open bag, 0 items')

  // Refreshing the order page still works (phone remembered in this tab)
  await page.reload()
  await expect(page.getByTestId('order-no')).toHaveText(orderNo)

  await page.goto(`/track?order=${orderNo}`)
  await page.getByLabel('Mobile number').fill('+63 917 555 1234')
  await page.getByRole('button', { name: 'Find order' }).click()
  await expect(page.getByTestId('order-no')).toHaveText(orderNo)
  await expect(page.getByText('New').first()).toBeVisible()

  await page.getByLabel('Mobile number').fill('0917 000 0000')
  await page.getByRole('button', { name: 'Find order' }).click()
  await expect(page.getByText(/couldn’t find an order/)).toBeVisible()

  // Stock went down by one
  const stock = await api(page, async (api, id) => (await api.listProducts()).find((p) => p.id === id).stock, PRODUCT_ID)
  expect(stock).toBe(49)
  expect(errors).toEqual([])
})

test('bag drawer + GCash checkout to Cebu, then the customer adds the reference', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/product/crystal-blush')
  await waitForApp(page)
  await page.getByRole('button', { name: 'Increase quantity' }).click()
  await page.getByRole('button', { name: 'Add to bag' }).click()
  const drawer = page.getByRole('dialog', { name: 'Your bag' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByTestId('bag-subtotal')).toHaveText('₱798')
  await drawer.getByRole('button', { name: 'Increase quantity of Crystal Blush' }).click()
  await expect(drawer.getByTestId('bag-subtotal')).toHaveText('₱1,197')
  await drawer.getByRole('button', { name: 'Decrease quantity of Crystal Blush' }).click()
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  await expect(bagButton(page)).toHaveAccessibleName('Open bag, 2 items')

  await bagButton(page).click()
  await page.getByRole('dialog', { name: 'Your bag' }).getByRole('button', { name: 'Checkout' }).click()
  await page.getByLabel('Province', { exact: true }).selectOption('Cebu')
  await expect(page.getByTestId('shipping-zone')).toContainText('Visayas')
  await expect(page.getByTestId('checkout-shipping')).toHaveText('₱150')
  await expect(page.getByTestId('checkout-total')).toHaveText('₱948')
  await page.getByRole('radio', { name: /GCash/ }).check()
  await expect(page.getByTestId('gcash-qr')).toBeVisible()
  await expect(page.getByTestId('gcash-amount')).toHaveText('₱948')
  await expectNoHorizontalScroll(page)

  const orderNo = await checkout(page, { payment: 'gcash', province: 'Cebu', email: '' })
  expect(orderNo).toMatch(/^KL-/)
  await expect(page.getByText('Awaiting payment').first()).toBeVisible()
  await expect(page.getByTestId('order-total')).toHaveText('₱948')
  await expect(page.getByTestId('gcash-details')).toBeVisible()
  await page.getByLabel('GCash reference no.').fill('1012 345 678901')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText(/Reference 1012345678901 received/)).toBeVisible()
  expect(errors).toEqual([])
})

test('checkout validation, unlisted province pays the highest fee, and the per-phone order cap', async ({ page }) => {
  await page.goto('/')
  await waitForApp(page)
  await page.getByRole('button', { name: 'Order now' }).first().click()
  await page.getByRole('button', { name: /^Place order/ }).click()
  await expect(page.getByText('Please enter your full name.')).toBeVisible()
  await expect(page.getByText(/valid mobile number/)).toBeVisible()
  await expect(page.getByText('Please choose your province.')).toBeVisible()
  await expect(page.getByText('Please choose how you want to pay.')).toBeVisible()
  await expect(page.getByLabel('Full name')).toBeFocused()

  await page.getByLabel('Province', { exact: true }).selectOption('__other')
  await page.getByLabel('Province name').fill('Overseas test')
  await expect(page.getByTestId('shipping-zone')).toContainText('Outside our listed areas')
  await expect(page.getByTestId('checkout-total')).toHaveText('₱569')

  // Three unconfirmed orders per phone, the fourth is refused by the database
  await page.goto('/')
  for (let i = 0; i < 3; i++) {
    await orderNow(page, { phone: '0918 111 2222' })
  }
  await page.goto('/')
  await page.getByRole('button', { name: 'Order now' }).first().click()
  await page.getByLabel('Full name').fill(CUSTOMER.name)
  await page.getByLabel('Mobile number').fill('09181112222')
  await page.getByLabel('House / unit no. and street').fill(CUSTOMER.address)
  await page.getByLabel('Barangay').fill(CUSTOMER.barangay)
  await page.getByLabel('City / municipality').fill(CUSTOMER.city)
  await page.getByLabel('Province', { exact: true }).selectOption('Metro Manila')
  await page.getByRole('radio', { name: /Cash on delivery/ }).check()
  await page.getByRole('button', { name: /^Place order/ }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'already have 3 orders' })).toBeVisible()
})

test('low stock and sold out are shown and enforced', async ({ page }) => {
  await page.goto('/shop')
  await waitForApp(page)
  await api(page, async (api, id) => {
    await api.signInWithPassword('admin@demo.test', 'demo1234')
    await api.setStock(id, null, 50, 2)
    await api.signOut()
  }, PRODUCT_ID)

  await page.goto('/product/crystal-blush')
  await expect(page.getByTestId('badge-low-stock')).toHaveText('Only 2 left')
  await page.getByRole('button', { name: 'Increase quantity' }).click()
  await expect(page.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()

  // Another shopper buys both while this bag still has 2
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await page.keyboard.press('Escape')
  await api(page, async (api, id) => {
    await api.createOrder({
      items: [{ product_id: id, quantity: 2 }],
      customer: { name: 'Other Shopper', phone: '0919 000 0000', address_line: '1 Main St', barangay: 'Uno', city: 'Makati', province: 'Metro Manila' },
      payment_method: 'cod',
    })
  }, PRODUCT_ID)

  await page.goto('/checkout')
  await checkoutExpectStockError(page)

  await page.goto('/product/crystal-blush')
  await expect(page.getByTestId('badge-sold-out')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sold out' })).toBeDisabled()
  await page.goto('/')
  await expect(visible(page.getByRole('button', { name: 'Sold out' }))).toBeDisabled()
})

async function checkoutExpectStockError(page) {
  // The bag (refreshed from the catalogue) flags the problem and blocks checkout.
  await expect(page.getByText('Sold out').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Place order/ })).toBeDisabled()
}
