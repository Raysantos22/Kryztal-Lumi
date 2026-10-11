import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banknote, Lock, Smartphone } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { useAsync } from '../lib/useAsync.js'
import { useStore } from '../lib/StoreContext.jsx'
import { useBag } from '../lib/BagContext.jsx'
import { useSeo } from '../lib/useSeo.js'
import { PH_PROVINCES, zoneForProvince } from '../lib/ph.js'
import { shippingFee } from '../lib/catalog.js'
import { formatMoney, isValidEmail, isValidPhone } from '../lib/format.js'
import { rememberOrder } from '../lib/orderMemory.js'
import { ErrorBox, Field, Notice, Spinner } from '../components/ui.jsx'
import { Sparkle } from '../components/icons.jsx'
import { BagLine, FreeShippingNote } from '../components/BagDrawer.jsx'
import { GcashDetails } from '../components/GcashPayment.jsx'

const OTHER = '__other'
const EMPTY = {
  name: '',
  phone: '',
  email: '',
  address_line: '',
  barangay: '',
  city: '',
  province: '',
  province_other: '',
  zip: '',
  landmark: '',
  notes: '',
  zone_id: '',
  payment_method: '',
  gcash_reference: '',
}

function validate(f, { zone, needsZone }) {
  const e = {}
  if (f.name.trim().length < 2) e.name = 'Please enter your full name.'
  if (!isValidPhone(f.phone)) e.phone = 'Please enter a valid mobile number, e.g. 0917 123 4567.'
  if (f.email.trim() && !isValidEmail(f.email)) e.email = 'Please enter a valid email address.'
  if (f.address_line.trim().length < 3) e.address_line = 'Please enter your house no. and street.'
  if (f.barangay.trim().length < 2) e.barangay = 'Please enter your barangay.'
  if (f.city.trim().length < 2) e.city = 'Please enter your city or municipality.'
  if (!f.province) e.province = 'Please choose your province.'
  if (f.province === OTHER && f.province_other.trim().length < 2) e.province_other = 'Please type your province.'
  if (f.zip.trim() && !/^\d{4}$/.test(f.zip.trim())) e.zip = 'ZIP code should be 4 digits.'
  if (needsZone && !zone) e.zone_id = 'Please choose a shipping zone.'
  if (!f.payment_method) e.payment_method = 'Please choose how you want to pay.'
  if (f.gcash_reference.trim() && !/^[A-Za-z0-9\s-]{4,40}$/.test(f.gcash_reference.trim()))
    e.gcash_reference = 'That reference number looks wrong — please check it.'
  return e
}

