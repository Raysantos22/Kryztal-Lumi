import { useNavigate } from 'react-router-dom'

// "Order now": jump to the order form — on this page if there is one (home,
// product page), otherwise on the product page.
export function useOrderNow(product) {
  const navigate = useNavigate()
  return () => {
    if (!product) return
    const form = document.getElementById('order-form')
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => form.querySelector('input:not([type=hidden]), select')?.focus({ preventScroll: true }), 400)
      return
    }
    navigate(`/product/${product.slug}#order-form`)
  }
}
