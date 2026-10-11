// Real backend: Supabase (Postgres + RLS, Auth, Storage, Edge Functions).
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js'
import { ApiError, toApiError } from './errors.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

const MEDIA_BUCKET = 'media'

async function run(promise) {
  const { data, error } = await promise
  if (error) throw toApiError(error)
  return data
}

async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let payload = null
    try {
      payload = await error.context?.json?.()
    } catch {
      /* not JSON */
    }
    throw new ApiError(payload?.error || 'Could not reach the shop. Please check your connection and try again.', {
      hint: payload?.hint,
      cause: error,
    })
  }
  if (data?.error) throw new ApiError(data.error, { hint: data.hint })
  return data
}

const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name ?? a.created_at).localeCompare(String(b.name ?? b.created_at))
const normalizeProduct = (p) =>
  p && { ...p, variants: [...(p.variants || [])].sort(bySort), images: [...(p.images || [])].sort(bySort) }

// --------------------------------------------------------------- public ---
export const getSettings = () => run(supabase.from('store_settings').select('*').eq('id', 1).single())

export const listCategories = ({ includeInactive = false } = {}) => {
  let q = supabase.from('categories').select('*')
  if (!includeInactive) q = q.eq('is_active', true)
  return run(q.order('sort_order').order('name'))
}

// RLS already hides inactive products / variants from the public; admins
// see everything, so the public pages filter again explicitly.
export async function listProducts({ includeInactive = false } = {}) {
  let q = supabase.from('products').select('*, variants:product_variants(*), images:product_images(*)')
  if (!includeInactive) q = q.eq('is_active', true)
  const rows = await run(q.order('sort_order').order('name'))
  return rows.map((p) => {
    const n = normalizeProduct(p)
    return includeInactive ? n : { ...n, variants: n.variants.filter((v) => v.is_active) }
  })
}

export async function getProduct(slug) {
  const p = await run(
    supabase
      .from('products')
      .select('*, variants:product_variants(*), images:product_images(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle(),
  )
  if (!p) return null
  const n = normalizeProduct(p)
  return { ...n, variants: n.variants.filter((v) => v.is_active) }
}

export const listShippingZones = ({ includeInactive = false } = {}) => {
  let q = supabase.from('shipping_zones').select('*')
  if (!includeInactive) q = q.eq('is_active', true)
  return run(q.order('sort_order').order('name'))
}

// Goes through the create-order edge function, which re-reads prices and
// takes stock inside one database transaction.
export const createOrder = (payload) => invoke('create-order', payload).then((d) => d.order)

export const getOrder = (orderNo, phone) => run(supabase.rpc('get_order', { p_order_no: orderNo, p_phone: phone }))

export const submitGcashReference = (orderNo, phone, reference) =>
  run(supabase.rpc('submit_gcash_reference', { p_order_no: orderNo, p_phone: phone, p_reference: reference }))

// ----------------------------------------------------------------- auth ---
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export const signInWithPassword = (email, password) => run(supabase.auth.signInWithPassword({ email, password }))

export async function signOut() {
  await supabase.auth.signOut()
}

export async function isAdmin() {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return false
  const data = await run(supabase.from('admin_users').select('role').eq('user_id', session.session.user.id).maybeSingle())
  return !!data
}

// ---------------------------------------------------------------- admin ---
export const adminStats = () => run(supabase.rpc('admin_stats'))

export const adminListOrders = ({ status = null, paymentMethod = null, search = null, limit = 50, offset = 0 } = {}) =>
  run(
    supabase.rpc('admin_list_orders', {
      p_status: status || null,
      p_payment_method: paymentMethod || null,
      p_search: search || null,
      p_limit: limit,
      p_offset: offset,
    }),
  )

export const adminGetOrder = (id) => run(supabase.rpc('admin_get_order', { p_order_id: id }))

// Moving to "confirmed" / "shipped" fires the DB trigger → send-order-update.
export const setOrderStatus = (id, status, { courier = null, trackingNo = null, note = null } = {}) =>
  run(
    supabase.rpc('admin_set_order_status', {
      p_order_id: id,
      p_status: status,
      p_courier: courier,
      p_tracking_no: trackingNo,
      p_note: note,
    }),
  )

export const markPaid = (id, reference = null) =>
  run(supabase.rpc('admin_mark_paid', { p_order_id: id, p_reference: reference }))

export const updateTracking = (id, courier, trackingNo) =>
  run(supabase.rpc('admin_update_tracking', { p_order_id: id, p_courier: courier, p_tracking_no: trackingNo }))

export const saveOrderNotes = (id, adminNotes) =>
  run(supabase.from('orders').update({ admin_notes: adminNotes || null }).eq('id', id))

export const resendOrderEmail = (id, kind) => invoke('send-order-update', { order_id: id, kind, force: true })

async function save(table, row) {
  const { id, ...fields } = row
  if (id != null) return run(supabase.from(table).update(fields).eq('id', id).select().single())
  return run(supabase.from(table).insert(fields).select().single())
}
async function remove(table, id) {
  await run(supabase.from(table).delete().eq('id', id))
}

export const saveProduct = (product) => save('products', product)
export const deleteProduct = (id) => remove('products', id)
export const saveVariant = (variant) => save('product_variants', variant)
export const deleteVariant = (id) => remove('product_variants', id)
export const saveProductImage = (image) => save('product_images', image)
export async function deleteProductImage(image) {
  await remove('product_images', image.id)
  if (image.storage_path) await removeImage(image.storage_path).catch(() => {})
}
export const saveCategory = (category) => save('categories', category)
export const deleteCategory = (id) => remove('categories', id)
export const saveShippingZone = (zone) => save('shipping_zones', zone)
export const deleteShippingZone = (id) => remove('shipping_zones', id)

export const updateSettings = (fields) => save('store_settings', { id: 1, ...fields })
export const getPrivateSettings = () => run(supabase.from('store_private').select('*').eq('id', 1).maybeSingle())
export const updatePrivateSettings = (fields) => save('store_private', { id: 1, ...fields })

export async function uploadImage(folder, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  await run(
    supabase.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type }),
  )
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function removeImage(path) {
  if (!path) return
  await run(supabase.storage.from(MEDIA_BUCKET).remove([path]))
}
