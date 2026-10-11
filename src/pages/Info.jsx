// Content pages: About, FAQ, Shipping & Returns, Contact. Text comes from
// Admin → Settings so the owner can edit it.
import { Link } from 'react-router-dom'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { useAsync } from '../lib/useAsync.js'
import { useStore } from '../lib/StoreContext.jsx'
import { useSeo } from '../lib/useSeo.js'
import { formatMoney, messengerLink, socialLinks, telLink, viberLink, whatsappLink } from '../lib/format.js'
import { Eyebrow, PageHeader } from '../components/ui.jsx'
import { SOCIAL_ICONS, Sparkle } from '../components/icons.jsx'

function Prose({ children }) {
  return <div className="space-y-4 leading-relaxed whitespace-pre-line text-ink/85">{children}</div>
}

export function About() {
  const { settings } = useStore()
  useSeo({ title: 'About', description: 'About Kryztal Lumi — crystal-clear beauty that glows on every skin tone.' })
  return (
    <div className="pb-20">
      <PageHeader eyebrow="Our story" title="About Kryztal Lumi">
        {settings?.tagline}
      </PageHeader>
      <div className="container-page grid gap-12 py-14 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div className="relative overflow-hidden rounded-sm bg-noir p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(184,112,107,0.4),transparent_60%)]" aria-hidden="true" />
          <img src="/images/logo-sm.webp" alt="Kryztal Lumi logo" width="420" height="225" loading="lazy" className="relative mx-auto w-4/5" />
        </div>
        <div>
          <Eyebrow>Kryztal · Lumi</Eyebrow>
          <h2 className="mt-3 font-display text-4xl text-noir">Crystal, and light.</h2>
          <div className="mt-5">
            <Prose>{settings?.about}</Prose>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Made to glow', 'Products that catch the light and look like you, only brighter.'],
              ['Every skin tone', 'We choose formulas that adapt, so one product suits many.'],
              ['Small batches', 'We launch slowly and only what we truly love.'],
            ].map(([t, b]) => (
              <li key={t} className="border-t border-noir pt-4">
                <h3 className="tracked-caps font-sans text-[0.68rem] text-noir">{t}</h3>
                <p className="mt-2 text-sm text-muted">{b}</p>
              </li>
            ))}
          </ul>
          <Link to="/shop" className="btn-solid mt-10">
            Shop the collection
          </Link>
        </div>
      </div>
    </div>
  )
}

