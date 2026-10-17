import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Banknote, Truck } from 'lucide-react'
import { useStore } from '../lib/StoreContext.jsx'
import { useSeo } from '../lib/useSeo.js'
import { availableStock, priceRange } from '../lib/catalog.js'
import { formatMoney } from '../lib/format.js'
import { img } from '../content/assets.js'
import { CLOSING, FEATURES, HERO, HOW_TO, LAUNCH_SLUG, LIFESTYLE, MEET, SHADE } from '../content/crystalBlush.js'
import { Eyebrow } from '../components/ui.jsx'
import { FeatureList } from '../components/Features.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { CommunitySlideshow } from '../components/Community.jsx'
import Shop from './Shop.jsx'

function DeliveryNotes({ settings, className = '' }) {
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink ${className}`}>
      {settings?.cod_enabled && (
        <li className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-rose-600" aria-hidden="true" /> Cash on delivery
        </li>
      )}
      <li className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-rose-600" aria-hidden="true" /> Nationwide shipping
      </li>
    </ul>
  )
}

// --------------------------------------------------------------- Hero ---
function Hero({ product, settings, price, soldOut }) {
  return (
    <section className="bg-blush-100" aria-labelledby="hero-title">
      <div className="container-page grid gap-6 pt-4 pb-10 md:grid-cols-[1fr_1fr] md:items-center md:gap-10 md:py-12 lg:gap-16 lg:py-16">
        <div className="relative md:order-2">
          <img
            {...img('heroPodium', '(min-width: 768px) 50vw, 100vw')}
            fetchPriority="high"
            loading="eager"
            className="aspect-[6/5] h-auto w-full rounded-3xl object-cover object-[50%_85%] md:aspect-[4/5] md:object-center"
          />
        </div>
        <div className="md:order-1">
          <Eyebrow>{HERO.eyebrow}</Eyebrow>
          <h1 id="hero-title" className="mt-3 text-[2.6rem] leading-[1.02] text-noir sm:text-6xl lg:text-7xl">
            {HERO.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink sm:text-xl">{HERO.text}</p>
          <p className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-rose-700 tabular-nums" data-testid="hero-price">
              {formatMoney(price)}
            </span>
            {soldOut && (
              <span className="rounded-full bg-noir px-3 py-1 text-xs font-medium text-ivory" data-testid="hero-sold-out">
                Sold out
              </span>
            )}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to={`/product/${product.slug}`} className="btn-solid">
              {HERO.primary}
            </Link>
            <a href="#shade" className="btn-outline">
              {HERO.secondary}
            </a>
          </div>
          <DeliveryNotes settings={settings} className="mt-6" />
        </div>
      </div>
    </section>
  )
}

// --------------------------------------------------- Meet Crystal Blush ---
function Meet({ product }) {
  return (
    <section className="py-16 sm:py-24" aria-labelledby="meet-title">
      <div className="container-page grid gap-10 md:grid-cols-2 md:items-center lg:gap-16">
        <div className="photo-frame">
          <img {...img('panCloseup', '(min-width: 768px) 50vw, 100vw')} loading="lazy" className="aspect-square h-auto w-full object-cover" />
        </div>
        <div>
          <Eyebrow>{product.subtitle || HERO.eyebrow}</Eyebrow>
          <h2 id="meet-title" className="mt-3 text-4xl text-noir sm:text-5xl">
            {MEET.title}
          </h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-ink">
            {MEET.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <Link to={`/product/${product.slug}`} className="mt-7 inline-flex min-h-11 items-center gap-2 font-medium text-rose-700 underline-offset-4 hover:underline">
            View product details <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------- Shade and finish ---
function ShadeCard({ asset, title, text }) {
  return (
    <figure>
      <div className="photo-frame">
        <img {...img(asset, '(min-width: 768px) 30vw, 50vw')} loading="lazy" className="aspect-[5/7] h-auto w-full object-cover" />
      </div>
      <figcaption className="mt-3">
        <span className="block font-display text-2xl text-noir">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </figcaption>
    </figure>
  )
}

function Shade() {
  return (
    <section id="shade" className="scroll-mt-20 border-y border-rose-100 bg-blush-50 py-16 sm:py-24" aria-labelledby="shade-title">
      <div className="container-page">
        <div className="max-w-2xl">
          <Eyebrow>Shade &amp; finish</Eyebrow>
          <h2 id="shade-title" className="mt-3 text-4xl text-noir sm:text-5xl">
            {SHADE.title}
          </h2>
          <p className="mt-4 text-lg text-ink">{SHADE.intro}</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr_1.25fr] lg:items-start">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:col-span-2">
            <ShadeCard asset="inCompact" title={SHADE.inCompact} text={SHADE.inCompactText} />
            <ShadeCard asset="onSkin" title={SHADE.onSkin} text={SHADE.onSkinText} />
          </div>
          <figure className="rounded-2xl bg-white p-4 ring-1 ring-rose-100 sm:p-5">
            <img {...img('colorDevelop', '(min-width: 1024px) 34vw, 100vw')} loading="lazy" className="aspect-square h-auto w-full rounded-xl object-contain" />
            <figcaption className="mt-4">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-noir" aria-label="Stages shown">
                {SHADE.stages.map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />}
                    {s}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted">{SHADE.developNote}</p>
            </figcaption>
          </figure>
        </div>
        <p className="mt-8 text-sm font-medium text-rose-700" data-testid="shade-note">
          {SHADE.note}
        </p>
      </div>
    </section>
  )
}

// ------------------------------------------------------- Product details ---
function Details() {
  return (
    <section className="py-16 sm:py-24" aria-labelledby="details-title">
      <div className="container-page grid gap-10 md:grid-cols-2 md:items-center lg:gap-16">
        <div className="md:order-2">
          <div className="photo-frame">
            <img {...img('compactAngle', '(min-width: 768px) 50vw, 100vw')} loading="lazy" className="aspect-square h-auto w-full object-contain" />
          </div>
        </div>
        <div className="md:order-1">
          <Eyebrow>Product details</Eyebrow>
          <h2 id="details-title" className="mt-3 text-4xl text-noir sm:text-5xl">
            What you get
          </h2>
          <FeatureList items={FEATURES} className="mt-8" />
        </div>
      </div>
    </section>
  )
}

// -------------------------------------------------------------- Lifestyle ---
function Lifestyle() {
  return (
    <section className="pb-16 sm:pb-24" aria-labelledby="lifestyle-title">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-pearl">
          <img {...img('lifestyleBrush', '(min-width: 1152px) 1104px, 100vw')} loading="lazy" className="aspect-[16/9] h-auto w-full object-cover" />
          <div className="p-6 sm:p-8 md:absolute md:top-1/2 md:left-8 md:max-w-sm md:-translate-y-1/2 md:rounded-2xl md:bg-ivory/90 md:shadow-sm md:backdrop-blur-sm lg:left-12">
            <Eyebrow>{LIFESTYLE.eyebrow}</Eyebrow>
            <h2 id="lifestyle-title" className="mt-3 text-3xl text-noir sm:text-4xl">
              {LIFESTYLE.title}
            </h2>
            <p className="mt-3 text-ink">{LIFESTYLE.text}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// -------------------------------------------------------------- How to use ---
function HowTo() {
  return (
    <section className="border-y border-rose-100 bg-pearl py-16 sm:py-20" aria-labelledby="howto-title">
      <div className="container-page">
        <Eyebrow>How to use</Eyebrow>
        <h2 id="howto-title" className="mt-3 text-4xl text-noir sm:text-5xl">
          Tap, apply, blend
        </h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {HOW_TO.map((step, i) => (
            <li key={step.title} className="rounded-2xl bg-white p-6 ring-1 ring-rose-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 font-semibold text-white" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-4 font-sans text-lg font-semibold text-noir">{step.title}</h3>
              <p className="mt-1 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// --------------------------------------------------------------------- FAQ ---
function Faq({ faq }) {
  if (!faq.length) return null
  return (
    <section className="py-16 sm:py-24" aria-labelledby="faq-title">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <Eyebrow>Good to know</Eyebrow>
          <h2 id="faq-title" className="mt-3 text-4xl text-noir sm:text-5xl">
            Questions
          </h2>
          <p className="mt-4 text-muted">Ordering, cash on delivery, shipping and returns.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/faq" className="btn-outline">
              All FAQs
            </Link>
            <Link to="/shipping-returns" className="btn-outline">
              Shipping &amp; Returns
            </Link>
          </div>
        </div>
        <div className="divide-y divide-rose-200 border-y border-rose-200">
          {faq.map((f, i) => (
            <details key={i} className="group" name="home-faq">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-medium text-noir">
                {f.q}
                <span className="text-2xl leading-none text-rose-500 transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="pb-5 leading-relaxed whitespace-pre-line text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------- Closing ---
function Closing({ product, settings, price }) {
  return (
    <section className="bg-rose-500 text-white" aria-labelledby="closing-title">
      <div className="container-page flex flex-col items-center py-16 text-center sm:py-20">
        <img src="/images/monogram.webp" alt="" width="400" height="400" loading="lazy" className="h-14 w-14 rounded-full bg-ivory p-2" />
        <h2 id="closing-title" className="mt-5 text-4xl sm:text-5xl">
          {CLOSING.title}
        </h2>
        <p className="mt-3 max-w-md text-white">
          {product.name} · {formatMoney(price)}
          {settings?.cod_enabled ? `. ${CLOSING.text}` : ''}
        </p>
        <Link to={`/product/${product.slug}`} className="btn-light mt-8 px-10">
          {HERO.primary}
        </Link>
      </div>
    </section>
  )
}

export default function Home() {
  const { featured, settings, products } = useStore()
  const { hash } = useLocation()
  const isLaunch = featured?.slug === LAUNCH_SLUG

  // Links like /#shade from other pages: scroll once the section exists.
  useEffect(() => {
    if (!hash || !isLaunch) return
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 50)
    return () => clearTimeout(t)
  }, [hash, isLaunch])
  const price = featured ? priceRange(featured).min : 0

  useSeo({
    title: !isLaunch ? 'Shop' : `${featured.name} — ${featured.subtitle || HERO.eyebrow}`,
    description: isLaunch
      ? `${HERO.title.join(' ')} ${HERO.text} ${formatMoney(price)}${settings?.cod_enabled ? ' · cash on delivery' : ''} · nationwide shipping in the Philippines.`
      : 'Kryztal Lumi beauty — order online with nationwide shipping in the Philippines.',
  })

  if (!isLaunch) return <Shop />

  const soldOut = availableStock(featured) <= 0
  const others = products.filter((p) => p.id !== featured.id)

  return (
    <div className="bg-ivory">
      <Hero product={featured} settings={settings} price={price} soldOut={soldOut} />
      <Meet product={featured} />
      <Shade />
      <Details />
      <Lifestyle />
      <HowTo />
      <CommunitySlideshow product={featured} />
      <Faq faq={settings?.faq || []} />

      {others.length > 0 && (
        <section className="container-page pb-16 sm:pb-24" aria-labelledby="others-title">
          <h2 id="others-title" className="text-3xl text-noir">
            Also in the shop
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
            {others.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <Closing product={featured} settings={settings} price={price} />
    </div>
  )
}
