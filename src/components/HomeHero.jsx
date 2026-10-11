// Home page heroes: an editorial desktop layout (big serif headline with a
// highlighter block, product with colour blocks on graph paper, product
// cards and rotating promises) and an app-style phone layout (tall hero
// with vertical type, then a "collection" with chips and product cards).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Banknote, Search, Truck } from 'lucide-react'
import { useOrderNow } from '../lib/useOrderNow.js'
import { availableStock, priceRange, primaryImage, sizeTag } from '../lib/catalog.js'
import { formatMoney } from '../lib/format.js'
import { Sparkle } from './icons.jsx'
import { ImagePlaceholder } from './ui.jsx'

const PROMISES = [
  {
    title: 'Adapts to your skin tone',
    body: 'Deep crystal in the compact, a soft rosy flush on your cheek — the colour develops to match your own undertone.',
  },
  { title: 'Buildable, never heavy', body: 'One tap for a fresh, barely-there glow. A few more for a deeper flush. A little goes a long way.' },
  { title: 'Cruelty-free, pocket-sized', body: 'Never tested on animals. A slim 53 × 53 mm compact made for touch-ups on the go.' },
  { title: 'Pay when it arrives', body: 'Cash on delivery: fill in the form, then pay the rider when your parcel reaches your door.' },
]

function Promises() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((x) => (x + 1) % PROMISES.length), 5500)
    return () => clearInterval(t)
  }, [paused])
  const p = PROMISES[i]
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Why you'll love it">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex gap-0.5 text-rose-500" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((s) => (
            <Sparkle key={s} className="h-3.5 w-3.5" />
          ))}
        </span>
        <span className="tabular-nums text-noir">{String(i + 1).padStart(2, '0')}</span>
        <div className="relative h-px flex-1 bg-rose-200" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 bg-noir transition-all duration-500" style={{ width: `${((i + 1) / PROMISES.length) * 100}%` }} />
        </div>
        <span className="tabular-nums text-muted">{String(PROMISES.length).padStart(2, '0')}</span>
      </div>
      <div className="mt-5 flex gap-3" aria-live="polite">
        <span className="font-display text-5xl leading-[0.6] text-rose-400" aria-hidden="true">“</span>
        <div>
          <p className="text-2xl font-medium text-noir">{p.title}</p>
          <p className="mt-2 leading-relaxed text-ink/75">{p.body}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2" role="tablist" aria-label="Choose a reason">
        {PROMISES.map((x, n) => (
          <button
            key={x.title}
            type="button"
            role="tab"
            aria-selected={n === i}
            aria-label={x.title}
            onClick={() => setI(n)}
            className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-noir' : 'w-1.5 bg-rose-200 hover:bg-rose-300'}`}
          />
        ))}
      </div>
    </div>
  )
}

