import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, QrCode, RotateCcw, Save, Trash2 } from 'lucide-react'
import { api } from '../../lib/api/index.js'
import { useAsync } from '../../lib/useAsync.js'
import { useStore } from '../../lib/StoreContext.jsx'
import { DEMO_MODE } from '../../lib/config.js'
import { isValidEmail } from '../../lib/format.js'
import { ErrorBox, Field, Notice, Spinner } from '../../components/ui.jsx'
import { AdminTitle, ImageUpload, Panel, SavedFlash, Toggle, num, useAction } from './adminUi.jsx'

const TEXT_FIELDS = [
  'store_name', 'tagline', 'about', 'contact_email', 'contact_phone', 'viber', 'whatsapp', 'messenger_id',
  'facebook_url', 'instagram_url', 'tiktok_url', 'announcement_text', 'gcash_name', 'gcash_number', 'gcash_instructions',
  'shipping_policy', 'returns_policy',
]
const URL_FIELDS = ['facebook_url', 'instagram_url', 'tiktok_url']

function fromSettings(s) {
  const f = {}
  for (const k of TEXT_FIELDS) f[k] = s[k] ?? ''
  return {
    ...f,
    announcement_enabled: s.announcement_enabled,
    cod_enabled: s.cod_enabled,
    gcash_enabled: s.gcash_enabled,
    gcash_expiry_hours: s.gcash_expiry_hours,
    max_unconfirmed_per_phone: s.max_unconfirmed_per_phone,
    low_stock_threshold: s.low_stock_threshold,
    faq: (s.faq || []).map((x) => ({ q: x.q, a: x.a })),
  }
}

function validate(f) {
  if (!f.store_name.trim()) return 'Store name is required.'
  if (f.contact_email.trim() && !isValidEmail(f.contact_email)) return 'Contact email is not valid.'
  for (const k of URL_FIELDS) if (f[k].trim() && !/^https:\/\/\S+$/i.test(f[k].trim())) return 'Social links must start with https://'
  if (/[\s/]/.test(f.messenger_id.trim())) return 'Messenger: enter only the Page username or ID (the part after m.me/).'
  if (!f.cod_enabled && !f.gcash_enabled) return 'Turn on at least one payment method.'
  const hours = num(f.gcash_expiry_hours)
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) return 'GCash payment window must be 1–168 hours.'
  const max = num(f.max_unconfirmed_per_phone)
  if (!Number.isInteger(max) || max < 1 || max > 50) return 'Unconfirmed orders per phone must be 1–50.'
  const low = num(f.low_stock_threshold)
  if (!Number.isInteger(low) || low < 0 || low > 1000) return 'Low-stock level must be 0–1000.'
  if (f.faq.some((x) => !x.q.trim() || !x.a.trim())) return 'Every FAQ needs a question and an answer (or delete it).'
  return null
}

function GcashQr({ settings, onSaved }) {
  const { error, run } = useAction()
  const qr = settings.gcash_qr_url
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="w-40 shrink-0">
        {qr ? (
          <img src={qr} alt="Current GCash QR code" className="w-full rounded-lg border border-stone-200 p-2" data-testid="admin-qr" />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-stone-300 text-stone-400">
            <QrCode className="h-10 w-10" />
          </div>
        )}
        {qr?.includes('/placeholders/') && <p className="mt-1 text-xs text-amber-700">Sample QR — upload your real one</p>}
      </div>
      <div className="space-y-3">
        <ImageUpload folder="payment" label="Upload GCash QR" onUploaded={({ url }) => run('qr', () => onSaved({ gcash_qr_url: url }))} />
        {qr && (
          <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => window.confirm('Remove the QR code?') && run('rm', () => onSaved({ gcash_qr_url: null }))}>
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
        <p className="text-xs text-stone-500">In GCash: Profile → My QR → Download, then crop it. PNG or JPG under 10 MB.</p>
        <ErrorBox error={error} />
      </div>
    </div>
  )
}

