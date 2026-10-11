import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { ExternalLink, FolderTree, LayoutDashboard, LogOut, MessageSquareHeart, Package, Receipt, Settings, Truck } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext.jsx'
import { useStore } from '../../lib/StoreContext.jsx'
import { useSeo } from '../../lib/useSeo.js'
import { api } from '../../lib/api/index.js'
import { DEMO_ADMIN, DEMO_MODE } from '../../lib/config.js'
import { ErrorBox, Field, Loading, Notice, Spinner } from '../../components/ui.jsx'
import { DemoBanner } from '../../components/Layout.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import { AdminOrders, AdminOrderDetail } from './AdminOrders.jsx'
import { AdminProducts, AdminProductEdit } from './AdminProducts.jsx'
import AdminCategories from './AdminCategories.jsx'
import AdminCommunity from './AdminCommunity.jsx'
import AdminShipping from './AdminShipping.jsx'
import AdminSettings from './AdminSettings.jsx'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: Receipt },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/community', label: 'Reviews', icon: MessageSquareHeart },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/shipping', label: 'Shipping', icon: Truck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function AdminLogin() {
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_ADMIN.email : '')
  const [password, setPassword] = useState(DEMO_MODE ? DEMO_ADMIN.password : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.signInWithPassword(email.trim(), password)
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blush-200 to-ivory p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl shadow-rose-900/10">
        <img src="/images/logo-sm.webp" alt="Kryztal Lumi" width="420" height="225" className="mx-auto h-16 w-auto" />
        <div className="text-center">
          <h1 className="font-display text-3xl">Owner login</h1>
          <p className="text-sm text-stone-600">Orders, products, shipping and settings.</p>
        </div>
        {DEMO_MODE && (
          <Notice>
            Demo mode — use <strong>{DEMO_ADMIN.email}</strong> / <strong>{DEMO_ADMIN.password}</strong>
          </Notice>
        )}
        <Field label="Email" htmlFor="admin-email">
          <input id="admin-email" type="email" className="input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="admin-password">
          <input
            id="admin-password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <ErrorBox error={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4 text-white" />} Log in
        </button>
        <Link to="/" className="block text-center text-sm text-stone-500 hover:underline">
          ← Back to the shop
        </Link>
      </form>
    </div>
  )
}

function useAdminCheck(user) {
  const [state, setState] = useState({ checking: true, isAdmin: false, error: null })
  useEffect(() => {
    let active = true
    if (!user) {
      setState({ checking: false, isAdmin: false, error: null })
      return
    }
    setState({ checking: true, isAdmin: false, error: null })
    api
      .isAdmin()
      .then((ok) => active && setState({ checking: false, isAdmin: ok, error: null }))
      .catch((error) => active && setState({ checking: false, isAdmin: false, error }))
    return () => {
      active = false
    }
  }, [user])
  return state
}

export default function AdminApp() {
  const { user, ready } = useAuth()
  const { loading: storeLoading, error: storeError, reload } = useStore()
  const { checking, isAdmin, error } = useAdminCheck(user)
  useSeo({ title: 'Admin', description: 'Kryztal Lumi admin', noindex: true })

  if (!ready || storeLoading) return <Loading label="Loading…" />
  if (storeError)
    return (
      <div className="container-page py-16">
        <ErrorBox error={storeError} onRetry={reload} />
      </div>
    )
  if (!user) return <AdminLogin />
  if (checking) return <Loading label="Checking access…" />
  if (!isAdmin)
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-md space-y-4 p-6 text-center">
          <h1 className="font-display text-2xl">No admin access</h1>
          <p className="text-sm text-stone-600">
            {user.email} is not an admin of this shop. See README → “Create the owner login”.
          </p>
          <ErrorBox error={error} />
          <button type="button" className="btn-secondary" onClick={() => api.signOut()}>
            Log out
          </button>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-stone-50">
      <DemoBanner />
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/images/logo-sm.webp" alt="Kryztal Lumi" width="420" height="225" className="h-9 w-auto" />
            <span className="text-xs tracking-[0.2em] text-stone-500 uppercase">Admin</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/" target="_blank" className="btn-ghost btn-sm hidden sm:inline-flex">
              <ExternalLink className="h-4 w-4" /> View shop
            </Link>
            <button type="button" className="btn-ghost btn-sm" onClick={() => api.signOut()} aria-label="Log out">
              <LogOut className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2" aria-label="Admin">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                  isActive ? 'bg-noir text-ivory' : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/:id" element={<AdminProductEdit />} />
          <Route path="community" element={<AdminCommunity />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="shipping" element={<AdminShipping />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<p className="text-stone-600">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}
