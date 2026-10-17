import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Banknote, Menu, MessageCircle, Package, ShoppingBag, Smartphone, Truck, X } from 'lucide-react'
import { SOCIAL_ICONS } from './icons.jsx'
import { useStore } from '../lib/StoreContext.jsx'
import { useBag } from '../lib/BagContext.jsx'
import { useDialog } from '../lib/useDialog.js'
import { DEMO_MODE } from '../lib/config.js'
import { messengerLink, socialLinks } from '../lib/format.js'
import { ErrorBox, Loading } from './ui.jsx'
import BagDrawer from './BagDrawer.jsx'

const NAV_MAIN = [
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
]
const NAV_EXTRA = [{ to: '/track', label: 'Track order' }, { to: '/shipping-returns', label: 'Shipping & Returns' }]

// One-product shop: "Shop" becomes a direct link to that product.
function useNav() {
  const { products } = useStore()
  const only = products.length === 1 ? products[0] : null
  const main = NAV_MAIN.map((n) => (n.to === '/shop' && only ? { to: `/product/${only.slug}`, label: only.name } : n))
  return { main, all: [{ to: '/', label: 'Home', end: true }, ...main, ...NAV_EXTRA] }
}

export function DemoBanner() {
  if (!DEMO_MODE) return null
  return (
    <div className="bg-stone-800 px-4 py-1.5 text-center text-[0.7rem] text-white/90">
      Demo mode — orders are stored only in this browser. Connect Supabase to go live.
    </div>
  )
}

function AnnouncementBar({ settings }) {
  if (!settings?.announcement_enabled || !settings.announcement_text?.trim()) return null
  return (
    <div className="bg-rose-500 px-4 py-2 text-center text-xs font-medium text-white sm:text-[0.8rem]" data-testid="announcement">
      {settings.announcement_text}
    </div>
  )
}

export function Logo({ className = 'h-11 sm:h-12', eager = true }) {
  return (
    <Link to="/" className="inline-flex shrink-0 rounded-sm" aria-label="Kryztal Lumi — home">
      <img
        src="/images/logo-sm.webp"
        alt="Kryztal Lumi"
        width="480"
        height="246"
        className={`w-auto object-contain ${className}`}
        loading={eager ? 'eager' : 'lazy'}
      />
    </Link>
  )
}

function BagButton() {
  const { count, setOpen } = useBag()
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-noir transition hover:bg-blush-100"
      aria-label={`Open bag, ${count} item${count === 1 ? '' : 's'}`}
      data-testid="bag-button"
    >
      <ShoppingBag className="h-[1.35rem] w-[1.35rem]" strokeWidth={1.6} />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-semibold text-white ring-2 ring-ivory">
          {count}
        </span>
      )}
    </button>
  )
}

