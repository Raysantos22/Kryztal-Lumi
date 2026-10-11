// DEMO backend: a real Postgres (PGlite, compiled to WASM) running inside the
// browser with the exact same migrations + seed as Supabase. Pricing, stock,
// shipping rules, anti-spam and expiry therefore behave exactly as in
// production — only auth, file storage and outgoing emails are simulated.
// Data persists in IndexedDB per browser; "Reset demo data" in /admin wipes it.
import { PGlite } from '@electric-sql/pglite'
import stubsSql from './demo/supabase-stubs.sql?raw'
import seedSql from '../../../supabase/seed.sql?raw'
import { DEMO_ADMIN } from '../config.js'
import { ApiError, toApiError } from './errors.js'

const migrationFiles = import.meta.glob('../../../supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const DB_NAME = 'idb://kryztal-lumi-demo-v1'
const DEMO_ADMIN_ID = 'dddddddd-0000-4000-8000-000000000001'
const SESSION_KEY = 'kl-demo-session'

// Match PostgREST's JSON shapes: dates as strings, numerics as numbers.
const parsers = {
  1082: (v) => v, // date
  1114: (v) => v, // timestamp
  1184: (v) => new Date(v.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')).toISOString(), // timestamptz
  1083: (v) => v, // time
  1700: (v) => (v === null ? null : Number(v)), // numeric
}

let dbPromise = null

async function openDb() {
  let db
  try {
    db = await PGlite.create(DB_NAME, { parsers })
  } catch (e) {
    console.warn('PGlite IndexedDB unavailable, using in-memory demo database', e)
    db = await PGlite.create({ parsers })
  }
  const { rows } = await db.query("select to_regclass('public.store_settings') is not null as ready")
  if (!rows[0].ready) await initSchema(db)
  // Unpaid GCash orders get tidied on load (pg_cron's job in production).
  await db.query('select public.expire_unpaid_orders()')
  await flush(db)
  return db
}

async function initSchema(db) {
  await db.exec(stubsSql)
  for (const f of Object.keys(migrationFiles).sort()) await db.exec(migrationFiles[f])
  await db.exec(seedSql)
  await db.query('insert into auth.users (id, email) values ($1, $2) on conflict do nothing', [DEMO_ADMIN_ID, DEMO_ADMIN.email])
  await db.query(`insert into public.admin_users (user_id, role) values ($1, 'owner') on conflict do nothing`, [DEMO_ADMIN_ID])
}

function getDb() {
  if (!dbPromise) dbPromise = openDb()
  return dbPromise
}

// Statements that change data must be flushed to IndexedDB straight away:
// PGlite does not persist on commit, so a write followed by a page
// navigation would otherwise be lost.
const WRITE_SQL =
  /^\s*(insert|update|delete)\b|\b(create_order|submit_gcash_reference|admin_set_stock|admin_set_order_status|admin_mark_paid|admin_update_tracking|expire_unpaid_orders)\(/i

async function flush(db) {
  try {
    await db.syncToFs()
  } catch (e) {
    console.warn('Demo database could not be saved to this browser', e)
  }
}

// Run a query with auth.uid() set to the demo session's user (if any).
async function q(sql, params = []) {
  const db = await getDb()
  let rows
  try {
    rows = await db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [currentSession()?.user.id ?? ''])
      const res = await tx.query(sql, params)
      return res.rows
    })
  } catch (e) {
    throw toApiError(e)
  }
  if (WRITE_SQL.test(sql)) await flush(db)
  return rows
}
const one = async (sql, params) => (await q(sql, params))[0] ?? null
const rpc = async (sql, params) => Object.values((await one(sql, params)) ?? {})[0] ?? null

const IDENT = /^[a-z_][a-z0-9_]*$/
const JSON_COLUMNS = new Set(['faq', 'specs'])
function toParam(key, v) {
  if (v === undefined) return null
  if (JSON_COLUMNS.has(key)) return JSON.stringify(v)
  if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) return JSON.stringify(v)
  return v
}

