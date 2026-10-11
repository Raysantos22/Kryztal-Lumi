// "Big image" two-up section and the community / reviews slideshow.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { api } from '../lib/api/index.js'
import { useAsync } from '../lib/useAsync.js'
import { socialLinks } from '../lib/format.js'
import { Sparkle } from './icons.jsx'

const pill =
  'inline-flex items-center rounded-full border border-noir bg-white px-8 py-2.5 text-xs font-medium tracking-[0.08em] text-noir uppercase transition hover:bg-noir hover:text-white'

function Tile({ photo, photoSmall, alt, label, cta, to, onClick, testId, dark = false }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-pearl md:aspect-auto md:h-[min(92svh,900px)]" data-testid={testId}>
      <picture>
        <source media="(max-width: 767px)" srcSet={photoSmall} />
        <img src={photo} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-[1.5s] hover:scale-[1.03]" />
      </picture>
      {dark && <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />}
      <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-10">
        <p className={`mb-4 text-sm tracking-[0.04em] uppercase ${dark ? 'text-ivory' : 'text-noir'}`}>{label}</p>
        {to ? (
          <Link to={to} className={pill}>
            {cta}
          </Link>
        ) : (
          <button type="button" onClick={onClick} className={pill}>
            {cta}
          </button>
        )}
      </div>
    </div>
  )
}

export function BigTiles({ product }) {
  return (
    <section className="grid md:grid-cols-2" aria-label={`${product.name} close-ups`}>
      <Tile
        testId="tile-product"
        dark
        photo="/images/closeup-box.webp"
        photoSmall="/images/closeup-box-700.webp"
        alt={`Close-up of the ${product.name} compact with its rose-gold foil logo`}
        label={`${product.badge_new ? 'New! ' : ''}${product.name}`}
        cta={`Shop ${product.name}`}
        to={`/product/${product.slug}`}
      />
      <Tile
        testId="tile-pan"
        photo="/images/closeup-pan.webp"
        photoSmall="/images/closeup-pan-700.webp"
        alt="Close-up of the crystal blush pan with a rose-gold rim"
        label="The tone-adapt pan"
        cta="See how it works"
        onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
      />
    </section>
  )
}

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

// Shown until the owner publishes real reviews / looks — never fake ones.
function PlaceholderCard({ kind, handle, product, i }) {
  return (
    <article
      className={`flex h-[400px] shrink-0 snap-start flex-col items-center justify-center rounded-xl border border-dashed border-rose-200 px-6 text-center sm:h-[420px] ${
        kind === 'look' ? 'w-[230px] bg-gradient-to-b from-blush-100 to-blush-300 sm:w-[240px]' : 'w-[280px] bg-pearl sm:w-[300px]'
      }`}
      data-testid="community-placeholder"
    >
      <Sparkle className="h-8 w-8" gradient />
      {kind === 'look' ? (
        <>
          <p className="mt-4 font-display text-2xl text-noir">Your look here</p>
          <p className="mt-2 text-sm text-muted">{handle ? `Post your glow and tag ${handle}` : 'Share your Crystal Blush look with us'}</p>
        </>
      ) : (
        <>
          <p className="mt-4 font-display text-2xl text-noir">{i === 1 ? 'Be the first review' : 'Your words here'}</p>
          <p className="mt-2 text-sm text-muted">Reviews from our first customers will appear here.</p>
        </>
      )}
      {product && (
        <Link to={`/product/${product.slug}`} className="mt-5 rounded-full bg-white px-4 py-1.5 text-xs text-noir hover:bg-blush-100">
          Shop now
        </Link>
      )}
    </article>
  )
}

export function CommunitySlideshow({ product, settings }) {
  const posts = useAsync(() => api.listCommunity(), [])
  const track = useRef(null)
  const [paused, setPaused] = useState(false)
  const list = posts.data || []
  const instagram = socialLinks(settings).find((l) => l.key === 'instagram' || l.key === 'tiktok')
  const handle = instagram ? `@${instagram.href.replace(/\/+$/, '').split('/').pop().replace(/^@/, '')}` : null

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

  const placeholders = ['look', 'review', 'look', 'look', 'review', 'look', 'look']

  return (
    <section className="py-16 sm:py-20" aria-labelledby="community-title">
      <div className="container-page text-center">
        <h2 id="community-title" className="font-display text-4xl text-noir sm:text-5xl">
          Glow notes
        </h2>
        <p className="mt-2 text-sm text-muted italic">Real looks and reviews from the Kryztal Lumi community.</p>
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
          {list.length > 0
            ? list.map((p) => (p.kind === 'look' ? <LookCard key={p.id} post={p} product={product} /> : <ReviewCard key={p.id} post={p} product={product} />))
            : placeholders.map((k, i) => <PlaceholderCard key={i} i={i} kind={k} handle={handle} product={product} />)}
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
