import { test, expect } from '@playwright/test'
import { PRODUCT_ID, api, bagButton, checkout, enableGcash, expectNoHorizontalScroll, openOrderForm, orderNow, quickOrder, toCheckoutViaBag, visible, waitForApp, watchErrors } from './helpers.js'

test('every public page renders without errors or horizontal scroll', async ({ page }) => {
  const errors = watchErrors(page)

  await page.goto('/')
  await waitForApp(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A little color.A little Lumi.')
  await expect(page.getByTestId('hero-price')).toHaveText('₱399')
  await expect(page.getByRole('link', { name: 'Shop Crystal Blush' }).first()).toHaveAttribute('href', '/product/crystal-blush')
  await expect(page.getByRole('heading', { name: 'Meet Crystal Blush' })).toBeVisible()
  await expect(page.getByTestId('shade-note')).toHaveText('Shade appearance may vary.')
  await expect(page.getByText('Illustrative concept, not actual stage photos.')).toBeVisible()
  await expect(page.getByText('What is Crystal Blush?')).toBeVisible()
  await expect(page.getByTestId('announcement')).toContainText('Cash on delivery')
  // Unconfirmed claims and the old product description stay off the page
  await expect(page.locator('main')).not.toContainText(/vegan|cruelty-free|tone-adapt|undertone|1\.8 g/i)
  // Community section only appears once the owner adds real posts
  await expect(page.getByTestId('community-track')).toHaveCount(0)
  // The hero image loads first; images further down are lazy
  await expect(page.locator('img[fetchpriority=high]').first()).toHaveAttribute('src', /hero-podium/)
  await page.getByRole('link', { name: 'Explore the shade' }).click()
  await expect(page.getByRole('heading', { name: 'See the shade' })).toBeInViewport()
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
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /compact-top-1254\.webp$/)
  await expect(page.getByTestId('product-main-image')).toHaveAttribute('src', /compact-top/)
  // The order form stays closed until "Order now"
  await expect(page.getByTestId('order-form')).toHaveCount(0)
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

test('bag drawer + GCash checkout to Cebu (when GCash is switched on), then the customer adds the reference', async ({ page }) => {
  const errors = watchErrors(page)
  await enableGcash(page)
  await page.goto('/product/crystal-blush')
  await waitForApp(page)
  await page.getByRole('button', { name: 'Add to bag' }).click()
  const drawer = page.getByRole('dialog', { name: 'Your bag' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByTestId('bag-subtotal')).toHaveText('₱399')
  await drawer.getByRole('button', { name: 'Increase quantity of Crystal Blush' }).click()
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

test('cash on delivery only by default; order form validation, unlisted province and the per-phone cap', async ({ page }) => {
  // Checkout offers only cash on delivery
  await toCheckoutViaBag(page)
  await expect(page.getByRole('radio', { name: /Cash on delivery/ })).toBeChecked()
  await expect(page.getByRole('radio', { name: /GCash/ })).toHaveCount(0)

  const form = await openOrderForm(page)
  await form.getByRole('button', { name: /^Place order/ }).click()
  await expect(form.getByText('Please enter your full name.')).toBeVisible()
  await expect(form.getByText(/valid mobile number/)).toBeVisible()
  await expect(form.getByText('Please choose your province.')).toBeVisible()
  await expect(form.getByLabel('Full Name')).toBeFocused()
  await form.getByLabel('Email').fill('not-an-email')
  await form.getByRole('button', { name: /^Place order/ }).click()
  await expect(form.getByText('Please check your email address.')).toBeVisible()

  await form.getByLabel('Province').selectOption('__other')
  await form.getByLabel('Province name').fill('Overseas test')
  await expect(page.getByTestId('order-form-shipping')).toHaveText('₱170')
  await expect(page.getByTestId('order-form-total')).toHaveText('₱569')

  // Three unconfirmed orders per phone, the fourth is refused by the database
  for (let i = 0; i < 3; i++) await orderNow(page, { phone: '0918 111 2222' })
  await openOrderForm(page)
  await quickOrder(page, { phone: '09181112222', expectError: 'already have 3 orders' })
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

  // Another shopper buys both while this bag still has 2 (the quantity chosen above)
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByRole('dialog', { name: 'Your bag' }).getByTestId('bag-subtotal')).toHaveText('₱798')
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
  await expect(page.getByRole('button', { name: 'Add to bag' })).toBeDisabled()
  await expect(page.getByTestId('availability')).toHaveText('Sold out')
  await page.goto('/')
  await expect(page.getByTestId('hero-sold-out')).toBeVisible()
})

async function checkoutExpectStockError(page) {
  // The bag (refreshed from the catalogue) flags the problem and blocks checkout.
  await expect(page.getByText('Sold out').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Place order/ })).toBeDisabled()
}

test('quantity stays in sync between the buy box, the order form, the sticky bar and the bag', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/product/crystal-blush')
  await waitForApp(page)
  await page.getByRole('button', { name: 'Increase quantity' }).click()
  await page.getByRole('button', { name: 'Order now' }).first().click()
  const form = page.getByTestId('order-form')
  await expect(form).toBeVisible()
  await expect(form.getByLabel('Full Name')).toBeFocused()
  await expect(page.getByTestId('order-form-summary')).toContainText('Crystal Blush × 2')
  await form.getByLabel('Province').selectOption('Metro Manila')
  await expect(page.getByTestId('order-form-total')).toHaveText('₱898')
  // Changing it in the form changes it in the buy box too
  await form.getByRole('button', { name: 'Increase quantity' }).click()
  await expect(page.getByTestId('order-form-summary')).toContainText('Crystal Blush × 3')
  await expect(page.getByRole('group', { name: 'Quantity' }).first()).toContainText('3')
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByRole('dialog', { name: 'Your bag' }).getByTestId('bag-subtotal')).toHaveText('₱1,197')
  await page.keyboard.press('Escape')
  await expect(bagButton(page)).toHaveAccessibleName('Open bag, 3 items')
  expect(errors).toEqual([])
})