// Product card with the product "standing" out of a pastel block.
function FloatCard({ to, image, imageAlt, title, line, cta, tone, onClick }) {
  const Inner = (
    <>
      <img src={image} alt={imageAlt} loading="lazy" className="absolute -top-9 left-4 w-[38%] object-contain drop-shadow-[0_16px_18px_rgba(90,42,51,0.3)] transition duration-500 group-hover:-translate-y-1" />
      <div className="ml-auto w-[54%] py-6 pr-5">
        <p className="text-lg text-noir">{title}</p>
        <p className="mt-1 text-lg text-noir tabular-nums">{line}</p>
        <span className="mt-3 inline-flex bg-noir px-3 py-1.5 text-xs text-ivory transition group-hover:bg-rose-800">{cta}</span>
      </div>
    </>
  )
  const cls = `group relative mt-10 flex min-h-36 items-center ${tone}`
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} text-left`}>
      {Inner}
    </button>
  ) : (
    <Link to={to} className={cls}>
      {Inner}
    </Link>
  )
}

export function DesktopHero({ featured, settings, products }) {
  const { min } = priceRange(featured)
  const [first, ...rest] = featured.name.split(' ')
  const orderNow = useOrderNow(featured)
  const second = products.find((p) => p.id !== featured.id)
  const firstImage = '/images/pan-transparent.webp'

  return (
    <section className="bg-grid relative hidden overflow-hidden bg-ivory lg:block" aria-labelledby="hero-title">
      <div className="container-page relative pt-14 pb-16 xl:pt-16">
        <div className="grid grid-cols-[1.08fr_1fr] items-center gap-8">
          {/* Copy */}
          <div className="relative z-10">
            <Sparkle className="animate-twinkle absolute -top-2 left-[62%] h-7 w-7 text-noir" />
            <h1 id="hero-title" className="font-display leading-[0.92] font-bold tracking-[-0.01em] text-noir">
              <span className="relative inline-block text-[6.6rem] xl:text-[7.6rem]">
                <span className="marker absolute top-[14%] -right-3 bottom-[2%] -left-2" aria-hidden="true" />
                <span className="relative">{rest.length ? first : featured.name}</span>
              </span>
              {rest.length > 0 && (
                <span className="block text-[6.6rem] xl:text-[7.6rem]">
                  {rest.join(' ')}
                  <span className="text-rose-500">.</span>
                </span>
              )}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/80">
              {settings?.tagline && <span className="font-display text-2xl text-noir italic">{settings.tagline} </span>}A deep
              crystal in the compact that blooms into your own rosy flush — one blush for every skin tone.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-8">
              <button
                type="button"
                onClick={orderNow}
                disabled={availableStock(featured) <= 0}
                className="inline-flex items-center gap-3 bg-noir px-8 py-4 text-ivory transition hover:bg-rose-800 disabled:opacity-50"
              >
                {availableStock(featured) <= 0 ? 'Sold out' : `Order now · ${formatMoney(min)}`}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link to={`/product/${featured.slug}`} className="group inline-flex items-center gap-4 border-b border-noir pb-2 text-noir">
                View product
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-noir transition group-hover:bg-noir group-hover:text-ivory">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </div>
            <p className="sr-only" data-testid="hero-price">
              {formatMoney(min)}
            </p>

            <ul className="mt-12 flex flex-wrap gap-10">
              <li className="flex items-center gap-3">
                <span className="flex -space-x-3" aria-hidden="true">
                  <img src="/images/product-box-700.webp" alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-ivory" />
                  <img src="/images/product-pan.webp" alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-ivory" />
                </span>
                <span>
                  <span className="block text-2xl font-medium text-noir">1 shade</span>
                  <span className="text-sm text-muted">for every skin tone</span>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white" aria-hidden="true">
                  {settings?.cod_enabled ? <Banknote className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                </span>
                <span>
                  <span className="block text-2xl font-medium text-noir">{settings?.cod_enabled ? 'COD' : 'Nationwide'}</span>
                  <span className="text-sm text-muted">{settings?.cod_enabled ? 'pay when it arrives' : 'shipping'}</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Visual */}
          <div className="relative h-[540px] xl:h-[580px]">
            <div className="absolute top-0 left-[32%] h-[36%] w-[22%] bg-rose-800" aria-hidden="true" />
            <div className="bg-foil absolute right-0 bottom-[2%] h-[58%] w-[20%]" aria-hidden="true" />
            <div className="absolute top-[11%] left-[8%] z-20 flex items-center gap-3 bg-white px-4 py-3 shadow-lg shadow-rose-900/10">
              <span className="flex h-9 w-9 items-center justify-center bg-blush-100 text-rose-600" aria-hidden="true">
                <Truck className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-medium text-noir">Nationwide delivery</span>
                <span className="text-xs text-muted">{settings?.cod_enabled ? 'Cash on delivery available' : 'Pay ahead with GCash'}</span>
              </span>
            </div>
            <img
              src="/images/hero-box.webp"
              alt={`${featured.name} compact: black box with rose-gold Kryztal Lumi foil logo`}
              width="900"
              height="900"
              fetchPriority="high"
              className="absolute top-[16%] left-[16%] z-10 w-[70%] drop-shadow-[0_34px_40px_rgba(90,42,51,0.35)]"
            />
            <img
              src="/images/pan-transparent.webp"
              alt=""
              width="700"
              height="700"
              className="animate-float absolute bottom-[0%] left-[0%] z-10 w-[36%] drop-shadow-[0_18px_24px_rgba(90,42,51,0.3)]"
            />
            <Sparkle className="animate-twinkle absolute top-[52%] -left-6 z-20 h-6 w-6 text-noir" style={{ animationDelay: '1.2s' }} />
          </div>
        </div>

        {/* Bottom row: cards + rotating promises */}
        <div className="mt-6 grid grid-cols-[1fr_1fr_1.15fr] items-end gap-6">
          <FloatCard
            to={`/product/${featured.slug}`}
            image={firstImage}
            imageAlt=""
            title={featured.name}
            line={formatMoney(min)}
            cta="Shop now"
            tone="bg-blush-200"
          />
          {second ? (
            <FloatCard
              to={`/product/${second.slug}`}
              image={primaryImage(second)?.url || '/images/hero-box-520.webp'}
              imageAlt=""
              title={second.name}
              line={formatMoney(priceRange(second).min)}
              cta="Shop now"
              tone="bg-[#f6e4d8]"
            />
          ) : (
            <FloatCard
              to={`/product/${featured.slug}`}
              image="/images/hero-box-520.webp"
              imageAlt=""
              title="Tone-adapt"
              line="How to use"
              cta="See how"
              tone="bg-[#f6e4d8]"
            />
          )}
          <div className="pb-2 pl-4">
            <Promises />
          </div>
        </div>
      </div>
    </section>
  )
}

export function MobileHero({ featured, settings }) {
  return (
    <section className="relative overflow-hidden bg-blush-200 lg:hidden" aria-labelledby="mobile-hero-title">
      <div className="relative min-h-[min(calc(100svh-8rem),760px)] sm:min-h-[min(calc(100svh-9rem),980px)]">
        {/* Product on a glowing blush backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,#fff6f7_0%,#fee4e8_45%,#f2b6c0_100%)]" aria-hidden="true" />
        <img
          src="/images/hero-box.webp"
          alt=""
          width="900"
          height="900"
          fetchPriority="high"
          className="absolute top-[12%] -right-[16%] w-[92%] max-w-[620px] rotate-[-6deg] drop-shadow-[0_30px_40px_rgba(90,42,51,0.4)] sm:-right-[6%]"
        />
        <img
          src="/images/pan-transparent.webp"
          alt=""
          width="700"
          height="700"
          className="animate-float absolute right-[34%] bottom-[10%] w-[42%] max-w-[300px] drop-shadow-[0_18px_24px_rgba(90,42,51,0.35)]"
        />
        {/* Smoky glass panel with vertical type */}
        <div className="absolute inset-y-0 left-0 flex w-[40%] max-w-[300px] items-end bg-gradient-to-b from-noir/85 via-noir/70 to-noir/55 pb-10 backdrop-blur-[2px] sm:w-[34%]">
          <div className="flex h-full w-full items-end justify-center gap-3 pt-10">
            <h1
              id="mobile-hero-title"
              className="font-sans text-[3.4rem] leading-[0.95] font-bold tracking-tight text-ivory sm:text-[4.6rem]"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              <span className="sr-only">{featured.name}: </span>Find Your Glow
            </h1>
            <p
              className="flex items-center gap-3 text-[0.7rem] tracking-[0.12em] text-rose-100/80"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              <span className="h-16 border-l border-dashed border-rose-200/60" aria-hidden="true" />
              {settings?.tagline || 'Blush that becomes you.'}
              <span className="h-16 border-l border-dashed border-rose-200/60" aria-hidden="true" />
            </p>
          </div>
        </div>
        <Sparkle className="animate-twinkle absolute top-[10%] right-[12%] h-6 w-6 text-white" />
        <Link
          to={`/product/${featured.slug}`}
          className="absolute right-5 bottom-6 flex h-16 w-16 items-center justify-center border border-noir/70 bg-white/30 text-noir backdrop-blur-sm transition hover:bg-noir hover:text-ivory"
          aria-label={`See ${featured.name}`}
        >
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  )
}

export function MobileCollection({ products, categories, settings }) {
  const [cat, setCat] = useState('')
  const used = categories.filter((c) => products.some((p) => p.category_id === c.id))
  const list = products.filter((p) => !cat || p.category_id === cat).slice(0, 6)
  return (
    <section className="bg-pearl py-10 lg:hidden" aria-labelledby="collection-title">
      <div className="container-page">
        <h2 id="collection-title" className="font-sans leading-none font-bold tracking-tight text-noir">
          <span className="flex items-end gap-2">
            <span className="text-[3.3rem] sm:text-[4.2rem]">Pure</span>
            <span className="mb-2 text-base font-medium">Crystal</span>
            <img src="/images/pan-transparent.webp" alt="" className="animate-float -mt-6 w-16 sm:w-20" />
          </span>
          <span className="mt-1 flex items-center gap-3">
            <span className="flex items-center text-base font-medium">
              Glow
              <span className="relative ml-2 inline-block h-px w-14 bg-noir" aria-hidden="true">
                <span className="absolute -top-[3px] right-0 h-[7px] w-[7px] rotate-45 border-t border-r border-noir" />
              </span>
            </span>
            <span className="text-[3.3rem] sm:text-[4.2rem]">Blush</span>
          </span>
        </h2>

        {products.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4" role="toolbar" aria-label="Filter products">
          <Link to="/shop?search=1" className="flex h-11 w-11 shrink-0 items-center justify-center bg-blush-100 text-noir" aria-label="Search products">
            <Search className="h-4 w-4" />
          </Link>
          {[{ id: '', name: 'All' }, ...used].map((c) => (
            <button
              key={c.id || 'all'}
              type="button"
              onClick={() => setCat(c.id)}
              aria-pressed={cat === c.id}
              className={`h-11 shrink-0 px-5 text-sm transition ${cat === c.id ? 'bg-noir text-ivory' : 'bg-blush-100 text-noir hover:bg-blush-200'}`}
            >
              {c.name}
            </button>
          ))}
          <Link to="/shop" className="flex h-11 shrink-0 items-center bg-blush-100 px-5 text-sm text-noir">
            Shop all
          </Link>
        </div>
        )}

        <ul className="mt-5 grid gap-6 sm:grid-cols-2">
          {list.map((p) => {
            const img = primaryImage(p)
            const tag = sizeTag(p)
            const { min } = priceRange(p)
            const soldOut = availableStock(p) <= 0
            return (
              <li key={p.id} className="bg-gradient-to-b from-blush-100 to-pearl p-3" data-testid="mobile-product-card">
                <Link to={`/product/${p.slug}`} className="relative block overflow-hidden bg-blush-100">
                  {img ? (
                    <img src={img.url} alt={img.alt || p.name} loading="lazy" className={`aspect-square w-full object-cover ${soldOut ? 'opacity-60' : ''}`} />
                  ) : (
                    <ImagePlaceholder className="aspect-square w-full" />
                  )}
                  {tag && <span className="absolute top-3 right-3 bg-white/85 px-3 py-1.5 text-sm text-noir backdrop-blur">{tag}</span>}
                  {soldOut && <span className="absolute top-3 left-3 bg-noir px-3 py-1.5 text-xs text-ivory">Sold out</span>}
                </Link>
                <div className="mt-3 flex items-end justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-medium text-noir">{p.name}</p>
                    <p className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-noir tabular-nums">{formatMoney(min)}</span>
                      {p.compare_at_price && Number(p.compare_at_price) > min && (
                        <s className="text-sm text-muted">{formatMoney(p.compare_at_price)}</s>
                      )}
                    </p>
                  </div>
                  <OrderButtonOrLink product={p} />
                </div>
              </li>
            )
          })}
        </ul>
        {settings?.cod_enabled && <p className="mt-6 text-center text-xs tracking-[0.15em] text-muted uppercase">Cash on delivery · ships nationwide</p>}
      </div>
    </section>
  )
}

function OrderButtonOrLink({ product }) {
  return (
    <Link
      to={`/product/${product.slug}`}
      className="flex h-14 w-14 shrink-0 items-center justify-center bg-noir text-ivory transition hover:bg-rose-800"
      aria-label={`View ${product.name}`}
    >
      <ArrowUpRight className="h-5 w-5" />
    </Link>
  )
}


