// Catalogue rules shared by the shop, product page, bag and admin.
// A product either has active variants (each with its own price + stock)
// or uses its own price + stock.

export const activeVariants = (product) => (product?.variants || []).filter((v) => v.is_active !== false)
export const hasVariants = (product) => activeVariants(product).length > 0

// Stock available for a product (sum of variants) or one variant.
// Infinity when stock isn't tracked.
export function availableStock(product, variant = null) {
  if (!product) return 0
  if (!product.track_stock) return Infinity
  if (variant) return variant.stock
  if (hasVariants(product)) return activeVariants(product).reduce((n, v) => n + v.stock, 0)
  return product.stock
}

export function priceRange(product) {
  const vs = activeVariants(product)
  if (!vs.length) return { min: Number(product.price), max: Number(product.price) }
  const prices = vs.map((v) => Number(v.price))
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export const primaryImage = (product) => product?.images?.[0] || null

// Badges in display order: Sold out · Only X left · New · Best seller
export function productBadges(product, { lowStockThreshold = 5, variant = null } = {}) {
  const badges = []
  const stock = availableStock(product, variant)
  if (stock <= 0) badges.push({ key: 'sold-out', label: 'Sold out', tone: 'dark' })
  else if (stock !== Infinity && stock <= lowStockThreshold) badges.push({ key: 'low-stock', label: `Only ${stock} left`, tone: 'warn' })
  if (product?.badge_new) badges.push({ key: 'new', label: 'New', tone: 'rose' })
  if (product?.badge_bestseller) badges.push({ key: 'bestseller', label: 'Best seller', tone: 'light' })
  return badges
}

// Resolve bag lines against the loaded catalogue.
export function resolveBag(lines, products) {
  const byId = new Map((products || []).map((p) => [p.id, p]))
  return lines.map((line) => {
    const product = byId.get(line.product_id) || null
    const variant = line.variant_id ? activeVariants(product).find((v) => v.id === line.variant_id) || null : null
    let problem = null
    if (!product) problem = 'No longer available'
    else if (line.variant_id && !variant) problem = 'This option is no longer available'
    else if (!line.variant_id && hasVariants(product)) problem = `Please choose a ${product.variant_label.toLowerCase()}`
    const stock = product ? availableStock(product, variant) : 0
    if (!problem && stock <= 0) problem = 'Sold out'
    else if (!problem && line.quantity > stock) problem = `Only ${stock} left`
    else if (!problem && line.quantity > product.max_per_order) problem = `Max ${product.max_per_order} per order`
    const unitPrice = variant ? Number(variant.price) : product ? Number(product.price) : 0
    return {
      ...line,
      key: `${line.product_id}:${line.variant_id || ''}`,
      product,
      variant,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
      image: variant?.image_url || primaryImage(product)?.url || null,
      maxQuantity: product ? Math.max(1, Math.min(stock === Infinity ? 99 : stock, product.max_per_order)) : 1,
      problem,
    }
  })
}

// Shipping preview (the server recomputes this from the database).
export function shippingFee(settings, zone, subtotal) {
  if (!zone) return null
  if (settings?.free_shipping_mode === 'all') return 0
  if (settings?.free_shipping_mode === 'threshold' && subtotal >= Number(settings.free_shipping_threshold)) return 0
  return Number(zone.fee)
}
