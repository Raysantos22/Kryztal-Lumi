// Product feature list (icons + short text), shared by the home page and
// the product page. Items come from FEATURES in content/crystalBlush.js.
import { CircleDot, Droplets, Leaf, Rabbit, Smile } from 'lucide-react'

const ICONS = { change: Droplets, compact: CircleDot, cheeks: Smile, vegan: Leaf, crueltyFree: Rabbit }

export function FeatureList({ items, className = '', compact = false }) {
  return (
    <ul className={`grid gap-5 ${className}`}>
      {items.map((f) => {
        const Icon = ICONS[f.icon] || Droplets
        return (
          <li key={f.title} className="flex gap-4">
            <span
              className={`flex shrink-0 items-center justify-center rounded-full bg-blush-100 text-rose-600 ring-1 ring-gold-300/60 ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}
              aria-hidden="true"
            >
              <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={1.6} />
            </span>
            <div>
              <h3 className={`font-sans font-semibold text-noir ${compact ? 'text-[0.95rem]' : 'text-base'}`}>{f.title}</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
