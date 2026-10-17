import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Banknote, ChevronRight, Smartphone, Truck } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { useAsync } from '../lib/useAsync.js'
import { useStore } from '../lib/StoreContext.jsx'
import { useBag } from '../lib/BagContext.jsx'
import { useSeo } from '../lib/useSeo.js'
import { SITE_URL } from '../lib/config.js'
import { activeVariants, availableStock, hasVariants, priceRange, productBadges, productImages } from '../lib/catalog.js'
import { formatMoney } from '../lib/format.js'
import { FEATURES, HOW_TO, LAUNCH_SLUG, SHADE } from '../content/crystalBlush.js'
import { ErrorBox, Loading, ProductBadges, QuantityInput } from '../components/ui.jsx'
import { FeatureList } from '../components/Features.jsx'
import Gallery from '../components/Gallery.jsx'
import OrderForm, { BenefitList, PriceBlock } from '../components/OrderForm.jsx'
import NotFound from './NotFound.jsx'

const paragraphs = (text) => (text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

function productJsonLd(product, images, settings) {
  const origin = SITE_URL || window.location.origin
  const abs = (u) => (/^https?:/.test(u) ? u : `${origin}${u}`)
  const offers = (hasVariants(product) ? activeVariants(product) : [product]).map((v) => ({
    '@type': 'Offer',
    ...(v !== product ? { name: v.name, sku: v.sku || undefined } : {}),
    price: Number(v.price).toFixed(2),
    priceCurrency: settings?.currency || 'PHP',
    availability:
      availableStock(product, v === product ? null : v) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    url: `${origin}/product/${product.slug}`,
    itemCondition: 'https://schema.org/NewCondition',
  }))
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.subtitle || undefined,
    image: images.filter((i) => !i.url.startsWith('data:')).map((i) => abs(i.url)),
    brand: { '@type': 'Brand', name: settings?.store_name || 'Kryztal Lumi' },
    ...(offers.length === 1 ? { offers: offers[0] } : { offers }),
  }
}

function Section({ title, children, defaultOpen = false, id }) {
  return (
    <details className="group border-b border-rose-200" open={defaultOpen} id={id}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-2xl text-noir">
        {title}
        <span className="text-2xl leading-none text-rose-500 transition group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="pb-6 text-[0.95rem] leading-relaxed text-ink">{children}</div>
    </details>
  )
}

// Where an element is relative to the viewport: 'in', 'above' (scrolled
// past) or 'below' (not reached yet).
function useViewportPosition(ref, enabled = true) {
  const [pos, setPos] = useState('in')
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setPos(e.isIntersecting ? 'in' : e.boundingClientRect.top < 0 ? 'above' : 'below'))
    io.observe(el)
    return () => io.disconnect()
  }, [ref, enabled])
  return pos
}

