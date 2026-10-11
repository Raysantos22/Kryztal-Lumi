import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { api } from '../../lib/api/index.js'
import { ErrorBox, Spinner } from '../../components/ui.jsx'

export function AdminTitle({ title, children, back }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {back}
        <h1 className="font-display text-3xl text-noir">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Panel({ title, description, children, className = '', actions }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-sans text-base font-medium text-noir">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-stone-600">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Toggle({ checked, onChange, label, description, id }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full bg-stone-300 transition peer-checked:bg-rose-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rose-600" />
        <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
      <span>
        <span className="text-sm text-noir">{label}</span>
        {description && <span className="block text-xs text-stone-500">{description}</span>}
      </span>
    </label>
  )
}

export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector('input, textarea, select, button:not([aria-label=Close])')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-sans text-lg font-medium">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const MAX_UPLOAD_MB = 10
const MAX_VIDEO_MB = 50
const IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif,image/avif'
export const VIDEO_TYPES = 'video/mp4,video/webm'

export function ImageUpload({ folder, label = 'Upload image', onUploaded, multiple = false, className = '', accept = IMAGE_TYPES }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const input = useRef(null)

  const onChange = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    setError(null)
    try {
      for (const file of files) {
        const isVideo = file.type.startsWith('video/')
        if (!accept.split(',').includes(file.type)) throw new Error(`${file.name}: please use ${accept.includes('video') ? 'an image or an MP4 / WebM video' : 'a PNG, JPG or WebP image'}.`)
        const max = isVideo ? MAX_VIDEO_MB : MAX_UPLOAD_MB
        if (file.size > max * 1024 * 1024) throw new Error(`${file.name} is larger than ${max} MB.`)
        const result = await api.uploadImage(folder, file)
        await onUploaded(result, file)
      }
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={onChange}
        aria-label={label}
      />
      <button type="button" className="btn-secondary" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} {busy ? 'Uploading…' : label}
      </button>
      {error && (
        <div className="mt-2">
          <ErrorBox error={error} />
        </div>
      )}
    </div>
  )
}

// Run an async action with busy + error state.
export function useAction() {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const run = async (name, fn) => {
    setBusy(name)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(e)
      return undefined
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, setError, run }
}

export function SavedFlash({ show }) {
  if (!show) return null
  return <span className="text-sm text-emerald-700">Saved ✓</span>
}

// Numbers typed in inputs → numbers (or null when empty).
export const num = (v) => (v === '' || v == null ? null : Number(v))
