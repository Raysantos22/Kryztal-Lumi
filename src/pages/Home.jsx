import { Link } from 'react-router-dom'
import { useStore } from '../lib/StoreContext.jsx'
import { useOrderNow } from '../lib/useOrderNow.js'
import { useSeo } from '../lib/useSeo.js'
import { availableStock, priceRange } from '../lib/catalog.js'
import { formatMoney } from '../lib/format.js'
import { Eyebrow } from '../components/ui.jsx'
import { Sparkle } from '../components/icons.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { DesktopHero, MobileCollection, MobileHero } from '../components/HomeHero.jsx'
import FeatureBanners from '../components/FeatureBanners.jsx'
import OrderForm, { BenefitList, PriceBlock } from '../components/OrderForm.jsx'
import { CommunitySlideshow } from '../components/Community.jsx'
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

export default function Home() {
  const { featured, settings, products, categories } = useStore()

  const { min } = featured ? priceRange(featured) : { min: 0 }
  const faq = (settings?.faq || []).slice(0, 4)
  const others = products.filter((p) => p.id !== featured?.id)

  const isLaunch = featured?.slug === LAUNCH_SLUG
  useSeo({
    title: !isLaunch ? 'Shop' : featured ? `${featured.name} — ${featured.subtitle || 'Kryztal Lumi'}` : null,
    description: isLaunch
      ? `${featured.name} by Kryztal Lumi: ${featured.subtitle?.toLowerCase() || ''}. ${formatMoney(min)} · cash on delivery · fast nationwide shipping · ships nationwide.`
      : 'Kryztal Lumi beauty — order online, cash on delivery, fast nationwide shipping.',
  })

  if (!isLaunch) return <Shop />

  return (
    <div className="bg-ivory">
      <DesktopHero featured={featured} settings={settings} products={products} />
      <MobileHero featured={featured} settings={settings} />
      <MobileCollection products={products} categories={categories} settings={settings} />
      <FeatureBanners product={featured} />

      {/* ------------------------------------------------------- Order form */}
      <section id="order" className="scroll-mt-20 bg-blush-50 py-14 sm:py-20" aria-labelledby="order-title">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <img
              src="/images/product-box.webp"
              alt={`${featured.name} compact`}
              width="1200"
              height="1200"
              loading="lazy"
              className="mx-auto w-full max-w-md rounded-sm shadow-xl shadow-rose-900/10"
            />
          </div>
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            <Eyebrow>Order now · {settings?.cod_enabled ? 'Cash on delivery' : 'Fast shipping'}</Eyebrow>
            <h2 id="order-title" className="mt-3 font-sans text-3xl leading-tight font-bold tracking-tight text-noir sm:text-4xl">
              {featured.name}
            </h2>
            {featured.subtitle && <p className="mt-1 text-muted">{featured.subtitle}</p>}
            <PriceBlock price={min} compareAt={featured.compare_at_price} className="mt-4" />
            {featured.highlights?.length > 0 && (
              <div className="mt-4 border-t border-rose-200 pt-4">
                <BenefitList items={featured.highlights} />
              </div>
            )}
            <div className="mt-6">
              <OrderForm product={featured} idPrefix="home" />
            </div>
          </div>
        </div>
      </section>
      <CommunitySlideshow product={featured} settings={settings} />

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
            {featured.name} · {formatMoney(min)}. Cash on delivery, delivered fast anywhere in the Philippines.
          </p>
          <OrderNowButton product={featured} className="btn-light mt-9 px-10" />
        </div>
      </section>
    </div>
  )
}
