import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useStore } from './StoreContext.jsx'
import { resolveBag } from './catalog.js'

// The shopping bag lives in this browser (localStorage). Only ids and
// quantities are stored; prices always come from the current catalogue,
// and the server re-prices everything when the order is placed.
const BagContext = createContext(null)
const KEY = 'kl-bag-v1'
const MAX_LINES = 20

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter((l) => l && typeof l.product_id === 'string' && Number.isInteger(l.quantity) && l.quantity > 0)
      .map((l) => ({ product_id: l.product_id, variant_id: l.variant_id || null, quantity: Math.min(l.quantity, 99) }))
      .slice(0, MAX_LINES)
  } catch {
    return []
  }
}

const same = (a, b) => a.product_id === b.product_id && (a.variant_id || null) === (b.variant_id || null)

export function BagProvider({ children }) {
  const { products } = useStore()
  const [lines, setLines] = useState(load)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines))
    } catch {
      /* storage blocked: bag lasts for this visit */
    }
  }, [lines])

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setLines(load())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback((productId, variantId = null, quantity = 1) => {
    setLines((ls) => {
      const line = { product_id: productId, variant_id: variantId || null, quantity }
      const existing = ls.find((l) => same(l, line))
      if (existing) return ls.map((l) => (same(l, line) ? { ...l, quantity: Math.min(l.quantity + quantity, 99) } : l))
      return [...ls, line].slice(-MAX_LINES)
    })
  }, [])

  const setQuantity = useCallback((productId, variantId, quantity) => {
    setLines((ls) =>
      quantity <= 0
        ? ls.filter((l) => !same(l, { product_id: productId, variant_id: variantId }))
        : ls.map((l) => (same(l, { product_id: productId, variant_id: variantId }) ? { ...l, quantity: Math.min(quantity, 99) } : l)),
    )
  }, [])

  const remove = useCallback((productId, variantId) => setQuantity(productId, variantId, 0), [setQuantity])
  const clear = useCallback(() => setLines([]), [])

  const items = useMemo(() => resolveBag(lines, products), [lines, products])
  const count = lines.reduce((n, l) => n + l.quantity, 0)
  const subtotal = items.reduce((n, i) => n + (i.product ? i.lineTotal : 0), 0)
  const hasProblems = items.some((i) => i.problem)

  return (
    <BagContext.Provider
      value={{ lines, items, count, subtotal, hasProblems, add, setQuantity, remove, clear, open, setOpen }}
    >
      {children}
    </BagContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBag() {
  const ctx = useContext(BagContext)
  if (!ctx) throw new Error('useBag must be used inside <BagProvider>')
  return ctx
}
