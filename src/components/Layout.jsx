import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, MessageCircle, ShoppingBag, X, Truck, Banknote, Smartphone } from 'lucide-react'
import { SOCIAL_ICONS } from './icons.jsx'
import { useStore } from '../lib/StoreContext.jsx'
import { useBag } from '../lib/BagContext.jsx'
import { DEMO_MODE } from '../lib/config.js'
import { messengerLink, socialLinks } from '../lib/format.js'
import { ErrorBox, Loading } from './ui.jsx'
import BagDrawer from './BagDrawer.jsx'

const NAV_LEFT = [
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
]
const NAV_RIGHT = [
  { to: '/track', label: 'Track order' },
  { to: '/contact', label: 'Contact' },
]
const NAV_ALL = [{ to: '/', label: 'Home', end: true }, ...NAV_LEFT, ...NAV_RIGHT, { to: '/shipping-returns', label: 'Shipping & Returns' }]

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
    <div className="bg-noir px-4 py-2 text-center text-[0.62rem] tracking-[0.14em] text-rose-100 uppercase sm:text-[0.68rem] sm:tracking-[0.2em]" data-testid="announcement">
      {settings.announcement_text}
    </div>
  )
}

export function Logo({ className = 'h-12 sm:h-14 lg:h-16', eager = true }) {
  return (
    <Link to="/" className="inline-flex shrink-0" aria-label="Kryztal Lumi — home">
      <img
        src="/images/logo-sm.webp"
        alt="Kryztal Lumi"
        width="420"
        height="225"
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
      className="relative inline-flex h-11 w-11 items-center justify-center text-noir transition hover:text-rose-600"
      aria-label={`Open bag, ${count} item${count === 1 ? '' : 's'}`}
      data-testid="bag-button"
    >
      <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
      {count > 0 && (
        <span className="absolute top-1 right-0.5 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[0.6rem] font-medium text-white">
          {count}
        </span>
      )}
    </button>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const menuButton = useRef(null)
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        menuButton.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const linkClass = ({ isActive }) =>
    `text-[0.7rem] tracking-[0.28em] uppercase transition hover:text-rose-600 ${isActive ? 'text-rose-700' : 'text-noir'}`

  return (
    <header className="sticky top-0 z-40 border-b border-rose-100/70 bg-ivory/90 backdrop-blur-md">
      {/* Desktop: nav | centred logo | nav + bag */}
      <div className="container-page hidden h-24 grid-cols-[1fr_auto_1fr] items-center gap-6 lg:grid">
        <nav className="flex items-center gap-9" aria-label="Main">
          {NAV_LEFT.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <Logo />
        <div className="flex items-center justify-end gap-8">
          <nav className="flex items-center gap-8" aria-label="Secondary">
            {NAV_RIGHT.map((n) => (
              <NavLink key={n.to} to={n.to} className={linkClass}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <BagButton />
        </div>
      </div>

      {/* Phones + portrait tablets: menu | logo | bag */}
      <div className="container-page grid h-16 grid-cols-[auto_1fr_auto] items-center sm:h-20 lg:hidden">
        <button
          ref={menuButton}
          type="button"
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center text-noir"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-6 w-6" strokeWidth={1.5} /> : <Menu className="h-6 w-6" strokeWidth={1.5} />}
        </button>
        <div className="flex justify-center">
          <Logo className="h-11 sm:h-14" />
        </div>
        <div className="-mr-2">
          <BagButton />
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="animate-fade border-t border-rose-100 bg-ivory lg:hidden" aria-label="Mobile">
          <div className="container-page flex flex-col divide-y divide-rose-100 py-2">
            {NAV_ALL.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `py-3.5 text-xs tracking-[0.28em] uppercase ${isActive ? 'text-rose-700' : 'text-noir'}`}
              >
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
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
          <a key={l.key} href={l.href} target="_blank" rel="noreferrer" aria-label={l.label} className="transition hover:text-rose-500">
            <Icon className={iconClass} />
          </a>
        )
      })}
    </div>
  )
}

function Footer({ settings }) {
  return (
    <footer className="bg-noir text-rose-100/80">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <img src="/images/logo-sm.webp" alt="Kryztal Lumi" width="420" height="225" loading="lazy" className="h-20 w-auto" />
          {settings?.tagline && <p className="mt-4 font-display text-xl text-rose-100 italic">{settings.tagline}</p>}
          <SocialLinks settings={settings} className="mt-5 text-rose-200" />
        </div>
        <nav aria-label="Footer">
          <h2 className="tracked-caps mb-4 font-sans text-[0.68rem] text-rose-300">Shop</h2>
          <ul className="space-y-2.5 text-sm">
            {[
              ['/shop', 'All products'],
              ['/track', 'Track your order'],
              ['/shipping-returns', 'Shipping & Returns'],
              ['/faq', 'FAQ'],
              ['/about', 'About'],
              ['/contact', 'Contact'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="transition hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="tracked-caps mb-4 font-sans text-[0.68rem] text-rose-300">How we deliver</h2>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 text-rose-300" aria-hidden="true" /> Nationwide shipping
            </li>
            {settings?.cod_enabled && (
              <li className="flex items-center gap-2.5">
                <Banknote className="h-4 w-4 text-rose-300" aria-hidden="true" /> Cash on delivery
              </li>
            )}
            {settings?.gcash_enabled && (
              <li className="flex items-center gap-2.5">
                <Smartphone className="h-4 w-4 text-rose-300" aria-hidden="true" /> GCash
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-rose-100/50">
        © {new Date().getFullYear()} {settings?.store_name || 'Kryztal Lumi'} ·{' '}
        <Link to="/admin" className="hover:text-white">
          Owner login
        </Link>
      </div>
    </footer>
  )
}

// Meta retired the embedded Messenger Chat Plugin in 2024, so the widget is
// a floating button that opens the Page's conversation via m.me. Hidden
// until a Messenger username is set in Admin → Settings.
export function MessengerButton({ settings }) {
  const href = messengerLink(settings)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full bg-noir px-4 py-3 text-sm text-ivory shadow-lg shadow-rose-900/25 ring-1 ring-rose-300/40 transition hover:scale-105 hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-noir sm:right-6 sm:bottom-6"
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
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <DemoBanner />
      <AnnouncementBar settings={settings} />
      <Header />
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
      <MessengerButton settings={settings} />
      <BagDrawer />
    </div>
  )
}
