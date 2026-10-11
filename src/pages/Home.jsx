import { Link } from 'react-router-dom'
import { Banknote, Leaf, Layers, Sun, Smartphone, Truck, Package } from 'lucide-react'
import { useStore } from '../lib/StoreContext.jsx'
import { useOrderNow } from '../lib/useOrderNow.js'
import { useParallax } from '../lib/useParallax.js'
import { useSeo } from '../lib/useSeo.js'
import { availableStock, priceRange } from '../lib/catalog.js'
import { formatMoney, socialLinks } from '../lib/format.js'
import { Eyebrow } from '../components/ui.jsx'
import { Sparkle } from '../components/icons.jsx'
import { SocialLinks } from '../components/Layout.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Shop from './Shop.jsx'

function Twinkle({ className, delay = '0s' }) {
  return <Sparkle className={`animate-twinkle absolute text-white ${className}`} style={{ animationDelay: delay }} />
}

function OrderNowButton({ product, className = 'btn-solid', children = 'Order now' }) {
  const orderNow = useOrderNow(product)
  const soldOut = availableStock(product) <= 0
  return (
    <button type="button" className={className} onClick={orderNow} disabled={soldOut}>
      {soldOut ? 'Sold out' : children}
    </button>
  )
}

// The launch sections below are written for Crystal Blush. If another product
// is featured, the home page shows the regular shop instead.
export const LAUNCH_SLUG = 'crystal-blush'

const SKIN_TONES = [
  { skin: '#f7dccb', flush: 'rgba(232, 120, 140, 0.45)', label: 'Fair' },
  { skin: '#e7b996', flush: 'rgba(214, 92, 118, 0.5)', label: 'Light-medium' },
  { skin: '#c48d66', flush: 'rgba(190, 62, 98, 0.5)', label: 'Morena' },
  { skin: '#8a5a3f', flush: 'rgba(160, 40, 80, 0.55)', label: 'Deep' },
]

