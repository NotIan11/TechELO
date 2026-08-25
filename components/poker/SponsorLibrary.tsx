'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import type { PokerSponsorRow } from '@/lib/poker/types'

interface SponsorLibraryProps {
  sponsors: PokerSponsorRow[]
}

type Draft = { id: string | null; name: string; website_url: string; logo_url: string | null }

const emptyDraft: Draft = { id: null, name: '', website_url: '', logo_url: null }

export default function SponsorLibrary({ sponsors }: SponsorLibraryProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
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

  const save = async () => {
    if (!draft) return
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
      setDraft(null)
      setFile(null)
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

  return (
    <div className="space-y-5">
      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      {draft ? (
        <Card className="space-y-5">
          <p className="font-display text-lg font-semibold text-white">{draft.id ? 'Edit sponsor' : 'New sponsor'}</p>
          <div className="flex items-center gap-5">
            <span className="inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-line bg-ink-700">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-xs text-zinc-500">No logo</span>
              )}
            </span>
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                {preview ? 'Change logo' : 'Upload logo'}
              </Button>
              <p className="mt-1.5 text-xs text-zinc-500">PNG or SVG with a transparent background looks best.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sp-name" className="label">
                Name
              </label>
              <input id="sp-name" type="text" className="input" value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="sp-url" className="label">
                Website <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <input id="sp-url" type="url" className="input" placeholder="https://" value={draft.website_url} maxLength={300} onChange={(e) => setDraft({ ...draft, website_url: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={save} disabled={busy} type="button">
              {busy ? 'Saving…' : 'Save sponsor'}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy} type="button">
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => startEdit()} type="button">
            + Add sponsor
          </Button>
        </div>
      )}

      {sponsors.length === 0 ? (
        <EmptyState
          icon="gift"
          title="No sponsors yet"
          description="Add the companies backing the term tournament — their logos show on the event page and hub card."
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-line">
            {sponsors.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line bg-ink-700">
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_url} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    {s.website_url && (
                      <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-zinc-300">
                        {s.website_url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>
                {confirmDelete === s.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Remove {s.name}?</span>
                    <Button size="sm" variant="danger" onClick={() => remove(s.id)} disabled={busy} type="button">
                      {busy ? '…' : 'Confirm'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)} disabled={busy} type="button">
                      Back
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(s)} disabled={busy} type="button">
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(s.id)} disabled={busy} type="button">
                      Remove
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