export default function Checkout() {
  const { settings, reload: reloadStore } = useStore()
  const { items, lines, subtotal, hasProblems, clear } = useBag()
  const navigate = useNavigate()
  const zones = useAsync(() => api.listShippingZones(), [])
  const [f, setF] = useState(() => ({
    ...EMPTY,
    payment_method: settings?.cod_enabled && !settings?.gcash_enabled ? 'cod' : !settings?.cod_enabled && settings?.gcash_enabled ? 'gcash' : '',
  }))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [busy, setBusy] = useState(false)
  const errorRef = useRef(null)

  useSeo({ title: 'Checkout', description: 'Complete your Kryztal Lumi order.', noindex: true })

  const province = f.province === OTHER ? f.province_other.trim() : f.province
  const autoZone = useMemo(() => (f.province && f.province !== OTHER ? zoneForProvince(zones.data, f.province) : null), [zones.data, f.province])
  const needsZone = !!f.province && !autoZone
  const zone = autoZone || (zones.data || []).find((z) => z.id === f.zone_id) || null
  const fee = shippingFee(settings, zone, subtotal)
  const total = subtotal + (fee || 0)
  const minOrder = Number(settings?.min_order_amount || 0)
  const belowMinimum = minOrder > 0 && subtotal < minOrder

  const set = (key) => (e) => {
    const value = e.target.value
    setF((x) => ({ ...x, [key]: value }))
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  useEffect(() => {
    if (submitError) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [submitError])

  if (!lines.length) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <Sparkle className="h-10 w-10" gradient />
        <h1 className="mt-4 font-display text-4xl text-noir">Your bag is empty</h1>
        <p className="mt-2 text-muted">Add something you love, then come back to check out.</p>
        <Link to="/shop" className="btn-solid mt-8">
          Shop now
        </Link>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitError(null)
    const v = validate(f, { zone, needsZone })
    setErrors(v)
    if (Object.keys(v).length) {
      const first = document.getElementById(`co-${Object.keys(v)[0]}`)
      first?.focus()
      return
    }
    // TODO(captcha): add Cloudflare Turnstile here and verify the token in the
    // create-order edge function before going big on ads (see TODO_FOR_CLIENT.md).
    setBusy(true)
    try {
      const order = await api.createOrder({
        items: lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity })),
        customer: {
          name: f.name.trim(),
          phone: f.phone.trim(),
          email: f.email.trim() || null,
          address_line: f.address_line.trim(),
          barangay: f.barangay.trim(),
          city: f.city.trim(),
          province,
          zip: f.zip.trim() || null,
          landmark: f.landmark.trim() || null,
        },
        payment_method: f.payment_method,
        gcash_reference: f.payment_method === 'gcash' ? f.gcash_reference.trim() || null : null,
        shipping_zone_id: needsZone ? f.zone_id : null,
        notes: f.notes.trim() || null,
      })
      rememberOrder(order.order_no, f.phone.trim())
      clear()
      reloadStore() // fresh stock levels for the next visitor action
      navigate(`/order/${order.order_no}`, { state: { order, phone: f.phone.trim() } })
    } catch (err) {
      setSubmitError(err)
      if (err.hint === 'out_of_stock' || err.hint === 'invalid_items') reloadStore()
    } finally {
      setBusy(false)
    }
  }

  const input = (key, props = {}) => (
    <input
      id={`co-${key}`}
      className="input"
      value={f[key]}
      onChange={set(key)}
      aria-invalid={errors[key] ? 'true' : undefined}
      aria-describedby={errors[key] ? `co-${key}-error` : undefined}
      {...props}
    />
  )

  return (
    <div className="bg-pearl pb-20">
      <div className="container-page py-8 sm:py-12">
        <h1 className="font-display text-4xl text-noir sm:text-5xl">Checkout</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" /> No account needed. We only use your details to deliver your order.
        </p>

        <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div className="space-y-6">
            <div ref={errorRef}>
              <ErrorBox error={submitError} />
            </div>

            <fieldset className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-rose-100 sm:p-6">
              <legend className="sr-only">Contact</legend>
              <h2 className="mb-5 tracked-caps font-sans text-[0.68rem] text-rose-700">1 · Contact</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="co-name" error={errors.name} className="sm:col-span-2">
                  {input('name', { autoComplete: 'name', maxLength: 100 })}
                </Field>
                <Field label="Mobile number" htmlFor="co-phone" error={errors.phone} hint="For the courier and order updates">
                  {input('phone', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '0917 123 4567', maxLength: 30 })}
                </Field>
                <Field label="Email" htmlFor="co-email" optional error={errors.email} hint="For your order confirmation">
                  {input('email', { type: 'email', autoComplete: 'email', maxLength: 254 })}
                </Field>
              </div>
            </fieldset>

            <fieldset className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-rose-100 sm:p-6">
              <legend className="sr-only">Delivery address</legend>
              <h2 className="mb-5 tracked-caps font-sans text-[0.68rem] text-rose-700">2 · Delivery address</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="House / unit no. and street" htmlFor="co-address_line" error={errors.address_line} className="sm:col-span-2">
                  {input('address_line', { autoComplete: 'address-line1', maxLength: 200 })}
                </Field>
                <Field label="Barangay" htmlFor="co-barangay" error={errors.barangay}>
                  {input('barangay', { maxLength: 100 })}
                </Field>
                <Field label="City / municipality" htmlFor="co-city" error={errors.city}>
                  {input('city', { autoComplete: 'address-level2', maxLength: 100 })}
                </Field>
                <Field label="Province" htmlFor="co-province" error={errors.province}>
                  <select
                    id="co-province"
                    className="input"
                    value={f.province}
                    onChange={set('province')}
                    aria-invalid={errors.province ? 'true' : undefined}
                    autoComplete="address-level1"
                  >
                    <option value="">Choose province…</option>
                    {PH_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value={OTHER}>Other / not listed</option>
                  </select>
                </Field>
                <Field label="ZIP code" htmlFor="co-zip" optional error={errors.zip}>
                  {input('zip', { inputMode: 'numeric', autoComplete: 'postal-code', maxLength: 4 })}
                </Field>
                {f.province === OTHER && (
                  <Field label="Province name" htmlFor="co-province_other" error={errors.province_other} className="sm:col-span-2">
                    {input('province_other', { maxLength: 100 })}
                  </Field>
                )}
                <Field label="Landmark" htmlFor="co-landmark" optional className="sm:col-span-2" hint="Helps the rider find you, e.g. near the barangay hall">
                  {input('landmark', { maxLength: 200 })}
                </Field>
              </div>

              <div className="mt-5 rounded-lg bg-blush-50 p-4 text-sm" data-testid="shipping-zone">
                {zones.loading && !zones.data ? (
                  <span className="text-muted">Loading shipping rates…</span>
                ) : autoZone ? (
                  <p>
                    Shipping to <strong className="font-medium">{autoZone.name}</strong>
                    {autoZone.delivery_time ? ` · ${autoZone.delivery_time}` : ''} ·{' '}
                    <strong className="font-medium">{fee === 0 ? 'FREE' : formatMoney(fee)}</strong>
                  </p>
                ) : needsZone ? (
                  <Field label="Shipping zone" htmlFor="co-zone_id" error={errors.zone_id} hint="We couldn't match your province — choose the closest area.">
                    <select id="co-zone_id" className="input" value={f.zone_id} onChange={set('zone_id')} aria-invalid={errors.zone_id ? 'true' : undefined}>
                      <option value="">Choose…</option>
                      {(zones.data || []).map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} — {formatMoney(z.fee)}
                          {z.delivery_time ? ` (${z.delivery_time})` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <span className="text-muted">Choose your province to see the shipping fee and delivery time.</span>
                )}
                <ErrorBox error={zones.error} onRetry={zones.reload} />
              </div>
            </fieldset>

            <fieldset className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-rose-100 sm:p-6" aria-describedby={errors.payment_method ? 'co-payment_method-error' : undefined}>
              <legend className="sr-only">Payment</legend>
              <h2 className="mb-5 tracked-caps font-sans text-[0.68rem] text-rose-700">3 · Payment</h2>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method" id="co-payment_method" tabIndex={-1}>
                {[
                  settings?.cod_enabled && { value: 'cod', label: 'Cash on delivery', sub: 'Pay the courier when it arrives', icon: Banknote },
                  settings?.gcash_enabled && { value: 'gcash', label: 'GCash', sub: 'Pay now by QR or GCash number', icon: Smartphone },
                ]
                  .filter(Boolean)
                  .map(({ value, label, sub, icon: Icon }) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rose-600 ${
                        f.payment_method === value ? 'border-noir bg-blush-50' : 'border-rose-200 hover:border-rose-400'
                      }`}
                    >
                      <input type="radio" name="payment_method" value={value} checked={f.payment_method === value} onChange={set('payment_method')} className="mt-1 accent-noir" />
                      <span>
                        <span className="flex items-center gap-2 text-noir">
                          <Icon className="h-4 w-4 text-rose-600" aria-hidden="true" /> {label}
                        </span>
                        <span className="text-xs text-muted">{sub}</span>
                      </span>
                    </label>
                  ))}
              </div>
              {errors.payment_method && (
                <p className="mt-2 text-xs text-red-600" id="co-payment_method-error">
                  {errors.payment_method}
                </p>
              )}
              {f.payment_method === 'gcash' && (
                <div className="mt-5 rounded-lg border border-rose-100 p-4">
                  <GcashDetails settings={settings} amount={zone ? total : null} />
                  <Field
                    label="GCash reference no."
                    htmlFor="co-gcash_reference"
                    optional
                    error={errors.gcash_reference}
                    hint="Paid already? Enter the Ref No. from your receipt. You can also pay and add it after placing your order."
                    className="mt-5"
                  >
                    {input('gcash_reference', { inputMode: 'numeric', autoComplete: 'off', maxLength: 40 })}
                  </Field>
                  <p className="mt-3 text-xs text-muted">
                    Your items are reserved for {settings?.gcash_expiry_hours || 24} hours while we wait for your payment.
                  </p>
                </div>
              )}
              {f.payment_method === 'cod' && (
                <p className="mt-4 text-sm text-muted">Please prepare the exact amount. We&apos;ll confirm your order before it ships.</p>
              )}
            </fieldset>

            <fieldset className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-rose-100 sm:p-6">
              <legend className="sr-only">Notes</legend>
              <Field label="Notes for us" htmlFor="co-notes" optional>
                <textarea id="co-notes" className="input min-h-20" value={f.notes} onChange={set('notes')} maxLength={500} />
              </Field>
            </fieldset>
          </div>

          {/* Summary */}
          <aside className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-rose-100 sm:p-6 lg:sticky lg:top-28" aria-label="Order summary">
            <div className="flex items-baseline justify-between">
              <h2 className="tracked-caps font-sans text-[0.68rem] text-rose-700">Your order</h2>
              <Link to="/bag" className="text-xs text-muted underline underline-offset-2 hover:text-noir">
                Edit bag
              </Link>
            </div>
            <ul className="mt-2 divide-y divide-rose-100">
              {items.map((item) => (
                <BagLine key={item.key} item={item} editable={false} compact />
              ))}
            </ul>
            <dl className="mt-3 space-y-2 border-t border-rose-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums" data-testid="checkout-subtotal">
                  {formatMoney(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping{zone ? ` (${zone.name})` : ''}</dt>
                <dd className="tabular-nums" data-testid="checkout-shipping">
                  {fee == null ? '—' : fee === 0 ? 'FREE' : formatMoney(fee)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-rose-100 pt-3 font-display text-2xl text-noir">
                <dt>Total</dt>
                <dd className="tabular-nums" data-testid="checkout-total">
                  {formatMoney(total)}
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <FreeShippingNote subtotal={subtotal} />
            </div>
            {belowMinimum && (
              <Notice tone="warn" className="mt-4">
                The minimum order is {formatMoney(minOrder)}.
              </Notice>
            )}
            {hasProblems && (
              <Notice tone="warn" className="mt-4">
                Please fix the items marked in your bag first.
              </Notice>
            )}
            <button type="submit" className="btn-solid mt-5 w-full" disabled={busy || hasProblems || belowMinimum}>
              {busy && <Spinner className="h-4 w-4 text-white" />}
              {busy ? 'Placing order…' : `Place order · ${formatMoney(total)}`}
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              By ordering you agree to our{' '}
              <Link to="/shipping-returns" className="underline underline-offset-2">
                shipping &amp; returns policy
              </Link>
              .
            </p>
          </aside>
        </form>
      </div>
    </div>
  )
}
