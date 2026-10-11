import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Banknote, ChevronRight, Smartphone, Truck } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { useAsync } from '../lib/useAsync.js'
import { useStore } from '../lib/StoreContext.jsx'
import { useBag } from '../lib/BagContext.jsx'
import { useSeo } from '../lib/useSeo.js'
import { SITE_URL } from '../lib/config.js'
import { activeVariants, availableStock, hasVariants, priceRange, productBadges } from '../lib/catalog.js'
import { formatMoney } from '../lib/format.js'
import { ErrorBox, ImagePlaceholder, Loading, Price, ProductBadges, QuantityInput } from '../components/ui.jsx'
import NotFound from './NotFound.jsx'

function Gallery({ images, name }) {
  const [active, setActive] = useState(0)
  useEffect(() => setActive(0), [images])
  if (!images.length) return <ImagePlaceholder className="aspect-square w-full rounded-sm" />
  return (
    <div>
      {/* Phones: swipe; larger screens: main image + thumbnails */}
      <div className="-mx-4 flex snap-x snap-mandatory overflow-x-auto sm:hidden" aria-label="Product photos">
        {images.map((img, i) => (
          <img
            key={img.id || i}
            src={img.url}
            alt={img.alt || name}
            className="aspect-square w-full shrink-0 snap-center object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      {images.length > 1 && (
        <p className="mt-2 text-center text-xs text-muted sm:hidden">
          Swipe for {images.length - 1} more photo{images.length > 2 ? 's' : ''}
        </p>
      )}
      <div className="hidden sm:block">
        <div className="overflow-hidden rounded-sm bg-blush-100">
          <img src={images[active].url} alt={images[active].alt || name} className="aspect-square w-full object-cover" data-testid="product-main-image" />
        </div>
        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-3">
            {images.map((img, i) => (
              <button
                key={img.id || i}
                type="button"
                onClick={() => setActive(i)}
                className={`overflow-hidden rounded-sm ring-offset-2 ring-offset-ivory transition ${i === active ? 'ring-2 ring-noir' : 'opacity-70 hover:opacity-100'}`}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
              >
                <img src={img.url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children, open = false }) {
  return (
    <details className="group border-b border-rose-200 py-5" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between tracked-caps text-xs text-noir">
        {title}
        <span className="text-lg text-rose-500 transition group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="mt-4 text-sm leading-relaxed text-ink/80">{children}</div>
    </details>
  )
}

function productJsonLd(product, settings) {
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
    image: product.images.filter((i) => !i.url.startsWith('data:')).map((i) => abs(i.url)),
    brand: { '@type': 'Brand', name: settings?.store_name || 'Kryztal Lumi' },
    ...(offers.length === 1 ? { offers: offers[0] } : { offers }),
  }
}

export default function Product() {
  const { slug } = useParams()
  const { settings } = useStore()
  const { add, setOpen } = useBag()
  const navigate = useNavigate()
  // Always re-read the product so stock is current.
  const { data: product, loading, error, reload } = useAsync(() => api.getProduct(slug), [slug])
  const [variantId, setVariantId] = useState(null)
  const [qty, setQty] = useState(1)

  const variants = useMemo(() => activeVariants(product), [product])
  useEffect(() => {
    // Preselect the first variant that is in stock.
    const first = variants.find((v) => !product?.track_stock || v.stock > 0) || variants[0]
    setVariantId(first?.id || null)
    setQty(1)
  }, [variants, product?.track_stock])

  const variant = variants.find((v) => v.id === variantId) || null
  const needsVariant = variants.length > 0
  const stock = product ? availableStock(product, needsVariant ? variant : null) : 0
  const soldOut = stock <= 0
  const maxQty = product ? Math.max(1, Math.min(stock === Infinity ? 99 : stock, product.max_per_order)) : 1
  const badges = product ? productBadges(product, { lowStockThreshold: settings?.low_stock_threshold, variant: needsVariant ? variant : null }) : []
  const price = variant ? variant.price : product?.price

  useSeo({
    title: product ? `${product.name}${product.subtitle ? ` — ${product.subtitle}` : ''}` : 'Product',
    description: product
      ? `${product.subtitle ? `${product.subtitle}. ` : ''}${(product.description || '').slice(0, 140)}`.trim()
      : undefined,
    image: product?.images?.[0]?.url,
    type: 'product',
    jsonLd: product ? productJsonLd(product, settings) : null,
  })

  if (loading && !product) return <Loading />
  if (error)
    return (
      <div className="container-page py-16">
        <ErrorBox error={error} onRetry={reload} />
      </div>
    )
  if (!product) return <NotFound />

  const addToBag = (andCheckout = false) => {
    if (needsVariant && !variant) return
    add(product.id, variant?.id || null, qty)
    if (andCheckout) navigate('/checkout')
    else setOpen(true)
  }
  const { min, max } = priceRange(product)

  return (
    <div className="pb-20">
      <nav className="container-page flex items-center gap-1 py-4 text-xs text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-noir">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <Link to="/shop" className="hover:text-noir">
          Shop
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="text-noir" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="container-page grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
        <Gallery images={product.images} name={product.name} />

        <div className="md:sticky md:top-28 md:self-start">
          <ProductBadges badges={badges} />
          <h1 className="mt-3 font-display text-5xl leading-none font-medium text-noir sm:text-6xl">{product.name}</h1>
          {product.subtitle && <p className="mt-2 tracked-caps text-[0.7rem] text-rose-700">{product.subtitle}</p>}
          <p className="mt-5 font-display text-3xl text-noir tabular-nums" data-testid="product-price">
            {needsVariant && !variant && min !== max ? (
              `${formatMoney(min)} – ${formatMoney(max)}`
            ) : (
              <Price amount={price} compareAt={product.compare_at_price} currency={settings?.currency} />
            )}
          </p>
          {product.description && <p className="mt-5 leading-relaxed text-ink/80">{product.description}</p>}

          {needsVariant && (
            <fieldset className="mt-7">
              <legend className="tracked-caps text-[0.68rem] text-noir">
                {product.variant_label}: <span className="text-muted normal-case tracking-normal">{variant?.name || 'choose one'}</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {variants.map((v) => {
                  const out = product.track_stock && v.stock <= 0
                  return (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rose-600 ${
                        v.id === variantId ? 'border-noir bg-noir text-ivory' : 'border-rose-200 bg-white text-noir hover:border-noir'
                      } ${out ? 'opacity-50' : ''}`}
                    >
                      <input type="radio" name="variant" value={v.id} checked={v.id === variantId} onChange={() => { setVariantId(v.id); setQty(1) }} className="sr-only" />
                      {v.swatch && <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: v.swatch }} aria-hidden="true" />}
                      {v.name}
                      {out && <span className="text-xs">(sold out)</span>}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <QuantityInput value={qty} onChange={setQty} max={maxQty} label="Quantity" />
            <button type="button" className="btn-outline flex-1" onClick={() => addToBag(false)} disabled={soldOut || (needsVariant && !variant)}>
              {soldOut ? 'Sold out' : 'Add to bag'}
            </button>
          </div>
          {!soldOut && (
            <button type="button" className="btn-solid mt-3 w-full" onClick={() => addToBag(true)} disabled={needsVariant && !variant}>
              Buy now — {formatMoney(Number(price) * qty)}
            </button>
          )}
          {!soldOut && stock !== Infinity && stock <= (settings?.low_stock_threshold ?? 5) && (
            <p className="mt-3 text-sm text-rose-800">Only {stock} left — order soon.</p>
          )}

          <ul className="mt-7 grid gap-2 rounded-lg bg-blush-50 p-4 text-sm text-ink/80">
            <li className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 text-rose-600" aria-hidden="true" />
              Ships nationwide —{' '}
              <Link to="/shipping-returns" className="underline decoration-rose-300 underline-offset-2 hover:text-noir">
                fees &amp; delivery times
              </Link>
            </li>
            {settings?.cod_enabled && (
              <li className="flex items-center gap-2.5">
                <Banknote className="h-4 w-4 text-rose-600" aria-hidden="true" /> Cash on delivery available
              </li>
            )}
            {settings?.gcash_enabled && (
              <li className="flex items-center gap-2.5">
                <Smartphone className="h-4 w-4 text-rose-600" aria-hidden="true" /> Pay ahead with GCash
              </li>
            )}
          </ul>

          <div className="mt-6 border-t border-rose-200">
            {product.details && (
              <Section title="How to use" open>
                <p className="whitespace-pre-line">{product.details}</p>
              </Section>
            )}
            {product.ingredients && (
              <Section title="Ingredients">
                <p>{product.ingredients}</p>
              </Section>
            )}
            {product.specs?.length > 0 && (
              <Section title="Details">
                <dl className="divide-y divide-rose-100">
                  {product.specs.map((s) => (
                    <div key={s.label} className="flex justify-between gap-6 py-2">
                      <dt className="text-muted">{s.label}</dt>
                      <dd className="text-right">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}
            {settings?.returns_policy && (
              <Section title="Returns & exchanges">
                <p>{settings.returns_policy}</p>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
