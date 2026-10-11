import { useNavigate } from 'react-router-dom'
import { useBag } from './BagContext.jsx'
import { hasVariants } from './catalog.js'

// "Order now": straight to checkout with one in the bag (or to the product
// page when a shade/size has to be chosen first).
export function useOrderNow(product) {
  const { add, lines } = useBag()
  const navigate = useNavigate()
  return () => {
    if (!product) return
    if (hasVariants(product)) {
      navigate(`/product/${product.slug}`)
      return
    }
    if (!lines.some((l) => l.product_id === product.id)) add(product.id, null, 1)
    navigate('/checkout')
  }
}
