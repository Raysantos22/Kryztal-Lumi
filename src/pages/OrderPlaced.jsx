import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../lib/api/index.js'
import { useAsync } from '../lib/useAsync.js'
import { useSeo } from '../lib/useSeo.js'
import { recallOrderPhone } from '../lib/orderMemory.js'
import { ErrorBox, Loading } from '../components/ui.jsx'
import { Sparkle } from '../components/icons.jsx'
import OrderDetails from '../components/OrderDetails.jsx'

export default function OrderPlaced() {
  const { orderNo } = useParams()
  const { state } = useLocation()
  const phone = state?.phone || recallOrderPhone(orderNo)
  const [fresh, setFresh] = useState(state?.order || null)
  // After a refresh there is no router state: reload with the remembered phone.
  const loaded = useAsync(() => api.getOrder(orderNo, phone), [orderNo, phone], { enabled: !state?.order && !!phone })
  const order = fresh || loaded.data

  useSeo({ title: 'Thank you for your order', description: 'Your Kryztal Lumi order has been placed.', noindex: true })

  if (!order) {
    if (loaded.loading) return <Loading label="Loading your order…" />
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-4xl text-noir">Order {orderNo}</h1>
        <ErrorBox error={loaded.error} />
        <p className="mt-3 text-muted">Look up your order with your order number and mobile number.</p>
        <Link to={`/track?order=${encodeURIComponent(orderNo)}`} className="btn-solid mt-8">
          Track my order
        </Link>
      </div>
    )
  }

  const gcash = order.payment_method === 'gcash' && order.status === 'awaiting_payment'

  return (
    <div className="bg-pearl pb-20">
      <div className="relative overflow-hidden bg-blush-100">
        <div className="sparkle-dots absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-page relative py-12 text-center">
          <Sparkle className="mx-auto h-10 w-10" gradient />
          <h1 className="mt-4 font-display text-4xl text-noir sm:text-5xl">Thank you, {order.customer.name.split(' ')[0]}!</h1>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            {gcash
              ? 'Your order is reserved. Pay with GCash below and we’ll confirm it as soon as we see your payment.'
              : 'Your order has been placed. We’ll confirm it shortly and let you know when it ships.'}
          </p>
          <p className="mt-4 text-sm text-noir">
            Save your order number <strong data-testid="placed-order-no">{order.order_no}</strong> to track your parcel.
          </p>
        </div>
      </div>
      <div className="container-page max-w-4xl pt-8">
        <OrderDetails order={order} phone={phone} onUpdated={setFresh} />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn-outline">
            Continue shopping
          </Link>
          <Link to={`/track?order=${encodeURIComponent(order.order_no)}`} className="btn-outline">
            Track order
          </Link>
        </div>
      </div>
    </div>
  )
}
