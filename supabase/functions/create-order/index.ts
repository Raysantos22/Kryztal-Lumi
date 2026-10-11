// POST /functions/v1/create-order
// Body: { items: [{ product_id, variant_id?, quantity }], customer: { name, phone,
//         email?, address_line, barangay, city, province, zip?, landmark? },
//         payment_method: 'cod'|'gcash', gcash_reference?, shipping_zone_id?, notes? }
//
// Guests call this with just the anon key. The real work — re-reading
// prices, shipping and free-shipping rules, taking stock atomically and
// enforcing the per-phone cap — happens in public.create_order(), in one
// transaction. Nothing the browser computed (prices, totals) is trusted.
//
// TODO(captcha): verify a Cloudflare Turnstile token here before calling
// create_order (see TODO_FOR_CLIENT.md).
import { json, preflight } from '../_shared/http.ts'
import { adminClient } from '../_shared/supabase.ts'
import { loadOrder, validateOrderPayload, type OrderPayload } from '../_shared/orders.ts'
import { notify } from '../_shared/notifications/index.ts'
import { newOrderOwnerMessage } from '../_shared/notifications/templates.ts'

const FRIENDLY = new Set(['invalid_input', 'invalid_items', 'out_of_stock', 'below_minimum', 'too_many_pending', 'not_found'])

// Email the owner about the new order (best effort, logged).
async function notifyOwner(db: ReturnType<typeof adminClient>, orderId: string) {
  const loaded = await loadOrder(db, orderId)
  if (!loaded) return
  const ownerEmail = loaded.notifyEmail || Deno.env.get('OWNER_NOTIFY_EMAIL') || null
  const ownerPhone = Deno.env.get('OWNER_NOTIFY_PHONE') || null
  const siteUrl = Deno.env.get('SITE_URL')
  const message = newOrderOwnerMessage(loaded.order, loaded.store, siteUrl ? `${siteUrl.replace(/\/$/, '')}/admin/orders/${orderId}` : undefined)
  const results = await notify({ name: loaded.store.store_name, email: ownerEmail, phone: ownerPhone }, message)
  if (results.length) {
    await db.from('notifications_log').insert(
      results.map((r) => ({
        order_id: orderId,
        channel: r.channel,
        kind: 'owner_new_order',
        recipient: r.recipient,
        status: r.status,
        error: r.error ?? null,
      })),
    )
  }
}

Deno.serve(async (req) => {
  const early = preflight(req)
  if (early) return early

  let payload: OrderPayload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }
  const invalid = validateOrderPayload(payload)
  if (invalid) return json({ error: invalid, hint: 'invalid_input' }, 400)

  const db = adminClient()
  const { data, error } = await db.rpc('create_order', {
    p_items: payload.items,
    p_customer: payload.customer,
    p_payment_method: payload.payment_method,
    p_gcash_reference: payload.gcash_reference ?? null,
    p_shipping_zone_id: payload.shipping_zone_id ?? null,
    p_notes: payload.notes ?? null,
  })

  if (error) {
    if (error.hint && FRIENDLY.has(error.hint)) {
      const status = error.hint === 'out_of_stock' ? 409 : error.hint === 'too_many_pending' ? 429 : 400
      return json({ error: error.message, hint: error.hint }, status)
    }
    // Deadlock / serialization failure under heavy concurrency: ask to retry.
    if (error.code === '40P01' || error.code === '40001') {
      return json({ error: 'Lots of orders at once — please try again in a moment.', hint: 'out_of_stock' }, 409)
    }
    console.error('create_order failed', error)
    return json({ error: 'Sorry, we could not place your order. Please try again or message us.' }, 500)
  }

  try {
    await notifyOwner(db, data.id)
  } catch (e) {
    console.error('owner notification failed', e)
  }

  return json({ order: data }, 201)
})
