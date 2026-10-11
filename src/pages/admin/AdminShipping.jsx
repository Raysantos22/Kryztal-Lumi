import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { api } from '../../lib/api/index.js'
import { useAsync } from '../../lib/useAsync.js'
import { useStore } from '../../lib/StoreContext.jsx'
import { PH_PROVINCES, PH_REGIONS } from '../../lib/ph.js'
import { formatMoney } from '../../lib/format.js'
import { ErrorBox, Field, Loading, Notice, Spinner } from '../../components/ui.jsx'
import { AdminTitle, Modal, Panel, SavedFlash, num, useAction } from './adminUi.jsx'

function ZoneEditor({ zone, zones, onClose, onSaved }) {
  const [f, setF] = useState({
    name: zone?.name || '',
    fee: zone?.fee ?? '',
    delivery_time: zone?.delivery_time || '',
    provinces: zone?.provinces || [],
    is_active: zone?.is_active ?? true,
    sort_order: zone?.sort_order ?? (zones.length + 1),
  })
  const { busy, error, setError, run } = useAction()
  // Provinces already in another active zone (that zone wins if listed first).
  const taken = new Map()
  zones.filter((z) => z.id !== zone?.id && z.is_active).forEach((z) => z.provinces.forEach((p) => taken.set(p, z.name)))

  const toggle = (p) => setF((x) => ({ ...x, provinces: x.provinces.includes(p) ? x.provinces.filter((y) => y !== p) : [...x.provinces, p] }))
  const toggleRegion = (r, on) =>
    setF((x) => ({ ...x, provinces: on ? [...new Set([...x.provinces, ...r.provinces])] : x.provinces.filter((p) => !r.provinces.includes(p)) }))

  const save = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return setError('Please enter a zone name.')
    const fee = num(f.fee)
    if (fee == null || Number.isNaN(fee) || fee < 0) return setError('Please enter a valid fee (0 or more).')
    run('save', async () => {
      await api.saveShippingZone({
        ...(zone ? { id: zone.id } : {}),
        name: f.name.trim(),
        fee,
        delivery_time: f.delivery_time.trim() || null,
        provinces: f.provinces,
        is_active: f.is_active,
        sort_order: num(f.sort_order) ?? 0,
      })
      await onSaved()
      onClose()
    })
  }

  return (
    <Modal title={zone ? `Edit ${zone.name}` : 'New shipping zone'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Zone name" htmlFor="z-name">
            <input id="z-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
          </Field>
          <Field label="Fee (₱)" htmlFor="z-fee">
            <input id="z-fee" className="input" type="number" min="0" step="1" value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} />
          </Field>
          <Field label="Delivery time" htmlFor="z-eta" hint="Shown to customers">
            <input id="z-eta" className="input" value={f.delivery_time} onChange={(e) => setF({ ...f, delivery_time: e.target.value })} placeholder="e.g. 3–5 days" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active
        </label>
        <div>
          <p className="label">Provinces in this zone ({f.provinces.length})</p>
          <div className="max-h-[45vh] space-y-4 overflow-y-auto rounded-lg border border-stone-200 p-3">
            {PH_REGIONS.map((r) => {
              const all = r.provinces.every((p) => f.provinces.includes(p))
              return (
                <fieldset key={r.name}>
                  <legend className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={all} onChange={(e) => toggleRegion(r, e.target.checked)} aria-label={`All of ${r.name}`} /> {r.name}
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                    {r.provinces.map((p) => (
                      <label key={p} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={f.provinces.includes(p)} onChange={() => toggle(p)} />
                        <span className={taken.has(p) && !f.provinces.includes(p) ? 'text-stone-400' : ''}>{p}</span>
                        {taken.has(p) && f.provinces.includes(p) && <span className="text-[0.65rem] text-amber-700">(also {taken.get(p)})</span>}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )
            })}
          </div>
        </div>
        <ErrorBox error={error} />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={busy === 'save'}>
            {busy === 'save' && <Spinner className="h-4 w-4 text-white" />} Save zone
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ShippingRules() {
  const store = useStore()
  const s = store.settings
  const [f, setF] = useState(null)
  const [saved, setSaved] = useState(false)
  const { busy, error, setError, run } = useAction()
  useEffect(() => {
    if (s) setF({ free_shipping_mode: s.free_shipping_mode, free_shipping_threshold: s.free_shipping_threshold, min_order_amount: s.min_order_amount })
  }, [s])
  if (!f) return null

  const save = (e) => {
    e.preventDefault()
    const threshold = num(f.free_shipping_threshold) ?? 0
    const min = num(f.min_order_amount) ?? 0
    if (threshold < 0 || min < 0 || Number.isNaN(threshold) || Number.isNaN(min)) return setError('Amounts must be 0 or more.')
    run('save', async () => {
      const updated = await api.updateSettings({ free_shipping_mode: f.free_shipping_mode, free_shipping_threshold: threshold, min_order_amount: min })
      store.setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <Panel title="Free shipping & minimum order">
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-2" role="radiogroup" aria-label="Free shipping">
          {[
            ['off', 'No free shipping'],
            ['all', 'Free shipping on every order'],
            ['threshold', 'Free shipping above an amount'],
          ].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input type="radio" name="free-mode" value={v} checked={f.free_shipping_mode === v} onChange={() => setF({ ...f, free_shipping_mode: v })} /> {l}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {f.free_shipping_mode === 'threshold' && (
            <Field label="Free shipping from (₱)" htmlFor="free-threshold">
              <input id="free-threshold" className="input" type="number" min="0" step="1" value={f.free_shipping_threshold} onChange={(e) => setF({ ...f, free_shipping_threshold: e.target.value })} />
            </Field>
          )}
          <Field label="Minimum order (₱)" htmlFor="min-order" hint="0 = no minimum">
            <input id="min-order" className="input" type="number" min="0" step="1" value={f.min_order_amount} onChange={(e) => setF({ ...f, min_order_amount: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary btn-sm" disabled={busy === 'save'}>
            <Save className="h-4 w-4" /> Save rules
          </button>
          <SavedFlash show={saved} />
        </div>
        <ErrorBox error={error} />
      </form>
    </Panel>
  )
}

export default function AdminShipping() {
  const zones = useAsync(() => api.listShippingZones({ includeInactive: true }), [])
  const [editing, setEditing] = useState(null) // zone | 'new'
  const { error, run } = useAction()
  const all = zones.data || []
  const covered = new Set(all.filter((z) => z.is_active).flatMap((z) => z.provinces))
  const missing = PH_PROVINCES.filter((p) => !covered.has(p))

  return (
    <div>
      <AdminTitle title="Shipping">
        <button type="button" className="btn-primary btn-sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Add zone
        </button>
      </AdminTitle>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Zones" description="A customer's province picks the zone (the first active zone listing it). Customers in an unlisted province choose a zone themselves.">
          {zones.loading && !zones.data ? (
            <Loading />
          ) : (
            <ul className="divide-y divide-stone-100">
              {all.map((z) => (
                <li key={z.id} className={`flex flex-wrap items-center gap-3 py-3 ${z.is_active ? '' : 'opacity-60'}`} data-testid="admin-zone">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-noir">
                      {z.name} {!z.is_active && <span className="badge bg-stone-200 text-stone-700">Off</span>}
                    </p>
                    <p className="text-sm text-stone-600">
                      {formatMoney(z.fee)} · {z.delivery_time || 'no delivery time'} · {z.provinces.length} province{z.provinces.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(z)} aria-label={`Edit ${z.name}`}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm text-red-700"
                    aria-label={`Delete ${z.name}`}
                    onClick={() => window.confirm(`Delete the ${z.name} zone? Past orders keep their shipping details.`) && run(z.id, async () => { await api.deleteShippingZone(z.id); await zones.reload() })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {missing.length > 0 && zones.data && (
            <Notice tone="warn" className="mt-4">
              Not in any zone (customers pick a zone themselves): {missing.join(', ')}
            </Notice>
          )}
          <ErrorBox error={error || zones.error} />
        </Panel>
        <ShippingRules />
      </div>
      {editing && <ZoneEditor zone={editing === 'new' ? null : editing} zones={all} onClose={() => setEditing(null)} onSaved={zones.reload} />}
    </div>
  )
}
