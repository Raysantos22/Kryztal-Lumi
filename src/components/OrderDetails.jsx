import { Check, Package, X } from 'lucide-react'
import { useStore } from '../lib/StoreContext.jsx'
import { ORDER_STATUS, PAYMENT_METHOD, formatDateTime, formatMoney } from '../lib/format.js'
import { ImagePlaceholder, StatusBadge } from './ui.jsx'
import { CopyButton, GcashDetails, GcashReferenceForm } from './GcashPayment.jsx'

const STEPS = [
  { key: 'placed', label: 'Order placed', statuses: ['new', 'awaiting_payment'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['confirmed'] },
  { key: 'packed', label: 'Packed', statuses: ['packed'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered'] },
]
const STEP_INDEX = { new: 0, awaiting_payment: 0, confirmed: 1, packed: 2, shipped: 3, delivered: 4 }

// Progress steps + every update with its time.
export function OrderTimeline({ order }) {
  const ended = order.status === 'cancelled' || order.status === 'returned'
  // Furthest step reached (for cancelled/returned orders, from their history).
  const reached = ended
    ? Math.max(0, ...order.timeline.map((e) => STEP_INDEX[e.status] ?? -1))
    : STEP_INDEX[order.status] ?? 0
  const firstAt = (statuses) => order.timeline.find((e) => statuses.includes(e.status))?.created_at

  return (
    <div>
      <ol className="grid gap-0 sm:grid-cols-5" aria-label="Order progress" data-testid="order-steps">
        {STEPS.map((s, i) => {
          const done = i <= reached && !(ended && i > reached)
          const current = !ended && i === reached
          return (
            <li key={s.key} className="relative flex gap-3 pb-6 sm:flex-col sm:items-center sm:pb-0 sm:text-center" aria-current={current ? 'step' : undefined}>
              {i < STEPS.length - 1 && (
                <span
                  className={`absolute top-8 left-[0.95rem] h-[calc(100%-2rem)] w-px sm:top-[0.95rem] sm:left-[calc(50%+1.2rem)] sm:h-px sm:w-[calc(100%-2.4rem)] ${
                    i < reached ? 'bg-rose-500' : 'bg-rose-200'
                  }`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs ${
                  done ? 'border-rose-600 bg-rose-600 text-white' : 'border-rose-200 bg-white text-rose-300'
                } ${current ? 'ring-4 ring-rose-100' : ''}`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="sm:mt-2">
                <span className={`block text-sm ${done ? 'text-noir' : 'text-muted'}`}>{s.label}</span>
                {done && firstAt(s.statuses) && <span className="block text-xs text-muted">{formatDateTime(firstAt(s.statuses))}</span>}
              </span>
            </li>
          )
        })}
      </ol>
      {ended && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-stone-100 p-3 text-sm text-stone-700">
          <X className="h-4 w-4" aria-hidden="true" />
          {ORDER_STATUS[order.status].label}
          {order.cancelled_reason ? ` — ${order.cancelled_reason}` : ''}
        </p>
      )}
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-muted hover:text-noir">All updates ({order.timeline.length})</summary>
        <ul className="mt-3 space-y-2 border-l border-rose-200 pl-4">
          {[...order.timeline].reverse().map((e, i) => (
            <li key={i}>
              <span className="text-xs text-muted">{formatDateTime(e.created_at)}</span> ·{' '}
              <span className="text-noir">{ORDER_STATUS[e.status]?.label}</span>
              {e.note && <span className="text-muted"> — {e.note}</span>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

export function OrderItems({ order }) {
  return (
    <div>
      <ul className="divide-y divide-rose-100">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center gap-4 py-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-blush-100">
              {i.image_url ? <img src={i.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImagePlaceholder className="h-full w-full" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-noir">{i.product_name}</p>
              <p className="text-xs text-muted">
                {i.variant_name ? `${i.variant_name} · ` : ''}
                {i.quantity} × {formatMoney(i.unit_price)}
              </p>
            </div>
            <p className="text-sm tabular-nums">{formatMoney(i.line_total)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1.5 border-t border-rose-100 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Shipping ({order.shipping.zone_name})</dt>
          <dd className="tabular-nums">{Number(order.shipping_fee) === 0 ? 'FREE' : formatMoney(order.shipping_fee)}</dd>
        </div>
        <div className="flex justify-between border-t border-rose-100 pt-2 font-display text-xl text-noir">
          <dt>Total</dt>
          <dd className="tabular-nums" data-testid="order-total">
            {formatMoney(order.total)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function OrderAddress({ order }) {
  const a = order.shipping
  return (
    <address className="text-sm leading-relaxed text-ink/85 not-italic">
      <strong className="font-medium text-noir">{order.customer.name}</strong>
      <br />
      {order.customer.phone}
      {order.customer.email && (
        <>
          <br />
          {order.customer.email}
        </>
      )}
      <br />
      {a.address_line}, Brgy. {a.barangay}
      <br />
      {a.city}, {a.province}
      {a.zip ? ` ${a.zip}` : ''}
      {a.landmark && (
        <>
          <br />
          <span className="text-muted">Landmark: {a.landmark}</span>
        </>
      )}
    </address>
  )
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-rose-100 sm:p-6 ${className}`}>
      {title && <h2 className="mb-4 tracked-caps font-sans text-[0.68rem] text-rose-700">{title}</h2>}
      {children}
    </section>
  )
}

// Everything a customer needs about their order.
export default function OrderDetails({ order, phone, onUpdated }) {
  const { settings } = useStore()
  const awaitingGcash = order.payment_method === 'gcash' && order.status === 'awaiting_payment'

  return (
    <div className="space-y-5" data-testid="order-details">
      {awaitingGcash && (
        <Card title="Pay with GCash" className="ring-amber-200">
          {order.payment_status === 'submitted' ? (
            <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              Reference <strong>{order.gcash_reference}</strong> received — we&apos;ll confirm your order once we verify the payment.
            </p>
          ) : (
            <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Your items are reserved. Please pay within the time below or the order is cancelled automatically
              {order.expires_at ? ` (${formatDateTime(order.expires_at)})` : ''}.
            </p>
          )}
          <GcashDetails settings={settings} amount={order.total} />
          <GcashReferenceForm order={order} phone={phone} settings={settings} onUpdated={onUpdated} />
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Order number</p>
            <p className="flex items-center gap-2 font-display text-3xl text-noir" data-testid="order-no">
              {order.order_no}
            </p>
            <p className="mt-1 text-xs text-muted">Placed {formatDateTime(order.created_at)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-6">
          <OrderTimeline order={order} />
        </div>
      </Card>

      {(order.courier || order.tracking_no) && (
        <Card title="Shipping">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3" data-testid="tracking">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-rose-600" aria-hidden="true" />
              <div>
                <p className="text-xs text-muted">Courier</p>
                <p className="text-noir">{order.courier}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted">Tracking no.</p>
              <p className="flex items-center gap-2 text-noir">
                <span className="font-mono">{order.tracking_no}</span> <CopyButton text={order.tracking_no} />
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Track your parcel on the courier&apos;s website or app with this number.</p>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <Card title="Items">
          <OrderItems order={order} />
        </Card>
        <div className="space-y-5">
          <Card title="Delivery">
            <OrderAddress order={order} />
            {order.shipping.eta && <p className="mt-3 text-xs text-muted">Usually {order.shipping.eta} after shipping.</p>}
          </Card>
          <Card title="Payment">
            <p className="text-sm text-noir">{PAYMENT_METHOD[order.payment_method]}</p>
            <p className="mt-1 text-xs text-muted">
              {order.payment_status === 'paid'
                ? 'Paid — thank you!'
                : order.payment_method === 'cod'
                  ? `Pay ${formatMoney(order.total)} in cash to the courier on delivery.`
                  : order.payment_status === 'submitted'
                    ? 'Reference submitted, waiting for verification.'
                    : order.status === 'cancelled'
                      ? 'Not paid.'
                      : 'Waiting for your GCash payment.'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
