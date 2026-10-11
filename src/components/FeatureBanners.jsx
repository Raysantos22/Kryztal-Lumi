// Alternating full-width banners (text | big photo with a floating product
// card), one story each about the featured product. The photos are styled
// scenes generated from the packaging until real photography is uploaded.
import { Link } from 'react-router-dom'
import { useOrderNow } from '../lib/useOrderNow.js'
import { availableStock, priceRange } from '../lib/catalog.js'
import { formatMoney } from '../lib/format.js'

function ProductTag({ product, image, className = '' }) {
  return (
    <Link
      to={`/product/${product.slug}`}
      className={`absolute z-10 block w-36 bg-blush-100 p-1.5 shadow-xl shadow-rose-950/15 transition hover:-translate-y-1 sm:w-48 lg:w-60 lg:p-2 ${className}`}
      aria-label={`${product.name}, ${formatMoney(priceRange(product).min)}`}
    >
      <span className="block bg-white">
        <img src={image} alt="" loading="lazy" className="aspect-[4/4.4] w-full object-cover" />
      </span>
      <span className="block px-2 pt-2 pb-1 text-center lg:pt-3 lg:pb-2">
        <span className="block font-display text-sm font-bold text-rose-600 lg:text-base">{product.name}</span>
        <span className="block text-xs text-rose-500 tabular-nums lg:text-sm">{formatMoney(priceRange(product).min)}</span>
      </span>
    </Link>
  )
}

function Banner({ product, title, text, cta, onCta, to, photo, photoSmall, photoAlt, tagImage, reverse, tagClass, testId }) {
  const soldOut = availableStock(product) <= 0
  const button = 'inline-flex items-center rounded-full bg-rose-500 px-8 py-3.5 text-sm font-semibold tracking-wide text-white uppercase shadow-sm shadow-rose-900/20 transition hover:bg-rose-600 disabled:opacity-50'
  return (
    <section
      className={`grid lg:min-h-[540px] ${reverse ? 'lg:grid-cols-[60%_40%]' : 'lg:grid-cols-[40%_60%]'}`}
      data-testid={testId}
    >
      <div className={`relative min-h-[300px] overflow-hidden sm:min-h-[440px] ${reverse ? 'lg:order-1' : 'lg:order-2'}`}>
        <picture>
          <source media="(max-width: 900px)" srcSet={photoSmall} />
          <img src={photo} alt={photoAlt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        <ProductTag product={product} image={tagImage} className={tagClass} />
      </div>
      <div className={`flex items-center px-6 py-12 sm:px-12 lg:px-14 ${reverse ? 'bg-white lg:order-2' : 'bg-blush-50 lg:order-1'}`}>
        <div className="max-w-xl">
          <h2 className="font-display text-4xl font-semibold text-rose-600 italic sm:text-5xl">{title}</h2>
          <p className="mt-4 leading-relaxed text-ink/85 sm:text-lg">{text}</p>
          <div className="mt-8">
            {to ? (
              <Link to={to} className={button}>
                {cta}
              </Link>
            ) : (
              <button type="button" onClick={onCta} className={button} disabled={soldOut}>
                {soldOut ? 'Sold out' : cta}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function FeatureBanners({ product }) {
  const orderNow = useOrderNow(product)
  return (
    <div>
      <Banner
        testId="banner-product"
        product={product}
        title={product.name}
        text="A tone-adapt crystal blush that develops into your own natural flush — one shade that suits every skin tone, in a slim black compact finished in rose-gold foil."
        cta="Get your glow"
        to={`/product/${product.slug}`}
        photo="/images/scene-flatlay.webp"
        photoSmall="/images/scene-flatlay-900.webp"
        photoAlt={`Rows of ${product.name} compacts and blush pans on a blush-pink backdrop`}
        tagImage="/images/product-box-700.webp"
        tagClass="top-6 right-4 sm:top-10 sm:right-8 lg:top-16 lg:right-16"
      />
      <Banner
        testId="banner-tone-adapt"
        reverse
        product={product}
        title="Tone-adapt"
        text="Deep crystal in the compact, a soft rosy flush on your cheek. It develops on your skin in a minute or two and builds from barely-there to bold."
        cta="Let's glow!"
        onCta={orderNow}
        photo="/images/scene-podium.webp"
        photoSmall="/images/scene-podium-900.webp"
        photoAlt={`${product.name} blush pans displayed on white podiums`}
        tagImage="/images/product-pan.webp"
        tagClass="bottom-6 left-4 sm:bottom-auto sm:top-10 sm:left-8 lg:top-16 lg:left-16"
      />
    </div>
  )
}
