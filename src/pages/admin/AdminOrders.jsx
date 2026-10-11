import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Copy,
  Mail,
  MessageSquare,
  PackageCheck,
  Phone,
  RotateCcw,
  Search,
  Send,
  Truck,
} from 'lucide-react'
import { api } from '../../lib/api/index.js'
import { useAsync } from '../../lib/useAsync.js'
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, formatDateTime, formatMoney, telLink } from '../../lib/format.js'
import { EmptyState, ErrorBox, Field, Loading, Spinner, StatusBadge } from '../../components/ui.jsx'
import { OrderItems, OrderTimeline } from '../../components/OrderDetails.jsx'
import { AdminTitle, Panel, SavedFlash, useAction } from './adminUi.jsx'

const FILTERS = [
  ['', 'All orders'],
  ['open', 'Open (not delivered)'],
  ['to_verify', 'GCash to verify'],
  ['cod_to_collect', 'COD to collect'],
  ...Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label]),
]
const PAGE = 25
const COURIERS = ['J&T Express', 'LBC', 'Flash Express', 'Ninja Van', 'JRS Express', '2GO', 'Grab / Lalamove']

function PaymentPill({ order }) {
  const cls =
    order.payment_status === 'paid'
      ? 'bg-emerald-50 text-emerald-800'
      : order.payment_status === 'submitted'
        ? 'bg-amber-100 text-amber-900'
        : 'bg-stone-100 text-stone-600'
  return (
    <span className={`badge ${cls}`}>
      {PAYMENT_METHOD[order.payment_method] === 'GCash' ? 'GCash' : 'COD'} · {PAYMENT_STATUS[order.payment_status]}
    </span>
  )
}

