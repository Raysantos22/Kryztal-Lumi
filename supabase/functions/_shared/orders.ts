import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { OrderDetails, StoreDetails } from './notifications/templates.ts'
import { UUID_RE } from './http.ts'

// Load an order (admin shape) + the store details used in messages.
export async function loadOrder(
  db: SupabaseClient,
  orderId: string,
): Promise<{ order: OrderDetails & { id: string }; store: StoreDetails; notifyEmail: string | null } | null> {
  const [{ data: rows, error }, { data: store }, { data: priv }] = await Promise.all([
    db.rpc('_order_json', { p_order_id: orderId, p_admin: true }),
    db.from('store_settings').select('store_name, currency, contact_email, messenger_id').eq('id', 1).maybeSingle(),
    db.from('store_private').select('notify_email').eq('id', 1).maybeSingle(),
  ])
  if (error) throw error
  if (!rows) return null
  return {
    order: rows as OrderDetails & { id: string },
    store: (store as StoreDetails) ?? { store_name: 'Kryztal Lumi', currency: 'PHP' },
    notifyEmail: (priv as { notify_email: string | null } | null)?.notify_email ?? null,
  }
}

// ------------------------------------------------------------ validation ---
// Shape checks before calling create_order() (which re-validates everything
// against the database). Returns an error message or null.
export interface OrderPayload {
  items?: unknown
  customer?: Record<string, unknown>
  payment_method?: unknown
  gcash_reference?: unknown
  shipping_zone_id?: unknown
  notes?: unknown
}

const CUSTOMER_LIMITS: Record<string, number> = {
  name: 100,
  phone: 30,
  email: 254,
  address_line: 200,
  barangay: 100,
  city: 100,
  province: 100,
  zip: 10,
  landmark: 200,
}

export function validateOrderPayload(p: OrderPayload): string | null {
  if (!p || typeof p !== 'object') return 'Invalid request.'
  if (!Array.isArray(p.items) || p.items.length === 0) return 'Your bag is empty.'
  if (p.items.length > 20) return 'Too many different items in one order (max 20).'
  for (const it of p.items as Record<string, unknown>[]) {
    if (!it || typeof it !== 'object') return 'Invalid item in bag.'
    if (typeof it.product_id !== 'string' || !UUID_RE.test(it.product_id)) return 'Invalid item in bag.'
    if (it.variant_id != null && (typeof it.variant_id !== 'string' || !UUID_RE.test(it.variant_id))) return 'Invalid item in bag.'
    if (!Number.isInteger(it.quantity) || (it.quantity as number) < 1 || (it.quantity as number) > 100) return 'Invalid quantity.'
  }
  const c = p.customer
  if (!c || typeof c !== 'object') return 'Please enter your details.'
  for (const [key, max] of Object.entries(CUSTOMER_LIMITS)) {
    const v = c[key]
    if (v != null && (typeof v !== 'string' || v.length > max)) return `Invalid ${key.replace('_', ' ')}.`
  }
  if (typeof c.name !== 'string' || typeof c.phone !== 'string') return 'Please enter your name and mobile number.'
  if (p.payment_method !== 'cod' && p.payment_method !== 'gcash') return 'Please choose a payment method.'
  if (p.gcash_reference != null && (typeof p.gcash_reference !== 'string' || p.gcash_reference.length > 40)) return 'Invalid GCash reference.'
  if (p.shipping_zone_id != null && (typeof p.shipping_zone_id !== 'string' || !UUID_RE.test(p.shipping_zone_id))) return 'Invalid shipping zone.'
  if (p.notes != null && (typeof p.notes !== 'string' || p.notes.length > 500)) return 'Notes are too long.'
  return null
}
