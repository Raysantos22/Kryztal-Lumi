import { Link, useNavigate } from 'react-router-dom'
import { useBag } from '../lib/BagContext.jsx'
import { useSeo } from '../lib/useSeo.js'
import { formatMoney } from '../lib/format.js'
import { Notice } from '../components/ui.jsx'
import { Sparkle } from '../components/icons.jsx'
import { BagLine, FreeShippingNote } from '../components/BagDrawer.jsx'

export default function Bag() {
  const { items, subtotal, count, hasProblems } = useBag()
  const navigate = useNavigate()
  useSeo({ title: 'Your bag', description: 'Review your Kryztal Lumi bag.', noindex: true })

  return (
    <div className="container-page max-w-4xl py-10 pb-20 sm:py-14">
      <h1 className="font-display text-4xl text-noir sm:text-5xl">
        Your bag <span className="text-2xl text-muted">({count})</span>
      </h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Sparkle className="h-10 w-10" gradient />
          <p className="mt-4 font-display text-2xl text-noir">Your bag is empty</p>
          <Link to="/shop" className="btn-solid mt-8">
            Shop now
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-start">
          <ul className="divide-y divide-rose-100 border-y border-rose-100">
            {items.map((item) => (
              <BagLine key={item.key} item={item} />
            ))}
          </ul>
          <aside className="space-y-4 rounded-xl bg-blush-50 p-6" aria-label="Bag summary">
            <div className="flex items-baseline justify-between">
              <span className="tracked-caps text-[0.7rem]">Subtotal</span>
              <span className="font-display text-3xl tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            <FreeShippingNote subtotal={subtotal} />
            <p className="text-xs text-muted">Shipping is calculated at checkout from your province.</p>
            {hasProblems && <Notice tone="warn">Please update the items marked above.</Notice>}
            <button type="button" className="btn-solid w-full" disabled={hasProblems} onClick={() => navigate('/checkout')}>
              Checkout
            </button>
            <Link to="/shop" className="block text-center text-xs tracking-[0.2em] text-muted uppercase hover:text-noir">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  )
}
