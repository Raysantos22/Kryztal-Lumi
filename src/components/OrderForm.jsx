// One-step cash-on-delivery order form (product page): quantity, name,
// mobile, email and address, place the order. No bag, no account. The order
// goes through the same create_order() as checkout, which re-prices
// everything and takes stock in the database.
// Quantity and variant can be controlled by the page (qty/onQtyChange,
// variantId/onVariantChange) so they stay in sync with the buy box.
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Banknote, Check, Mail, Truck } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { useAsync } from '../lib/useAsync.js'
import { useStore } from '../lib/StoreContext.jsx'
import { PH_PROVINCES, zoneForProvince } from '../lib/ph.js'
import { activeVariants, availableStock, shippingFee } from '../lib/catalog.js'
import { formatMoney, isValidEmail, isValidPhone } from '../lib/format.js'
import { rememberOrder } from '../lib/orderMemory.js'
import { ErrorBox, QuantityInput, Spinner } from './ui.jsx'

const OTHER = '__other'
const EMPTY = { name: '', phone: '', email: '', address_line: '', province: '', province_other: '', city: '', barangay: '', landmark: '', notes: '' }

// Price with the crossed-out "before" price and a SAVE % badge (only when a
// compare-at price is set in Admin → Products).
export function PriceBlock({ price, compareAt, className = '' }) {
  const save = compareAt && Number(compareAt) > Number(price) ? Math.round((1 - Number(price) / Number(compareAt)) * 100) : 0
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {save > 0 && <s className="text-xl text-stone-500 tabular-nums">{formatMoney(compareAt)}</s>}
      <span className="font-sans text-3xl font-semibold text-rose-700 tabular-nums">{formatMoney(price)}</span>
      {save > 0 && <span className="rounded-full bg-rose-500 px-3 py-1 text-sm font-semibold text-white">Save {save}%</span>}
    </div>
  )
}

