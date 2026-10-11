import { Link } from 'react-router-dom'
import { useBag } from '../lib/BagContext.jsx'
import { useStore } from '../lib/StoreContext.jsx'
import { availableStock, hasVariants, priceRange, primaryImage, productBadges } from '../lib/catalog.js'
import { formatMoney } from '../lib/format.js'
import { ImagePlaceholder, ProductBadges } from './ui.jsx'

export default function ProductCard({ product }) {
  const { settings } = useStore()
  const { add, setOpen } = useBag()
  const image = primaryImage(product)
  const badges = productBadges(product, { lowStockThreshold: settings?.low_stock_threshold })
  const soldOut = availableStock(product) <= 0
  const { min, max } = priceRange(product)
  const variants = hasVariants(product)

  return (
    <article className="group relative flex flex-col" data-testid="product-card">
      <Link to={`/product/${product.slug}`} className="relative block overflow-hidden rounded-sm bg-blush-100">
        {image ? (
          <img
            src={image.url}
            alt={image.alt || product.name}
            loading="lazy"
            className={`aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.04] ${soldOut ? 'opacity-60' : ''}`}
          />
        ) : (
          <ImagePlaceholder className="aspect-[4/5] w-full" />
        )}
        <ProductBadges badges={badges} className="absolute top-3 left-3" />
      </Link>
      <div className="mt-4 flex flex-1 flex-col">
        <h3 className="font-display text-2xl leading-tight text-noir">
          <Link to={`/product/${product.slug}`} className="hover:text-rose-700">
            {product.name}
          </Link>
        </h3>
        {product.subtitle && <p className="mt-0.5 text-sm text-muted">{product.subtitle}</p>}
        <p className="mt-2 tabular-nums">
          {product.compare_at_price && Number(product.compare_at_price) > min && (
            <s className="mr-2 text-sm text-stone-400">{formatMoney(product.compare_at_price)}</s>
          )}
          {min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`}
        </p>
        <div className="mt-4">
          {soldOut ? (
            <span className="btn-outline w-full cursor-default opacity-50">Sold out</span>
          ) : variants ? (
            <Link to={`/product/${product.slug}`} className="btn-outline w-full">
              Choose {product.variant_label.toLowerCase()}
            </Link>
          ) : (
            <button
              type="button"
              className="btn-outline w-full"
              onClick={() => {
                add(product.id, null, 1)
                setOpen(true)
              }}
              aria-label={`Add ${product.name} to bag`}
            >
              Add to bag
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
