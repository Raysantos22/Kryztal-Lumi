// Product photo gallery: swipeable strip (scroll-snap) with arrow buttons,
// thumbnails, and a zoom dialog (keyboard: ←/→ to browse, Esc to close).
// Photos are contained in a square frame, never cropped.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'
import { assetKeyForUrl, img } from '../content/assets.js'
import { useDialog } from '../lib/useDialog.js'
import { ImagePlaceholder } from './ui.jsx'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// srcset for images that come from content/assets.js
function imgProps(image, sizes) {
  const key = assetKeyForUrl(image.url)
  return key ? { ...img(key, sizes), src: image.url } : { src: image.url }
}

function ZoomDialog({ images, index, setIndex, name, onClose }) {
  const closeRef = useRef(null)
  const ref = useDialog(true, onClose, closeRef)
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const image = images[index]
  const go = useCallback((d) => {
    setZoomed(false)
    setIndex((i) => (i + d + images.length) % images.length)
  }, [images.length, setIndex])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go])

  const toggleZoom = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
    setZoomed((z) => !z)
  }

  return (
    <div className="fixed inset-0 z-[70] bg-ivory" ref={ref} role="dialog" aria-modal="true" aria-label={`${name} photos`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-muted" aria-live="polite">
            Photo {index + 1} of {images.length}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-noir ring-1 ring-rose-100 hover:bg-blush-100"
            aria-label="Close photos"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <button
            type="button"
            onClick={toggleZoom}
            className={`flex h-full w-full items-center justify-center p-2 ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
          >
            <img
              {...imgProps(image, '100vw')}
              alt={image.alt || name}
              className="max-h-full max-w-full object-contain transition-transform duration-200"
              style={{ transform: zoomed ? 'scale(2.2)' : 'none', transformOrigin: origin }}
            />
          </button>
          {images.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-3 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-noir shadow ring-1 ring-rose-100 hover:bg-white" aria-label="Previous photo">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-3 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-noir shadow ring-1 ring-rose-100 hover:bg-white" aria-label="Next photo">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
        <p className="px-4 py-3 text-center text-sm text-muted">{image.alt}</p>
      </div>
    </div>
  )
}

export default function Gallery({ images, name }) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  const strip = useRef(null)
  const thumbs = useRef(null)

  const scrollTo = useCallback((i) => {
    const el = strip.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [])

  // Keep the active thumbnail in view.
  useEffect(() => {
    thumbs.current?.children[active]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [active])

  if (!images.length) return <ImagePlaceholder className="aspect-square w-full rounded-2xl" />

  const onScroll = () => {
    const el = strip.current
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth))
  }
  const openZoom = (i) => {
    setActive(i)
    setZoom(true)
  }
  const closeZoom = () => {
    setZoom(false)
    requestAnimationFrame(() => scrollTo(active))
  }

  return (
    <div aria-roledescription="carousel" aria-label={`${name} photos`}>
      <div className="photo-frame relative">
        <div ref={strip} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" data-testid="gallery-strip">
          {images.map((image, i) => {
            const p = imgProps(image, '(min-width: 768px) 50vw, 100vw')
            return (
            <button
              key={image.id || i}
              type="button"
              onClick={() => openZoom(i)}
              className="relative w-full shrink-0 snap-center cursor-zoom-in"
              aria-label={`Zoom photo ${i + 1} of ${images.length}: ${image.alt || name}`}
              tabIndex={i === active ? 0 : -1}
            >
              <img
                {...p}
                alt={image.alt || name}
                width={p.width || 1200}
                height={p.height || 1200}
                className="aspect-square h-auto w-full object-contain"
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : undefined}
                data-testid={i === active ? 'product-main-image' : undefined}
              />
            </button>
            )
          })}
        </div>
        <span className="pointer-events-none absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-noir shadow-sm ring-1 ring-rose-100" aria-hidden="true">
          <ZoomIn className="h-4 w-4" />
        </span>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollTo(Math.max(0, active - 1))}
              disabled={active === 0}
              className="absolute top-1/2 left-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-noir shadow-sm ring-1 ring-rose-100 transition hover:bg-white disabled:opacity-0 md:inline-flex"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo(Math.min(images.length - 1, active + 1))}
              disabled={active === images.length - 1}
              className="absolute top-1/2 right-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-noir shadow-sm ring-1 ring-rose-100 transition hover:bg-white disabled:opacity-0 md:inline-flex"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div
          ref={thumbs}
          className="no-scrollbar mt-3 flex gap-2 overflow-x-auto p-1 md:grid md:overflow-visible"
          style={{ gridTemplateColumns: `repeat(${Math.min(images.length, 7)}, minmax(0, 1fr))` }}
          role="group"
          aria-label="Choose a photo"
        >
          {images.map((image, i) => (
            <button
              key={image.id || i}
              type="button"
              onClick={() => scrollTo(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white ring-offset-2 ring-offset-ivory transition md:aspect-square md:h-auto md:w-full ${
                i === active ? 'ring-2 ring-rose-500' : 'ring-1 ring-rose-100 hover:ring-rose-300'
              }`}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active ? 'true' : undefined}
            >
              <img {...imgProps(image, '80px')} alt="" className="h-full w-full object-contain" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {zoom && <ZoomDialog images={images} index={active} setIndex={setActive} name={name} onClose={closeZoom} />}
    </div>
  )
}
