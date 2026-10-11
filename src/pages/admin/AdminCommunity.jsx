import { useState } from 'react'
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api/index.js'
import { useAsync } from '../../lib/useAsync.js'
import { useStore } from '../../lib/StoreContext.jsx'
import { EmptyState, ErrorBox, Field, Loading, Notice, Spinner } from '../../components/ui.jsx'
import { AdminTitle, ImageUpload, Modal, Panel, Toggle, VIDEO_TYPES, num, useAction } from './adminUi.jsx'

const EMPTY = { kind: 'review', author: '', source: '', quote: '', rating: '', image_url: null, image_path: null, video_url: null, video_path: null, link_url: '', is_published: true, sort_order: 0 }

function PostEditor({ post, count, onClose, onSaved }) {
  const { featured } = useStore()
  const [f, setF] = useState(() => (post ? { ...EMPTY, ...post, rating: post.rating ?? '', link_url: post.link_url || '', source: post.source || '', quote: post.quote || '' } : { ...EMPTY, sort_order: count + 1 }))
  const { busy, error, setError, run } = useAction()
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const save = (e) => {
    e.preventDefault()
    if (!f.author.trim()) return setError('Please enter a name or @handle.')
    if (f.kind === 'review' && !f.quote.trim()) return setError('Please enter the review text.')
    if (f.kind === 'look' && !f.image_url && !f.video_url) return setError('Please upload a photo or a video.')
    if (f.link_url.trim() && !/^https:\/\/\S+$/i.test(f.link_url.trim())) return setError('The link must start with https://')
    const rating = num(f.rating)
    if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return setError('Rating must be 1–5.')
    run('save', async () => {
      await api.saveCommunityPost({
        ...(post ? { id: post.id } : {}),
        kind: f.kind,
        author: f.author.trim(),
        source: f.source.trim() || null,
        quote: f.quote.trim() || null,
        rating,
        image_url: f.image_url,
        image_path: f.image_path,
        video_url: f.video_url,
        video_path: f.video_path,
        link_url: f.link_url.trim() || null,
        product_id: featured?.id || null,
        is_published: f.is_published,
        sort_order: num(f.sort_order) ?? 0,
      })
      await onSaved()
      onClose()
    })
  }

  return (
    <Modal title={post ? 'Edit post' : 'New review or look'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="flex gap-2" role="radiogroup" aria-label="Type">
          {[
            ['review', 'Written review / quote'],
            ['look', 'Photo or video look'],
          ].map(([k, l]) => (
            <label key={k} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${f.kind === k ? 'border-noir bg-blush-50' : 'border-stone-200'}`}>
              <input type="radio" name="kind" checked={f.kind === k} onChange={() => setF({ ...f, kind: k })} /> {l}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name or @handle *" htmlFor="c-author">
            <input id="c-author" className="input" value={f.author} onChange={set('author')} maxLength={80} placeholder="@glowwithmaria" />
          </Field>
          <Field label="Source" htmlFor="c-source" optional hint="e.g. Verified buyer, TikTok, a magazine name">
            <input id="c-source" className="input" value={f.source} onChange={set('source')} maxLength={80} />
          </Field>
        </div>
        <Field label={f.kind === 'review' ? 'Review *' : 'Caption'} htmlFor="c-quote" optional={f.kind === 'look'}>
          <textarea id="c-quote" className="input min-h-24" value={f.quote} onChange={set('quote')} maxLength={600} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Rating (1–5)" htmlFor="c-rating" optional>
            <input id="c-rating" className="input" type="number" min="1" max="5" step="1" value={f.rating} onChange={set('rating')} />
          </Field>
          <Field label="Link to the original post" htmlFor="c-link" optional className="sm:col-span-2">
            <input id="c-link" className="input" value={f.link_url} onChange={set('link_url')} placeholder="https://www.tiktok.com/@…" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">Photo {f.kind === 'look' ? '(or video cover)' : '(optional)'}</p>
            {f.image_url && <img src={f.image_url} alt="" className="mb-2 h-32 rounded-lg object-cover" />}
            <ImageUpload folder="community" label={f.image_url ? 'Replace photo' : 'Upload photo'} onUploaded={({ url, path }) => setF((x) => ({ ...x, image_url: url, image_path: path }))} />
          </div>
          {f.kind === 'look' && (
            <div>
              <p className="label">Short video (MP4 / WebM, up to 50 MB)</p>
              {f.video_url && <video src={f.video_url} className="mb-2 h-32 rounded-lg" muted controls />}
              <ImageUpload
                folder="community"
                accept={VIDEO_TYPES}
                label={f.video_url ? 'Replace video' : 'Upload video'}
                onUploaded={({ url, path }) => setF((x) => ({ ...x, video_url: url, video_path: path }))}
              />
            </div>
          )}
        </div>
        <Toggle id="c-published" checked={f.is_published} onChange={(v) => setF({ ...f, is_published: v })} label="Show on the home page" />
        <Notice tone="warn">Only post real reviews and content you have permission to use (ask creators before sharing their videos).</Notice>
        <ErrorBox error={error} />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={busy === 'save'}>
            {busy === 'save' && <Spinner className="h-4 w-4 text-white" />} Save
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminCommunity() {
  const list = useAsync(() => api.listCommunity({ includeUnpublished: true }), [])
  const [editing, setEditing] = useState(null)
  const { busy, error, run } = useAction()
  const posts = list.data || []

  return (
    <div>
      <AdminTitle title="Reviews & community">
        <button type="button" className="btn-primary btn-sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Add review or look
        </button>
      </AdminTitle>
      <Panel description="These appear in the “Glow notes” slideshow on the home page. Until you publish one, the slideshow shows “your look here” cards.">
        {list.loading && !list.data ? (
          <Loading />
        ) : posts.length === 0 ? (
          <EmptyState>No reviews or looks yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100">
            {posts.map((p) => (
              <li key={p.id} className={`flex flex-wrap items-center gap-3 py-3 ${p.is_published ? '' : 'opacity-60'}`} data-testid="admin-community-post">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-blush-100">
                  {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : p.video_url ? <video src={p.video_url} muted className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-noir">
                    {p.author} <span className="badge bg-stone-100 text-stone-600">{p.kind === 'look' ? (p.video_url ? 'Video' : 'Photo') : 'Review'}</span>
                    {!p.is_published && <span className="badge ml-1 bg-stone-200 text-stone-700">Hidden</span>}
                  </p>
                  {p.quote && <p className="truncate text-sm text-stone-600">{p.quote}</p>}
                </div>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={!!busy}
                  onClick={() => run(p.id, async () => { await api.saveCommunityPost({ id: p.id, is_published: !p.is_published }); await list.reload() })}
                  aria-label={`${p.is_published ? 'Hide' : 'Show'} ${p.author}`}
                >
                  {p.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {p.is_published ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.author}`}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm text-red-700"
                  aria-label={`Delete ${p.author}`}
                  onClick={() => window.confirm('Delete this post?') && run(`del-${p.id}`, async () => { await api.deleteCommunityPost(p); await list.reload() })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <ErrorBox error={error || list.error} />
      </Panel>
      {editing && <PostEditor post={editing === 'new' ? null : editing} count={posts.length} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </div>
  )
}
