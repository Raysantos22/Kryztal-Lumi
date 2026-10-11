// Unit tests for the edge-function helpers (no network — fetch is stubbed).
// Run: npm run test:functions
import { assert, assertEquals, assertMatch, assertStringIncludes } from 'jsr:@std/assert@1'
import { toE164 } from '../_shared/notifications/phone.ts'
import { enabledProviders, notify } from '../_shared/notifications/index.ts'
import { resendEmail, twilioSms } from '../_shared/notifications/providers.ts'
import { newOrderOwnerMessage, orderConfirmedMessage, orderReceivedMessage, orderShippedMessage, type OrderDetails } from '../_shared/notifications/templates.ts'
import type { NotificationProvider } from '../_shared/notifications/types.ts'
import { validateOrderPayload } from '../_shared/orders.ts'

const order: OrderDetails = {
  order_no: 'KL-24A7F3',
  status: 'shipped',
  payment_method: 'cod',
  payment_status: 'unpaid',
  customer: { name: 'Maria <script> Santos', phone: '0917 123 4567', email: 'maria@example.com' },
  shipping: {
    address_line: '12 Sampaguita St.',
    barangay: 'San Antonio',
    city: 'Pasig City',
    province: 'Metro Manila',
    zip: '1600',
    landmark: 'Near the chapel',
    zone_name: 'Metro Manila',
    eta: '2–3 days',
  },
  items: [{ product_name: 'Crystal Blush', variant_name: null, quantity: 2, unit_price: 399, line_total: 798 }],
  subtotal: 798,
  shipping_fee: 100,
  total: 898,
  gcash_reference: null,
  courier: 'J&T Express',
  tracking_no: 'JT0001234567',
  notes: 'Leave with the guard',
  created_at: '2026-10-11T09:00:00Z',
}
const store = { store_name: 'Kryztal Lumi', currency: 'PHP' }

Deno.test('toE164 normalises Philippine numbers', () => {
  assertEquals(toE164('0917 123 4567', '63'), '+639171234567')
  assertEquals(toE164('+63 917 123 4567', '63'), '+639171234567')
  assertEquals(toE164('639171234567', '63'), '+639171234567')
  assertEquals(toE164('12', '63'), null)
  assertEquals(toE164(null), null)
})

Deno.test('owner message: customer, items, total, address, payment, admin link; HTML escaped', () => {
  const m = newOrderOwnerMessage(order, store, 'https://kryztallumi.example/admin/orders/1')
  assertStringIncludes(m.subject, 'KL-24A7F3')
  assertMatch(m.subject, /₱898|PHP\s?898/)
  assertStringIncludes(m.text, '0917 123 4567')
  assertStringIncludes(m.text, '2× Crystal Blush')
  assertStringIncludes(m.text, 'Cash on delivery')
  assertStringIncludes(m.text, 'Brgy. San Antonio, Pasig City, Metro Manila 1600')
  assertStringIncludes(m.text, 'https://kryztallumi.example/admin/orders/1')
  assert(m.html && !m.html.includes('<script>'), 'customer name must be escaped')
  assertStringIncludes(m.html!, 'Maria &lt;script&gt; Santos')
  assertStringIncludes(m.html!, 'Leave with the guard')
})

Deno.test('owner message flags GCash references to verify', () => {
  const m = newOrderOwnerMessage({ ...order, payment_method: 'gcash', gcash_reference: '1012345678901' }, store)
  assertStringIncludes(m.text, 'reference 1012345678901 to verify')
})

Deno.test('confirmed message: COD reminder and tracking link', () => {
  const m = orderConfirmedMessage({ ...order, status: 'confirmed' }, store, 'https://kryztallumi.example')
  assertStringIncludes(m.subject, 'Order KL-24A7F3 confirmed')
  assertMatch(m.text, /prepare (₱898|PHP\s?898) in cash/)
  assertStringIncludes(m.text, 'https://kryztallumi.example/track?order=KL-24A7F3')
  assertStringIncludes(m.html!, 'logo-email.png')
  const paid = orderConfirmedMessage({ ...order, payment_method: 'gcash', payment_status: 'paid' }, store)
  assertStringIncludes(paid.text, 'received your GCash payment')
})

Deno.test('shipped message: courier + tracking number + ETA', () => {
  const m = orderShippedMessage(order, store, 'https://kryztallumi.example')
  assertStringIncludes(m.text, 'shipped via J&T Express, tracking no. JT0001234567')
  assertStringIncludes(m.text, 'Usually arrives in 2–3 days')
  assertStringIncludes(m.html!, 'J&amp;T Express')
  const paid = orderShippedMessage({ ...order, payment_method: 'gcash', payment_status: 'paid' }, store)
  assert(!paid.text.includes('prepare'))
})

function fakeProvider(channel: 'email' | 'sms', opts: { configured?: boolean; fail?: boolean } = {}) {
  const sent: string[] = []
  const p: NotificationProvider = {
    channel,
    isConfigured: () => opts.configured ?? true,
    addressFor: (r) => (channel === 'email' ? (r.email ?? null) : (r.phone ?? null)),
    send: (address) => {
      if (opts.fail) return Promise.reject(new Error('boom'))
      sent.push(address)
      return Promise.resolve()
    },
  }
  return { p, sent }
}

Deno.test('notify reports sent / failed / skipped without throwing', async () => {
  const email = fakeProvider('email')
  const sms = fakeProvider('sms', { fail: true })
  const results = await notify({ name: 'M', email: 'm@example.com', phone: '+639171234567' }, { subject: 's', text: 't' }, {
    providers: [email.p, sms.p],
  })
  assertEquals(email.sent, ['m@example.com'])
  assertEquals(results.map((r) => [r.channel, r.status]), [['email', 'sent'], ['sms', 'failed']])
  const none = await notify({ name: 'M', email: null }, { subject: 's', text: 't' }, { providers: [fakeProvider('email').p] })
  assertEquals(none, [{ channel: 'email', recipient: null, status: 'skipped', error: 'No address for this recipient' }])
})

