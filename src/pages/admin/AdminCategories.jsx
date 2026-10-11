import { useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { api } from '../../lib/api/index.js'
import { useAsync } from '../../lib/useAsync.js'
import { useStore } from '../../lib/StoreContext.jsx'
import { slugify } from '../../lib/format.js'
import { EmptyState, ErrorBox, Field, Loading, Spinner } from '../../components/ui.jsx'
import { AdminTitle, Panel, num, useAction } from './adminUi.jsx'

// Categories are optional: the shop only shows category filters once a
// category has products in it.
export default function AdminCategories() {
  const store = useStore()
  const list = useAsync(() => api.listCategories({ includeInactive: true }), [])
  const products = useAsync(() => api.listProducts({ includeInactive: true }), [])
  const { busy, error, run } = useAction()
  const [rows, setRows] = useState({})
  const [draft, setDraft] = useState('')

  const refresh = async () => {
    await list.reload()
    store.reload()
  }
  const value = (c, k) => rows[c.id]?.[k] ?? c[k]
  const setRow = (id, k, v) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }))
  const count = (id) => (products.data || []).filter((p) => p.category_id === id).length

  return (
    <div>
      <AdminTitle title="Categories" />
      <Panel description="Optional. Use them once you sell more than a few products (e.g. Cheeks, Lips, Skincare, Accessories). Assign products to a category on the product page.">
        {list.loading && !list.data ? (
          <Loading />
        ) : (
          <>
            {list.data?.length === 0 && <EmptyState>No categories yet.</EmptyState>}
            <ul className="divide-y divide-stone-100">
              {(list.data || []).map((c) => (
                <li key={c.id} className="flex flex-wrap items-end gap-2 py-3" data-testid="admin-category">
                  <Field label="Name" htmlFor={`c-name-${c.id}`} className="min-w-40 flex-1">
                    <input id={`c-name-${c.id}`} className="input" value={value(c, 'name')} onChange={(e) => setRow(c.id, 'name', e.target.value)} />
                  </Field>
                  <Field label="Order" htmlFor={`c-sort-${c.id}`} className="w-20">
                    <input id={`c-sort-${c.id}`} className="input" type="number" value={value(c, 'sort_order')} onChange={(e) => setRow(c.id, 'sort_order', e.target.value)} />
                  </Field>
                  <label className="flex items-center gap-2 pb-2.5 text-sm">
                    <input type="checkbox" checked={value(c, 'is_active')} onChange={(e) => setRow(c.id, 'is_active', e.target.checked)} /> Visible
                  </label>
                  <span className="pb-2.5 text-xs text-stone-500">{count(c.id)} products</span>
                  <button
                    type="button"
                    className="btn-secondary btn-sm mb-1"
                    disabled={!!busy}
                    onClick={() =>
                      run(c.id, async () => {
                        await api.saveCategory({ id: c.id, name: value(c, 'name').trim(), sort_order: num(value(c, 'sort_order')) ?? 0, is_active: value(c, 'is_active') })
                        setRows((r) => ({ ...r, [c.id]: undefined }))
                        await refresh()
                      })
                    }
                  >
                    {busy === c.id ? <Spinner className="h-3 w-3" /> : <Save className="h-3.5 w-3.5" />} Save
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm mb-1 text-red-700"
                    aria-label={`Delete ${c.name}`}
                    onClick={() => window.confirm(`Delete ${c.name}? Its products stay, without a category.`) && run(`del-${c.id}`, async () => { await api.deleteCategory(c.id); await refresh() })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <form
          className="mt-4 flex flex-wrap items-end gap-2 rounded-lg bg-stone-50 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            const name = draft.trim()
            if (!name) return
            run('add', async () => {
              await api.saveCategory({ name, slug: slugify(name), sort_order: (list.data?.length || 0) + 1 })
              setDraft('')
              await refresh()
            })
          }}
        >
          <Field label="New category" htmlFor="c-new" className="min-w-48 flex-1">
            <input id="c-new" className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Cheeks" maxLength={80} />
          </Field>
          <button type="submit" className="btn-primary" disabled={!draft.trim() || busy === 'add'}>
            <Plus className="h-4 w-4" /> Add category
          </button>
        </form>
        <ErrorBox error={error || list.error} />
      </Panel>
    </div>
  )
}
