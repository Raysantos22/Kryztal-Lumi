// Community / reviews slideshow (managed in Admin → Reviews).
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, ChevronLeft, ChevronRight, Heart, Leaf, Play, Smartphone, Sparkles, Truck } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { useAsync } from '../lib/useAsync.js'
import { Sparkle } from './icons.jsx'

// ---------------------------------------------------------------------------
// Slideshow
// ---------------------------------------------------------------------------
function LookCard({ post, product }) {
  const [playing, setPlaying] = useState(false)
  const video = useRef(null)
  const author = post.link_url ? (
    <a href={post.link_url} target="_blank" rel="noreferrer" className="hover:underline">
      {post.author}
    </a>
  ) : (
    post.author
  )
  return (
    <article className="relative h-[400px] w-[230px] shrink-0 snap-start overflow-hidden rounded-xl bg-noir sm:h-[420px] sm:w-[240px]" data-testid="community-card">
      {post.video_url && playing ? (
        <video ref={video} src={post.video_url} poster={post.image_url || undefined} className="absolute inset-0 h-full w-full object-cover" controls autoPlay playsInline />
      ) : (
        <>
          {post.image_url ? (
            <img src={post.image_url} alt={post.quote || `${post.author} wearing ${product?.name || 'Kryztal Lumi'}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <video src={post.video_url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
          )}
          {post.video_url && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-rose-600 shadow-lg transition hover:scale-105"
              aria-label={`Play ${post.author}'s video`}
            >
              <Play className="h-5 w-5 fill-current" />
            </button>
          )}
        </>
      )}
      {!playing && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 pt-16 pb-3">
          {post.quote && <p className="mb-2 line-clamp-3 text-sm text-white/90">{post.quote}</p>}
          <div className="pointer-events-auto flex items-end justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{author}</p>
            {product && (
              <Link to={`/product/${product.slug}`} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs text-noir hover:bg-blush-100">
                Shop now
              </Link>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function ReviewCard({ post, product }) {
  return (
    <article className="flex h-[400px] w-[280px] shrink-0 snap-start flex-col items-center justify-center rounded-xl bg-pearl px-7 text-center sm:h-[420px] sm:w-[300px]" data-testid="community-card">
      {post.source && <p className="font-display text-3xl font-bold text-noir">{post.source}</p>}
      {post.rating && (
        <p className="mt-2 flex gap-1 text-rose-500" aria-label={`${post.rating} out of 5`}>
          {Array.from({ length: post.rating }).map((_, i) => (
            <Sparkle key={i} className="h-4 w-4" />
          ))}
        </p>
      )}
      <blockquote className="mt-4 text-lg leading-relaxed text-ink/85">“{post.quote}”</blockquote>
      <p className="mt-4 text-sm text-muted">
        {post.link_url ? (
          <a href={post.link_url} target="_blank" rel="noreferrer" className="hover:underline">
            — {post.author}
          </a>
        ) : (
          <>— {post.author}</>
        )}
      </p>
      {product && (
        <Link to={`/product/${product.slug}`} className="mt-4 text-xs tracking-[0.06em] text-noir uppercase underline underline-offset-4">
          Shop now
        </Link>
      )}
    </article>
  )
}

// Brand cards (reel-style) that keep the slideshow full: why shop with us.
// Real reviews / looks from Admin → Reviews always come first.
function perksFor(settings) {
  return [
    { key: 'shipping', icon: Truck, title: 'Fast shipping', line: 'Packed within 1–2 days and delivered anywhere in the Philippines.', image: '/images/scene-flatlay-900.webp', pos: '30% 50%' },
    settings?.cod_enabled && { key: 'cod', icon: Banknote, title: 'Cash on delivery', line: 'Pay the rider when your Crystal Blush arrives. No card needed.', image: '/images/scene-podium-900.webp', pos: '40% 50%' },
    { key: 'tone', icon: Sparkles, title: 'Tone-adapt colour', line: 'Deep crystal in the compact, your own rosy flush on the cheek.', image: '/images/product-pan.webp', pos: '50% 50%' },
    settings?.gcash_enabled && { key: 'gcash', icon: Smartphone, title: 'Pay with GCash', line: 'Scan, pay, enter your reference — we confirm it fast.', image: '/images/product-box.webp', pos: '50% 50%' },
    { key: 'shade', icon: Heart, title: 'One shade, every skin tone', line: 'The colour develops to match your own undertone.', image: '/images/scene-flatlay-900.webp', pos: '75% 50%' },
    { key: 'cruelty', icon: Leaf, title: 'Cruelty-free', line: 'Never tested on animals. Pocket-sized 53 × 53 mm compact.', image: '/images/scene-podium-900.webp', pos: '62% 50%' },
  ].filter(Boolean)
}

function PerkCard({ perk, product }) {
  const Icon = perk.icon
  return (
    <article
      className="relative h-[400px] w-[230px] shrink-0 snap-start overflow-hidden rounded-xl bg-blush-200 sm:h-[420px] sm:w-[240px]"
      data-testid="community-perk"
    >
      <img src={perk.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: perk.pos }} />
      <div className="absolute inset-0 bg-gradient-to-t from-noir/80 via-noir/10 to-transparent" aria-hidden="true" />
      <span className="absolute top-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <h3 className="font-display text-2xl leading-tight text-white">{perk.title}</h3>
        <p className="mt-1.5 text-sm leading-snug text-white/85">{perk.line}</p>
        {product && (
          <div className="mt-3 flex justify-end">
            <Link to={`/product/${product.slug}`} className="rounded-full bg-white px-3 py-1.5 text-xs text-noir hover:bg-blush-100">
              Shop now
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}

export function CommunitySlideshow({ product, settings }) {
  const posts = useAsync(() => api.listCommunity(), [])
  const track = useRef(null)
  const [paused, setPaused] = useState(false)
  const list = posts.data || []

  const scroll = (dir) => {
    const el = track.current
    if (!el) return
    const step = (el.querySelector('article')?.offsetWidth || 240) + 16
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    if (dir > 0 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' })
    else el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  // Slideshow: advance every 4.5 s unless the visitor is interacting.
  useEffect(() => {
    if (paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => scroll(1), 4500)
    return () => clearInterval(t)
  }, [paused])

  const perks = perksFor(settings)

  return (
    <section className="py-16 sm:py-20" aria-labelledby="community-title">
      <div className="container-page text-center">
        <h2 id="community-title" className="font-display text-4xl text-noir sm:text-5xl">
          Glow notes
        </h2>
        <p className="mt-2 text-sm text-muted italic">
          {list.length ? 'Real looks and reviews from the Kryztal Lumi community.' : `Fast shipping${settings?.cod_enabled ? ' · Cash on delivery' : ''} · Nationwide`}
        </p>
      </div>
      <div
        className="relative mt-8"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
      >
        <div
          ref={track}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
          aria-roledescription="carousel"
          aria-label="Community looks and reviews"
          data-testid="community-track"
        >
          {list.map((p) => (p.kind === 'look' ? <LookCard key={p.id} post={p} product={product} /> : <ReviewCard key={p.id} post={p} product={product} />))}
          {perks.map((perk) => (
            <PerkCard key={perk.key} perk={perk} product={product} />
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={() => scroll(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-white text-noir transition hover:border-noir" aria-label="Previous">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => scroll(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-white text-noir transition hover:border-noir" aria-label="Next">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  )
}