Deno.test('notify skips unconfigured and already-sent channels', async () => {
  const email = fakeProvider('email', { configured: false })
  const sms = fakeProvider('sms')
  const results = await notify({ name: 'M', email: 'm@example.com', phone: '+639171234567' }, { subject: 's', text: 't' }, {
    providers: [email.p, sms.p],
    skipChannels: new Set(['sms']),
  })
  assertEquals(results, [{ channel: 'email', recipient: 'm@example.com', status: 'skipped', error: 'Channel not configured' }])
  assertEquals(sms.sent, [])
})

Deno.test('SMS (Twilio) is off unless NOTIFY_CHANNELS includes it', () => {
  Deno.env.delete('NOTIFY_CHANNELS')
  assertEquals(enabledProviders().map((p) => p.channel), ['email'])
  assertEquals(enabledProviders(undefined, 'email, sms').map((p) => p.channel), ['email', 'sms'])
})

Deno.test('Resend and Twilio send the right HTTP requests', async () => {
  Deno.env.set('RESEND_API_KEY', 're_test')
  Deno.env.set('RESEND_FROM', 'Kryztal Lumi <orders@example.com>')
  Deno.env.set('TWILIO_ACCOUNT_SID', 'AC123')
  Deno.env.set('TWILIO_AUTH_TOKEN', 'tok')
  Deno.env.set('TWILIO_FROM', '+15550001111')
  const calls: { url: string; init: RequestInit }[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = ((url: string, init: RequestInit) => {
    calls.push({ url: String(url), init })
    return Promise.resolve(new Response('{}', { status: 200 }))
  }) as typeof fetch
  try {
    assert(resendEmail.isConfigured())
    assert(twilioSms.isConfigured())
    await resendEmail.send('maria@example.com', { subject: 'Hi', text: 'Body', html: '<p>Body</p>' })
    await twilioSms.send('+639171234567', { subject: 'Hi', text: 'Body' })
  } finally {
    globalThis.fetch = realFetch
  }
  assertEquals(calls[0].url, 'https://api.resend.com/emails')
  assertEquals((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer re_test')
  assertEquals(JSON.parse(String(calls[0].init.body)).to, ['maria@example.com'])
  assertEquals(calls[1].url, 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json')
  assertEquals((calls[1].init.body as URLSearchParams).get('To'), '+639171234567')
})

Deno.test('provider errors surface the HTTP status', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = (() => Promise.resolve(new Response('bad key', { status: 401 }))) as typeof fetch
  try {
    let message = ''
    try {
      await resendEmail.send('a@b.co', { subject: 's', text: 't' })
    } catch (e) {
      message = (e as Error).message
    }
    assertStringIncludes(message, 'Resend responded 401')
  } finally {
    globalThis.fetch = realFetch
  }
})

Deno.test('create-order payload validation', () => {
  const ok = {
    items: [{ product_id: 'c0000000-0000-4000-8000-000000000001', quantity: 1 }],
    customer: { name: 'Maria', phone: '09171234567', address_line: 'x', barangay: 'y', city: 'z', province: 'Cebu' },
    payment_method: 'cod',
  }
  assertEquals(validateOrderPayload(ok), null)
  assertEquals(validateOrderPayload({ ...ok, items: [] }), 'Your bag is empty.')
  assertEquals(validateOrderPayload({ ...ok, items: [{ product_id: 'nope', quantity: 1 }] }), 'Invalid item in bag.')
  assertEquals(validateOrderPayload({ ...ok, items: [{ product_id: ok.items[0].product_id, quantity: 1.5 }] }), 'Invalid quantity.')
  assertEquals(validateOrderPayload({ ...ok, items: [{ product_id: ok.items[0].product_id, quantity: 0 }] }), 'Invalid quantity.')
  assertEquals(validateOrderPayload({ ...ok, items: Array(21).fill(ok.items[0]) }), 'Too many different items in one order (max 20).')
  assertEquals(validateOrderPayload({ ...ok, payment_method: 'card' }), 'Please choose a payment method.')
  assertEquals(validateOrderPayload({ ...ok, customer: { ...ok.customer, name: 'x'.repeat(101) } }), 'Invalid name.')
  assertEquals(validateOrderPayload({ ...ok, customer: { ...ok.customer, city: 5 } }), 'Invalid city.')
  assertEquals(validateOrderPayload({ ...ok, shipping_zone_id: 'zone' }), 'Invalid shipping zone.')
  assertEquals(validateOrderPayload({ ...ok, notes: 'x'.repeat(501) }), 'Notes are too long.')
  // Prices sent by the browser are simply ignored (never read).
  assertEquals(validateOrderPayload({ ...ok, items: [{ ...ok.items[0], price: 1 }] } as never), null)
})

Deno.test('order received email: order number, COD amount, address and tracking link', () => {
  const m = orderReceivedMessage({ ...order, status: 'new' }, store, 'https://kryztallumi.example')
  assertStringIncludes(m.subject, 'Order KL-24A7F3 received')
  assertMatch(m.text, /prepare (₱898|PHPs?898) in cash for the rider/)
  assertStringIncludes(m.text, 'https://kryztallumi.example/track?order=KL-24A7F3')
  assertStringIncludes(m.html!, 'Brgy. San Antonio')
  assert(!m.html!.includes('<script>'))
})
