// Render the notification emails to screenshots/email-*.html for a visual check.
//   npx -y deno@2 run --allow-write=screenshots scripts/preview-emails.ts
import { newOrderOwnerMessage, orderConfirmedMessage, orderShippedMessage, type OrderDetails } from '../supabase/functions/_shared/notifications/templates.ts'

const order: OrderDetails = {
  order_no: 'KL-24A7F3', status: 'shipped', payment_method: 'cod', payment_status: 'unpaid',
  customer: { name: 'Maria Santos', phone: '0917 123 4567', email: 'maria@example.com' },
  shipping: { address_line: '12 Sampaguita St.', barangay: 'San Antonio', city: 'Pasig City', province: 'Metro Manila', zip: '1600', landmark: 'Near the chapel', zone_name: 'Metro Manila', eta: '2–3 days' },
  items: [{ product_name: 'Crystal Blush', variant_name: null, quantity: 2, unit_price: 399, line_total: 798 }],
  subtotal: 798, shipping_fee: 100, total: 898, gcash_reference: null, courier: 'J&T Express', tracking_no: 'JT0001234567',
  notes: 'Please call before delivery', created_at: '2026-10-11T09:00:00Z',
}
const store = { store_name: 'Kryztal Lumi', currency: 'PHP' }
const site = 'http://localhost:5174'
Deno.writeTextFileSync('screenshots/email-owner.html', newOrderOwnerMessage(order, store, `${site}/admin/orders/x`).html!)
Deno.writeTextFileSync('screenshots/email-confirmed.html', orderConfirmedMessage(order, store, site).html!)
Deno.writeTextFileSync('screenshots/email-shipped.html', orderShippedMessage(order, store, site).html!)