export function Faq() {
  const { settings } = useStore()
  const faq = settings?.faq || []
  useSeo({
    title: 'FAQ',
    description: 'Answers about Crystal Blush, cash on delivery, delivery times and returns.',
    jsonLd: faq.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }
      : null,
  })
  return (
    <div className="pb-20">
      <PageHeader eyebrow="Help" title="Frequently asked questions" />
      <div className="container-page max-w-3xl py-12">
        {faq.length === 0 ? (
          <p className="text-center text-muted">No questions yet.</p>
        ) : (
          <div className="divide-y divide-rose-200 border-y border-rose-200">
            {faq.map((f, i) => (
              <details key={i} className="group py-5" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl text-noir sm:text-2xl">
                  {f.q}
                  <span className="text-2xl text-rose-500 transition group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed whitespace-pre-line text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        )}
        <p className="mt-10 text-center text-muted">
          Still wondering? <Link to="/contact" className="text-rose-700 underline underline-offset-2">Contact us</Link>.
        </p>
      </div>
    </div>
  )
}

export function ShippingReturns() {
  const { settings } = useStore()
  const zones = useAsync(() => api.listShippingZones(), [])
  useSeo({ title: 'Shipping & Returns', description: 'Shipping fees, delivery times, payment options and our exchange policy.' })
  const free =
    settings?.free_shipping_mode === 'all'
      ? 'Free shipping on every order.'
      : settings?.free_shipping_mode === 'threshold'
        ? `Free shipping on orders of ${formatMoney(settings.free_shipping_threshold)} or more.`
        : null

  return (
    <div className="pb-20">
      <PageHeader eyebrow="Delivery" title="Shipping & Returns" />
      <div className="container-page max-w-3xl space-y-14 py-12">
        <section>
          <h2 className="font-display text-3xl text-noir">Shipping</h2>
          <div className="mt-4">
            <Prose>{settings?.shipping_policy}</Prose>
          </div>
          <div className="mt-6 overflow-hidden rounded-xl ring-1 ring-rose-100">
            <table className="w-full text-left text-sm" data-testid="zones-table">
              <thead className="bg-blush-100 text-[0.68rem] tracking-[0.2em] text-noir uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 text-right font-medium">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100 bg-white">
                {(zones.data || []).map((z) => (
                  <tr key={z.id}>
                    <td className="px-4 py-3 text-noir">{z.name}</td>
                    <td className="px-4 py-3 text-muted">{z.delivery_time || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{settings?.free_shipping_mode === 'all' ? 'FREE' : formatMoney(z.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {free && <p className="mt-3 text-sm text-rose-700">✨ {free}</p>}
          {Number(settings?.min_order_amount) > 0 && (
            <p className="mt-2 text-sm text-muted">Minimum order: {formatMoney(settings.min_order_amount)}.</p>
          )}
        </section>

        <section>
          <h2 className="font-display text-3xl text-noir">Payment</h2>
          <ul className="mt-4 space-y-3 text-ink/85">
            {settings?.cod_enabled && (
              <li>
                <strong className="font-medium text-noir">Cash on delivery</strong> — pay the courier in cash when your parcel arrives.
              </li>
            )}
            {settings?.gcash_enabled && (
              <li>
                <strong className="font-medium text-noir">GCash</strong> — pay by QR code or GCash number at checkout and enter your
                reference number. Unpaid GCash orders are cancelled after {settings.gcash_expiry_hours} hours.
              </li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-3xl text-noir">Returns &amp; exchanges</h2>
          <div className="mt-4">
            <Prose>{settings?.returns_policy}</Prose>
          </div>
        </section>
      </div>
    </div>
  )
}

export function Contact() {
  const { settings } = useStore()
  useSeo({ title: 'Contact', description: 'Get in touch with Kryztal Lumi.' })
  const methods = [
    settings?.messenger_id && { icon: MessageCircle, label: 'Messenger', value: 'Chat with us', href: messengerLink(settings) },
    settings?.contact_email && { icon: Mail, label: 'Email', value: settings.contact_email, href: `mailto:${settings.contact_email}` },
    settings?.contact_phone && { icon: Phone, label: 'Phone / SMS', value: settings.contact_phone, href: telLink(settings.contact_phone) },
    settings?.viber && { icon: Phone, label: 'Viber', value: settings.viber, href: viberLink(settings.viber) },
    settings?.whatsapp && { icon: Phone, label: 'WhatsApp', value: settings.whatsapp, href: whatsappLink(settings.whatsapp) },
  ].filter(Boolean)
  const socials = socialLinks(settings)

  return (
    <div className="pb-20">
      <PageHeader eyebrow="Say hello" title="Contact us">
        Questions about your order or our products? We&apos;d love to help.
      </PageHeader>
      <div className="container-page max-w-3xl py-12">
        {methods.length === 0 && socials.length === 0 ? (
          <div className="rounded-xl bg-blush-50 p-8 text-center" data-testid="contact-empty">
            <Sparkle className="mx-auto h-8 w-8" gradient />
            <p className="mt-4 text-noir">Our contact channels are opening soon.</p>
            <p className="mt-2 text-sm text-muted">
              Already ordered? You can check your order any time on the <Link to="/track" className="underline">Track order</Link> page.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {methods.map(({ icon: Icon, label, value, href }) => (
              <li key={label}>
                <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                  className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rose-100 transition hover:ring-rose-300">
                  <Icon className="h-6 w-6 text-rose-600" aria-hidden="true" />
                  <span>
                    <span className="block tracked-caps text-[0.65rem] text-muted">{label}</span>
                    <span className="text-noir">{value}</span>
                  </span>
                </a>
              </li>
            ))}
            {socials.map((l) => {
              const Icon = SOCIAL_ICONS[l.key]
              return (
                <li key={l.key}>
                  <a href={l.href} target="_blank" rel="noreferrer"
                    className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rose-100 transition hover:ring-rose-300">
                    <Icon className="h-6 w-6 text-rose-600" />
                    <span>
                      <span className="block tracked-caps text-[0.65rem] text-muted">{l.label}</span>
                      <span className="text-noir">Follow us</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-10 text-center text-sm text-muted">
          For order updates, have your order number ready (it starts with KL-).
        </p>
      </div>
    </div>
  )
}