export default function Product() {
  const { slug } = useParams()
  const { settings } = useStore()
  const { add, setOpen } = useBag()
  const { hash } = useLocation()
  // Always re-read the product so stock is current.
  const { data: product, loading, error, reload } = useAsync(() => api.getProduct(slug), [slug])
  const [variantId, setVariantId] = useState(null)
  const [qty, setQty] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const buyRef = useRef(null)
  const formRef = useRef(null)
  const buyPos = useViewportPosition(buyRef, !!product)
  const formPos = useViewportPosition(formRef, formOpen)

  const variants = useMemo(() => activeVariants(product), [product])
  useEffect(() => {
    // Preselect the first variant that is in stock.
    const first = variants.find((v) => !product?.track_stock || v.stock > 0) || variants[0]
    setVariantId(first?.id || null)
  }, [variants, product?.track_stock])

  const images = useMemo(() => productImages(product), [product])
  const variant = variants.find((v) => v.id === variantId) || null
  const needsVariant = variants.length > 0
  const stock = product ? availableStock(product, needsVariant ? variant : null) : 0
  const soldOut = stock <= 0
  const maxQty = product ? Math.max(1, Math.min(stock === Infinity ? 99 : stock, product.max_per_order)) : 1
  const badges = product ? productBadges(product, { lowStockThreshold: settings?.low_stock_threshold, variant: needsVariant ? variant : null }) : []
  const price = variant ? variant.price : product?.price
  const isLaunch = product?.slug === LAUNCH_SLUG

  // Keep the quantity valid when stock or the variant changes.
  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), maxQty))
  }, [maxQty])

  useSeo({
    title: product ? `${product.name}${product.subtitle ? ` — ${product.subtitle}` : ''}` : 'Product',
    description: product
      ? `${product.subtitle ? `${product.subtitle}. ` : ''}${paragraphs(product.description)[0] || ''}`.slice(0, 200).trim()
      : undefined,
    image: images[0]?.url,
    type: 'product',
    jsonLd: product ? productJsonLd(product, images, settings) : null,
  })

  const openForm = (focus = true) => {
    setFormOpen(true)
    requestAnimationFrame(() => {
      const form = document.getElementById('order-form')
      form?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      if (focus) setTimeout(() => form?.querySelector('input:not([type=hidden]), select')?.focus({ preventScroll: true }), 350)
    })
  }

  // Opened with #order-form (links from elsewhere): show the form.
  useEffect(() => {
    if (product && hash === '#order-form' && !soldOut) openForm(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, hash])

  if (loading && !product) return <Loading />
  if (error)
    return (
      <div className="container-page py-16">
        <ErrorBox error={error} onRetry={reload} />
      </div>
    )
  if (!product) return <NotFound />

  const addToBag = () => {
    if (needsVariant && !variant) return
    add(product.id, variant?.id || null, qty)
    setOpen(true)
  }
  const { min, max } = priceRange(product)
  const disabled = soldOut || (needsVariant && !variant)
  const description = paragraphs(product.description)
  const howTo = product.details?.trim()
  // Shown once the buy box is scrolled past, hidden while the form is on screen.
  const showSticky = !soldOut && buyPos === 'above' && !(formOpen && formPos === 'in')

  return (
    <div className="pb-24 md:pb-20">
      <nav className="container-page flex items-center gap-1 py-4 text-xs text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-noir hover:underline">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <Link to="/shop" className="hover:text-noir hover:underline">
          Shop
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="text-noir" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="container-page grid gap-8 md:grid-cols-2 md:gap-10 lg:gap-16">
        <div className="min-w-0 md:sticky md:top-24 md:self-start">
          <Gallery key={product.id} images={images} name={product.name} />
        </div>

        <div className="min-w-0">
          <ProductBadges badges={badges} />
          <h1 className="mt-3 text-4xl leading-tight text-noir md:text-5xl">{product.name}</h1>
          {product.subtitle && <p className="mt-1 text-lg text-rose-700">{product.subtitle}</p>}
          {description[0] && <p className="mt-4 leading-relaxed text-ink">{description[0]}</p>}

          <div className="mt-5" data-testid="product-price">
            {needsVariant && min !== max ? (
              <p className="font-sans text-3xl font-semibold text-rose-700 tabular-nums">
                {formatMoney(min)} – {formatMoney(max)}
              </p>
            ) : (
              <PriceBlock price={price} compareAt={product.compare_at_price} />
            )}
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm" data-testid="availability">
            <span className={`h-2 w-2 rounded-full ${soldOut ? 'bg-stone-400' : 'bg-emerald-600'}`} aria-hidden="true" />
            {soldOut ? 'Sold out' : 'In stock'}
          </p>

          <div ref={buyRef} className="mt-6 space-y-4">
            {needsVariant && (
              <div>
                <label htmlFor="pdp-variant" className="label">
                  {product.variant_label}
                </label>
                <select
                  id="pdp-variant"
                  className="input h-12"
                  value={variantId || ''}
                  onChange={(e) => {
                    setVariantId(e.target.value)
                    setQty(1)
                  }}
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id} disabled={product.track_stock && v.stock <= 0}>
                      {v.name} — {formatMoney(v.price)}
                      {product.track_stock && v.stock <= 0 ? ' (sold out)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!soldOut && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-noir">
                  Quantity
                </span>
                <QuantityInput value={qty} onChange={setQty} max={maxQty} label="Quantity" />
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="btn-solid flex-1"
                onClick={() => openForm()}
                disabled={disabled}
                aria-expanded={formOpen}
                aria-controls="order-panel"
              >
                {soldOut ? 'Sold out' : 'Order now'}
              </button>
              <button type="button" className="btn-outline flex-1" onClick={addToBag} disabled={disabled}>
                Add to bag
              </button>
            </div>
            <ul className="space-y-2 text-sm text-ink">
              {settings?.cod_enabled && (
                <li className="flex items-center gap-2.5">
                  <Banknote className="h-4 w-4 text-rose-600" aria-hidden="true" /> Cash on delivery: pay when your parcel arrives
                </li>
              )}
              {settings?.gcash_enabled && (
                <li className="flex items-center gap-2.5">
                  <Smartphone className="h-4 w-4 text-rose-600" aria-hidden="true" /> Pay ahead with GCash at checkout
                </li>
              )}
              <li className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-rose-600" aria-hidden="true" /> Ships nationwide —{' '}
                <Link to="/shipping-returns" className="underline decoration-rose-300 underline-offset-2 hover:text-noir">
                  fees &amp; delivery times
                </Link>
              </li>
            </ul>
          </div>

          {/* The one-step order form opens here when "Order now" is pressed. */}
          <div id="order-panel" ref={formRef}>
            {formOpen && !soldOut && (
              <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-rose-100 sm:p-6" aria-labelledby="order-panel-title">
                <h2 id="order-panel-title" className="text-2xl text-noir">
                  Your delivery details
                </h2>
                <p className="mt-1 mb-5 text-sm text-muted">
                  {settings?.cod_enabled ? 'No account or card needed. You pay the courier when your order arrives.' : 'No account needed.'}
                </p>
                <OrderForm
                  key={product.id}
                  product={product}
                  qty={qty}
                  onQtyChange={setQty}
                  variantId={needsVariant ? variantId : undefined}
                  onVariantChange={needsVariant ? setVariantId : undefined}
                />
              </section>
            )}
          </div>

          {product.highlights?.length > 0 && !isLaunch && (
            <div className="mt-8 border-t border-rose-100 pt-6">
              <BenefitList items={product.highlights} />
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------- Product information */}
      <div className="container-page mt-16 grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <section aria-labelledby="about-title">
          <h2 id="about-title" className="text-3xl text-noir sm:text-4xl">
            About {product.name}
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed text-ink">
            {description.slice(1).map((p) => (
              <p key={p} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
          {isLaunch && <FeatureList items={FEATURES} compact className="mt-8" />}
        </section>

        <div className="border-t border-rose-200">
          {(howTo || isLaunch) && (
            <Section title="How to use" defaultOpen>
              {howTo ? (
                <p className="whitespace-pre-line">{howTo}</p>
              ) : (
                <ol className="list-decimal space-y-1 pl-5">
                  {HOW_TO.map((s) => (
                    <li key={s.title}>
                      <strong className="font-medium text-noir">{s.title}:</strong> {s.text}
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          )}
          {isLaunch && (
            <Section title="Shade">
              <p>
                <strong className="font-medium text-noir">{SHADE.inCompact}:</strong> {SHADE.inCompactText}
              </p>
              <p className="mt-2">
                <strong className="font-medium text-noir">{SHADE.onSkin}:</strong> {SHADE.onSkinText}
              </p>
              <p className="mt-3 font-medium text-rose-700">{SHADE.note}</p>
              <Link to="/#shade" className="mt-3 inline-block text-rose-700 underline underline-offset-4">
                See the shade photos
              </Link>
            </Section>
          )}
          {(product.specs?.length > 0 || product.ingredients) && (
            <Section title="Specifications">
              {product.specs?.length > 0 && (
                <dl className="divide-y divide-rose-100">
                  {product.specs.map((s) => (
                    <div key={s.label} className="flex justify-between gap-6 py-2">
                      <dt className="text-muted">{s.label}</dt>
                      <dd className="text-right">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {product.ingredients && (
                <div className={product.specs?.length ? 'mt-5' : ''}>
                  <h3 className="font-sans text-sm font-semibold text-noir">Ingredients</h3>
                  <p className="mt-1 text-sm" data-testid="ingredients">
                    {product.ingredients}
                  </p>
                </div>
              )}
            </Section>
          )}
          <Section title="Shipping & returns">
            <p>
              We ship nationwide.{settings?.cod_enabled ? ' Pay in cash when your order arrives.' : ''} Fees and delivery times depend on your
              province and are shown in the order form before you place your order.
            </p>
            {settings?.returns_policy && <p className="mt-3 whitespace-pre-line">{settings.returns_policy}</p>}
            <Link to="/shipping-returns" className="mt-3 inline-block text-rose-700 underline underline-offset-4">
              Shipping fees, delivery times &amp; returns
            </Link>
          </Section>
        </div>
      </div>

      {/* Phones: compact purchase bar while the buy box is off screen */}
      {showSticky && (
        <div
          className="animate-fade fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-ivory/95 px-4 py-3 backdrop-blur md:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          data-testid="sticky-buy"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-noir">
                {product.name}
                {variant ? ` · ${variant.name}` : ''}
              </p>
              <p className="text-sm text-muted tabular-nums">
                {qty > 1 ? `${qty} × ` : ''}
                {formatMoney(price)}
              </p>
            </div>
            <button type="button" className="btn-solid min-h-11 px-6 text-sm" onClick={() => openForm()}>
              Order now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
