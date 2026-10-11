import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { useSeo } from '../lib/useSeo.js'
import { isValidPhone } from '../lib/format.js'
import { ErrorBox, Field, PageHeader, Spinner } from '../components/ui.jsx'
import OrderDetails from '../components/OrderDetails.jsx'

export default function Track() {
  const [params] = useSearchParams()
  const [orderNo, setOrderNo] = useState(params.get('order') || '')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [searched, setSearched] = useState(null)

  useSeo({ title: 'Track your order', description: 'Check the status, courier and tracking number of your Kryztal Lumi order.' })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!orderNo.trim()) return setError('Please enter your order number.')
    if (!isValidPhone(phone)) return setError('Please enter the mobile number you used when ordering.')
    setBusy(true)
    try {
      const found = await api.getOrder(orderNo.trim(), phone.trim())
      setOrder(found)
      setSearched({ phone: phone.trim() })
      if (!found) setError('We couldn’t find an order with that number and mobile. Please check both and try again.')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-pearl pb-20">
      <PageHeader eyebrow="Order status" title="Track your order">
        Enter your order number (e.g. KL-24A7F3) and the mobile number you ordered with.
      </PageHeader>
      <div className="container-page max-w-4xl">
        <form onSubmit={submit} className="relative -mt-8 rounded-xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Order number" htmlFor="track-order">
              <input
                id="track-order"
                className="input uppercase placeholder:normal-case"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="KL-XXXXXX"
                autoComplete="off"
                maxLength={20}
              />
            </Field>
            <Field label="Mobile number" htmlFor="track-phone">
              <input
                id="track-phone"
                type="tel"
                inputMode="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0917 123 4567"
                autoComplete="tel"
                maxLength={30}
              />
            </Field>
            <button type="submit" className="btn-solid" disabled={busy}>
              {busy ? <Spinner className="h-4 w-4 text-white" /> : <Search className="h-4 w-4" />} Find order
            </button>
          </div>
          {error && (
            <div className="mt-4">
              <ErrorBox error={error} />
            </div>
          )}
        </form>

        {order && searched && (
          <div className="mt-8">
            <OrderDetails order={order} phone={searched.phone} onUpdated={setOrder} />
          </div>
        )}
      </div>
    </div>
  )
}
