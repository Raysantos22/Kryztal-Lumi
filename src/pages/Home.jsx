import { Link } from 'react-router-dom'
import { useStore } from '../lib/StoreContext.jsx'
import { useOrderNow } from '../lib/useOrderNow.js'
import { useSeo } from '../lib/useSeo.js'
import { availableStock, priceRange } from '../lib/catalog.js'
import { formatMoney, socialLinks } from '../lib/format.js'
import { Eyebrow } from '../components/ui.jsx'
import { Sparkle } from '../components/icons.jsx'
import { SocialLinks } from '../components/Layout.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { DesktopHero, MobileCollection, MobileHero } from '../components/HomeHero.jsx'
import FeatureBanners from '../components/FeatureBanners.jsx'
import Shop from './Shop.jsx'

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
  const { featured, settings, products, categories } = useStore()

  const { min } = featured ? priceRange(featured) : { min: 0 }
  const faq = (settings?.faq || []).slice(0, 4)
  const others = products.filter((p) => p.id !== featured?.id)
  const hasSocials = socialLinks(settings).length > 0

  const isLaunch = featured?.slug === LAUNCH_SLUG
  useSeo({
    title: !isLaunch ? 'Shop' : featured ? `${featured.name} — ${featured.subtitle || 'Kryztal Lumi'}` : null,
    description: isLaunch
      ? `${featured.name} by Kryztal Lumi: ${featured.subtitle?.toLowerCase() || ''}. ${formatMoney(min)} · cash on delivery or GCash · ships nationwide.`
      : 'Kryztal Lumi beauty — shop online, cash on delivery or GCash, shipped nationwide.',
  })

  if (!isLaunch) return <Shop />

  return (
    <div className="bg-ivory">
      <DesktopHero featured={featured} settings={settings} products={products} />
      <MobileHero featured={featured} settings={settings} />
      <MobileCollection products={products} categories={categories} settings={settings} />
      <FeatureBanners product={featured} />

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
