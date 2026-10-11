import { useMemo } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../lib/StoreContext.jsx'
import { useSeo } from '../lib/useSeo.js'
import { availableStock, priceRange } from '../lib/catalog.js'
import { EmptyState, PageHeader } from '../components/ui.jsx'
import ProductCard from '../components/ProductCard.jsx'

const SORTS = {
  featured: { label: 'Featured', fn: (a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order },
  'price-asc': { label: 'Price: low to high', fn: (a, b) => priceRange(a).min - priceRange(b).min },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => priceRange(b).min - priceRange(a).min },
  newest: { label: 'Newest', fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
}

export default function Shop() {
  const { products, categories } = useStore()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'featured'
  const q = params.get('q') || ''
  const showSearch = params.has('search') || !!q

  useSeo({
    title: 'Shop',
    description: 'Shop Kryztal Lumi beauty: Crystal Blush and more. Cash on delivery, fast shipping nationwide in the Philippines.',
  })

  // Only show categories that actually have products.
  const usedCategories = categories.filter((c) => products.some((p) => p.category_id === c.id))
  const list = useMemo(() => {
    const cat = categories.find((c) => c.slug === category)
    return products
      .filter((p) => !cat || p.category_id === cat.id)
      .filter((p) => !q.trim() || `${p.name} ${p.subtitle || ''} ${p.description || ''}`.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => Number(availableStock(a) <= 0) - Number(availableStock(b) <= 0) || SORTS[sort].fn(a, b))
  }, [products, categories, category, sort, q])

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="pb-20">
      <PageHeader eyebrow="The collection" title="Shop">
        Crystal-clear beauty, made to glow on every skin tone.
      </PageHeader>
      <div className="container-page pt-8">
        {showSearch && (
          <label className="mb-6 flex items-center gap-3 border-b border-noir pb-2">
            <Search className="h-5 w-5 text-muted" aria-hidden="true" />
            <span className="sr-only">Search products</span>
            <input
              type="search"
              autoFocus
              value={q}
              onChange={(e) => update('q', e.target.value)}
              placeholder="Search products…"
              className="w-full bg-transparent py-2 text-lg text-noir placeholder:text-stone-400 focus:outline-none"
            />
          </label>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-100 pb-5">
          {usedCategories.length > 0 ? (
            <nav className="-mx-1 flex flex-wrap gap-2" aria-label="Categories">
              {[{ slug: '', name: 'All' }, ...usedCategories].map((c) => (
                <button
                  key={c.slug || 'all'}
                  type="button"
                  onClick={() => update('category', c.slug)}
                  aria-pressed={category === c.slug}
                  className={`rounded-full border px-4 py-1.5 text-xs tracking-[0.15em] uppercase transition ${
                    category === c.slug ? 'border-noir bg-noir text-ivory' : 'border-rose-200 text-noir hover:border-noir'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </nav>
          ) : (
            <p className="text-sm text-muted">
              {products.length} product{products.length === 1 ? '' : 's'}
            </p>
          )}
          <label className="flex items-center gap-2 text-sm text-muted">
            Sort
            <select className="input w-auto! py-1.5!" value={sort} onChange={(e) => update('sort', e.target.value === 'featured' ? '' : e.target.value)}>
              {Object.entries(SORTS).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {list.length === 0 ? (
          <div className="mt-10">
            <EmptyState>{q ? `No products match “${q}”.` : 'No products here yet — check back soon.'}</EmptyState>
          </div>
        ) : (
          <div
            className={`mt-10 grid gap-x-4 gap-y-12 sm:gap-x-6 ${
              list.length === 1 ? 'mx-auto max-w-sm' : 'grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