function PrivateSettings() {
  const priv = useAsync(() => api.getPrivateSettings(), [])
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const { busy, error, setError, run } = useAction()
  useEffect(() => setEmail(priv.data?.notify_email || ''), [priv.data])
  return (
    <Panel title="New-order alerts" description="Where we email you about every new order. Only admins can see this.">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (email.trim() && !isValidEmail(email)) return setError('Please enter a valid email.')
          run('save', async () => {
            await api.updatePrivateSettings({ notify_email: email.trim() || null })
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          })
        }}
      >
        <Field label="Alert email" htmlFor="notify-email" className="min-w-60 flex-1">
          <input id="notify-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <button type="submit" className="btn-secondary" disabled={busy === 'save'}>
          Save
        </button>
        <SavedFlash show={saved} />
      </form>
      {!priv.data?.notify_email && <p className="mt-2 text-xs text-amber-700">Not set yet — you won’t get new-order emails.</p>}
      <ErrorBox error={error || priv.error} />
    </Panel>
  )
}

export default function AdminSettings() {
  const store = useStore()
  const [f, setF] = useState(() => (store.settings ? fromSettings(store.settings) : null))
  const [saved, setSaved] = useState(false)
  const { busy, error, setError, run } = useAction()

  if (!f) return null
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const setVal = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const saveFields = async (fields) => {
    const updated = await api.updateSettings(fields)
    store.setSettings(updated)
    return updated
  }

  const save = (e) => {
    e.preventDefault()
    const invalid = validate(f)
    if (invalid) return setError(invalid)
    const fields = {}
    for (const k of TEXT_FIELDS) fields[k] = f[k].trim() || null
    fields.store_name = f.store_name.trim()
    fields.messenger_id = f.messenger_id.trim().replace(/^https?:\/\/(www\.)?m\.me\//i, '') || null
    Object.assign(fields, {
      announcement_enabled: f.announcement_enabled,
      cod_enabled: f.cod_enabled,
      gcash_enabled: f.gcash_enabled,
      gcash_expiry_hours: num(f.gcash_expiry_hours),
      max_unconfirmed_per_phone: num(f.max_unconfirmed_per_phone),
      low_stock_threshold: num(f.low_stock_threshold),
      faq: f.faq.map((x) => ({ q: x.q.trim(), a: x.a.trim() })),
    })
    run('save', async () => {
      await saveFields(fields)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  const input = (k, props = {}) => <input id={`s-${k}`} className="input" value={f[k]} onChange={set(k)} {...props} />
  const area = (k, props = {}) => <textarea id={`s-${k}`} className="input min-h-24" value={f[k]} onChange={set(k)} {...props} />
  const moveFaq = (i, d) => setVal('faq', f.faq.map((x, j) => (j === i ? f.faq[i + d] : j === i + d ? f.faq[i] : x)))

  return (
    <div>
      <AdminTitle title="Settings" />
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Store">
            <div className="space-y-4">
              <Field label="Store name" htmlFor="s-store_name">{input('store_name', { maxLength: 80 })}</Field>
              <Field label="Tagline" htmlFor="s-tagline" hint="Shown in the hero and footer">{input('tagline', { maxLength: 120 })}</Field>
              <Field label="About text" htmlFor="s-about" hint="About page">{area('about')}</Field>
            </div>
          </Panel>

          <Panel title="Contact & social links" description="Anything left empty is hidden on the site.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email" htmlFor="s-contact_email">{input('contact_email', { type: 'email' })}</Field>
              <Field label="Phone / SMS" htmlFor="s-contact_phone">{input('contact_phone', { type: 'tel' })}</Field>
              <Field label="Viber number" htmlFor="s-viber">{input('viber', { type: 'tel' })}</Field>
              <Field label="WhatsApp number" htmlFor="s-whatsapp">{input('whatsapp', { type: 'tel' })}</Field>
              <Field label="Messenger (Page username)" htmlFor="s-messenger_id" hint="Shows the floating “Message us” button" className="sm:col-span-2">
                {input('messenger_id', { placeholder: 'e.g. kryztallumi' })}
              </Field>
              <Field label="Facebook link" htmlFor="s-facebook_url" className="sm:col-span-2">{input('facebook_url', { placeholder: 'https://facebook.com/…' })}</Field>
              <Field label="Instagram link" htmlFor="s-instagram_url">{input('instagram_url', { placeholder: 'https://instagram.com/…' })}</Field>
              <Field label="TikTok link" htmlFor="s-tiktok_url">{input('tiktok_url', { placeholder: 'https://tiktok.com/@…' })}</Field>
            </div>
          </Panel>
        </div>

        <Panel title="Announcement bar" description="A thin black bar at the very top of every page.">
          <div className="space-y-3">
            <Toggle id="s-ann" checked={f.announcement_enabled} onChange={(v) => setVal('announcement_enabled', v)} label="Show announcement bar" />
            <Field label="Text" htmlFor="s-announcement_text">{input('announcement_text', { maxLength: 140 })}</Field>
          </div>
        </Panel>

        <Panel title="Payments">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <Toggle id="s-cod" checked={f.cod_enabled} onChange={(v) => setVal('cod_enabled', v)} label="Cash on delivery" />
              <Toggle id="s-gcash" checked={f.gcash_enabled} onChange={(v) => setVal('gcash_enabled', v)} label="GCash (prepaid)" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="GCash number" htmlFor="s-gcash_number">{input('gcash_number', { type: 'tel', placeholder: '0917 123 4567' })}</Field>
                <Field label="GCash account name" htmlFor="s-gcash_name" hint="As shown in GCash, e.g. K**** L.">{input('gcash_name')}</Field>
                <Field label="GCash payment window (hours)" htmlFor="s-gcash_expiry_hours" hint="Unpaid GCash orders are cancelled after this and the stock is released">
                  {input('gcash_expiry_hours', { type: 'number', min: 1, max: 168, step: 1 })}
                </Field>
              </div>
              <Field label="GCash instructions" htmlFor="s-gcash_instructions">{area('gcash_instructions')}</Field>
            </div>
            <div>
              <p className="label">GCash QR code</p>
              <GcashQr settings={store.settings} onSaved={saveFields} />
            </div>
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Policies">
            <div className="space-y-4">
              <Field label="Shipping policy" htmlFor="s-shipping_policy">{area('shipping_policy')}</Field>
              <Field label="Returns & exchanges" htmlFor="s-returns_policy">{area('returns_policy')}</Field>
            </div>
          </Panel>
          <Panel title="Orders & stock">
            <div className="space-y-4">
              <Field label="Max unconfirmed orders per mobile number" htmlFor="s-max_unconfirmed_per_phone" hint="Anti-spam: further orders are refused until you confirm or cancel some">
                {input('max_unconfirmed_per_phone', { type: 'number', min: 1, max: 50, step: 1 })}
              </Field>
              <Field label="“Only X left” from" htmlFor="s-low_stock_threshold" hint="Also lists the product under Low stock on the dashboard">
                {input('low_stock_threshold', { type: 'number', min: 0, max: 1000, step: 1 })}
              </Field>
            </div>
          </Panel>
        </div>

        <Panel title="FAQ" description="Shown on the FAQ page; the first four also appear on the home page.">
          <ol className="space-y-3">
            {f.faq.map((x, i) => (
              <li key={i} className="rounded-lg border border-stone-200 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input className="input" aria-label={`Question ${i + 1}`} value={x.q} onChange={(e) => setVal('faq', f.faq.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)))} placeholder="Question" />
                    <textarea className="input min-h-16" aria-label={`Answer ${i + 1}`} value={x.a} onChange={(e) => setVal('faq', f.faq.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)))} placeholder="Answer" />
                  </div>
                  <div className="flex flex-col">
                    <button type="button" className="btn-ghost btn-sm" disabled={i === 0} onClick={() => moveFaq(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" className="btn-ghost btn-sm" disabled={i === f.faq.length - 1} onClick={() => moveFaq(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => setVal('faq', f.faq.filter((_, j) => j !== i))} aria-label={`Delete question ${i + 1}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="btn-ghost btn-sm mt-3" onClick={() => setVal('faq', [...f.faq, { q: '', a: '' }])}>
            <Plus className="h-4 w-4" /> Add question
          </button>
        </Panel>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
          <button type="submit" className="btn-primary" disabled={busy === 'save'}>
            {busy === 'save' ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />} Save settings
          </button>
          <SavedFlash show={saved} />
          <div className="w-full">
            <ErrorBox error={error} />
          </div>
        </div>
      </form>

      <div className="mt-5 space-y-5">
        <PrivateSettings />
        {DEMO_MODE && (
          <Panel title="Demo data">
            <Notice tone="warn">This wipes every order and change made in this browser and reloads the original shop.</Notice>
            <button
              type="button"
              className="btn-danger btn-sm mt-3"
              onClick={async () => {
                if (!window.confirm('Reset all demo data in this browser?')) return
                await api.resetDemoData()
                window.location.reload()
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset demo data
            </button>
          </Panel>
        )}
      </div>
    </div>
  )
}
