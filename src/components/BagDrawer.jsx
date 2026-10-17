import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Trash2, X } from 'lucide-react'
import { useBag } from '../lib/BagContext.jsx'
import { useStore } from '../lib/StoreContext.jsx'
import { useDialog } from '../lib/useDialog.js'
import { formatMoney } from '../lib/format.js'
import { ImagePlaceholder, QuantityInput } from './ui.jsx'
import { Sparkle } from './icons.jsx'

// One line of the bag, used by the drawer, the bag page and checkout.
export function BagLine({ item, editable = true, compact = false }) {
  const { setQuantity, remove } = useBag()
  const name = item.product?.name || 'Unavailable item'
  return (
    <li className="flex gap-4 py-4" data-testid="bag-line">
      <div className={`shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-rose-100 ${compact ? 'h-16 w-16' : 'h-20 w-20 sm:h-24 sm:w-24'}`}>
        {item.image ? (
          <img src={item.image} alt="" className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <ImagePlaceholder className="h-full w-full" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {item.product ? (
              <Link to={`/product/${item.product.slug}`} className="font-display text-lg leading-tight text-noir hover:text-rose-700">
                {name}
              </Link>
            ) : (
              <p className="font-display text-lg leading-tight text-stone-500">{name}</p>
            )}
            {item.variant && (
              <p className="text-xs text-muted">
                {item.product.variant_label}: {item.variant.name}
              </p>
            )}
            {!editable && <p className="text-xs text-muted">Qty {item.quantity}</p>}
          </div>
          <p className="shrink-0 text-sm tabular-nums">{formatMoney(item.lineTotal)}</p>
        </div>
        {item.problem && (
          <p className="mt-1 text-xs font-medium text-red-700" role="alert">
            {item.problem}
          </p>
        )}
        {editable && (
          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <QuantityInput
              size="sm"
              value={item.quantity}
              max={item.maxQuantity}
              min={1}
              label={`Quantity of ${name}`}
              onChange={(q) => setQuantity(item.product_id, item.variant_id, q)}
            />
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-red-700"
              onClick={() => remove(item.product_id, item.variant_id)}
              aria-label={`Remove ${name}`}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

export function FreeShippingNote({ subtotal }) {
  const { settings } = useStore()
  if (settings?.free_shipping_mode === 'all') {
    return <p className="text-xs text-rose-700">Free shipping on every order</p>
  }
  if (settings?.free_shipping_mode !== 'threshold') return null
  const threshold = Number(settings.free_shipping_threshold)
  const left = threshold - subtotal
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100))
  return (
    <div>
      <p className="text-xs text-rose-800">
        {left > 0 ? (
          <>
            Add <strong>{formatMoney(left)}</strong> more for free shipping
          </>
        ) : (
          'You get free shipping!'
        )}
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-rose-100" aria-hidden="true">
        <div className="h-full bg-rose-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function BagDrawer() {
  const { open, setOpen, items, subtotal, count, hasProblems } = useBag()
  const closeRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  const dialog = useDialog(open, () => setOpen(false), closeRef)

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="animate-fade absolute inset-0 bg-noir/40" onClick={() => setOpen(false)} aria-hidden="true" />
      <aside
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        className="animate-drawer absolute top-0 right-0 flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-rose-100 px-5 py-4">
          <h2 className="font-display text-2xl text-noir">
            Your bag <span className="text-base text-muted">({count})</span>
          </h2>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="-mr-2 p-2 text-noir" aria-label="Close bag">
            <X className="h-5 w-5" />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <Sparkle className="h-10 w-10 text-rose-400" />
            <p className="font-display text-2xl text-noir">Your bag is empty</p>
            <Link to="/shop" className="btn-outline" onClick={() => setOpen(false)}>
              Shop now
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-rose-100 overflow-y-auto px-5">
              {items.map((item) => (
                <BagLine key={item.key} item={item} />
              ))}
            </ul>
            <div className="space-y-4 border-t border-rose-100 px-5 py-5">
              <FreeShippingNote subtotal={subtotal} />
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="font-display text-2xl tabular-nums" data-testid="bag-subtotal">
                  {formatMoney(subtotal)}
                </span>
              </div>
              <p className="text-xs text-muted">Shipping is calculated at checkout from your province.</p>
              <button type="button" className="btn-solid w-full" disabled={hasProblems} onClick={() => navigate('/checkout')}>
                Checkout
              </button>
              <Link to="/bag" className="block py-1 text-center text-sm text-muted underline-offset-4 hover:text-noir hover:underline">
                View bag
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