export function BenefitList({ items, className = '' }) {
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem] text-noir ${className}`}>
      {items.map((b) => (
        <li key={b} className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-rose-600" aria-hidden="true" /> {b}
        </li>
      ))}
    </ul>
  )
}

function validate(f) {
  const e = {}
  if (f.name.trim().length < 2) e.name = 'Please enter your full name.'
  if (!isValidPhone(f.phone)) e.phone = 'Please enter a valid mobile number, e.g. 0917 123 4567.'
  if (f.email.trim() && !isValidEmail(f.email)) e.email = 'Please check your email address.'
  if (f.address_line.trim().length < 3) e.address_line = 'Please enter your house no., street and village.'
  if (!f.province) e.province = 'Please choose your province.'
  if (f.province === OTHER && f.province_other.trim().length < 2) e.province_other = 'Please type your province.'
  if (f.city.trim().length < 2) e.city = 'Please enter your city or municipality.'
  if (f.barangay.trim().length < 2) e.barangay = 'Please enter your barangay.'
  return e
}

export default function OrderForm({ product, id = 'order-form', idPrefix = 'of', qty: qtyProp, onQtyChange, variantId: variantProp, onVariantChange }) {
  const { settings, reload: reloadStore } = useStore()
  const navigate = useNavigate()
  const zones = useAsync(() => api.listShippingZones(), [])
  const variants = activeVariants(product)
  const [ownVariantId, setOwnVariantId] = useState(() => (variants.find((v) => !product.track_stock || v.stock > 0) || variants[0])?.id || null)
  const variantId = variantProp !== undefined ? variantProp : ownVariantId
  const setVariantId = onVariantChange || setOwnVariantId
  const variant = variants.find((v) => v.id === variantId) || null
  const [ownQty, setOwnQty] = useState(1)
  const qty = qtyProp ?? ownQty
  const setQty = onQtyChange || setOwnQty
  const submitting = useRef(false)
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const stock = availableStock(product, variants.length ? variant : null)
  const soldOut = stock <= 0
  const maxQty = Math.max(1, Math.min(stock === Infinity ? 99 : stock, product.max_per_order))
  const unit = Number(variant ? variant.price : product.price)
  const subtotal = unit * qty
  const province = f.province === OTHER ? f.province_other.trim() : f.province
  const autoZone = useMemo(() => (f.province && f.province !== OTHER ? zoneForProvince(zones.data, f.province) : null), [zones.data, f.province])
  const fallbackZone = useMemo(() => [...(zones.data || [])].sort((a, b) => b.fee - a.fee)[0] || null, [zones.data])
  const zone = autoZone || (province ? fallbackZone : null)
  const fee = shippingFee(settings, zone, subtotal)
  const total = subtotal + (fee || 0)
  const codOnly = settings?.cod_enabled && !settings?.gcash_enabled
  const minOrder = Number(settings?.min_order_amount || 0)

  const set = (k) => (e) => {
    const v = e.target.value
    setF((x) => ({ ...x, [k]: v }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }))
  }
  const fid = (k) => `${idPrefix}-${k}`
  const field = (k, label, props = {}) => (
    <div className={props.wrapClass}>
      <label htmlFor={fid(k)} className="label">
        {label}
        {props.optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      <input
        id={fid(k)}
        className="input h-12 text-base!"
        placeholder={props.placeholder}
        value={f[k]}
        onChange={set(k)}
        aria-invalid={errors[k] ? 'true' : undefined}
        aria-describedby={errors[k] ? `${fid(k)}-error` : undefined}
        {...props.input}
      />
      {errors[k] && (
        <p id={`${fid(k)}-error`} className="mt-1 text-xs text-red-600">
          {errors[k]}
        </p>
      )}
    </div>
  )

  const submit = async (e) => {
    e.preventDefault()
    if (submitting.current) return // a second click before the first finished
    setError(null)
    const v = validate(f)
    setErrors(v)
    if (Object.keys(v).length) {
      document.getElementById(fid(Object.keys(v)[0]))?.focus()
      return
    }
    if (minOrder > 0 && subtotal < minOrder) return setError(`The minimum order is ${formatMoney(minOrder)}.`)
    // TODO(captcha): add Cloudflare Turnstile here (see TODO_FOR_CLIENT.md).
    submitting.current = true
    setBusy(true)
    try {
      const order = await api.createOrder({
        items: [{ product_id: product.id, variant_id: variant?.id || null, quantity: qty }],
        customer: {
          name: f.name.trim(),
          phone: f.phone.trim(),
          email: f.email.trim() || null,
          address_line: f.address_line.trim(),
          barangay: f.barangay.trim(),
          city: f.city.trim(),
          province,
          zip: null,
          landmark: f.landmark.trim() || null,
        },
        payment_method: settings?.cod_enabled ? 'cod' : 'gcash',
        notes: f.notes.trim() || null,
      })
      rememberOrder(order.order_no, f.phone.trim())
      reloadStore()
      navigate(`/order/${order.order_no}`, { state: { order, phone: f.phone.trim() } })
    } catch (err) {
      setError(err)
      if (err.hint === 'out_of_stock' || err.hint === 'invalid_items') reloadStore()
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  if (soldOut && !variants.length) {
    return (
      <div id={id} className="rounded-xl bg-blush-50 p-6 text-center text-noir">
        Sold out for now — check back soon.
      </div>
    )
  }

  return (
    <form id={id} onSubmit={submit} noValidate className="scroll-mt-28 space-y-3" aria-label={`Order ${product.name}`} data-testid="order-form">
      {variants.length > 0 && (
        <div>
          <label htmlFor={fid('variant')} className="label">
            {product.variant_label}
          </label>
          <select id={fid('variant')} className="input h-12" value={variantId || ''} onChange={(e) => { setVariantId(e.target.value); setQty(1) }}>
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={product.track_stock && v.stock <= 0}>
                {v.name} — {formatMoney(v.price)}
                {product.track_stock && v.stock <= 0 ? ' (sold out)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg bg-blush-50 px-4 py-2.5">
        <span className="text-sm font-medium text-noir">Quantity</span>
        <QuantityInput value={qty} onChange={setQty} max={maxQty} label="Quantity" size="sm" />
      </div>

      {field('name', 'Full Name', { input: { autoComplete: 'name', maxLength: 100 } })}
      {field('phone', 'Phone Number', { placeholder: 'e.g. 0917 123 4567', input: { type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 30 } })}
      <div>
        {field('email', 'Email', { optional: true, placeholder: 'you@gmail.com', input: { type: 'email', autoComplete: 'email', maxLength: 254 } })}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> We’ll email your order details here.
        </p>
      </div>
      {field('address_line', 'Address (House Number, Street, Village)', { placeholder: 'e.g. 12 Sampaguita St., Villa Rosa', input: { autoComplete: 'address-line1', maxLength: 200 } })}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={fid('province')} className="label">
            Province
          </label>
          <select
            id={fid('province')}
            className={`input h-12 ${f.province ? 'text-noir' : 'text-stone-500'}`}
            value={f.province}
            onChange={set('province')}
            aria-invalid={errors.province ? 'true' : undefined}
            aria-describedby={errors.province ? `${fid('province')}-error` : undefined}
            autoComplete="address-level1"
          >
            <option value="">Choose…</option>
            {PH_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value={OTHER}>Other / not listed</option>
          </select>
          {errors.province && (
            <p id={`${fid('province')}-error`} className="mt-1 text-xs text-red-600">
              {errors.province}
            </p>
          )}
        </div>
        {field('city', 'City / Municipality', { input: { autoComplete: 'address-level2', maxLength: 100 } })}
        {field('barangay', 'Barangay', { input: { maxLength: 100 } })}
      </div>
      {f.province === OTHER && field('province_other', 'Province name', { input: { maxLength: 100 } })}
      {field('landmark', 'Landmark', { optional: true, placeholder: 'e.g. near the barangay hall', input: { maxLength: 200 } })}

      <div className="space-y-1.5 rounded-lg bg-white p-4 text-sm ring-1 ring-rose-100" data-testid="order-form-summary">
        <div className="flex justify-between">
          <span className="text-muted">
            {product.name}
            {variant ? ` (${variant.name})` : ''} × {qty}
          </span>
          <span className="tabular-nums">{formatMoney(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Shipping{zone ? ` · ${zone.delivery_time || zone.name}` : ''}</span>
          <span className="tabular-nums" data-testid="order-form-shipping">
            {fee == null ? 'Choose province' : fee === 0 ? 'FREE' : formatMoney(fee)}
          </span>
        </div>
        <div className="flex justify-between border-t border-rose-100 pt-2 text-base font-semibold text-noir">
          <span>Total {codOnly && <span className="font-normal text-muted">· pay on delivery</span>}</span>
          <span className="tabular-nums" data-testid="order-form-total">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      <ErrorBox error={error} />
      <button
        type="submit"
        disabled={busy || soldOut}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-rose-500 text-lg font-semibold text-white shadow-sm shadow-rose-900/10 transition hover:bg-rose-600 disabled:opacity-60"
      >
        {busy && <Spinner className="h-5 w-5 text-white" />}
        {soldOut ? 'Sold out' : busy ? 'Placing order…' : `Place order · ${formatMoney(total)}`}
      </button>
      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted">
        {settings?.cod_enabled && (
          <li className="flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5" aria-hidden="true" /> Cash on delivery
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Nationwide shipping
        </li>
      </ul>
    </form>
  )
}