// The demo session is the admin; mirror RLS by refusing writes otherwise.
async function requireAdmin() {
  if (!(await isAdmin())) throw new ApiError('You do not have permission to do that.', { code: '42501' })
}

async function save(table, row, { idColumn = 'id' } = {}) {
  await requireAdmin()
  const { [idColumn]: id, ...fields } = row
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined)
  keys.forEach((k) => {
    if (!IDENT.test(k)) throw new ApiError(`Invalid field ${k}`)
  })
  const values = keys.map((k) => toParam(k, fields[k]))
  if (id != null) {
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    return one(`update public.${table} set ${sets} where ${idColumn} = $1 returning *`, [id, ...values])
  }
  const cols = keys.join(', ')
  const ph = keys.map((_, i) => `$${i + 1}`).join(', ')
  return one(`insert into public.${table} (${cols}) values (${ph}) returning *`, values)
}

async function remove(table, id) {
  await requireAdmin()
  await q(`delete from public.${table} where id = $1`, [id])
}

// --------------------------------------------------------------- public ---
export const getSettings = () => one('select * from public.store_settings where id = 1')

export const listCategories = ({ includeInactive = false } = {}) =>
  q(`select * from public.categories ${includeInactive ? '' : 'where is_active'} order by sort_order, name`)

const PRODUCT_SELECT = (variantFilter) => `
  select p.*,
         coalesce((select json_agg(v order by v.sort_order, v.name) from public.product_variants v
                    where v.product_id = p.id ${variantFilter}), '[]') as variants,
         coalesce((select json_agg(i order by i.sort_order, i.created_at) from public.product_images i
                    where i.product_id = p.id), '[]') as images
    from public.products p`

export const listProducts = ({ includeInactive = false } = {}) =>
  q(
    `${PRODUCT_SELECT(includeInactive ? '' : 'and v.is_active')}
     ${includeInactive ? '' : 'where p.is_active'}
     order by p.sort_order, p.name`,
  )

export const getProduct = (slug) =>
  one(`${PRODUCT_SELECT('and v.is_active')} where p.slug = $1 and p.is_active`, [slug])

export const listShippingZones = ({ includeInactive = false } = {}) =>
  q(`select * from public.shipping_zones ${includeInactive ? '' : 'where is_active'} order by sort_order, name`)

// Same call the create-order edge function makes with the service role,
// followed by the owner alert (logged as "skipped" in demo mode).
export async function createOrder(payload) {
  const order = await rpc('select public.create_order($1, $2, $3, $4, $5, $6) as o', [
    JSON.stringify(payload.items ?? []),
    JSON.stringify(payload.customer ?? {}),
    payload.payment_method ?? null,
    payload.gcash_reference || null,
    payload.shipping_zone_id || null,
    payload.notes || null,
  ])
  await q(
    `insert into public.notifications_log (order_id, channel, kind, recipient, status, error)
     select $1, 'email', 'owner_new_order', notify_email, 'skipped', 'Demo mode — no email actually sent'
       from public.store_private where id = 1`,
    [order.id],
  )
  return order
}

export const getOrder = (orderNo, phone) => rpc('select public.get_order($1, $2)', [orderNo, phone])

export const submitGcashReference = (orderNo, phone, reference) =>
  rpc('select public.submit_gcash_reference($1, $2, $3)', [orderNo, phone, reference])

// ----------------------------------------------------------------- auth ---
const listeners = new Set()

function currentSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function setSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage blocked — session lasts for this page only */
  }
  listeners.forEach((cb) => cb(session))
}

export async function getSession() {
  return currentSession()
}