export default function Home() {
  const { featured, settings, products } = useStore()
  const visualRef = useParallax(0.12, { maxScroll: 900 })

  const { min } = featured ? priceRange(featured) : { min: 0 }
  const stock = featured ? availableStock(featured) : 0
  const lowStock = stock > 0 && stock !== Infinity && stock <= (settings?.low_stock_threshold ?? 5)
  const faq = (settings?.faq || []).slice(0, 4)
  const others = products.filter((p) => p.id !== featured?.id)
  const hasSocials = socialLinks(settings).length > 0
  const [titleFirst, ...titleWords] = (featured?.name || '').split(' ')
  const titleRest = titleWords.join(' ')

  useSeo({
    title: featured ? `${featured.name} — ${featured.subtitle || 'Kryztal Lumi'}` : null,
    description: featured
      ? `${featured.name} by Kryztal Lumi: ${featured.subtitle?.toLowerCase() || ''}. ${formatMoney(min)} · cash on delivery or GCash · ships nationwide.`
      : 'Kryztal Lumi beauty — shop online, cash on delivery or GCash, shipped nationwide.',
  })

  if (!featured || featured.slug !== LAUNCH_SLUG) return <Shop />

  return (
    <div className="bg-ivory">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden bg-blush-200">
        <div className="glow-blush absolute -top-1/4 left-1/2 h-[120%] w-[120%] -translate-x-1/2 opacity-90 split:left-[70%] split:w-[80%]" aria-hidden="true" />
        <div className="sparkle-dots absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container-page relative grid min-h-[calc(100svh-6rem)] content-center items-center gap-4 py-10 sm:gap-8 split:min-h-[calc(100svh-8rem)] split:grid-cols-[1.05fr_1fr] split:py-12">
          <div className="text-center split:text-left">
            <Eyebrow className="justify-center split:justify-start">{featured.badge_new ? 'New · ' : ''}Tone-adapt blush</Eyebrow>
            <h1 className="mt-4 font-display leading-[0.88] font-medium text-noir">
              {titleRest ? (
                <>
                  <span className="block text-[3.6rem] sm:text-[5.5rem] lg:text-[6.5rem]">{titleFirst}</span>
                  <span className="text-foil block text-[4.2rem] italic sm:text-[6.4rem] lg:text-[7.6rem]">{titleRest}</span>
                </>
              ) : (
                <span className="text-foil block text-[4.2rem] italic sm:text-[6.4rem] lg:text-[7.6rem]">{titleFirst}</span>
              )}
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-ink/80 split:mx-0">
              {settings?.tagline ? <span className="font-display text-2xl text-noir italic">{settings.tagline} </span> : null}
              <span className="block">A deep crystal in the compact that blooms into your own rosy flush.</span>
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-4 split:justify-start">
              <p className="font-display text-4xl text-noir tabular-nums" data-testid="hero-price">
                {formatMoney(min)}
              </p>
              <OrderNowButton product={featured} />
              <a href="#how-it-works" className="btn-outline hidden sm:inline-flex">
                How it works
              </a>
            </div>
            {lowStock && <p className="mt-4 text-sm text-rose-800">Only {stock} left in this batch</p>}
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[0.68rem] tracking-[0.18em] text-ink/70 uppercase split:justify-start">
              {settings?.cod_enabled && <li className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" aria-hidden="true" /> Cash on delivery</li>}
              {settings?.gcash_enabled && <li className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" aria-hidden="true" /> GCash</li>}
              <li className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" aria-hidden="true" /> Ships nationwide</li>
            </ul>
          </div>

          {/* Visual: the box floats in a glow; the pan peeks out below */}
          <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[420px] split:max-w-[540px]">
            <div ref={visualRef} className="will-change-transform">
              <div className="relative aspect-square">
                <div className="absolute inset-[6%] rounded-full bg-white/60 blur-3xl" aria-hidden="true" />
                <picture>
                  <source media="(max-width: 640px)" srcSet="/images/hero-box-520.webp" />
                  <img
                    src="/images/hero-box.webp"
                    alt={`${featured.name} compact: black box with rose-gold Kryztal Lumi foil logo`}
                    width="900"
                    height="900"
                    fetchPriority="high"
                    className="animate-float relative h-full w-full object-contain drop-shadow-[0_30px_40px_rgba(90,42,51,0.35)]"
                  />
                </picture>
                <img
                  src="/images/pan-transparent.webp"
                  alt=""
                  width="700"
                  height="700"
                  className="absolute -bottom-[8%] -left-[8%] w-[46%] drop-shadow-[0_18px_24px_rgba(90,42,51,0.3)]"
                />
                <Twinkle className="top-[4%] right-[10%] h-7 w-7" />
                <Twinkle className="top-[38%] -right-[2%] h-4 w-4" delay="1.1s" />
                <Twinkle className="bottom-[16%] left-[38%] h-5 w-5" delay="2.2s" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- How it works */}
      <section id="how-it-works" className="scroll-mt-24 py-16 sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center">How tone-adapt works</Eyebrow>
            <h2 className="mt-3 font-display text-4xl text-noir sm:text-5xl">
              One blush. <em className="text-foil">Your</em> glow.
            </h2>
            <p className="mt-4 text-muted">
              Crystal Blush looks deep and dark in the compact. On your skin, its colour-changing pigment develops into a soft
              flush that adapts to your own undertone.
            </p>
          </div>

          <ol className="mt-12 grid grid-cols-3 gap-3 sm:gap-6">
            {[
              { n: '01', title: 'Tap', body: 'Touch a fingertip or soft brush lightly to the crystal pan.', swatch: 'bg-[radial-gradient(circle_at_35%_30%,#5b3c42,#1c1517_70%)]' },
              { n: '02', title: 'Bloom', body: 'Press onto your cheeks. In a minute or two the colour starts to develop.', swatch: 'animate-adapt' },
              { n: '03', title: 'Glow', body: 'A natural, rosy flush that is yours alone. Build it up until you love it.', swatch: 'bg-[radial-gradient(circle_at_35%_30%,#f6b3c0,#d9667e_70%)]' },
            ].map((s) => (
              <li key={s.n} className="flex flex-col items-center text-center">
                <div className={`h-20 w-20 sm:h-28 sm:w-28 rounded-full shadow-[inset_0_-10px_30px_rgba(0,0,0,0.15),0_14px_30px_rgba(90,42,51,0.18)] ring-4 ring-white ${s.swatch}`} aria-hidden="true" />
                <p className="mt-6 font-display text-lg text-rose-600">{s.n}</p>
                <h3 className="mt-1 tracked-caps font-sans text-sm text-noir">{s.title}</h3>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted sm:text-sm">{s.body}</p>
              </li>
            ))}
          </ol>

          <figure className="mx-auto mt-16 max-w-3xl rounded-2xl bg-blush-100 px-6 py-8 sm:px-10">
            <figcaption className="text-center">
              <span className="tracked-caps text-[0.68rem] text-rose-700">One shade, many glows</span>
              <span className="mt-1 block text-xs text-muted">Illustration of how the same blush develops differently</span>
            </figcaption>
            <ul className="mt-6 grid grid-cols-4 gap-3 sm:gap-6">
              {SKIN_TONES.map((t) => (
                <li key={t.label} className="flex flex-col items-center gap-2">
                  <div
                    className="aspect-square w-full max-w-24 rounded-full shadow-inner"
                    style={{ background: `radial-gradient(circle at 50% 55%, ${t.flush} 0%, transparent 62%), ${t.skin}` }}
                    aria-hidden="true"
                  />
                  <span className="text-center text-[0.65rem] tracking-[0.12em] text-ink/70 uppercase">{t.label}</span>
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </section>

      {/* ------------------------------------------------- Big split panels */}
      <section className="grid lg:grid-cols-2">
        <div className="relative flex min-h-[70svh] items-center justify-center overflow-hidden bg-noir px-8 py-16 lg:min-h-[90svh]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(184,112,107,0.35),transparent_60%)]" aria-hidden="true" />
          <img
            src="/images/hero-box.webp"
            alt=""
            width="900"
            height="900"
            loading="lazy"
            className="relative w-[78%] max-w-[460px] rotate-[-4deg] drop-shadow-[0_40px_50px_rgba(0,0,0,0.6)]"
          />
          <Sparkle className="animate-twinkle absolute top-[14%] right-[16%] h-6 w-6 text-rose-200" />
          <Sparkle className="animate-twinkle absolute bottom-[18%] left-[14%] h-4 w-4 text-rose-300" style={{ animationDelay: '1.4s' }} />
          <p className="absolute bottom-6 left-0 w-full text-center text-[0.65rem] tracking-[0.3em] text-rose-200/70 uppercase">
            Black compact · rose-gold foil · 53 × 53 mm
          </p>
        </div>
        <div className="flex flex-col justify-center bg-ivory px-6 py-16 sm:px-12 lg:px-16 lg:py-20">
          <Eyebrow>Why you&apos;ll love it</Eyebrow>
          <h2 className="mt-3 font-display text-4xl leading-tight text-noir sm:text-5xl">
            Crystal in the compact.
            <br />
            <em className="text-foil">Light</em> on your cheek.
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2">
            {[
              { icon: Sun, title: 'Adapts to you', body: 'One shade for every skin tone: the colour develops to match your undertone.' },
              { icon: Layers, title: 'Buildable', body: 'Sheer and fresh with one tap, deeper with a few. A little goes a long way.' },
              { icon: Leaf, title: 'Cruelty-free', body: 'Never tested on animals. Use within 12 months of opening.' },
              { icon: Package, title: 'Pocket-sized', body: `A slim 53 × 53 mm compact, 1.8 g — made for touch-ups on the go.` },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="border-t border-noir pt-5">
                <Icon className="h-5 w-5 text-rose-600" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="mt-3 tracked-caps font-sans text-xs text-noir">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <OrderNowButton product={featured}>Order now — {formatMoney(min)}</OrderNowButton>
            <Link to={`/product/${featured.slug}`} className="btn-outline">
              Product details
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Ingredients */}
      {(featured.ingredients || featured.specs?.length > 0) && (
        <section className="bg-blush-50 py-16 sm:py-24">
          <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <Eyebrow>What&apos;s inside</Eyebrow>
              <h2 className="mt-3 font-display text-4xl text-noir sm:text-5xl">Ingredients</h2>
              {featured.specs?.length > 0 && (
                <dl className="mt-8 divide-y divide-rose-200 border-y border-rose-200 text-sm">
                  {featured.specs.map((s) => (
                    <div key={s.label} className="flex justify-between gap-6 py-3">
                      <dt className="text-muted">{s.label}</dt>
                      <dd className="text-right text-noir">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {featured.ingredients && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-rose-100 sm:p-10">
                <p className="text-sm leading-[1.9] tracking-wide text-ink/85 uppercase" data-testid="ingredients">
                  {featured.ingredients}
                </p>
                <p className="mt-6 text-xs text-muted">
                  The colour-changing effect comes from D&amp;C Red No.22 (CI 45380). As with any new cosmetic, patch-test first if
                  your skin is sensitive.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- Reviews */}
      <section className="py-16 sm:py-24" aria-labelledby="reviews-title">
        <div className="container-page text-center">
          <Eyebrow className="justify-center">Reviews</Eyebrow>
          <h2 id="reviews-title" className="mt-3 font-display text-4xl text-noir sm:text-5xl">
            Glow notes
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3" data-testid="reviews-placeholder">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-rose-200 bg-blush-50/60 p-6">
                <div className="flex gap-1 text-rose-300" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Sparkle key={s} className="h-3.5 w-3.5" />
                  ))}
                </div>
                <p className="text-sm text-muted">Your review could be here</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-lg text-muted">
            Crystal Blush has just launched — our first customers&apos; reviews will appear here soon.
            {hasSocials ? ' Tag us when you try it:' : ''}
          </p>
          {hasSocials && <SocialLinks settings={settings} className="mt-4 justify-center text-noir" />}
        </div>
      </section>

      {/* -------------------------------------------------------------- FAQ */}
      {faq.length > 0 && (
        <section className="border-t border-rose-100 bg-pearl py-16 sm:py-24">
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <Eyebrow>Good to know</Eyebrow>
              <h2 className="mt-3 font-display text-4xl text-noir sm:text-5xl">Questions</h2>
              <Link to="/faq" className="btn-outline mt-8">
                All FAQs
              </Link>
            </div>
            <div className="divide-y divide-rose-200 border-y border-rose-200">
              {faq.map((f, i) => (
                <details key={i} className="group py-5" name="home-faq">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl text-noir">
                    {f.q}
                    <span className="text-2xl text-rose-500 transition group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- Other products */}
      {others.length > 0 && (
        <section className="container-page py-16 sm:py-24">
          <Eyebrow>Also in the shop</Eyebrow>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
            {others.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- CTA */}
      <section className="relative overflow-hidden bg-noir text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,154,149,0.35),transparent_55%)]" aria-hidden="true" />
        <div className="container-page relative flex flex-col items-center py-20 sm:py-28">
          <Sparkle className="h-10 w-10" gradient />
          <h2 className="mt-6 font-display text-5xl text-ivory sm:text-7xl">
            Find your <em className="text-foil">glow</em>
          </h2>
          <p className="mt-4 max-w-md text-rose-100/80">
            {featured.name} · {formatMoney(min)}. Pay cash on delivery or with GCash, delivered anywhere in the Philippines.
          </p>
          <OrderNowButton product={featured} className="btn-light mt-9 px-10" />
        </div>
      </section>
    </div>
  )
}
