import type { OutgoingMessage } from './types.ts'

// The order JSON returned by public._order_json() (the fields we use).
export interface OrderDetails {
  order_no: string
  status: string
  payment_method: 'cod' | 'gcash'
  payment_status: string
  customer: { name: string; phone: string; email: string | null }
  shipping: {
    address_line: string
    barangay: string
    city: string
    province: string
    zip: string | null
    landmark: string | null
    zone_name: string
    eta: string | null
  }
  items: { product_name: string; variant_name: string | null; quantity: number; unit_price: number; line_total: number }[]
  subtotal: number
  shipping_fee: number
  total: number
  gcash_reference: string | null
  courier: string | null
  tracking_no: string | null
  notes: string | null
  created_at: string
}

export interface StoreDetails {
  store_name: string
  currency: string
  contact_email?: string | null
  messenger_id?: string | null
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function money(amount: number, currency = 'PHP') {
  const n = Number(amount)
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n)
  } catch {
    return `${currency} ${n}`
  }
}

const PAYMENT: Record<string, string> = { cod: 'Cash on delivery', gcash: 'GCash' }

// Rose-gold on ivory, black header — matches the site and packaging.
function shell(title: string, body: string, siteUrl?: string) {
  return `<!doctype html><html><body style="margin:0;background:#fbf6f3;font-family:Arial,Helvetica,sans-serif;color:#2a2123">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #f8e7e4;border-radius:14px" cellspacing="0" cellpadding="0">
<tr><td style="background:#121012;padding:22px 24px;border-radius:14px 14px 0 0;text-align:center">
${siteUrl ? `<img src="${esc(siteUrl)}/images/logo-email.png" alt="Kryztal Lumi" width="150" style="display:inline-block;width:150px;height:auto">` : `<span style="color:#e3b0a8;font-family:Georgia,serif;font-size:24px;letter-spacing:3px">KRYZTAL LUMI</span>`}
</td></tr>
<tr><td style="padding:24px 24px 4px;font-family:Georgia,serif;font-size:24px;color:#121012">${esc(title)}</td></tr>
<tr><td style="padding:8px 24px 24px;font-size:15px;line-height:1.55">${body}</td></tr>
</table></td></tr></table></body></html>`
}

function itemsTable(o: OrderDetails, currency: string) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.quantity)} × ${esc(i.product_name)}${i.variant_name ? ` (${esc(i.variant_name)})` : ''}</td><td style="padding:6px 0;text-align:right">${esc(money(i.line_total, currency))}</td></tr>`,
    )
    .join('')
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;font-size:14px;border-top:1px solid #f8e7e4;border-bottom:1px solid #f8e7e4;margin:12px 0">
${rows}
<tr><td style="padding:6px 0;color:#6f6063">Shipping (${esc(o.shipping.zone_name)})</td><td style="padding:6px 0;text-align:right">${Number(o.shipping_fee) === 0 ? 'FREE' : esc(money(o.shipping_fee, currency))}</td></tr>
<tr><td style="padding:8px 0;font-weight:bold">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold">${esc(money(o.total, currency))}</td></tr>
</table>`
}

function addressText(o: OrderDetails) {
  const a = o.shipping
  return `${a.address_line}, Brgy. ${a.barangay}, ${a.city}, ${a.province}${a.zip ? ` ${a.zip}` : ''}${a.landmark ? ` (landmark: ${a.landmark})` : ''}`
}

function button(href: string, label: string) {
  return `<p style="margin:20px 0 4px"><a href="${esc(href)}" style="display:inline-block;background:#121012;color:#fffaf6;text-decoration:none;padding:12px 22px;letter-spacing:2px;font-size:12px;text-transform:uppercase">${esc(label)}</a></p>`
}

const trackUrl = (siteUrl: string | undefined, orderNo: string) =>
  siteUrl ? `${siteUrl.replace(/\/$/, '')}/track?order=${encodeURIComponent(orderNo)}` : null