test('gallery: thumbnails, arrows and the zoom dialog work with the keyboard', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/product/crystal-blush')
  await waitForApp(page)
  const thumbs = page.getByRole('group', { name: 'Choose a photo' }).getByRole('button')
  await expect(thumbs).toHaveCount(7)
  await thumbs.nth(2).click()
  await expect(thumbs.nth(2)).toHaveAttribute('aria-current', 'true')
  await expect(page.getByTestId('product-main-image')).toHaveAttribute('src', /pan-closeup/)

  await page.getByTestId('product-main-image').click()
  const zoom = page.getByRole('dialog', { name: 'Crystal Blush photos' })
  await expect(zoom).toBeVisible()
  await expect(zoom.getByRole('button', { name: 'Close photos' })).toBeFocused()
  await expect(zoom).toContainText('Photo 3 of 7')
  await page.keyboard.press('ArrowRight')
  await expect(zoom).toContainText('Photo 4 of 7')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(zoom).toContainText('Photo 2 of 7')
  // Focus stays inside the dialog
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab')
  expect(await zoom.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(zoom).toHaveCount(0)
  await expect(thumbs.nth(1)).toHaveAttribute('aria-current', 'true')
  await expectNoHorizontalScroll(page)
  expect(errors).toEqual([])
})

test('phones: the menu is a dialog that keeps focus and closes with Escape; the sticky buy bar appears after the buy box', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only')
  const errors = watchErrors(page)
  await page.goto('/product/crystal-blush')
  await waitForApp(page)
  const menuButton = page.getByRole('button', { name: 'Open menu' })
  await menuButton.click()
  const menu = page.getByRole('dialog', { name: 'Menu' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Track order' })).toBeVisible()
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
  expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(menuButton).toBeFocused()

  await expect(page.getByTestId('sticky-buy')).toHaveCount(0)
  await page.getByRole('heading', { name: 'About Crystal Blush' }).evaluate((el) => el.scrollIntoView({ block: 'start' }))
  const bar = page.getByTestId('sticky-buy')
  await expect(bar).toBeVisible()
  await bar.getByRole('button', { name: 'Order now' }).click()
  await expect(page.getByTestId('order-form')).toBeVisible()
  await expect(bar).toHaveCount(0)
  expect(errors).toEqual([])
})
