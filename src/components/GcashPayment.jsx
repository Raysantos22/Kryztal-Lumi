import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { formatMoney, messengerLink } from '../lib/format.js'
import { ErrorBox, Field, Spinner } from './ui.jsx'

export function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  if (!text) return null
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2.5 py-1 text-xs text-noir hover:bg-rose-50"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          /* clipboard blocked */
        }
      }}
      aria-label={`${label}: ${text}`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : label}
    </button>
  )
}

// GCash QR + number + amount. Shown at checkout and on the order page.
export function GcashDetails({ settings, amount }) {
  const qr = settings?.gcash_qr_url
  const isSample = !qr || qr.includes('/placeholders/')
  return (
    <div className="grid gap-5 sm:grid-cols-[10rem_1fr] sm:items-start" data-testid="gcash-details">
      <div className="mx-auto w-40 sm:mx-0">
        {qr ? (
          <img src={qr} alt="GCash QR code" className="w-full rounded-lg border border-rose-100 bg-white p-2" data-testid="gcash-qr" />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-rose-200 text-center text-xs text-muted">
            QR code coming soon
          </div>
        )}
        {isSample && <p className="mt-1 text-center text-[0.65rem] text-amber-700">Sample QR — not a real account</p>}
      </div>
      <dl className="space-y-3 text-sm">
        {amount != null && (
          <div>
            <dt className="text-muted">Amount to send</dt>
            <dd className="font-display text-3xl text-noir tabular-nums" data-testid="gcash-amount">
              {formatMoney(amount)}
            </dd>
          </div>
        )}
        {settings?.gcash_number && (
          <div>
            <dt className="text-muted">GCash number</dt>
            <dd className="flex flex-wrap items-center gap-2 text-noir">
              <span className="text-base tabular-nums">{settings.gcash_number}</span>
              <CopyButton text={settings.gcash_number.replace(/\s/g, '')} />
            </dd>
          </div>
        )}
        {settings?.gcash_name && (
          <div>
            <dt className="text-muted">Account name</dt>
            <dd className="text-noir">{settings.gcash_name}</dd>
          </div>
        )}
        {settings?.gcash_instructions && <p className="text-xs leading-relaxed text-muted">{settings.gcash_instructions}</p>}
      </dl>
    </div>
  )
}

// After ordering: customer enters / corrects the GCash reference number.
export function GcashReferenceForm({ order, phone, settings, onUpdated }) {
  const [ref, setRef] = useState(order.gcash_reference || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const proofLink = messengerLink(settings, `Hi! GCash payment for order ${order.order_no}`)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await api.submitGcashReference(order.order_no, phone, ref)
      setSaved(true)
      onUpdated?.(updated)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 border-t border-rose-100 pt-5">
      <Field label="GCash reference no." htmlFor="gcash-ref-after" hint="The 13-digit Ref No. on your GCash receipt">
        <div className="flex gap-2">
          <input
            id="gcash-ref-after"
            className="input"
            inputMode="numeric"
            autoComplete="off"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            maxLength={40}
            required
          />
          <button type="submit" className="btn-primary shrink-0" disabled={busy || !ref.trim()}>
            {busy && <Spinner className="h-4 w-4 text-white" />} {order.gcash_reference ? 'Update' : 'Submit'}
          </button>
        </div>
      </Field>
      {saved && <p className="text-sm text-emerald-700">Thank you! We&apos;ll verify your payment and confirm your order.</p>}
      <ErrorBox error={error} />
      {proofLink && (
        <a href={proofLink} target="_blank" rel="noreferrer" className="inline-block text-sm text-rose-700 underline underline-offset-2">
          Send your payment screenshot on Messenger
        </a>
      )}
    </form>
  )
}
