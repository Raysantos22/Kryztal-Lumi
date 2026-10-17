import { useEffect } from 'react'
import { SITE_URL } from './config.js'

const DEFAULT_IMAGE = '/og-image.jpg'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

const absolute = (url) => (!url || /^(https?:|data:)/.test(url) ? url : `${SITE_URL || window.location.origin}${url}`)

// Per-page <title>, description, Open Graph tags and optional JSON-LD
// structured data (e.g. Product on the product page).
export function useSeo({ title, description, image, type = 'website', jsonLd = null, noindex = false }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : null
  useEffect(() => {
    const fullTitle = title ? `${title} · Kryztal Lumi` : 'Kryztal Lumi — Crystal Blush, color-changing blush'
    document.title = fullTitle
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:url', window.location.href.split('?')[0])
    setMeta('property', 'og:image', absolute(image && !image.startsWith('data:') ? image : DEFAULT_IMAGE))
    setMeta('name', 'robots', noindex ? 'noindex' : null)

    let script = document.getElementById('kl-jsonld')
    if (ld) {
      if (!script) {
        script = document.createElement('script')
        script.type = 'application/ld+json'
        script.id = 'kl-jsonld'
        document.head.appendChild(script)
      }
      script.textContent = ld
    } else script?.remove()
  }, [title, description, image, type, ld, noindex])
}