export function OrderRow({ order: o, compact = false }) {
  return (
    <li>
      <Link
        to={`/admin/orders/${o.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 hover:bg-stone-50"
        data-testid="admin-order-row"
        data-order-no={o.order_no}
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-noir">{o.order_no}</span>
            <StatusBadge status={o.status} />
            {!compact && <PaymentPill order={o} />}
          </p>
          <p className="mt-0.5 truncate text-sm text-stone-700">
            {o.customer_name} · {o.city}, {o.province}
          </p>
          <p className="truncate text-xs text-stone-500">{o.items_summary}</p>
        </div>
        <div className="text-right">
          <p className="tabular-nums text-noir">{formatMoney(o.total)}</p>
          <p className="text-xs text-stone-500">{formatDateTime(o.created_at)}</p>
          {compact && o.gcash_reference && <p className="text-xs text-amber-800">Ref {o.gcash_reference}</p>}
        </div>
      </Link>
    </li>
  )
}

export function AdminOrders() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const method = params.get('method') || ''
  const page = Math.max(0, Number(params.get('page') || 0))
  const [search, setSearch] = useState(params.get('q') || '')
  const q = params.get('q') || ''

  const list = useAsync(
    () => api.adminListOrders({ status, paymentMethod: method, search: q, limit: PAGE, offset: page * PAGE }),
    [status, method, q, page],
  )
  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k)
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }
  const total = list.data?.total ?? 0

  return (
    <div>
      <AdminTitle title="Orders" />
      <div className="mb-4 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_1fr_1.4fr]">
        <Field label="Status" htmlFor="filter-status">
          <select id="filter-status" className="input" value={status} onChange={(e) => update({ status: e.target.value })}>
            {FILTERS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payment" htmlFor="filter-method">
          <select id="filter-method" className="input" value={method} onChange={(e) => update({ method: e.target.value })}>
            <option value="">All</option>
            <option value="cod">Cash on delivery</option>
            <option value="gcash">GCash</option>
          </select>
        </Field>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            update({ q: search.trim() })
          }}
        >
          <Field label="Search" htmlFor="filter-q">
            <div className="flex gap-2">
              <input id="filter-q" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order no., name, mobile, tracking" />
              <button type="submit" className="btn-secondary px-3!" aria-label="Search">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </Field>
        </form>
      </div>

      <Panel>
        {list.loading && !list.data ? (
          <Loading />
        ) : (
          <>
            <ErrorBox error={list.error} onRetry={list.reload} />
            {list.data?.orders.length === 0 && <EmptyState>No orders match.</EmptyState>}
            <ul className="-mx-2 divide-y divide-stone-100" aria-label="Orders">
              {(list.data?.orders || []).map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </ul>
            {total > PAGE && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <button type="button" className="btn-secondary btn-sm" disabled={page === 0} onClick={() => update({ page: String(page - 1) })}>
                  Previous
                </button>
                <span className="text-stone-500">
                  {page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} of {total}
                </span>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={(page + 1) * PAGE >= total}
                  onClick={() => update({ page: String(page + 1) })}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  )
}

function CopyText({ text, label }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* blocked */
        }
      }}
    >
      <Copy className="h-3.5 w-3.5" /> {done ? 'Copied' : label}
    </button>
  )
}

// Status buttons for the order's next steps.
function OrderActions({ order: o, onChanged }) {
  const { busy, error, run } = useAction()
  const [mode, setMode] = useState(null) // 'ship' | 'cancel' | 'paid' | 'tracking'
  const [courier, setCourier] = useState(o.courier || 'J&T Express')
  const [tracking, setTracking] = useState(o.tracking_no || '')
  const [note, setNote] = useState('')
  const [reference, setReference] = useState(o.gcash_reference || '')

  const act = (name, fn) =>
    run(name, async () => {
      await fn()
      setMode(null)
      setNote('')
      await onChanged()
    })
  const status = (s, extra = {}) => act(s, () => api.setOrderStatus(o.id, s, extra))

  const canPay = o.payment_method === 'gcash' && o.payment_status !== 'paid' &&
    (o.status === 'awaiting_payment' || (o.status === 'cancelled' && o.cancelled_reason?.startsWith('Auto-cancelled')))

  return (
    <div className="space-y-3" data-testid="order-actions">
      <div className="flex flex-wrap gap-2">
        {canPay && (
          <button type="button" className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setMode('paid')} disabled={!!busy}>
            <CheckCircle2 className="h-4 w-4" /> {o.status === 'cancelled' ? 'Reinstate: GCash paid' : 'Mark GCash paid'}
          </button>
        )}
        {o.status === 'new' && (
          <button type="button" className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => status('confirmed')} disabled={!!busy}>
            {busy === 'confirmed' ? <Spinner className="h-4 w-4 text-white" /> : <CheckCircle2 className="h-4 w-4" />} Confirm order
          </button>
        )}
        {o.status === 'confirmed' && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => status('packed')} disabled={!!busy}>
            {busy === 'packed' ? <Spinner className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />} Mark packed
          </button>
        )}
        {(o.status === 'confirmed' || o.status === 'packed') && (
          <button type="button" className="btn btn-sm bg-noir text-ivory hover:bg-rose-800" onClick={() => setMode('ship')} disabled={!!busy}>
            <Truck className="h-4 w-4" /> Mark shipped
          </button>
        )}
        {o.status === 'shipped' && (
          <button type="button" className="btn btn-sm bg-noir text-ivory hover:bg-rose-800" onClick={() => status('delivered')} disabled={!!busy}>
            {busy === 'delivered' ? <Spinner className="h-4 w-4 text-white" /> : <CheckCircle2 className="h-4 w-4" />} Mark delivered
          </button>
        )}
        {['shipped', 'delivered', 'returned'].includes(o.status) && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setMode('tracking')} disabled={!!busy}>
            Edit tracking
          </button>
        )}
        {(o.status === 'shipped' || o.status === 'delivered') && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => window.confirm('Mark as returned? The stock is put back.') && status('returned')}
            disabled={!!busy}
          >
            <RotateCcw className="h-4 w-4" /> Returned
          </button>
        )}
        {['new', 'awaiting_payment', 'confirmed', 'packed'].includes(o.status) && (
          <button type="button" className="btn-danger btn-sm" onClick={() => setMode('cancel')} disabled={!!busy}>
            <Ban className="h-4 w-4" /> Cancel order
          </button>
        )}
      </div>

      {mode === 'paid' && (
        <form className="rounded-lg bg-emerald-50 p-3" onSubmit={(e) => { e.preventDefault(); act('paid', () => api.markPaid(o.id, reference.trim() || null)) }}>
          <Field label="GCash reference (from your GCash app)" htmlFor="paid-ref" optional>
            <input id="paid-ref" className="input" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={40} />
          </Field>
          <p className="mt-2 text-xs text-emerald-900">Only confirm once you see {formatMoney(o.total)} in your GCash history.</p>
          <div className="mt-2 flex gap-2">
            <button type="submit" className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700" disabled={!!busy}>
              {busy === 'paid' && <Spinner className="h-4 w-4 text-white" />} Payment received — confirm order
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setMode(null)}>
              Back
            </button>
          </div>
        </form>
      )}

      {(mode === 'ship' || mode === 'tracking') && (
        <form
          className="grid gap-3 rounded-lg bg-stone-100 p-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (mode === 'ship') status('shipped', { courier: courier.trim(), trackingNo: tracking.trim(), note: note.trim() || null })
            else act('tracking', () => api.updateTracking(o.id, courier.trim(), tracking.trim()))
          }}
        >
          <Field label="Courier" htmlFor="ship-courier">
            <input id="ship-courier" className="input" list="couriers" value={courier} onChange={(e) => setCourier(e.target.value)} required maxLength={60} />
            <datalist id="couriers">
              {COURIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Tracking no." htmlFor="ship-tracking">
            <input id="ship-tracking" className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} required maxLength={60} />
          </Field>
          {mode === 'ship' && (
            <Field label="Note for the customer" htmlFor="ship-note" optional className="sm:col-span-2">
              <input id="ship-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            </Field>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn btn-sm bg-noir text-ivory" disabled={!!busy || !courier.trim() || !tracking.trim()}>
              {busy && <Spinner className="h-4 w-4 text-white" />} {mode === 'ship' ? 'Save & mark shipped' : 'Save tracking'}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setMode(null)}>
              Back
            </button>
          </div>
        </form>
      )}

      {mode === 'cancel' && (
        <form className="rounded-lg bg-red-50 p-3" onSubmit={(e) => { e.preventDefault(); status('cancelled', { note: note.trim() || null }) }}>
          <Field label="Reason (shown to the customer)" htmlFor="cancel-note" optional>
            <input id="cancel-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Customer asked to cancel" />
          </Field>
          <p className="mt-2 text-xs text-red-800">
            The stock goes back on sale.{o.payment_status === 'paid' ? ' This order was paid — remember to refund the customer.' : ''}
          </p>
          <div className="mt-2 flex gap-2">
            <button type="submit" className="btn-danger btn-sm" disabled={!!busy}>
              {busy === 'cancelled' && <Spinner className="h-4 w-4" />} Cancel order
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setMode(null)}>
              Back
            </button>
          </div>
        </form>
      )}
      <ErrorBox error={error} />
    </div>
  )
}

function Notifications({ order: o, onChanged }) {
  const { busy, error, run } = useAction()
  const [info, setInfo] = useState(null)
  const kinds = [
    ['confirmed', 'order_confirmed', 'Confirmation'],
    ['shipped', 'order_shipped', 'Shipping'],
  ].filter(([s]) => (s === 'confirmed' ? ['confirmed', 'packed', 'shipped', 'delivered'] : ['shipped', 'delivered']).includes(o.status))
  const label = { owner_new_order: 'New-order alert to you', order_confirmed: 'Confirmation to customer', order_shipped: 'Shipping email to customer' }

  return (
    <Panel title="Emails" description="Customers get an email (if they gave one) when their order is confirmed and when it ships.">
      {o.notifications.length === 0 ? (
        <p className="text-sm text-stone-500">Nothing sent yet.</p>
      ) : (
        <ul className="space-y-1.5 text-sm" data-testid="notifications">
          {o.notifications.map((n, i) => (
            <li key={i} className="flex flex-wrap gap-x-2">
              <span className="text-stone-500">{formatDateTime(n.sent_at)}</span>
              <span>{label[n.kind] || n.kind}</span>
              <span className={n.status === 'sent' ? 'text-emerald-700' : n.status === 'failed' ? 'text-red-700' : 'text-stone-500'}>
                {n.channel}: {n.status}
              </span>
              {n.error && <span className="text-xs text-stone-500">({n.error})</span>}
            </li>
          ))}
        </ul>
      )}
      {o.customer.email && kinds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {kinds.map(([, kind, name]) => (
            <button
              key={kind}
              type="button"
              className="btn-ghost btn-sm"
              disabled={!!busy}
              onClick={() =>
                run(kind, async () => {
                  await api.resendOrderEmail(o.id, kind)
                  setInfo(`${name} email sent again.`)
                  onChanged()
                })
              }
            >
              {busy === kind ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />} Resend {name.toLowerCase()} email
            </button>
          ))}
        </div>
      )}
      {info && <p className="mt-2 text-xs text-emerald-700">{info}</p>}
      <ErrorBox error={error} />
    </Panel>
  )
}

function AdminNotes({ order: o }) {
  const [notes, setNotes] = useState(o.admin_notes || '')
  const [saved, setSaved] = useState(false)
  const { busy, error, run } = useAction()
  return (
    <Panel title="Private notes" description="Only you see these.">
      <textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Private notes" maxLength={2000} />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={!!busy}
          onClick={() =>
            run('notes', async () => {
              await api.saveOrderNotes(o.id, notes.trim())
              setSaved(true)
              setTimeout(() => setSaved(false), 2000)
            })
          }
        >
          Save notes
        </button>
        <SavedFlash show={saved} />
      </div>
      <ErrorBox error={error} />
    </Panel>
  )
}

export function AdminOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const order = useAsync(() => api.adminGetOrder(id), [id])
  const [o, setO] = useState(null)
  useEffect(() => setO(order.data || null), [order.data])

  if (order.loading && !o) return <Loading />
  if (order.error) return <ErrorBox error={order.error} onRetry={order.reload} />
  if (!o) return <p className="text-stone-600">Order not found.</p>

  const a = o.shipping
  const addressText = `${o.customer.name}\n${o.customer.phone}\n${a.address_line}, Brgy. ${a.barangay}\n${a.city}, ${a.province}${a.zip ? ` ${a.zip}` : ''}${a.landmark ? `\nLandmark: ${a.landmark}` : ''}`
  const smsHref = `sms:${o.customer.phone.replace(/[^\d+]/g, '')}`

  return (
    <div data-testid="admin-order-detail">
      <AdminTitle
        title={o.order_no}
        back={
          <button type="button" onClick={() => navigate(-1)} className="mb-1 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-noir">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      >
        <StatusBadge status={o.status} />
        <PaymentPill order={o} />
      </AdminTitle>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Panel title="Next step">
            <OrderActions order={o} onChanged={() => order.reload()} />
            {o.status === 'awaiting_payment' && o.expires_at && o.payment_status === 'unpaid' && (
              <p className="mt-3 text-xs text-amber-800">Auto-cancels {formatDateTime(o.expires_at)} if not paid.</p>
            )}
            {o.cancelled_reason && <p className="mt-3 text-sm text-stone-600">Cancelled: {o.cancelled_reason}</p>}
          </Panel>

          <Panel title="Items">
            <OrderItems order={o} />
          </Panel>

          <Panel title="Timeline">
            <OrderTimeline order={o} />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Customer">
            <p className="text-noir">{o.customer.name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={telLink(o.customer.phone)} className="btn-secondary btn-sm">
                <Phone className="h-4 w-4" /> {o.customer.phone}
              </a>
              <a href={smsHref} className="btn-secondary btn-sm">
                <MessageSquare className="h-4 w-4" /> SMS
              </a>
              {o.customer.email && (
                <a href={`mailto:${encodeURIComponent(o.customer.email)}?subject=${encodeURIComponent(`Your order ${o.order_no}`)}`} className="btn-secondary btn-sm">
                  <Mail className="h-4 w-4" /> {o.customer.email}
                </a>
              )}
            </div>
          </Panel>

          <Panel title="Ship to" actions={<CopyText text={addressText} label="Copy address" />}>
            <p className="text-sm whitespace-pre-line text-stone-700" data-testid="admin-address">
              {addressText}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              Zone: {a.zone_name}
              {a.eta ? ` · ${a.eta}` : ''}
            </p>
            {o.notes && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Customer note:</strong> {o.notes}
              </p>
            )}
          </Panel>

          <Panel title="Payment">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Method</dt>
                <dd>{PAYMENT_METHOD[o.payment_method]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Status</dt>
                <dd>{PAYMENT_STATUS[o.payment_status]}</dd>
              </div>
              {o.gcash_reference && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">GCash ref.</dt>
                  <dd className="font-mono">{o.gcash_reference}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-stone-500">Total</dt>
                <dd className="font-medium">{formatMoney(o.total)}</dd>
              </div>
              {o.paid_at && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">Paid</dt>
                  <dd>{formatDateTime(o.paid_at)}</dd>
                </div>
              )}
            </dl>
          </Panel>

          {(o.courier || o.tracking_no) && (
            <Panel title="Shipping">
              <p className="text-sm">
                {o.courier} · <span className="font-mono">{o.tracking_no}</span>
              </p>
            </Panel>
          )}

          <Notifications order={o} onChanged={order.reload} />
          <AdminNotes order={o} />
        </div>
      </div>
    </div>
  )
}