function MobileNav({ open, onClose, nav, settings }) {
  const ref = useDialog(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="animate-fade absolute inset-0 bg-noir/35" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="animate-drawer-left absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-ivory shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-rose-100 px-4 py-3">
          <Logo className="h-10" />
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-noir hover:bg-blush-100" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-4 py-2">
          {nav.all.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex min-h-12 items-center border-b border-rose-100 text-base ${isActive ? 'font-medium text-rose-700' : 'text-noir'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <ul className="space-y-2 border-t border-rose-100 bg-blush-50 px-5 py-4 text-sm text-ink">
          <li className="flex items-center gap-2.5">
            <Truck className="h-4 w-4 text-rose-600" aria-hidden="true" /> Nationwide shipping
          </li>
          {settings?.cod_enabled && (
            <li className="flex items-center gap-2.5">
              <Banknote className="h-4 w-4 text-rose-600" aria-hidden="true" /> Cash on delivery
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

function Header({ settings }) {
  const nav = useNav()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const menuButton = useRef(null)
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const linkClass = ({ isActive }) =>
    `relative py-1 text-[0.95rem] transition hover:text-rose-600 ${
      isActive ? 'text-noir after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-rose-500' : 'text-ink/80'
    }`

  // The drawer sits outside <header>: its backdrop blur would otherwise
  // become the containing block for the fixed-position drawer.
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-rose-100 bg-ivory/95 backdrop-blur-md">
        {/* Desktop: logo | nav | track + bag */}
        <div className="container-page hidden h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center gap-6 lg:grid">
          <Logo className="h-12" />
          <nav className="flex items-center gap-9" aria-label="Main">
            {nav.main.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-1">
            <NavLink
              to="/track"
              className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm text-ink/80 transition hover:bg-blush-100 hover:text-noir"
            >
              <Package className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /> Track order
            </NavLink>
            <BagButton />
          </div>
        </div>
  
        {/* Phones + portrait tablets: menu | logo | track + bag */}
        <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:hidden">
          <div>
            <button
              ref={menuButton}
              type="button"
              className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-noir transition hover:bg-blush-100"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" strokeWidth={1.6} />
            </button>
          </div>
          <Logo className="h-10" />
          <div className="-mr-2 flex items-center justify-end">
            <Link to="/track" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-noir transition hover:bg-blush-100" aria-label="Track order">
              <Package className="h-5 w-5" strokeWidth={1.6} />
            </Link>
            <BagButton />
          </div>
        </div>
      </header>
      <MobileNav open={open} onClose={() => setOpen(false)} nav={nav} settings={settings} />
    </>
  )
}

export function SocialLinks({ settings, className = '', iconClass = 'h-5 w-5' }) {
  const links = socialLinks(settings)
  if (!links.length) return null
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {links.map((l) => {
        const Icon = SOCIAL_ICONS[l.key]
        return (
          <a key={l.key} href={l.href} target="_blank" rel="noreferrer" aria-label={l.label} className="transition hover:text-rose-600">
            <Icon className={iconClass} />
          </a>
        )
      })}
    </div>
  )
}

function Footer({ settings }) {
  const { products } = useStore()
  const only = products.length === 1 ? products[0] : null
  return (
    <footer className="border-t border-rose-100 bg-blush-100 text-ink">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <img src="/images/logo-sm.webp" alt="Kryztal Lumi" width="480" height="246" loading="lazy" className="h-16 w-auto" />
          {settings?.tagline && <p className="mt-4 font-display text-xl text-rose-800">{settings.tagline}</p>}
          <SocialLinks settings={settings} className="mt-5 text-rose-700" />
        </div>
        <nav aria-label="Footer">
          <h2 className="tracked-caps mb-4 font-sans text-xs text-rose-700">Shop</h2>
          <ul className="space-y-2.5 text-sm">
            {[
              only ? [`/product/${only.slug}`, only.name] : ['/shop', 'All products'],
              ['/track', 'Track your order'],
              ['/shipping-returns', 'Shipping & Returns'],
              ['/faq', 'FAQ'],
              ['/about', 'About'],
              ['/contact', 'Contact'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="transition hover:text-rose-700 hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="tracked-caps mb-4 font-sans text-xs text-rose-700">How we deliver</h2>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 text-rose-600" aria-hidden="true" /> Nationwide shipping
            </li>
            {settings?.cod_enabled && (
              <li className="flex items-center gap-2.5">
                <Banknote className="h-4 w-4 text-rose-600" aria-hidden="true" /> Cash on delivery
              </li>
            )}
            {settings?.gcash_enabled && (
              <li className="flex items-center gap-2.5">
                <Smartphone className="h-4 w-4 text-rose-600" aria-hidden="true" /> GCash
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-rose-200/70 py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} {settings?.store_name || 'Kryztal Lumi'} ·{' '}
        <Link to="/admin" className="hover:text-noir hover:underline">
          Owner login
        </Link>
      </div>
    </footer>
  )
}

// Meta retired the embedded Messenger Chat Plugin in 2024, so the widget is
// a floating button that opens the Page's conversation via m.me. Hidden
// until a Messenger username is set in Admin → Settings.
export function MessengerButton({ settings, raised = false }) {
  const href = messengerLink(settings)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`fixed right-4 z-30 ${raised ? 'bottom-24 md:bottom-6' : 'bottom-4'} inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-3 text-sm text-white shadow-lg shadow-rose-900/20 transition hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 sm:right-6 sm:bottom-6`}
      aria-label="Message us on Facebook Messenger"
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      <span className="hidden sm:inline">Message us</span>
    </a>
  )
}

export default function Layout() {
  const { settings, error, loading, reload } = useStore()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <DemoBanner />
      <AnnouncementBar settings={settings} />
      <Header settings={settings} />
      <main id="main" className="flex-1">
        {loading ? (
          <Loading label="Loading the shop…" />
        ) : error ? (
          <div className="container-page py-16">
            <ErrorBox error={error} onRetry={reload} />
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <Footer settings={settings} />
      <MessengerButton settings={settings} raised={pathname.startsWith('/product/')} />
      <BagDrawer />
    </div>
  )
}
