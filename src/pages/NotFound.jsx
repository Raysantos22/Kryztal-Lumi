import { Link } from 'react-router-dom'
import { useSeo } from '../lib/useSeo.js'
import { Sparkle } from '../components/icons.jsx'

export default function NotFound() {
  useSeo({ title: 'Page not found', description: 'This page does not exist.', noindex: true })
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <Sparkle className="h-12 w-12" gradient />
      <p className="mt-6 tracked-caps text-[0.7rem] text-rose-700">404</p>
      <h1 className="mt-2 font-display text-5xl text-noir">Page not found</h1>
      <p className="mt-3 text-muted">This page has lost its sparkle — it doesn’t exist.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-outline">
          Home
        </Link>
        <Link to="/shop" className="btn-solid">
          Shop
        </Link>
      </div>
    </div>
  )
}
