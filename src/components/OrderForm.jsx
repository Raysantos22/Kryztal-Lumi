// One-step cash-on-delivery order form (landing-page style): pick the
// quantity, fill in name, mobile, email and address, place the order. No bag,
// no account. The order goes through the same create_order() as checkout,
// which re-prices everything and takes stock in the database.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Banknote, Heart, Mail, Truck } from 'lucide-react'
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
      {save > 0 && <s className="text-2xl text-stone-400 tabular-nums">{formatMoney(compareAt)}</s>}
      <span className="font-sans text-4xl font-bold text-rose-600 tabular-nums">{formatMoney(price)}</span>
      {save > 0 && <span className="rounded-full bg-rose-500 px-4 py-1.5 text-sm font-semibold text-white">SAVE {save}%</span>}
    </div>
  )
}

export function BenefitList({ items, className = '' }) {
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem] text-noir ${className}`}>
      {items.map((b) => (
        <li key={b} className="flex items-center gap-1.5">
          <Heart className="h-4 w-4 fill-rose-400 text-rose-400" aria-hidden="true" /> {b}
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

export default function OrderForm({ product, id = 'order-form', idPrefix = 'of' }) {
  const { settings, reload: reloadStore } = useStore()
  const navigate = useNavigate()
  const zones = useAsync(() => api.listShippingZones(), [])
  const variants = activeVariants(product)
  const [variantId, setVariantId] = useState(() => (variants.find((v) => !product.track_stock || v.stock > 0) || variants[0])?.id || null)
  const variant = variants.find((v) => v.id === variantId) || null
  const [qty, setQty] = useState(1)
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
      <label htmlFor={fid(k)} className="sr-only">
        {label}
      </label>
      <input
        id={fid(k)}
        className="input h-14 border-2 border-rose-300 text-base! focus:border-rose-500"
        placeholder={props.placeholder || label}
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
    setError(null)
    const v = validate(f)
    setErrors(v)
    if (Object.keys(v).length) {
      document.getElementById(fid(Object.keys(v)[0]))?.focus()
      return
    }
    if (minOrder > 0 && subtotal < minOrder) return setError(`The minimum order is ${formatMoney(minOrder)}.`)
    // TODO(captcha): add Cloudflare Turnstile here (see TODO_FOR_CLIENT.md).
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
          <select id={fid('variant')} className="input h-14 border-2 border-rose-300" value={variantId || ''} onChange={(e) => { setVariantId(e.target.value); setQty(1) }}>
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={product.track_stock && v.stock <= 0}>
                {v.name} — {formatMoney(v.price)}
                {product.track_stock && v.stock <= 0 ? ' (sold out)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg bg-blush-50 px-4 py-3">
        <span className="text-sm text-noir">Quantity</span>
        <QuantityInput value={qty} onChange={setQty} max={maxQty} label="Quantity" size="sm" />
      </div>

      {field('name', 'Full Name', { input: { autoComplete: 'name', maxLength: 100 } })}
      {field('phone', 'Phone Number', { placeholder: 'Phone Number (e.g. 0917 123 4567)', input: { type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 30 } })}
      <div>
        {field('email', 'Email', { placeholder: 'Email (we’ll send your order confirmation here)', input: { type: 'email', autoComplete: 'email', maxLength: 254 } })}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Optional — add your Gmail or any email to get your order details automatically.
        </p>
      </div>
      {field('address_line', 'Address (House Number, Street, Village)', { input: { autoComplete: 'address-line1', maxLength: 200 } })}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={fid('province')} className="sr-only">
            Province
          </label>
          <select
            id={fid('province')}
            className={`input h-14 border-2 border-rose-300 ${f.province ? 'text-noir' : 'text-stone-400'}`}
            value={f.province}
            onChange={set('province')}
            aria-invalid={errors.province ? 'true' : undefined}
            autoComplete="address-level1"
          >
            <option value="">Province</option>
            {PH_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value={OTHER}>Other / not listed</option>
          </select>
          {errors.province && <p className="mt-1 text-xs text-red-600">{errors.province}</p>}
        </div>
        {field('city', 'City / Municipality', { placeholder: 'City', input: { autoComplete: 'address-level2', maxLength: 100 } })}
        {field('barangay', 'Barangay', { input: { maxLength: 100 } })}
      </div>
      {f.province === OTHER && field('province_other', 'Province name', { input: { maxLength: 100 } })}
      {field('landmark', 'Landmark', { placeholder: 'Landmark (optional)', input: { maxLength: 200 } })}

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
        className="flex h-16 w-full items-center justify-center gap-2 rounded-lg bg-rose-600 text-lg font-semibold text-white shadow-lg shadow-rose-900/20 transition hover:bg-rose-700 disabled:opacity-60"
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
          <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Fast nationwide shipping
        </li>
      </ul>
    </form>
  )
}
