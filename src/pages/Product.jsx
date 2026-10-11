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
import { ErrorBox, ImagePlaceholder, Loading, ProductBadges } from '../components/ui.jsx'
import OrderForm, { BenefitList, PriceBlock } from '../components/OrderForm.jsx'
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

  const variants = useMemo(() => activeVariants(product), [product])
  useEffect(() => {
    // Preselect the first variant that is in stock.
    const first = variants.find((v) => !product?.track_stock || v.stock > 0) || variants[0]
    setVariantId(first?.id || null)
  }, [variants, product?.track_stock])

  const variant = variants.find((v) => v.id === variantId) || null
  const needsVariant = variants.length > 0
  const stock = product ? availableStock(product, needsVariant ? variant : null) : 0
  const soldOut = stock <= 0
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

  // Opened from an "Order now" button elsewhere: jump to the form.
  useEffect(() => {
    if (product && window.location.hash === '#order-form') {
      requestAnimationFrame(() => document.getElementById('order-form')?.scrollIntoView({ block: 'start' }))
    }
  }, [product])

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
    add(product.id, variant?.id || null, 1)
    if (andCheckout) navigate('/checkout')
    else setOpen(true)
  }
  const { min, max } = priceRange(product)
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
          <h1 className="mt-3 font-sans text-3xl leading-tight font-bold tracking-tight text-noir md:text-5xl">{product.name}</h1>
          {product.subtitle && <p className="mt-1.5 text-sm text-muted md:text-base">{product.subtitle}</p>}
          <div className="mt-4" data-testid="product-price">
            {needsVariant && min !== max ? (
              <p className="font-sans text-4xl font-bold text-rose-600 tabular-nums">
                {formatMoney(min)} – {formatMoney(max)}
              </p>
            ) : (
              <PriceBlock price={price} compareAt={product.compare_at_price} />
            )}
          </div>
          {product.highlights?.length > 0 && (
            <div className="mt-4 border-t border-rose-100 pt-4">
              <BenefitList items={product.highlights} />
            </div>
          )}
          {!soldOut && stock !== Infinity && stock <= (settings?.low_stock_threshold ?? 5) && (
            <p className="mt-3 text-sm font-medium text-rose-700">Only {stock} left — order soon.</p>
          )}

          <div className="mt-5">
            <OrderForm key={product.id} product={product} />
          </div>
          {!needsVariant && (
            <button
              type="button"
              className="mt-3 w-full py-2 text-center text-sm text-muted underline underline-offset-4 hover:text-noir disabled:no-underline"
              onClick={() => addToBag(false)}
              disabled={disabled}
            >
              {soldOut ? 'Sold out' : 'Add to bag'}
            </button>
          )}

          <InfoTabs product={product} settings={settings} />

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

      {/* Phones: sticky "Order now" bar that jumps to the form */}
      {!soldOut && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-ivory/95 px-4 py-3 backdrop-blur md:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <a href="#order-form" className="flex h-12 w-full items-center justify-center rounded-lg bg-rose-600 text-sm font-semibold text-white">
            Order now · {formatMoney(price)} · Cash on delivery
          </a>
        </div>
      )}
    </div>
  )
}
