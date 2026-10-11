// POST /functions/v1/send-order-update   Body: { order_id, kind, force? }
//   kind: "order_confirmed" | "order_shipped"
//
// Called by the orders_notify_update DB trigger (pg_net, with the shared
// NOTIFY_WEBHOOK_SECRET) when an order becomes confirmed or shipped, and by
// the dashboard's "Resend email" button (admin JWT, force = true).
// Emails the customer if they gave an email (and texts them if SMS is
// enabled). Each channel is first claimed atomically with
// claim_notification() (a "pending" log row), so overlapping calls never
// both send; the row is then updated with the outcome. `force` (the
// admin's Resend button) always sends.
import { bearerToken, json, preflight, safeEqual, UUID_RE } from '../_shared/http.ts'
import { adminClient, isServiceRoleToken, userFromToken } from '../_shared/supabase.ts'
import { loadOrder } from '../_shared/orders.ts'
import { enabledProviders, notify, type Channel } from '../_shared/notifications/index.ts'
import { orderConfirmedMessage, orderShippedMessage } from '../_shared/notifications/templates.ts'

const KINDS = { order_confirmed: 'confirmed', order_shipped: 'shipped' } as const
type Kind = keyof typeof KINDS
// Statuses at or after the one the message is about.
const LATER: Record<string, string[]> = {
  confirmed: ['confirmed', 'packed', 'shipped', 'delivered'],
  shipped: ['shipped', 'delivered'],
}

Deno.serve(async (req) => {
  const early = preflight(req)
  if (early) return early

  let body: { order_id?: unknown; kind?: unknown; force?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }
  if (typeof body.order_id !== 'string' || !UUID_RE.test(body.order_id)) return json({ error: 'order_id required' }, 400)
  if (typeof body.kind !== 'string' || !(body.kind in KINDS)) return json({ error: 'Unknown kind' }, 400)
  const orderId = body.order_id
  const kind = body.kind as Kind

  const db = adminClient()

  // Authorise: the DB trigger (shared webhook secret), the service role, or an admin.
  const token = bearerToken(req)
  const webhookSecret = Deno.env.get('NOTIFY_WEBHOOK_SECRET')
  const fromTrigger = !!webhookSecret && safeEqual(req.headers.get('x-webhook-secret'), webhookSecret)
  if (!fromTrigger && !isServiceRoleToken(token)) {
    const user = await userFromToken(db, token)
    if (!user) return json({ error: 'Not authorised' }, 401)
    const { data: admin } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!admin) return json({ error: 'Not authorised' }, 403)
  }

  const loaded = await loadOrder(db, orderId)
  if (!loaded) return json({ error: 'Order not found' }, 404)
  const { order, store } = loaded
  if (!LATER[KINDS[kind]].includes(order.status)) {
    return json({ error: `Order is ${order.status}; nothing to send for ${kind}.` }, 409)
  }

  // Claim each enabled channel; channels someone else already sent (or is
  // sending) are skipped.
  const claims = new Map<Channel, string>()
  const skipChannels = new Set<Channel>()
  for (const p of enabledProviders()) {
    const { data: claimId, error } = await db.rpc('claim_notification', {
      p_order_id: orderId,
      p_kind: kind,
      p_channel: p.channel,
      p_force: body.force === true,
    })
    if (error) {
      console.error('claim_notification failed', error)
      skipChannels.add(p.channel)
    } else if (claimId) claims.set(p.channel, claimId as string)
    else skipChannels.add(p.channel)
  }

  const siteUrl = Deno.env.get('SITE_URL') || undefined
  const message = kind === 'order_shipped' ? orderShippedMessage(order, store, siteUrl) : orderConfirmedMessage(order, store, siteUrl)
  const results = await notify({ name: order.customer.name, email: order.customer.email, phone: order.customer.phone }, message, {
    skipChannels,
  })

  for (const r of results) {
    const id = claims.get(r.channel)
    if (!id) continue
    const { error } = await db
      .from('notifications_log')
      .update({ recipient: r.recipient, status: r.status, error: r.error ?? null, sent_at: new Date().toISOString() })
      .eq('id', id)
    if (error) console.error('notifications_log update failed', error)
  }

  return json({ ok: true, results })
})
