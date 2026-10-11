import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { api } from '../../lib/api/index.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatMoney } from '../../lib/format.js'
import { EmptyState, ErrorBox, Loading } from '../../components/ui.jsx'
import { AdminTitle, Panel } from './adminUi.jsx'
import { OrderRow } from './AdminOrders.jsx'

function Stat({ label, value, sub, to, testId, highlight = false }) {
  const body = (
    <>
      <p className="text-[0.68rem] tracking-[0.15em] text-stone-500 uppercase">{label}</p>
      <p className={`mt-1 font-display text-3xl ${highlight ? 'text-rose-700' : 'text-noir'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
    </>
  )
  const cls = `block rounded-xl border bg-white p-4 ${highlight ? 'border-rose-300' : 'border-stone-200'}`
  return to ? (
    <Link to={to} className={`${cls} transition hover:border-noir`} data-testid={testId}>
      {body}
    </Link>
  ) : (
    <div className={cls} data-testid={testId}>
      {body}
    </div>
  )
}

function OrderList({ title, filter, description, emptyText }) {
  const list = useAsync(() => api.adminListOrders({ status: filter, limit: 8 }), [filter])
  return (
    <Panel
      title={`${title}${list.data ? ` (${list.data.total})` : ''}`}
      description={description}
      actions={
        <Link to={`/admin/orders?status=${filter}`} className="text-sm text-rose-700 hover:underline">
          View all
        </Link>
      }
    >
      {list.loading && !list.data ? (
        <Loading />
      ) : (
        <>
          <ErrorBox error={list.error} onRetry={list.reload} />
          {list.data?.orders.length === 0 && <EmptyState>{emptyText}</EmptyState>}
          <ul className="-mx-2 divide-y divide-stone-100">
            {(list.data?.orders || []).map((o) => (
              <OrderRow key={o.id} order={o} compact />
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}

export default function AdminDashboard() {
  const stats = useAsync(() => api.adminStats(), [])
  const s = stats.data

  return (
    <div>
      <AdminTitle title="Dashboard">
        <Link to="/admin/orders" className="btn-secondary btn-sm">
          All orders
        </Link>
      </AdminTitle>

      <ErrorBox error={stats.error} onRetry={stats.reload} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="New orders" value={s ? s.new_orders : '—'} sub="COD, to confirm" to="/admin/orders?status=new" testId="stat-new" highlight={s?.new_orders > 0} />
        <Stat
          label="GCash to verify"
          value={s ? s.gcash_to_verify : '—'}
          sub={s ? `${s.gcash_submitted} with reference` : ''}
          to="/admin/orders?status=to_verify"
          testId="stat-gcash"
          highlight={s?.gcash_to_verify > 0}
        />
        <Stat label="To ship" value={s ? s.to_ship : '—'} sub="Confirmed / packed" to="/admin/orders?status=open" testId="stat-to-ship" />
        <Stat label="Orders this week" value={s ? s.orders_this_week : '—'} sub="Mon–Sun, excl. cancelled" testId="stat-week" />
        <Stat label="Sales this month" value={s ? formatMoney(s.sales_this_month) : '—'} sub="Confirmed → delivered" testId="stat-sales" />
        <Stat
          label="COD to collect"
          value={s ? formatMoney(s.cod_to_collect) : '—'}
          sub={s ? `${s.cod_to_collect_count} order${s.cod_to_collect_count === 1 ? '' : 's'} not yet delivered` : ''}
          to="/admin/orders?status=cod_to_collect"
          testId="stat-cod"
        />
      </div>

      {s?.low_stock?.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="low-stock">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Low stock (≤ {s.low_stock_threshold})
          </p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {s.low_stock.map((l) => (
              <li key={`${l.product_id}-${l.variant_name}`}>
                <Link to={`/admin/products/${l.product_id}`} className="inline-block rounded-full bg-white px-3 py-1 ring-1 ring-amber-200 hover:ring-amber-400">
                  {l.product_name}
                  {l.variant_name ? ` · ${l.variant_name}` : ''}: <strong>{l.stock === 0 ? 'sold out' : `${l.stock} left`}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <OrderList
          title="GCash to verify"
          filter="to_verify"
          description="Check your GCash app for the amount + reference, then open the order and mark it paid."
          emptyText="No GCash payments waiting. ✨"
        />
        <OrderList title="New COD orders" filter="new" description="Confirm them (call or message the customer if needed)." emptyText="No new orders." />
      </div>
    </div>
  )
}
