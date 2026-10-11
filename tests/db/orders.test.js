import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, as, PRODUCT_ID, ZONE, CUSTOMER } from './harness.js'
import { PH_PROVINCES } from '../../src/lib/ph.js'

const ADMIN_USER = 'aaaaaaaa-0000-4000-8000-000000000001'
const OTHER_USER = 'aaaaaaaa-0000-4000-8000-000000000002'

let db
const q = async (sql, params) => (await db.query(sql, params)).rows
const one = async (sql, params) => (await q(sql, params))[0]
const stock = async (id = PRODUCT_ID) => (await one('select stock from products where id = $1', [id])).stock

const order = (overrides = {}) => {
  const a = {
    items: [{ product_id: PRODUCT_ID, quantity: 1 }],
    customer: CUSTOMER,
    method: 'cod',
    ref: null,
    zone: null,
    notes: null,
    ...overrides,
  }
  if (overrides.customer) a.customer = { ...CUSTOMER, ...overrides.customer }
  return one('select create_order($1, $2, $3, $4, $5, $6) as o', [
    JSON.stringify(a.items), JSON.stringify(a.customer), a.method, a.ref, a.zone, a.notes,
  ]).then((r) => r.o)
}
const asAdmin = (fn) => as(db, 'authenticated', ADMIN_USER, fn)
const setStatus = (id, status, courier = null, tracking = null, note = null) =>
  asAdmin(() => one('select admin_set_order_status($1, $2, $3, $4, $5) as o', [id, status, courier, tracking, note])).then((r) => r.o)
const markPaid = (id, ref = null) => asAdmin(() => one('select admin_mark_paid($1, $2) as o', [id, ref])).then((r) => r.o)

// A second product with shade variants, for the generic-catalogue tests.
const VARIANT_PRODUCT = 'c0000000-0000-4000-8000-0000000000aa'
const SHADE_ROSE = 'd0000000-0000-4000-8000-000000000001'
const SHADE_NUDE = 'd0000000-0000-4000-8000-000000000002'
async function addVariantProduct() {
  await q(`insert into products (id, slug, name, price, stock, variant_label) values ($1, 'lip-tint', 'Lip Tint', 299, 0, 'Shade')`, [VARIANT_PRODUCT])
  await q(`insert into product_variants (id, product_id, name, price, stock) values
             ($1, $3, 'Rose', 299, 5), ($2, $3, 'Nude', 349, 1)`, [SHADE_ROSE, SHADE_NUDE, VARIANT_PRODUCT])
}

