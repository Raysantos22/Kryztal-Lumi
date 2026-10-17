import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react'
import { api } from '../../lib/api/index.js'
import { useAsync } from '../../lib/useAsync.js'
import { useStore } from '../../lib/StoreContext.jsx'
import { availableStock, hasVariants, priceRange } from '../../lib/catalog.js'
import { formatMoney, slugify } from '../../lib/format.js'
import { EmptyState, ErrorBox, Field, ImagePlaceholder, Loading, Spinner } from '../../components/ui.jsx'
import { AdminTitle, ImageUpload, Panel, SavedFlash, Toggle, num, useAction } from './adminUi.jsx'

export function AdminProducts() {
  const store = useStore()
  const list = useAsync(() => api.listProducts({ includeInactive: true }), [])
  const { busy, error, run } = useAction()
  const navigate = useNavigate()
  const threshold = store.settings?.low_stock_threshold ?? 5

  const refresh = async () => {
    await list.reload()
    store.reload()
  }
  const toggleActive = (p) => run(p.id, async () => {
    await api.saveProduct({ id: p.id, is_active: !p.is_active })
    await refresh()
  })

  return (
    <div>
      <AdminTitle title="Products">
        <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/admin/products/new')}>
          <Plus className="h-4 w-4" /> Add product
        </button>
      </AdminTitle>
      <ErrorBox error={error || list.error} onRetry={list.error ? list.reload : undefined} />
      {list.loading && !list.data ? (
        <Loading />
      ) : list.data?.length === 0 ? (
        <EmptyState>No products yet.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {(list.data || []).map((p) => {
            const stock = availableStock(p)
            const { min, max } = priceRange(p)
            return (
              <li key={p.id} className={`flex flex-wrap items-center gap-4 rounded-xl border border-stone-200 bg-white p-3 ${p.is_active ? '' : 'opacity-60'}`} data-testid="admin-product">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-blush-100">
                  {p.images[0] ? <img src={p.images[0].url} alt="" className="h-full w-full object-cover" /> : <ImagePlaceholder className="h-full w-full" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-noir">
                    {p.name} {!p.is_active && <span className="badge bg-stone-200 text-stone-700">Hidden</span>}
                    {p.is_featured && <span className="badge ml-1 bg-rose-100 text-rose-800">Featured</span>}
                  </p>
                  <p className="text-sm text-stone-600">
                    {min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`}
                    {hasVariants(p) && ` · ${p.variants.filter((v) => v.is_active).length} ${p.variant_label.toLowerCase()}s`}
                  </p>
                  <p className={`text-xs ${stock <= 0 ? 'text-red-700' : stock <= threshold ? 'text-amber-700' : 'text-stone-500'}`} data-testid="admin-product-stock">
                    {stock === Infinity ? 'Stock not tracked' : stock <= 0 ? 'Sold out' : `${stock} in stock`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => toggleActive(p)} disabled={busy === p.id} aria-label={`${p.is_active ? 'Hide' : 'Show'} ${p.name}`}>
                    {p.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {p.is_active ? 'Hide' : 'Show'}
                  </button>
                  <Link to={`/admin/products/${p.id}`} className="btn-secondary btn-sm" aria-label={`Edit ${p.name}`}>
                    Edit
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const PRODUCT_FIELDS = [
  'name', 'slug', 'subtitle', 'description', 'details', 'ingredients', 'highlights', 'specs', 'price', 'compare_at_price',
  'track_stock', 'variant_label', 'max_per_order', 'category_id', 'is_active', 'is_featured', 'badge_new', 'badge_bestseller', 'sort_order',
]
const NEW_PRODUCT = {
  name: '', slug: '', subtitle: '', description: '', details: '', ingredients: '', highlights: '', specs: [], price: '', compare_at_price: '',
  stock: 0, track_stock: true, variant_label: 'Shade', max_per_order: 10, category_id: '', is_active: false, is_featured: false,
  badge_new: true, badge_bestseller: false, sort_order: 10,
}

function toRow(f) {
  const row = {}
  for (const k of PRODUCT_FIELDS) row[k] = f[k]
  row.price = num(f.price)
  row.compare_at_price = num(f.compare_at_price)
  row.max_per_order = num(f.max_per_order) ?? 10
  row.sort_order = num(f.sort_order) ?? 0
  row.category_id = f.category_id || null
  row.specs = (f.specs || []).filter((s) => s.label?.trim() && s.value?.trim()).map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
  for (const k of ['subtitle', 'description', 'details', 'ingredients']) row[k] = f[k]?.trim() || null
  row.highlights = String(f.highlights || '')
    .split('\n')
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, 12)
  row.name = f.name.trim()
  row.slug = slugify(f.slug || f.name)
  row.variant_label = f.variant_label?.trim() || 'Option'
  return row
}

function validateProduct(row) {
  if (!row.name) return 'Please enter a name.'
  if (!row.slug) return 'Please enter a link name (slug).'
  if (row.price == null || Number.isNaN(row.price) || row.price < 0) return 'Please enter a valid price.'
  if (row.compare_at_price != null && (Number.isNaN(row.compare_at_price) || row.compare_at_price < 0)) return 'Compare-at price is not valid.'
  return null
}

function VariantsPanel({ product, onChanged }) {
  const { busy, error, run } = useAction()
  const [rows, setRows] = useState(product.variants)
  useEffect(() => setRows(product.variants), [product.variants])
  const [draft, setDraft] = useState({ name: '', price: product.price, stock: 0, sku: '', swatch: '' })

  const setRow = (id, k, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)))
  const saveRow = (r) =>
    run(r.id, async () => {
      const stock = num(r.stock)
      if (!Number.isInteger(stock) || stock < 0) throw new Error('Stock must be a whole number (0 or more).')
      await api.saveVariant({
        id: r.id,
        name: r.name.trim(),
        sku: r.sku?.trim() || null,
        price: num(r.price),
        swatch: r.swatch || null,
        is_active: r.is_active,
      })
      const loaded = product.variants.find((v) => v.id === r.id)
      if (loaded && stock !== loaded.stock) await api.setStock(product.id, r.id, loaded.stock, stock)
      await onChanged()
    })
  const add = (e) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    run('add', async () => {
      await api.saveVariant({
        product_id: product.id,
        name: draft.name.trim(),
        sku: draft.sku.trim() || null,
        price: num(draft.price) ?? product.price,
        stock: num(draft.stock) ?? 0,
        swatch: draft.swatch || null,
        sort_order: rows.length + 1,
      })
      setDraft({ name: '', price: product.price, stock: 0, sku: '', swatch: '' })
      await onChanged()
    })
  }

  return (
    <Panel
      title={`Variants (${product.variant_label.toLowerCase()}s)`}
      description="Optional. When a product has active variants, customers must pick one and each variant has its own price and stock."
    >
      {rows.length > 0 && (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-stone-500">
              <tr>
                <th className="px-1 py-1 font-normal">Name</th>
                <th className="px-1 py-1 font-normal">SKU</th>
                <th className="px-1 py-1 font-normal">Price</th>
                <th className="px-1 py-1 font-normal">Stock</th>
                <th className="px-1 py-1 font-normal">Swatch</th>
                <th className="px-1 py-1 font-normal">Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-1 py-1"><input className="input py-1.5!" aria-label="Variant name" value={r.name} onChange={(e) => setRow(r.id, 'name', e.target.value)} /></td>
                  <td className="px-1 py-1"><input className="input py-1.5!" aria-label="SKU" value={r.sku || ''} onChange={(e) => setRow(r.id, 'sku', e.target.value)} /></td>
                  <td className="px-1 py-1"><input className="input w-24 py-1.5!" aria-label="Variant price" type="number" min="0" step="0.01" value={r.price} onChange={(e) => setRow(r.id, 'price', e.target.value)} /></td>
                  <td className="px-1 py-1"><input className="input w-20 py-1.5!" aria-label="Variant stock" type="number" min="0" step="1" value={r.stock} onChange={(e) => setRow(r.id, 'stock', e.target.value)} /></td>
                  <td className="px-1 py-1"><input type="color" aria-label="Swatch colour" className="h-9 w-12 rounded border border-rose-200" value={r.swatch || '#d99a95'} onChange={(e) => setRow(r.id, 'swatch', e.target.value)} /></td>
                  <td className="px-1 py-1"><input type="checkbox" aria-label="Variant active" checked={r.is_active} onChange={(e) => setRow(r.id, 'is_active', e.target.checked)} /></td>
                  <td className="px-1 py-1 whitespace-nowrap">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => saveRow(r)} disabled={!!busy}>
                      {busy === r.id ? <Spinner className="h-3 w-3" /> : <Save className="h-3 w-3" />} Save
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm text-red-700"
                      aria-label={`Delete ${r.name}`}
                      onClick={() => window.confirm(`Delete ${r.name}? Past orders keep their details.`) && run(`del-${r.id}`, async () => { await api.deleteVariant(r.id); await onChanged() })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form onSubmit={add} className="mt-4 grid gap-2 rounded-lg bg-stone-50 p-3 sm:grid-cols-[1.4fr_1fr_0.8fr_0.7fr_auto] sm:items-end">
        <Field label="New variant" htmlFor="v-name">
          <input id="v-name" className="input" placeholder={`e.g. ${product.variant_label === 'Size' ? 'Large' : 'Rose'}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="SKU" htmlFor="v-sku" optional>
          <input id="v-sku" className="input" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
        </Field>
        <Field label="Price" htmlFor="v-price">
          <input id="v-price" className="input" type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        </Field>
        <Field label="Stock" htmlFor="v-stock">
          <input id="v-stock" className="input" type="number" min="0" step="1" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
        </Field>
        <button type="submit" className="btn-primary" disabled={busy === 'add' || !draft.name.trim()}>
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
      <ErrorBox error={error} />
    </Panel>
  )
}

function ImagesPanel({ product, onChanged }) {
  const { busy, error, run } = useAction()
  const images = product.images
  const move = (i, dir) =>
    run(`move-${i}`, async () => {
      const a = images[i]
      const b = images[i + dir]
      if (!a || !b) return
      // Re-number everything so equal sort orders can't get stuck.
      const ordered = [...images]
      ordered[i] = b
      ordered[i + dir] = a
      await Promise.all(ordered.map((img, n) => api.saveProductImage({ id: img.id, sort_order: n + 1 })))
      await onChanged()
    })

  return (
    <Panel title="Photos" description="The first photo is the main one on the shop and in social previews. Square photos look best (at least 1200 × 1200).">
      {images.length === 0 && <p className="mb-3 text-sm text-stone-500">No photos yet.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id} className="rounded-lg border border-stone-200 p-2" data-testid="admin-image">
            <img src={img.url} alt={img.alt || ''} className="aspect-square w-full rounded object-cover" loading="lazy" />
            <input
              className="input mt-2 py-1.5! text-xs!"
              defaultValue={img.alt || ''}
              placeholder="Describe the photo"
              aria-label="Photo description"
              onBlur={(e) => e.target.value !== (img.alt || '') && run(`alt-${img.id}`, () => api.saveProductImage({ id: img.id, alt: e.target.value.trim() || null }))}
            />
            <div className="mt-1 flex justify-between">
              <div>
                <button type="button" className="btn-ghost btn-sm" disabled={i === 0 || !!busy} onClick={() => move(i, -1)} aria-label="Move photo earlier">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="btn-ghost btn-sm" disabled={i === images.length - 1 || !!busy} onClick={() => move(i, 1)} aria-label="Move photo later">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                className="btn-ghost btn-sm text-red-700"
                aria-label="Delete photo"
                onClick={() => window.confirm('Delete this photo?') && run(`del-${img.id}`, async () => { await api.deleteProductImage(img); await onChanged() })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <ImageUpload
        className="mt-4"
        folder="products"
        label="Upload photos"
        multiple
        onUploaded={async ({ url, path }) => {
          await api.saveProductImage({
            product_id: product.id,
            url,
            storage_path: path,
            alt: product.name,
            // Increasing whole number (seconds) so a batch keeps upload order; "move" renumbers 1, 2, 3…
            sort_order: Math.max((images.at(-1)?.sort_order ?? 0) + 1, Math.floor(Date.now() / 1000) % 1_000_000_000),
          })
          await onChanged()
        }}
      />
      <ErrorBox error={error} />
    </Panel>
  )
}

export function AdminProductEdit() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const store = useStore()
  const products = useAsync(() => api.listProducts({ includeInactive: true }), [id])
  const categories = useAsync(() => api.listCategories({ includeInactive: true }), [])
  const product = isNew ? null : products.data?.find((p) => p.id === id)
  const [f, setF] = useState(null)
  const [saved, setSaved] = useState(false)
  const { busy, error, setError, run } = useAction()

  useEffect(() => {
    if (isNew) setF({ ...NEW_PRODUCT })
    else if (product) setF({ ...product, highlights: (product.highlights || []).join('\n'), price: product.price, compare_at_price: product.compare_at_price ?? '', category_id: product.category_id || '' })
  }, [isNew, product])

  if (!isNew && products.loading && !products.data) return <Loading />
  if (!isNew && !product) return <ErrorBox error={products.error || 'Product not found.'} />
  if (!f) return <Loading />

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const setVal = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const refresh = async () => {
    await products.reload()
    store.reload()
  }

  const save = (e) => {
    e.preventDefault()
    const row = toRow(f)
    const stock = num(f.stock)
    const invalid = validateProduct(row) || (!Number.isInteger(stock) || stock < 0 ? 'Stock must be a whole number (0 or more).' : null)
    if (invalid) return setError(invalid)
    run('save', async () => {
      const result = await api.saveProduct(isNew ? { ...row, stock } : { id, ...row })
      // Stock is set separately and only if it was edited, with a check that
      // nobody bought / cancelled in the meantime.
      if (!isNew && stock !== product.stock) await api.setStock(id, null, product.stock, stock)
      store.reload()
      if (isNew) navigate(`/admin/products/${result.id}`, { replace: true })
      else {
        await products.reload()
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  const remove = () => {
    if (!window.confirm(`Delete ${product.name}? Past orders keep their details. Tip: "Hide" keeps it but removes it from the shop.`)) return
    run('delete', async () => {
      await api.deleteProduct(id)
      store.reload()
      navigate('/admin/products', { replace: true })
    })
  }
  const variantsActive = product && hasVariants(product)

  return (
    <div>
      <AdminTitle
        title={isNew ? 'New product' : product.name}
        back={
          <Link to="/admin/products" className="mb-1 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-noir">
            <ArrowLeft className="h-4 w-4" /> Products
          </Link>
        }
      >
        {!isNew && product.is_active && (
          <Link to={`/product/${product.slug}`} target="_blank" className="btn-ghost btn-sm">
            <Eye className="h-4 w-4" /> View in shop
          </Link>
        )}
      </AdminTitle>

      <form onSubmit={save} className="space-y-5">
        <Panel title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *" htmlFor="p-name">
              <input id="p-name" className="input" value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value, slug: isNew ? slugify(e.target.value) : x.slug }))} required maxLength={120} />
            </Field>
            <Field label="Link name (slug)" htmlFor="p-slug" hint={`Shop link: /product/${slugify(f.slug || f.name) || '…'}`}>
              <input id="p-slug" className="input" value={f.slug} onChange={set('slug')} maxLength={80} />
            </Field>
            <Field label="Short tagline" htmlFor="p-subtitle" optional className="sm:col-span-2">
              <input id="p-subtitle" className="input" value={f.subtitle || ''} onChange={set('subtitle')} maxLength={120} placeholder="e.g. Color-changing blush" />
            </Field>
            <Field label="Description" htmlFor="p-description" className="sm:col-span-2">
              <textarea id="p-description" className="input min-h-28" value={f.description || ''} onChange={set('description')} />
            </Field>
            <Field label="How to use / details" htmlFor="p-details" optional>
              <textarea id="p-details" className="input min-h-28" value={f.details || ''} onChange={set('details')} />
            </Field>
            <Field label="Ingredients" htmlFor="p-ingredients" optional>
              <textarea id="p-ingredients" className="input min-h-28" value={f.ingredients || ''} onChange={set('ingredients')} />
            </Field>
            <Field label="Highlights" htmlFor="p-highlights" optional hint="One per line, shown with hearts above the order form" className="sm:col-span-2">
              <textarea id="p-highlights" className="input min-h-24" value={f.highlights} onChange={set('highlights')} placeholder={'Color-changing formula\nCompact format\nFor cheeks'} />
            </Field>
            <Field label="Category" htmlFor="p-category" optional>
              <select id="p-category" className="input" value={f.category_id} onChange={set('category_id')}>
                <option value="">None</option>
                {(categories.data || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sort order" htmlFor="p-sort" hint="Lower numbers show first">
              <input id="p-sort" className="input" type="number" step="1" value={f.sort_order} onChange={set('sort_order')} />
            </Field>
          </div>
        </Panel>

        <Panel title="Price & stock">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Price (₱) *" htmlFor="p-price" hint={variantsActive ? 'Variants use their own prices' : undefined}>
              <input id="p-price" className="input" type="number" min="0" step="0.01" value={f.price} onChange={set('price')} required />
            </Field>
            <Field label="Compare-at price" htmlFor="p-compare" optional hint="Shown crossed out">
              <input id="p-compare" className="input" type="number" min="0" step="0.01" value={f.compare_at_price} onChange={set('compare_at_price')} />
            </Field>
            <Field label="Stock" htmlFor="p-stock" hint={variantsActive ? 'Variants have their own stock' : 'Units available'}>
              <input id="p-stock" className="input" type="number" min="0" step="1" value={f.stock} onChange={set('stock')} disabled={variantsActive} />
            </Field>
            <Field label="Max per order" htmlFor="p-max">
              <input id="p-max" className="input" type="number" min="1" max="100" step="1" value={f.max_per_order} onChange={set('max_per_order')} />
            </Field>
            <div className="sm:col-span-4">
              <Toggle id="p-track" checked={f.track_stock} onChange={(v) => setVal('track_stock', v)} label="Track stock" description="Show “Only X left” / “Sold out” and stop orders at 0." />
            </div>
          </div>
        </Panel>

        <Panel title="Visibility & badges">
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle id="p-active" checked={f.is_active} onChange={(v) => setVal('is_active', v)} label="Visible in the shop" />
            <Toggle id="p-featured" checked={f.is_featured} onChange={(v) => setVal('is_featured', v)} label="Featured" description="Shown first; Crystal Blush gets the launch home page." />
            <Toggle id="p-new" checked={f.badge_new} onChange={(v) => setVal('badge_new', v)} label="“New” badge" />
            <Toggle id="p-best" checked={f.badge_bestseller} onChange={(v) => setVal('badge_bestseller', v)} label="“Best seller” badge" />
          </div>
          <p className="mt-3 text-xs text-stone-500">“Only X left” and “Sold out” badges appear automatically from stock.</p>
        </Panel>

        <Panel title="Details table" description="Small facts shown on the product page, e.g. Net wt · 1.8 g.">
          <div className="space-y-2">
            {(f.specs || []).map((s, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" aria-label="Label" placeholder="Label" value={s.label} onChange={(e) => setVal('specs', f.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className="input" aria-label="Value" placeholder="Value" value={s.value} onChange={(e) => setVal('specs', f.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" className="btn-ghost btn-sm text-red-700" aria-label="Remove row" onClick={() => setVal('specs', f.specs.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost btn-sm" onClick={() => setVal('specs', [...(f.specs || []), { label: '', value: '' }])}>
              <Plus className="h-4 w-4" /> Add row
            </button>
          </div>
          <Field label="Variant option name" htmlFor="p-variant-label" className="mt-5 max-w-xs" hint="e.g. Shade, Size, Colour">
            <input id="p-variant-label" className="input" value={f.variant_label} onChange={set('variant_label')} maxLength={30} />
          </Field>
        </Panel>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
          <button type="submit" className="btn-primary" disabled={busy === 'save'}>
            {busy === 'save' ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />} {isNew ? 'Create product' : 'Save product'}
          </button>
          <SavedFlash show={saved} />
          {!isNew && (
            <button type="button" className="btn-danger btn-sm ml-auto" onClick={remove} disabled={!!busy}>
              <Trash2 className="h-4 w-4" /> Delete product
            </button>
          )}
          <div className="w-full">
            <ErrorBox error={error} />
          </div>
        </div>
      </form>

      {!isNew && (
        <div className="mt-5 space-y-5">
          <ImagesPanel product={product} onChanged={refresh} />
          <VariantsPanel product={product} onChanged={refresh} />
        </div>
      )}
      {isNew && <p className="mt-4 text-sm text-stone-500">Photos and variants can be added after you create the product.</p>}
    </div>
  )
}
