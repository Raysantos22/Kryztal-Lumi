import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Banknote, ChevronRight, Share2, Smartphone, Truck } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { useAsync } from '../lib/useAsync.js'
import { useStore } from '../lib/StoreContext.jsx'
import { useBag } from '../lib/BagContext.jsx'
import { useSeo } from '../lib/useSeo.js'
import { SITE_URL } from '../lib/config.js'
import { activeVariants, availableStock, hasVariants, priceRange, productBadges, sizeTag } from '../lib/catalog.js'
import { formatMoney } from '../lib/format.js'
import { ErrorBox, ImagePlaceholder, Loading, ProductBadges, QuantityInput } from '../components/ui.jsx'
import NotFound from './NotFound.jsx'

function Gallery({ images, name, tag }) {
  const [active, setActive] = useState(0)
  const strip = useRef(null)
  useEffect(() => setActive(0), [images])
  if (!images.length) return <ImagePlaceholder className="aspect-square w-full" />

  const Tag = tag ? (
    <span className="absolute top-4 right-4 bg-white/85 px-3.5 py-2 text-sm text-noir backdrop-blur">{tag}</span>
  ) : null

  // Phones: swipe with dots under the photo.
  const onScroll = () => {
    const el = strip.current
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth))
  }
  return (
    <div>
      <div className="relative md:hidden">
        <div ref={strip} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-blush-100" aria-label="Product photos">
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
        {Tag}
        {images.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
            {images.map((img, i) => (
              <span key={img.id || i} className={`h-[3px] rounded-full transition-all ${i === active ? 'w-8 bg-noir' : 'w-4 bg-rose-200'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Tablets / desktop: main photo + thumbnails */}
      <div className="hidden md:block">
        <div className="relative overflow-hidden bg-blush-100">
          <img src={images[active].url} alt={images[active].alt || name} className="aspect-square w-full object-cover" data-testid="product-main-image" />
          {Tag}
        </div>
        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-3">
            {images.map((img, i) => (
              <button
                key={img.id || i}
                type="button"
                onClick={() => setActive(i)}
                className={`overflow-hidden ring-offset-2 ring-offset-ivory transition ${i === active ? 'ring-2 ring-noir' : 'opacity-70 hover:opacity-100'}`}
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

// Description · How to use · Ingredients · Details, as tabs.
function InfoTabs({ product, settings }) {
  const tabs = [
    product.description && { key: 'description', label: 'Description', body: <p className="whitespace-pre-line">{product.description}</p> },
    product.details && { key: 'how', label: 'How to use', body: <p className="whitespace-pre-line">{product.details}</p> },
    product.ingredients && { key: 'ingredients', label: 'Ingredients', body: <p>{product.ingredients}</p> },
    (product.specs?.length > 0 || settings?.returns_policy) && {
      key: 'details',
      label: 'Details',
      body: (
        <>
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
          {settings?.returns_policy && <p className="mt-4 text-muted">{settings.returns_policy}</p>}
        </>
      ),
    },
  ].filter(Boolean)
  const [tab, setTab] = useState(tabs[0]?.key)
  if (!tabs.length) return null
  const current = tabs.find((t) => t.key === tab) || tabs[0]
  return (
    <div className="mt-7">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Product information">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={t.key === current.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`h-11 shrink-0 px-4 text-sm transition ${t.key === current.key ? 'bg-white text-noir shadow-sm ring-1 ring-rose-100' : 'bg-blush-100 text-ink/70 hover:text-noir'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${current.key}`} aria-labelledby={`tab-${current.key}`} className="mt-4 text-sm leading-relaxed text-ink/80">
        {current.body}
      </div>
    </div>
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

async function share(product) {
  const url = window.location.href
  try {
    if (navigator.share) await navigator.share({ title: product.name, text: product.subtitle || product.name, url })
    else await navigator.clipboard.writeText(url)
  } catch {
    /* cancelled */
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
  const compareAt = product.compare_at_price != null && Number(product.compare_at_price) > Number(price) ? product.compare_at_price : null
  const disabled = soldOut || (needsVariant && !variant)

  return (
    <div className="pb-28 md:pb-20">
      {/* Phones: app-style top bar */}
      <div className="container-page flex items-center justify-between py-3 md:hidden">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/shop'))}
          className="flex h-11 w-11 items-center justify-center bg-blush-100 text-noir"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="truncate px-3 text-sm text-ink/80">{product.subtitle || 'Kryztal Lumi'}</p>
        <button type="button" onClick={() => share(product)} className="flex h-11 w-11 items-center justify-center bg-blush-100 text-noir" aria-label="Share">
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <nav className="container-page hidden items-center gap-1 py-4 text-xs text-muted md:flex" aria-label="Breadcrumb">
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

      <div className="container-page grid gap-6 md:grid-cols-2 md:gap-12 lg:gap-16">
        <Gallery images={product.images} name={product.name} tag={sizeTag(product)} />

        <div className="md:sticky md:top-28 md:self-start">
          <ProductBadges badges={badges} />
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-sans text-3xl leading-tight font-bold tracking-tight text-noir md:font-display md:text-6xl md:leading-none md:font-medium md:tracking-normal">
                {product.name}
              </h1>
              {product.subtitle && <p className="mt-1.5 text-sm text-muted md:tracked-caps md:mt-2 md:text-[0.7rem] md:text-rose-700">{product.subtitle}</p>}
            </div>
            <div className="shrink-0 text-right md:hidden">
              {compareAt && <s className="block text-sm text-muted">{formatMoney(compareAt)}</s>}
              <p className="text-3xl font-bold text-noir tabular-nums" data-testid="product-price">
                {needsVariant && !variant && min !== max ? `${formatMoney(min)}+` : formatMoney(price)}
              </p>
            </div>
          </div>
          <p className="mt-5 hidden font-display text-3xl text-noir tabular-nums md:block">
            {compareAt && <s className="mr-2 text-[0.8em] text-stone-400">{formatMoney(compareAt)}</s>}
            {needsVariant && !variant && min !== max ? `${formatMoney(min)} – ${formatMoney(max)}` : formatMoney(price)}
          </p>

          {needsVariant && (
            <fieldset className="mt-6">
              <legend className="tracked-caps text-[0.68rem] text-noir">
                {product.variant_label}: <span className="text-muted normal-case tracking-normal">{variant?.name || 'choose one'}</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {variants.map((v) => {
                  const out = product.track_stock && v.stock <= 0
                  return (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-center gap-2 border px-4 py-2 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rose-600 ${
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

          <InfoTabs product={product} settings={settings} />

          {/* Tablets / desktop: inline buy box */}
          <div className="mt-7 hidden flex-wrap items-center gap-3 md:flex">
            <QuantityInput value={qty} onChange={setQty} max={maxQty} label="Quantity" />
            <button type="button" className="btn-outline flex-1" onClick={() => addToBag(false)} disabled={disabled}>
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

          <ul className="mt-7 grid gap-2 bg-blush-50 p-4 text-sm text-ink/80">
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
        </div>
      </div>

      {/* Phones: sticky add-to-bag bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-ivory/95 px-4 py-3 backdrop-blur md:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-3">
          <QuantityInput value={qty} onChange={setQty} max={maxQty} label="Quantity" size="sm" />
          <button
            type="button"
            className="h-12 flex-1 bg-noir text-sm text-ivory transition hover:bg-rose-800 disabled:opacity-50"
            onClick={() => addToBag(false)}
            disabled={disabled}
          >
            {soldOut ? 'Sold out' : `Add to bag · ${formatMoney(Number(price) * qty)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