beforeEach(async () => {
  db = await createDb()
  await q('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ADMIN_USER, 'owner@example.com', OTHER_USER, 'other@example.com'])
  await q('insert into admin_users (user_id, role) values ($1, $2)', [ADMIN_USER, 'owner'])
}, 30000)

describe('seed', () => {
  it('has the store, Crystal Blush at ₱399 × 50 and four zones', async () => {
    const s = await one('select * from store_settings')
    expect(s.store_name).toBe('Kryztal Lumi')
    expect(s.max_unconfirmed_per_phone).toBe(3)
    const p = await one('select * from products where id = $1', [PRODUCT_ID])
    expect(p.name).toBe('Crystal Blush')
    expect(Number(p.price)).toBe(399)
    expect(p.stock).toBe(50)
    expect(p.ingredients).toContain('D&C Red No.22 (CI 45380)')
    expect((await q('select * from product_images where product_id = $1', [PRODUCT_ID])).length).toBe(4)
    const zones = await q('select name, fee::int, delivery_time from shipping_zones order by sort_order')
    expect(zones).toEqual([
      { name: 'Metro Manila', fee: 100, delivery_time: '2–3 days' },
      { name: 'Luzon', fee: 120, delivery_time: '3–5 days' },
      { name: 'Visayas', fee: 150, delivery_time: '5–7 days' },
      { name: 'Mindanao', fee: 170, delivery_time: '5–7 days' },
    ])
  })

  it('every province is in exactly one zone', async () => {
    const rows = await q('select unnest(provinces) as p from shipping_zones')
    const listed = rows.map((r) => r.p).sort()
    expect(listed).toEqual([...PH_PROVINCES].sort())
    expect(new Set(listed).size).toBe(listed.length)
  })

  it('is safe to re-run and does not reset stock', async () => {
    await order({ items: [{ product_id: PRODUCT_ID, quantity: 2 }] })
    const { readFileSync } = await import('node:fs')
    await db.exec(readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8'))
    expect(await stock()).toBe(48)
  })
})

describe('create_order', () => {
  it('COD order: totals from the DB, stock taken, snapshot + timeline', async () => {
    const o = await order({ items: [{ product_id: PRODUCT_ID, quantity: 2, unit_price: 1, price: 1 }] })
    expect(o.order_no).toMatch(/^KL-[0-9A-F]{6}$/)
    expect(o.status).toBe('new')
    expect(o.payment_method).toBe('cod')
    expect(o.subtotal).toBe(798) // the browser's "unit_price: 1" is ignored
    expect(o.shipping_fee).toBe(100)
    expect(o.total).toBe(898)
    expect(o.shipping).toMatchObject({ zone_name: 'Metro Manila', eta: '2–3 days', barangay: 'San Antonio', zip: '1600' })
    expect(o.items).toEqual([
      expect.objectContaining({ product_name: 'Crystal Blush', product_slug: 'crystal-blush', unit_price: 399, quantity: 2, line_total: 798, image_url: '/images/product-box.webp' }),
    ])
    expect(o.timeline).toHaveLength(1)
    expect(o.timeline[0].status).toBe('new')
    expect(o.admin_notes).toBeUndefined()
    expect(await stock()).toBe(48)
  })

  it('later price / name edits never rewrite the order', async () => {
    const o = await order()
    await q("update products set price = 999, name = 'Renamed' where id = $1", [PRODUCT_ID])
    const again = await one('select get_order($1, $2) as o', [o.order_no, CUSTOMER.phone])
    expect(again.o.items[0]).toMatchObject({ product_name: 'Crystal Blush', unit_price: 399 })
    expect(again.o.total).toBe(499)
  })

  it('merges duplicate lines', async () => {
    const o = await order({ items: [{ product_id: PRODUCT_ID, quantity: 1 }, { product_id: PRODUCT_ID, quantity: 2 }] })
    expect(o.items).toHaveLength(1)
    expect(o.items[0].quantity).toBe(3)
    expect(await stock()).toBe(47)
  })

  it('shipping fee follows the province, whatever zone the browser sent', async () => {
    expect((await order({ customer: { province: 'Cebu', phone: '0917 000 0001' } })).shipping_fee).toBe(150)
    expect((await order({ customer: { province: 'davao del sur', phone: '0917 000 0002' } })).shipping_fee).toBe(170)
    const o = await order({ customer: { province: 'Pampanga', phone: '0917 000 0003' }, zone: ZONE.metro })
    expect(o.shipping).toMatchObject({ zone_name: 'Luzon' })
    expect(o.shipping_fee).toBe(120)
  })

  it('a province in no zone pays the highest active fee; a browser-chosen zone is ignored', async () => {
    const o = await order({ customer: { province: 'Davao' }, zone: ZONE.metro })
    expect(o.shipping).toMatchObject({ zone_name: 'Mindanao' })
    expect(o.shipping_fee).toBe(170)
    await q('update shipping_zones set is_active = false where id = $1', [ZONE.mindanao])
    expect((await order({ customer: { province: 'Overseas', phone: '0917 000 0009' } })).shipping_fee).toBe(150)
    await q('update shipping_zones set is_active = false')
    await expect(order({ customer: { phone: '0917 000 0010' } })).rejects.toThrow("can't ship to that address")
  })

  it('free shipping: everything, or above a threshold', async () => {
    await q("update store_settings set free_shipping_mode = 'threshold', free_shipping_threshold = 700")
    expect((await order({ customer: { phone: '0917 000 0001' } })).shipping_fee).toBe(100)
    expect((await order({ items: [{ product_id: PRODUCT_ID, quantity: 2 }], customer: { phone: '0917 000 0002' } })).shipping_fee).toBe(0)
    await q("update store_settings set free_shipping_mode = 'all'")
    const o = await order({ customer: { phone: '0917 000 0003' } })
    expect(o.shipping_fee).toBe(0)
    expect(o.total).toBe(399)
  })

  it('minimum order', async () => {
    await q('update store_settings set min_order_amount = 500')
    await expect(order()).rejects.toThrow('The minimum order is ₱500')
    expect(await stock()).toBe(50)
    expect((await order({ items: [{ product_id: PRODUCT_ID, quantity: 2 }] })).subtotal).toBe(798)
  })

  it('GCash order waits for payment and expires after the configured hours', async () => {
    await q('update store_settings set gcash_expiry_hours = 6')
    const o = await order({ method: 'gcash' })
    expect(o.status).toBe('awaiting_payment')
    expect(o.payment_status).toBe('unpaid')
    const hours = (new Date(o.expires_at) - Date.now()) / 3600000
    expect(hours).toBeGreaterThan(5.9)
    expect(hours).toBeLessThan(6.1)
    const withRef = await order({ method: 'gcash', ref: ' 1012 345 678901 ', customer: { phone: '0917 000 0002' } })
    expect(withRef.payment_status).toBe('submitted')
    expect(withRef.gcash_reference).toBe('1012345678901')
  })

  it('COD ignores a GCash reference; disabled methods are refused', async () => {
    expect((await order({ ref: '12345' })).gcash_reference).toBeNull()
    await q('update store_settings set gcash_enabled = false')
    await expect(order({ method: 'gcash', customer: { phone: '0917 000 0002' } })).rejects.toThrow('not available')
    await expect(order({ method: 'card', customer: { phone: '0917 000 0003' } })).rejects.toThrow('payment method')
  })

  it('validates customer details', async () => {
    await expect(order({ customer: { name: 'A' } })).rejects.toThrow('full name')
    await expect(order({ customer: { phone: '12345' } })).rejects.toThrow('valid mobile')
    await expect(order({ customer: { email: 'nope' } })).rejects.toThrow('valid email')
    await expect(order({ customer: { email: 'a@b.co?bcc=x%40evil.com' } })).rejects.toThrow('valid email')
    await expect(order({ customer: { email: 'a@b.co&body=hi' } })).rejects.toThrow('valid email')
    await expect(order({ customer: { barangay: '' } })).rejects.toThrow('barangay')
    await expect(order({ customer: { city: '' } })).rejects.toThrow('city')
    await expect(order({ customer: { zip: '12' } })).rejects.toThrow('ZIP')
    await expect(order({ customer: { address_line: '' } })).rejects.toThrow('house no.')
    await expect(order({ method: 'gcash', ref: 'x!' })).rejects.toThrow('reference')
    expect((await order({ customer: { email: '', zip: '', landmark: '' } })).customer.email).toBeNull()
    expect(await stock()).toBe(49)
  })

  it('rejects bad / empty / inactive items', async () => {
    await expect(order({ items: [] })).rejects.toThrow('bag is empty')
    await expect(order({ items: [{ product_id: 'nope', quantity: 1 }] })).rejects.toThrow('not valid')
    await expect(order({ items: [{ product_id: PRODUCT_ID, quantity: 0 }] })).rejects.toThrow('not valid')
    await expect(order({ items: [{ product_id: PRODUCT_ID, quantity: -1 }] })).rejects.toThrow('not valid')
    await expect(order({ items: [{ product_id: PRODUCT_ID, quantity: 11 }] })).rejects.toThrow('up to 10')
    await q('update products set is_active = false')
    await expect(order()).rejects.toThrow('no longer available')
    expect(await stock()).toBe(50)
  })
})

describe('stock safety', () => {
  it('never sells more than is in stock; the failed order takes nothing', async () => {
    await q('update products set stock = 3')
    await order({ items: [{ product_id: PRODUCT_ID, quantity: 2 }], customer: { phone: '0917 000 0001' } })
    await expect(order({ items: [{ product_id: PRODUCT_ID, quantity: 2 }], customer: { phone: '0917 000 0002' } })).rejects.toThrow('only 1 left of Crystal Blush')
    expect(await stock()).toBe(1)
    await order({ customer: { phone: '0917 000 0003' } })
    expect(await stock()).toBe(0)
    await expect(order({ customer: { phone: '0917 000 0004' } })).rejects.toThrow('Crystal Blush is sold out')
    expect((await one('select count(*)::int as n from orders')).n).toBe(2)
  })

  it('a multi-item order that fails part-way rolls back every line', async () => {
    await addVariantProduct()
    await expect(
      order({ items: [{ product_id: PRODUCT_ID, quantity: 3 }, { product_id: VARIANT_PRODUCT, variant_id: SHADE_NUDE, quantity: 2 }] }),
    ).rejects.toThrow('only 1 left of Lip Tint (Nude)')
    expect(await stock()).toBe(50)
    expect((await one('select stock from product_variants where id = $1', [SHADE_NUDE])).stock).toBe(1)
  })

  it('the stock check is a single guarded UPDATE (row-locked under concurrency)', async () => {
    // PGlite has one connection, so we assert the mechanism instead of racing:
    // the decrement only happens when stock >= qty, inside the order transaction.
    const src = await one("select prosrc from pg_proc where proname = '_take_stock'")
    expect(src.prosrc).toMatch(/update public\.products set stock = stock - p_qty where id = p_product_id and stock >= p_qty/)
    expect(src.prosrc).toMatch(/update public\.product_variants set stock = stock - p_qty where id = p_variant_id and stock >= p_qty/)
    await expect(q('update products set stock = -1')).rejects.toThrow(/check constraint/)
  })

  it('untracked products are never limited or decremented', async () => {
    await q('update products set stock = 0, track_stock = false')
    const o = await order({ items: [{ product_id: PRODUCT_ID, quantity: 5 }] })
    expect(o.total).toBe(5 * 399 + 100)
    expect(await stock()).toBe(0)
    await setStatus(o.id, 'cancelled')
    expect(await stock()).toBe(0)
  })
})

describe('variants (generic catalogue)', () => {
  beforeEach(addVariantProduct)

  it('uses the variant price and stock', async () => {
    const o = await order({ items: [{ product_id: VARIANT_PRODUCT, variant_id: SHADE_NUDE, quantity: 1 }] })
    expect(o.items[0]).toMatchObject({ product_name: 'Lip Tint', variant_name: 'Nude', unit_price: 349 })
    expect((await one('select stock from product_variants where id = $1', [SHADE_NUDE])).stock).toBe(0)
    await setStatus(o.id, 'cancelled')
    expect((await one('select stock from product_variants where id = $1', [SHADE_NUDE])).stock).toBe(1)
  })

  it('max per order counts all options of a product together', async () => {
    await q('update products set max_per_order = 3 where id = $1', [VARIANT_PRODUCT])
    await q('update product_variants set stock = 10')
    await expect(
      order({ items: [{ product_id: VARIANT_PRODUCT, variant_id: SHADE_ROSE, quantity: 2 }, { product_id: VARIANT_PRODUCT, variant_id: SHADE_NUDE, quantity: 2 }] }),
    ).rejects.toThrow('up to 3 of Lip Tint')
  })

  it('requires an active variant of that product', async () => {
    await expect(order({ items: [{ product_id: VARIANT_PRODUCT, quantity: 1 }] })).rejects.toThrow('choose a shade for Lip Tint')
    await expect(order({ items: [{ product_id: PRODUCT_ID, variant_id: SHADE_ROSE, quantity: 1 }] })).rejects.toThrow('no longer available')
    await q('update product_variants set is_active = false where id = $1', [SHADE_ROSE])
    await expect(order({ items: [{ product_id: VARIANT_PRODUCT, variant_id: SHADE_ROSE, quantity: 1 }] })).rejects.toThrow('no longer available')
  })

  it('a deleted variant is not restocked onto the product', async () => {
    const o = await order({ items: [{ product_id: VARIANT_PRODUCT, variant_id: SHADE_ROSE, quantity: 2 }] })
    await q('delete from product_variants where id = $1', [SHADE_ROSE])
    await setStatus(o.id, 'cancelled')
    expect(await stock(VARIANT_PRODUCT)).toBe(0)
  })
})

describe('anti-spam', () => {
  it('max 3 unconfirmed orders per phone, however the number is typed', async () => {
    await order({ customer: { phone: '0917 123 4567' } })
    await order({ customer: { phone: '+63 917 123 4567' }, method: 'gcash' })
    const third = await order({ customer: { phone: '639171234567' } })
    await expect(order({ customer: { phone: '(0917) 123-4567' } })).rejects.toThrow('already have 3 orders')
    expect(await stock()).toBe(47)
    // Another number is fine
    await order({ customer: { phone: '0918 765 4321' } })
    // Confirming one frees a slot
    await setStatus(third.id, 'confirmed')
    await order({ customer: { phone: '0917 123 4567' } })
  })

  it('the cap is configurable', async () => {
    await q('update store_settings set max_unconfirmed_per_phone = 1')
    await order()
    await expect(order()).rejects.toThrow('already have 1 orders')
  })
})

describe('GCash expiry', () => {
  it('auto-cancels unpaid GCash orders and releases stock', async () => {
    const o = await order({ method: 'gcash', items: [{ product_id: PRODUCT_ID, quantity: 4 }] })
    const cod = await order({ customer: { phone: '0917 000 0002' } })
    expect(await stock()).toBe(45)
    expect((await one('select expire_unpaid_orders() as n')).n).toBe(0)
    await q("update orders set expires_at = now() - interval '1 minute' where id = $1", [o.id])
    expect((await one('select expire_unpaid_orders() as n')).n).toBe(1)
    expect(await stock()).toBe(49)
    const after = await one('select status, cancelled_reason, stock_released from orders where id = $1', [o.id])
    expect(after).toMatchObject({ status: 'cancelled', stock_released: true })
    expect(after.cancelled_reason).toMatch(/^Auto-cancelled/)
    expect((await one('select status from orders where id = $1', [cod.id])).status).toBe('new')
    // Running again changes nothing
    expect((await one('select expire_unpaid_orders() as n')).n).toBe(0)
    expect(await stock()).toBe(49)
  })

  it('orders with a submitted reference get 48 more hours, then expire too (a fake reference cannot hold stock forever)', async () => {
    const o = await order({ method: 'gcash', ref: 'ABC12345' })
    await q("update orders set expires_at = now() - interval '1 minute' where id = $1", [o.id])
    expect((await one('select expire_unpaid_orders() as n')).n).toBe(0)
    await q("update orders set expires_at = now() - interval '49 hours' where id = $1", [o.id])
    expect((await one('select expire_unpaid_orders() as n')).n).toBe(1)
    expect(await stock()).toBe(50)
    // …and a late payment can still be confirmed while stock lasts
    expect((await markPaid(o.id)).status).toBe('confirmed')
  })

  it('a reference cannot be submitted after the payment window closed', async () => {
    const o = await order({ method: 'gcash' })
    await q("update orders set expires_at = now() - interval '1 minute' where id = $1", [o.id])
    await expect(one('select submit_gcash_reference($1, $2, $3)', [o.order_no, CUSTOMER.phone, '123456'])).rejects.toThrow('payment window')
  })

  it('expired orders no longer count towards the per-phone cap (even before the cron job runs)', async () => {
    for (let i = 0; i < 3; i++) await order({ method: 'gcash' })
    await q("update orders set expires_at = now() - interval '1 minute'")
    await order({ method: 'gcash' })
    expect((await one("select count(*)::int as n from orders where status = 'awaiting_payment'")).n).toBe(4)
  })
})

describe('customer lookup', () => {
  it('finds an order by order no. + any format of the same mobile', async () => {
    const o = await order()
    const find = (no, phone) => one('select get_order($1, $2) as o', [no, phone]).then((r) => r.o)
    expect((await find(o.order_no, '09171234567')).id).toBe(o.id)
    expect((await find(o.order_no.toLowerCase(), '+63 917 123 4567')).id).toBe(o.id)
    expect((await find(o.order_no.slice(3), '0917-123-4567')).id).toBe(o.id)
    expect(await find(o.order_no, '0917 999 9999')).toBeNull()
    expect(await find(o.order_no, '4567')).toBeNull()
    expect(await find('KL-000000', '09171234567')).toBeNull()
  })

  it('customers can add their GCash reference later', async () => {
    const o = await order({ method: 'gcash' })
    const r = await as(db, 'anon', null, () => one('select submit_gcash_reference($1, $2, $3) as o', [o.order_no, '09171234567', '5012 345 6789']))
    expect(r.o.payment_status).toBe('submitted')
    expect(r.o.gcash_reference).toBe('50123456789')
    expect(r.o.timeline.at(-1).note).toMatch(/reference submitted/)
    await expect(one('select submit_gcash_reference($1, $2, $3)', [o.order_no, '0999 999 9999', '123456'])).rejects.toThrow("couldn't find")
    const cod = await order({ customer: { phone: '0917 000 0002' } })
    await expect(one('select submit_gcash_reference($1, $2, $3)', [cod.order_no, '0917 000 0002', '123456'])).rejects.toThrow("doesn't need")
  })
})

describe('admin order flow', () => {
  it('COD: new → confirmed → packed → shipped → delivered (paid on delivery)', async () => {
    const o = await order()
    await setStatus(o.id, 'confirmed')
    await setStatus(o.id, 'packed')
    await expect(setStatus(o.id, 'shipped', 'J&T Express', null)).rejects.toThrow('courier and tracking')
    const shipped = await setStatus(o.id, 'shipped', 'J&T Express', 'JT0001234567')
    expect(shipped).toMatchObject({ status: 'shipped', courier: 'J&T Express', tracking_no: 'JT0001234567', payment_status: 'unpaid' })
    const done = await setStatus(o.id, 'delivered')
    expect(done.payment_status).toBe('paid')
    expect(done.timeline.map((e) => e.status)).toEqual(['new', 'confirmed', 'packed', 'shipped', 'delivered'])
    expect(done.timeline[3].note).toBe('Shipped via J&T Express · tracking no. JT0001234567')
    // Customer sees the same timeline + tracking
    const pub = (await one('select get_order($1, $2) as o', [o.order_no, CUSTOMER.phone])).o
    expect(pub).toMatchObject({ status: 'delivered', courier: 'J&T Express', tracking_no: 'JT0001234567' })
    expect(pub.notifications).toBeUndefined()
  })

  it('refuses invalid transitions', async () => {
    const o = await order()
    await expect(setStatus(o.id, 'delivered')).rejects.toThrow("can't be marked delivered")
    await expect(setStatus(o.id, 'new')).rejects.toThrow("can't be marked")
    const g = await order({ method: 'gcash', customer: { phone: '0917 000 0002' } })
    await expect(setStatus(g.id, 'confirmed')).rejects.toThrow('Mark GCash paid')
    await setStatus(o.id, 'cancelled', null, null, 'Customer changed mind')
    await expect(setStatus(o.id, 'confirmed')).rejects.toThrow("can't be marked")
  })

  it('cancel and return put stock back exactly once', async () => {
    const a = await order({ items: [{ product_id: PRODUCT_ID, quantity: 3 }] })
    expect(await stock()).toBe(47)
    const c = await setStatus(a.id, 'cancelled', null, null, 'Out of area')
    expect(c.cancelled_reason).toBe('Out of area')
    expect(await stock()).toBe(50)
    const b = await order({ items: [{ product_id: PRODUCT_ID, quantity: 2 }] })
    await setStatus(b.id, 'confirmed')
    await setStatus(b.id, 'shipped', 'LBC', '123')
    await setStatus(b.id, 'delivered')
    expect(await stock()).toBe(48)
    await setStatus(b.id, 'returned')
    expect(await stock()).toBe(50)
    await expect(setStatus(b.id, 'returned')).rejects.toThrow()
    expect(await stock()).toBe(50)
  })

  it('mark GCash paid confirms the order', async () => {
    const o = await order({ method: 'gcash' })
    const paid = await markPaid(o.id, 'ref 777')
    expect(paid).toMatchObject({ status: 'confirmed', payment_status: 'paid', gcash_reference: 'REF777' })
    await expect(markPaid(o.id)).rejects.toThrow('already marked paid')
    const cod = await order({ customer: { phone: '0917 000 0002' } })
    await expect(markPaid(cod.id)).rejects.toThrow('Cash on delivery')
  })

  it('a late GCash payment reinstates an auto-cancelled order if stock allows', async () => {
    await q('update products set stock = 2')
    const o = await order({ method: 'gcash', items: [{ product_id: PRODUCT_ID, quantity: 2 }] })
    await q("update orders set expires_at = now() - interval '1 minute' where id = $1", [o.id])
    await one('select expire_unpaid_orders()')
    expect(await stock()).toBe(2)
    const back = await markPaid(o.id)
    expect(back.status).toBe('confirmed')
    expect(back.cancelled_reason).toBeNull()
    expect(await stock()).toBe(0)

    // Same again, but someone bought the stock in the meantime
    await q('update products set stock = 1')
    const p = await order({ method: 'gcash', customer: { phone: '0917 000 0002' } })
    await q("update orders set expires_at = now() - interval '1 minute' where id = $1", [p.id])
    await one('select expire_unpaid_orders()')
    await order({ customer: { phone: '0917 000 0003' } })
    await expect(markPaid(p.id)).rejects.toThrow('sold out')
    expect((await one('select status from orders where id = $1', [p.id])).status).toBe('cancelled')
    // A manually cancelled order can't be "paid" back to life
    await q('update products set stock = 5')
    const m = await order({ method: 'gcash', customer: { phone: '0917 000 0004' } })
    await setStatus(m.id, 'cancelled')
    await expect(markPaid(m.id)).rejects.toThrow('Only orders awaiting payment')
  })

  it('reinstating uses the current catalogue: untracked products take no stock', async () => {
    const o = await order({ method: 'gcash', items: [{ product_id: PRODUCT_ID, quantity: 2 }] })
    await q("update orders set expires_at = now() - interval '1 minute' where id = $1", [o.id])
    await one('select expire_unpaid_orders()')
    await q('update products set stock = 0, track_stock = false')
    expect((await markPaid(o.id)).status).toBe('confirmed')
    expect(await stock()).toBe(0)
  })

  it('tracking can be corrected after shipping', async () => {
    const o = await order()
    await expect(asAdmin(() => q('select admin_update_tracking($1, $2, $3)', [o.id, 'LBC', '1']))).rejects.toThrow('after the order has shipped')
    await setStatus(o.id, 'confirmed')
    await setStatus(o.id, 'shipped', 'LBC', 'WRONG')
    const r = await asAdmin(() => one('select admin_update_tracking($1, $2, $3) as o', [o.id, 'J&T Express', 'JT99']))
    expect(r.o).toMatchObject({ courier: 'J&T Express', tracking_no: 'JT99' })
  })

  it('list + filters + search', async () => {
    const a = await order({ customer: { name: 'Ana Reyes', phone: '0917 000 0001' } })
    await order({ method: 'gcash', customer: { name: 'Bea Cruz', phone: '0917 000 0002' } })
    await order({ method: 'gcash', ref: 'REF123', customer: { name: 'Cora Lim', phone: '0917 000 0003' } })
    const list = (args) =>
      asAdmin(() => one('select admin_list_orders($1, $2, $3, $4, $5) as r', [args.status ?? null, args.method ?? null, args.search ?? null, 50, 0])).then((r) => r.r)
    expect((await list({})).total).toBe(3)
    expect((await list({ status: 'to_verify' })).total).toBe(2)
    expect((await list({ status: 'cod_to_collect' })).total).toBe(1)
    expect((await list({ method: 'gcash' })).total).toBe(2)
    expect((await list({ search: 'bea' })).orders[0].customer_name).toBe('Bea Cruz')
    expect((await list({ search: '0001' })).orders[0].id).toBe(a.id)
    expect((await list({ search: a.order_no.slice(3) })).orders[0].id).toBe(a.id)
    expect((await list({})).orders[0].items_summary).toBe('1× Crystal Blush')
  })

  it('dashboard stats', async () => {
    const cod = await order({ items: [{ product_id: PRODUCT_ID, quantity: 2 }] })
    const g = await order({ method: 'gcash', customer: { phone: '0917 000 0002' } })
    await order({ method: 'gcash', ref: 'R12345', customer: { phone: '0917 000 0003' } })
    await markPaid(g.id)
    await q('update products set stock = 4')
    const s = (await asAdmin(() => one('select admin_stats() as s'))).s
    expect(s).toMatchObject({
      new_orders: 1,
      orders_this_week: 3,
      sales_this_month: 499,
      cod_to_collect: 898,
      cod_to_collect_count: 1,
      gcash_to_verify: 1,
      gcash_submitted: 1,
      to_ship: 1,
    })
    expect(s.low_stock).toEqual([{ product_id: PRODUCT_ID, product_name: 'Crystal Blush', variant_name: null, stock: 4 }])
    await setStatus(cod.id, 'cancelled')
    expect((await asAdmin(() => one('select admin_stats() as s'))).s.cod_to_collect).toBe(0)
  })
})

describe('row level security & privileges', () => {
  it('anon reads only the active catalogue and public settings', async () => {
    await addVariantProduct()
    await q("update product_variants set is_active = false where id = $1", [SHADE_NUDE])
    await as(db, 'anon', null, async () => {
      expect((await q('select id from products')).length).toBe(2)
      expect((await q('select id from product_variants')).length).toBe(1)
      expect((await q('select id from shipping_zones')).length).toBe(4)
      expect((await one('select store_name from store_settings')).store_name).toBe('Kryztal Lumi')
      await expect(q('select * from store_private')).rejects.toThrow(/permission denied/)
    })
    await q('update products set is_active = false where id = $1', [VARIANT_PRODUCT])
    await as(db, 'anon', null, async () => {
      expect((await q('select id from products')).map((r) => r.id)).toEqual([PRODUCT_ID])
      expect(await q('select id from product_variants')).toEqual([])
    })
  })

  it('anon cannot read orders, create orders directly or call admin functions', async () => {
    const o = await order()
    await as(db, 'anon', null, async () => {
      await expect(q('select * from orders')).rejects.toThrow(/permission denied/)
      await expect(q('select * from order_items')).rejects.toThrow(/permission denied/)
      await expect(q("select create_order('[]', '{}', 'cod')")).rejects.toThrow(/permission denied/)
      await expect(q('select admin_stats()')).rejects.toThrow(/permission denied/)
      await expect(q('select admin_mark_paid($1)', [o.id])).rejects.toThrow(/permission denied/)
      await expect(q('select expire_unpaid_orders()')).rejects.toThrow(/permission denied/)
      await expect(q("update products set price = 1")).rejects.toThrow(/permission denied/)
      await expect(q("insert into orders (order_no) values ('x')")).rejects.toThrow(/permission denied/)
    })
  })

  it('a logged-in non-admin can do nothing an anon user cannot', async () => {
    const o = await order()
    await as(db, 'authenticated', OTHER_USER, async () => {
      expect(await q('select * from orders')).toEqual([])
      expect(await q('select * from store_private')).toEqual([])
      await expect(q('select admin_stats()')).rejects.toThrow('Not authorised')
      await expect(q('select admin_set_order_status($1, $2)', [o.id, 'confirmed'])).rejects.toThrow('Not authorised')
      await expect(q('select admin_list_orders()')).rejects.toThrow('Not authorised')
      await expect(q('select admin_get_order($1)', [o.id])).rejects.toThrow('Not authorised')
      await expect(q("select create_order('[]', '{}', 'cod')")).rejects.toThrow(/permission denied/)
      await q('update products set price = 1')
      await q("update store_settings set store_name = 'Hacked'")
      await expect(q("insert into products (slug, name, price) values ('x', 'X', 1)")).rejects.toThrow(/row-level security/)
      await expect(q('insert into admin_users (user_id) values ($1)', [OTHER_USER])).rejects.toThrow(/permission denied/)
      await expect(q('update orders set status = $1', ['delivered'])).rejects.toThrow(/permission denied/)
    })
    expect(Number((await one('select price from products where id = $1', [PRODUCT_ID])).price)).toBe(399)
    expect((await one('select store_name from store_settings')).store_name).toBe('Kryztal Lumi')
  })

  it('admins manage the catalogue, settings and private notes', async () => {
    const o = await order()
    await asAdmin(async () => {
      await q("insert into categories (slug, name) values ('blush', 'Blush')")
      await q("insert into products (slug, name, price, stock) values ('lip-oil', 'Lip Oil', 250, 10)")
      // Stock only changes through the compare-and-set function
      await expect(q('update products set stock = 60 where id = $1', [PRODUCT_ID])).rejects.toThrow(/permission denied/)
      await expect(q('select admin_set_stock($1, null, 50, 60)', [PRODUCT_ID])).rejects.toThrow('Stock changed to 49')
      expect((await one('select admin_set_stock($1, null, 49, 60) as s', [PRODUCT_ID])).s).toBe(60)
      await q("update products set price = 450 where id = $1", [PRODUCT_ID])
      await q("update store_settings set gcash_number = '0917 000 0000'")
      await q("update store_private set notify_email = 'owner@example.com'")
      expect((await one('select notify_email from store_private')).notify_email).toBe('owner@example.com')
      await q("update orders set admin_notes = 'VIP' where id = $1", [o.id])
      // …but cannot edit order money/status columns directly
      await expect(q('update orders set total = 1 where id = $1', [o.id])).rejects.toThrow(/permission denied/)
      expect((await q('select * from orders')).length).toBe(1)
      const full = (await one('select admin_get_order($1) as o', [o.id])).o
      expect(full.admin_notes).toBe('VIP')
      expect(full.notifications).toEqual([])
    })
    expect(await stock()).toBe(60)
  })

  it('storage: only admins can write to the media bucket', async () => {
    await as(db, 'authenticated', OTHER_USER, async () => {
      await expect(q("insert into storage.objects (bucket_id, name) values ('media', 'products/x.webp')")).rejects.toThrow(/row-level security/)
    })
    await as(db, 'anon', null, async () => {
      await expect(q("insert into storage.objects (bucket_id, name) values ('media', 'products/x.webp')")).rejects.toThrow()
    })
    await asAdmin(async () => {
      await q("insert into storage.objects (bucket_id, name) values ('media', 'products/x.webp')")
      await expect(q("insert into storage.objects (bucket_id, name) values ('other', 'x')")).rejects.toThrow(/row-level security/)
    })
  })

  it('claim_notification lets only one caller send each (order, kind, channel)', async () => {
    const o = await order()
    const claim = (force = false) => one('select claim_notification($1, $2, $3, $4) as id', [o.id, 'order_confirmed', 'email', force]).then((r) => r.id)
    const first = await claim()
    expect(first).toBeTruthy()
    expect(await claim()).toBeNull() // still pending
    await q("update notifications_log set status = 'sent' where id = $1", [first])
    expect(await claim()).toBeNull() // already sent
    expect(await claim(true)).toBeTruthy() // admin resend
    await q("update notifications_log set status = 'failed' where status = 'pending'")
    await q("delete from notifications_log where status = 'sent'")
    expect(await claim()).toBeTruthy() // a failure can be retried
    await as(db, 'authenticated', ADMIN_USER, async () => {
      await expect(q('select claim_notification($1, $2, $3)', [o.id, 'x', 'email'])).rejects.toThrow(/permission denied/)
    })
  })

  it('community posts: public sees only published ones; only admins write; links must be https', async () => {
    await asAdmin(async () => {
      await q("insert into community_posts (kind, author, quote, is_published) values ('review', 'Ana', 'Love it', true), ('review', 'Draft', 'Hidden', false)")
      await expect(q("insert into community_posts (kind, author) values ('look', 'No media')")).rejects.toThrow(/check constraint/)
      await expect(q("insert into community_posts (kind, author, quote, link_url) values ('review', 'X', 'Y', 'javascript:alert(1)')")).rejects.toThrow(/check constraint/)
    })
    await as(db, 'anon', null, async () => {
      expect((await q('select author from community_posts')).map((r) => r.author)).toEqual(['Ana'])
      await expect(q("insert into community_posts (author, quote) values ('Spam', 'x')")).rejects.toThrow(/permission denied/)
    })
    await as(db, 'authenticated', OTHER_USER, async () => {
      await expect(q("insert into community_posts (author, quote) values ('Spam', 'x')")).rejects.toThrow(/row-level security/)
      await q("update community_posts set quote = 'hacked'")
    })
    expect((await q("select count(*)::int as n from community_posts where quote = 'hacked'"))[0].n).toBe(0)
  })

  it('every public function has an explicit grant (no accidental PUBLIC execute)', async () => {
    const rows = await q(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
       order by 1`)
    expect(rows.map((r) => r.proname)).toEqual(['get_order', 'is_admin', 'is_product_public', 'phone_key', 'submit_gcash_reference'])
  })
})
