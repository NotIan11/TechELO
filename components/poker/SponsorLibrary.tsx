'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import type { PokerSponsorRow } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

const GRID = 'grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 md:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)_170px] md:gap-x-5'
const ROW_ACTION = 'inline-flex min-h-[44px] items-center text-[13px] transition disabled:opacity-50'

interface SponsorLibraryProps {
  sponsors: PokerSponsorRow[]
}

type Draft = { id: string | null; name: string; website_url: string; logo_url: string | null }

const emptyDraft: Draft = { id: null, name: '', website_url: '', logo_url: null }

export default function SponsorLibrary({ sponsors }: SponsorLibraryProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  /** The one form in play: `id: null` is the add row at the foot of the list, otherwise the sponsor being edited */
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const startEdit = (s?: PokerSponsorRow) => {
    setDraft(s ? { id: s.id, name: s.name, website_url: s.website_url ?? '', logo_url: s.logo_url } : { ...emptyDraft })
    setFile(null)
    setPreview(s?.logo_url ?? null)
    setError('')
    setNotice('')
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB.')
      return
    }
    setFile(f)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const resetDraft = () => {
    setDraft({ ...emptyDraft })
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const save = async () => {
    if (!draft.name.trim()) {
      setError('Sponsor name is required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      let logoUrl = draft.logo_url
      if (file) {
        const supabase = createClient()
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
        const path = `${draft.id ?? 'new'}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('sponsor-logos')
          .upload(path, file, { cacheControl: '3600', upsert: true })
        if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`)
        logoUrl = supabase.storage.from('sponsor-logos').getPublicUrl(path).data.publicUrl
      }
      const res = await fetch('/api/poker/sponsors/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          name: draft.name.trim(),
          website_url: draft.website_url.trim() || null,
          logo_url: logoUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save sponsor')
      setNotice(draft.id ? 'Sponsor updated.' : 'Sponsor added.')
      resetDraft()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/poker/sponsors/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not delete sponsor')
      setNotice('Sponsor removed.')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
      setConfirmDelete(null)
    }
  }

  const editingId = draft.id

  /** The inline form: the last row when adding, or in place of the row being edited */
  const formRow = (
    <form
      className={cn(GRID, 'min-h-[88px] border-b border-line-bright py-3', editingId && '-mt-px border-t')}
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label={preview ? 'Change the logo' : 'Upload a logo'}
        className="inline-flex h-12 w-12 items-center justify-center overflow-hidden border border-dashed border-white/40 text-xl text-zinc-300 transition hover:border-white"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-contain p-1" />
        ) : (
          <span aria-hidden="true">+</span>
        )}
      </button>
      <input
        type="text"
        className="input"
        aria-label="Sponsor name"
        placeholder={editingId ? 'Sponsor name' : 'Add a sponsor'}
        value={draft.name}
        maxLength={60}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <input
        type="url"
        className="input col-span-2 md:col-span-1"
        aria-label="Website"
        placeholder="https://"
        value={draft.website_url}
        maxLength={300}
        onChange={(e) => setDraft({ ...draft, website_url: e.target.value })}
      />
      <span className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
        {editingId && (
          <Button variant="ghost" onClick={resetDraft} disabled={busy} type="button">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : editingId ? 'Save' : 'Add'}
        </Button>
      </span>
    </form>
  )

  return (
    <div>
      {(notice || error) && (
        <div className="mt-6 space-y-2">
          {notice && <Banner tone="success">{notice}</Banner>}
          {error && <Banner tone="error">{error}</Banner>}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className={cn(GRID, 'mt-10 border-b border-line-bright pb-2.5 text-xs text-mute')}>
        <span>Logo</span>
        <span>Name</span>
        <span className="hidden md:block">Website</span>
        <span className="hidden md:block" />
      </div>

      {sponsors.length === 0 && <p className="border-b border-line py-4 text-sm text-mute">No sponsors yet. Add the companies backing the term tournament below.</p>}

      {sponsors.map((s) =>
        s.id === editingId ? (
          <div key={s.id}>{formRow}</div>
        ) : (
          <div key={s.id} className="border-b border-line">
            <div className={cn(GRID, 'min-h-[72px] py-2')}>
              <span className={cn('inline-flex h-12 w-12 items-center justify-center overflow-hidden border', s.logo_url ? 'border-line-strong' : 'border-dashed border-line-bright')}>
                {s.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo_url} alt="" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-[10px] text-mute">none</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] text-white">{s.name}</span>
                <span className="block truncate text-xs text-mute md:hidden">{s.website_url ? s.website_url.replace(/^https?:\/\//, '') : 'No website'}</span>
              </span>
              <span className="hidden min-w-0 truncate text-sm md:block">
                {s.website_url ? (
                  <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline-offset-4 transition hover:text-white hover:underline">
                    {s.website_url.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className="text-mute">No website</span>
                )}
              </span>
              {confirmDelete !== s.id && (
                <span className="col-span-2 flex justify-end gap-4 md:col-span-1">
                  <button type="button" className={cn(ROW_ACTION, 'text-orange-400 hover:text-orange-500')} onClick={() => startEdit(s)} disabled={busy}>
                    Edit
                  </button>
                  <button type="button" className={cn(ROW_ACTION, 'text-zinc-400 hover:text-loss')} onClick={() => setConfirmDelete(s.id)} disabled={busy}>
                    Remove
                  </button>
                </span>
              )}
            </div>
            {confirmDelete === s.id && (
              <ConfirmStrip
                inline
                tone="danger"
                text={`Remove ${s.name}?`}
                confirmLabel="Remove"
                busy={busy}
                onConfirm={() => remove(s.id)}
                onBack={() => setConfirmDelete(null)}
                className="mt-0 border-0 p-0 pb-4"
              />
            )}
          </div>
        )
      )}

      {!editingId && formRow}
      <p className="mt-3.5 text-[13px] text-mute">PNG or SVG on a transparent background, under 2MB.</p>
    </div>
  )
}