// To the owner, for every new order.
export function newOrderOwnerMessage(o: OrderDetails, store: StoreDetails, adminUrl?: string): OutgoingMessage {
  const pay =
    o.payment_method === 'gcash'
      ? `GCash — ${o.gcash_reference ? `reference ${o.gcash_reference} to verify` : 'waiting for payment'}`
      : 'Cash on delivery'
  const text =
    `New order ${o.order_no}: ${o.customer.name} (${o.customer.phone}) — ` +
    o.items.map((i) => `${i.quantity}× ${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ''}`).join(', ') +
    `. Total ${money(o.total, store.currency)}, ${pay}. Ship to ${addressText(o)}.` +
    (adminUrl ? ` Open: ${adminUrl}` : '')
  const html = shell(
    `New order ${o.order_no}`,
    `<p><strong>${esc(o.customer.name)}</strong> · <a href="tel:${esc(o.customer.phone.replace(/[^\d+]/g, ''))}">${esc(o.customer.phone)}</a>${o.customer.email ? ` · ${esc(o.customer.email)}` : ''}</p>
${itemsTable(o, store.currency)}
<p style="font-size:14px"><strong>Payment:</strong> ${esc(pay)}</p>
<p style="font-size:14px"><strong>Ship to:</strong> ${esc(addressText(o))}</p>
${o.notes ? `<p style="font-size:14px"><strong>Notes:</strong> ${esc(o.notes)}</p>` : ''}
${adminUrl ? button(adminUrl, 'Open in dashboard') : ''}`,
  )
  return { subject: `New order ${o.order_no} — ${o.customer.name}, ${money(o.total, store.currency)}`, text, html }
}

// To the customer when the owner confirms the order (or the GCash payment).
export function orderConfirmedMessage(o: OrderDetails, store: StoreDetails, siteUrl?: string): OutgoingMessage {
  const first = o.customer.name.split(' ')[0]
  const track = trackUrl(siteUrl, o.order_no)
  const payLine =
    o.payment_method === 'cod'
      ? `Please prepare ${money(o.total, store.currency)} in cash for the courier.`
      : 'We received your GCash payment — thank you!'
  const text =
    `Hi ${first}! Your ${store.store_name} order ${o.order_no} is confirmed. ${payLine} ` +
    `We'll let you know when it ships.${track ? ` Track it: ${track}` : ''}`
  const html = shell(
    'Your order is confirmed ✨',
    `<p>Hi ${esc(first)},</p>
<p>Thank you for your order! Order <strong>${esc(o.order_no)}</strong> is confirmed and we're getting it ready.</p>
${itemsTable(o, store.currency)}
<p style="font-size:14px"><strong>Payment:</strong> ${esc(PAYMENT[o.payment_method])}. ${esc(payLine)}</p>
<p style="font-size:14px"><strong>Delivering to:</strong> ${esc(addressText(o))}</p>
${track ? button(track, 'Track your order') : ''}
<p style="color:#6f6063;font-size:13px">With love,<br>${esc(store.store_name)}</p>`,
    siteUrl,
  )
  return { subject: `Order ${o.order_no} confirmed — ${store.store_name}`, text, html }
}

// To the customer when the order ships (courier + tracking number).
export function orderShippedMessage(o: OrderDetails, store: StoreDetails, siteUrl?: string): OutgoingMessage {
  const first = o.customer.name.split(' ')[0]
  const track = trackUrl(siteUrl, o.order_no)
  const text =
    `Hi ${first}! Your ${store.store_name} order ${o.order_no} has shipped via ${o.courier}, tracking no. ${o.tracking_no}.` +
    (o.shipping.eta ? ` Usually arrives in ${o.shipping.eta}.` : '') +
    (o.payment_method === 'cod' && o.payment_status !== 'paid' ? ` Please prepare ${money(o.total, store.currency)} for the courier.` : '') +
    (track ? ` Track: ${track}` : '')
  const html = shell(
    'Your glow is on its way ✨',
    `<p>Hi ${esc(first)},</p>
<p>Order <strong>${esc(o.order_no)}</strong> has shipped!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;font-size:14px;background:#fff6f7;border-radius:8px;margin:12px 0">
<tr><td style="padding:10px 14px;color:#6f6063">Courier</td><td style="padding:10px 14px;font-weight:bold">${esc(o.courier)}</td></tr>
<tr><td style="padding:10px 14px;color:#6f6063">Tracking no.</td><td style="padding:10px 14px;font-weight:bold;font-family:monospace">${esc(o.tracking_no)}</td></tr>
${o.shipping.eta ? `<tr><td style="padding:10px 14px;color:#6f6063">Delivery</td><td style="padding:10px 14px">usually ${esc(o.shipping.eta)}</td></tr>` : ''}
</table>
${o.payment_method === 'cod' && o.payment_status !== 'paid' ? `<p style="font-size:14px">Please prepare <strong>${esc(money(o.total, store.currency))}</strong> in cash for the courier.</p>` : ''}
${track ? button(track, 'Track your order') : ''}
<p style="color:#6f6063;font-size:13px">With love,<br>${esc(store.store_name)}</p>`,
    siteUrl,
  )
  return { subject: `Order ${o.order_no} has shipped — ${store.store_name}`, text, html }
}
