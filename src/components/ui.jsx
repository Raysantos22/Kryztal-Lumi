import { AlertCircle, Loader2, Minus, Plus } from 'lucide-react'
import { ORDER_STATUS, formatMoney } from '../lib/format.js'
import { Sparkle } from './icons.jsx'

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-rose-600 ${className}`} aria-hidden="true" />
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <Spinner />
      {label}
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  const message = typeof error === 'string' ? error : error.message || 'Something went wrong.'
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">{message}</div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline">
          Try again
        </button>
      )}
    </div>
  )
}

export function Notice({ children, tone = 'info', className = '' }) {
  const tones = {
    info: 'border-rose-200 bg-rose-50 text-rose-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }
  return <div className={`rounded-lg border p-4 text-sm ${tones[tone]} ${className}`}>{children}</div>
}

export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`flex items-center gap-2 tracked-caps text-[0.68rem] text-rose-700 ${className}`}>
      <Sparkle className="h-3 w-3 text-rose-500" /> {children}
    </p>
  )
}

export function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="relative overflow-hidden bg-blush-100">
      <div className="sparkle-dots absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-page relative py-12 text-center sm:py-16">
        {eyebrow && <Eyebrow className="justify-center">{eyebrow}</Eyebrow>}
        <h1 className="mt-3 font-display text-4xl font-medium text-noir sm:text-5xl">{title}</h1>
        {children && <div className="mx-auto mt-3 max-w-2xl text-muted">{children}</div>}
      </div>
    </header>
  )
}

export function StatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { label: status, style: 'bg-stone-100 text-stone-700' }
  return <span className={`badge ${s.style}`}>{s.label}</span>
}

export function EmptyState({ children }) {
  return <div className="rounded-xl border border-dashed border-rose-200 p-8 text-center text-sm text-muted">{children}</div>
}

export function Field({ label, htmlFor, hint, error, children, className = '', optional = false }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {optional && <span className="font-normal text-stone-500"> (optional)</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-600" id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </p>
      )}
    </div>
  )
}

export function Price({ amount, compareAt, currency = 'PHP', className = '' }) {
  const showCompare = compareAt != null && Number(compareAt) > Number(amount)
  return (
    <span className={className}>
      {showCompare && <s className="mr-2 text-[0.8em] text-stone-400">{formatMoney(compareAt, currency)}</s>}
      {formatMoney(amount, currency)}
    </span>
  )
}

const BADGE_TONES = {
  dark: 'bg-noir text-ivory',
  warn: 'bg-amber-100 text-amber-900',
  rose: 'bg-rose-100 text-rose-800',
  light: 'bg-white text-noir ring-1 ring-rose-200',
}
export function ProductBadges({ badges, className = '' }) {
  if (!badges?.length) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((b) => (
        <span key={b.key} className={`badge tracked-caps px-2! text-[0.6rem]! ${BADGE_TONES[b.tone]}`} data-testid={`badge-${b.key}`}>
          {b.label}
        </span>
      ))}
    </div>
  )
}

export function QuantityInput({ value, onChange, max = 99, min = 1, label = 'Quantity', size = 'md' }) {
  const btn = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'
  return (
    <div className="inline-flex items-center rounded-full border border-rose-200 bg-white" role="group" aria-label={label}>
      <button
        type="button"
        className={`${btn} flex items-center justify-center rounded-full text-noir hover:bg-rose-50 disabled:opacity-30`}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={`min-w-8 text-center tabular-nums ${size === 'sm' ? 'text-sm' : ''}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`${btn} flex items-center justify-center rounded-full text-noir hover:bg-rose-50 disabled:opacity-30`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// Fallback art when a product has no photo yet.
export function ImagePlaceholder({ className = '' }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-blush-100 to-blush-300 ${className}`}>
      <Sparkle className="h-1/4 w-1/4 opacity-70" gradient />
    </div>
  )
}