export function onAuthChange(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export async function signInWithPassword(email, password) {
  if (email.trim().toLowerCase() !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) {
    throw new ApiError(`Demo mode: sign in with ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`)
  }
  const session = { user: { id: DEMO_ADMIN_ID, email: DEMO_ADMIN.email }, demo: true }
  setSession(session)
  return { session }
}

export async function signOut() {
  setSession(null)
}

export async function isAdmin() {
  if (!currentSession()) return false
  return !!(await one('select public.is_admin() as ok'))?.ok
}

// ---------------------------------------------------------------- admin ---
export const adminStats = () => rpc('select public.admin_stats()')

export const adminListOrders = ({ status = null, paymentMethod = null, search = null, limit = 50, offset = 0 } = {}) =>
  rpc('select public.admin_list_orders($1, $2, $3, $4, $5)', [status || null, paymentMethod || null, search || null, limit, offset])

export const adminGetOrder = (id) => rpc('select public.admin_get_order($1)', [id])

// Production: the status change fires the send-order-update edge function.
// Demo: record what would have been sent.
async function logDemoCustomerEmail(orderId, kind) {
  await q(
    `insert into public.notifications_log (order_id, channel, kind, recipient, status, error)
     select id, 'email', $2, customer_email,
            'skipped', case when customer_email is null then 'No email for this customer'
                            else 'Demo mode — no email actually sent' end
       from public.orders where id = $1`,
    [orderId, kind],
  )
}

export async function setOrderStatus(id, status, { courier = null, trackingNo = null, note = null } = {}) {
  const order = await rpc('select public.admin_set_order_status($1, $2, $3, $4, $5)', [id, status, courier, trackingNo, note])
  if (status === 'confirmed' || status === 'shipped') await logDemoCustomerEmail(id, `order_${status}`)
  return order
}

export async function markPaid(id, reference = null) {
  const order = await rpc('select public.admin_mark_paid($1, $2)', [id, reference])
  await logDemoCustomerEmail(id, 'order_confirmed')
  return order
}

export const updateTracking = (id, courier, trackingNo) =>
  rpc('select public.admin_update_tracking($1, $2, $3)', [id, courier, trackingNo])

export async function saveOrderNotes(id, adminNotes) {
  await requireAdmin()
  await q('update public.orders set admin_notes = $2 where id = $1', [id, adminNotes || null])
}

export async function resendOrderEmail(id, kind) {
  await requireAdmin()
  await logDemoCustomerEmail(id, kind)
  return { ok: true, demo: true }
}

// Compare-and-set: refuses if stock changed since the form loaded it.
export const setStock = (productId, variantId, expected, next) =>
  rpc('select public.admin_set_stock($1, $2, $3, $4)', [productId, variantId || null, expected, next])

export const saveProduct = (product) => save('products', product)
export const deleteProduct = (id) => remove('products', id)
export const saveVariant = (variant) => save('product_variants', variant)
export const deleteVariant = (id) => remove('product_variants', id)
export const saveProductImage = (image) => save('product_images', image)
export const deleteProductImage = (image) => remove('product_images', image.id)
export const saveCategory = (category) => save('categories', category)
export const deleteCategory = (id) => remove('categories', id)
export const saveShippingZone = (zone) => save('shipping_zones', zone)
export const deleteShippingZone = (id) => remove('shipping_zones', id)

export const updateSettings = (fields) => save('store_settings', { id: 1, ...fields })

export async function getPrivateSettings() {
  await requireAdmin()
  return one('select * from public.store_private where id = 1')
}
export const updatePrivateSettings = (fields) => save('store_private', { id: 1, ...fields })

// Demo "storage": keep the image inline as a data URL.
export function uploadImage(_folder, file) {
  return new Promise((resolve, reject) => {
    if (file.size > 3 * 1024 * 1024) {
      reject(new ApiError('Demo mode stores images in your browser — please use an image under 3 MB.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve({ url: reader.result, path: null })
    reader.onerror = () => reject(new ApiError('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}
export async function removeImage() {}

// Demo-only helper.
export async function resetDemoData() {
  const db = await getDb()
  await db.close()
  dbPromise = null
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('/pglite/' + DB_NAME.replace('idb://', ''))
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}
