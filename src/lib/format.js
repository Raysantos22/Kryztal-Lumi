// Formatting helpers. Dates are shown in the store's timezone (Asia/Manila)
// whatever timezone the visitor's device is in.
export const STORE_TZ = 'Asia/Manila'

export function formatMoney(amount, currency = 'PHP') {
  const n = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency,
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}

export function formatDate(iso, opts = {}) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-PH', { timeZone: STORE_TZ, month: 'short', day: 'numeric', year: 'numeric', ...opts })
}

export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: STORE_TZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const ORDER_STATUS = {
  awaiting_payment: { label: 'Awaiting payment', style: 'bg-amber-100 text-amber-900' },
  new: { label: 'New', style: 'bg-sky-100 text-sky-900' },
  confirmed: { label: 'Confirmed', style: 'bg-emerald-100 text-emerald-900' },
  packed: { label: 'Packed', style: 'bg-violet-100 text-violet-900' },
  shipped: { label: 'Shipped', style: 'bg-rose-100 text-rose-800' },
  delivered: { label: 'Delivered', style: 'bg-noir text-ivory' },
  cancelled: { label: 'Cancelled', style: 'bg-stone-200 text-stone-700' },
  returned: { label: 'Returned', style: 'bg-stone-200 text-stone-700' },
}

export const PAYMENT_METHOD = { cod: 'Cash on delivery', gcash: 'GCash' }
export const PAYMENT_STATUS = {
  unpaid: 'Unpaid',
  submitted: 'Reference submitted',
  paid: 'Paid',
  refunded: 'Refunded',
}

// Accepts 09xx xxx xxxx, +63 9xx…, 639xx…, landlines with area code.
export function isValidPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 13 && String(phone).length <= 30
}

export const isValidEmail = (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '').trim())

export function messengerLink(settings, text) {
  const id = settings?.messenger_id?.trim()
  if (!id) return null
  const base = `https://m.me/${encodeURIComponent(id)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

export const telLink = (phone) => (phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null)

export function viberLink(phone) {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `63${digits.slice(1)}`
  return `viber://chat?number=%2B${digits}`
}

export function whatsappLink(phone) {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `63${digits.slice(1)}`
  return `https://wa.me/${digits}`
}

// Social links that are set (hidden while empty).
export function socialLinks(settings) {
  if (!settings) return []
  return [
    { key: 'facebook', label: 'Facebook', href: settings.facebook_url },
    { key: 'instagram', label: 'Instagram', href: settings.instagram_url },
    { key: 'tiktok', label: 'TikTok', href: settings.tiktok_url },
  ].filter((l) => l.href && /^https?:\/\//i.test(l.href))
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
