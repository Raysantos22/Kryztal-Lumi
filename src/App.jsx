import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/StoreContext.jsx'
import { BagProvider } from './lib/BagContext.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import { Loading } from './components/ui.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Product from './pages/Product.jsx'
import Bag from './pages/Bag.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderPlaced from './pages/OrderPlaced.jsx'
import Track from './pages/Track.jsx'
import { About, Contact, Faq, ShippingReturns } from './pages/Info.jsx'
import NotFound from './pages/NotFound.jsx'

// The admin dashboard is only downloaded by the owner.
const AdminApp = lazy(() => import('./pages/admin/AdminApp.jsx'))

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <BagProvider>
          <AuthProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="product/:slug" element={<Product />} />
                <Route path="bag" element={<Bag />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order/:orderNo" element={<OrderPlaced />} />
                <Route path="track" element={<Track />} />
                <Route path="about" element={<About />} />
                <Route path="faq" element={<Faq />} />
                <Route path="shipping-returns" element={<ShippingReturns />} />
                <Route path="contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route
                path="admin/*"
                element={
                  <Suspense fallback={<Loading label="Loading dashboard…" />}>
                    <AdminApp />
                  </Suspense>
                }
              />
            </Routes>
          </AuthProvider>
        </BagProvider>
      </StoreProvider>
    </BrowserRouter>
  )
}
