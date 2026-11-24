'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SignOutButton from '@/components/auth/SignOutButton'
import Avatar from '@/components/ui/Avatar'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import HouseChip from '@/components/ui/HouseChip'
import TextLink from '@/components/ui/TextLink'

interface Profile {
  id: string
  display_name: string
  profile_image_url: string | null
}

interface ProfileEditFormProps {
  profile: Profile
  /** Shown read-only */
  email: string
  /** Current house, or null when the player has not joined one */
  houseName: string | null
}

const ROW = 'flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line py-5'
const LABEL = 'w-40 shrink-0 text-sm text-zinc-400'
const FIELD = 'min-w-0 flex-[1_1_260px]'

export default function ProfileEditForm({ profile, email, houseName }: ProfileEditFormProps) {
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.profile_image_url)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }
      setProfileImage(file)
      setError('')
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (!displayName.trim()) {
      setError('Display name is required')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      let imageUrl = profile.profile_image_url

      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop()
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, profileImage, {
            cacheControl: '3600',
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName)

        imageUrl = urlData.publicUrl
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: displayName.trim(),
          profile_image_url: imageUrl,
        })
        .eq('id', profile.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setMessage('Profile saved.')
      setTimeout(() => {
        router.push(`/profile/${profile.id}`)
        router.refresh()
      }, 800)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 border-t border-line-bright">
      <div className={ROW}>
        <label htmlFor="displayName" className={LABEL}>
          Name on the boards
        </label>
        <input
          id="displayName"
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={`input ${FIELD}`}
          placeholder="Your display name"
        />
      </div>

      <div className={ROW}>
        <span className={LABEL}>Picture</span>
        <div className={`${FIELD} flex flex-wrap items-center gap-x-4 gap-y-2`}>
          <Avatar src={previewUrl} name={displayName || profile.display_name} size="lg" />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Upload a picture
          </Button>
          <span className="min-w-0 truncate text-[13px] text-mute">
            {profileImage ? profileImage.name : previewUrl ? 'Images up to 5MB.' : 'Initials are used until you add one.'}
          </span>
        </div>
      </div>

      <div className={ROW}>
        <span className={LABEL}>House</span>
        <div className={`${FIELD} flex flex-wrap items-center justify-between gap-x-4`}>
          {houseName ? <HouseChip name={houseName} className="text-[15px] text-white" /> : <span className="text-[15px] text-mute">No house yet</span>}
          <TextLink href="/profile/join-dorm" className="min-h-[44px] text-[13px]">
            {houseName ? 'Change house' : 'Join a house'}
          </TextLink>
        </div>
      </div>

      <div className={ROW}>
        <span className={LABEL}>Email</span>
        <span className={`${FIELD} tabular truncate text-sm text-zinc-300`}>{email}</span>
      </div>

      <div className={ROW}>
        <span className={LABEL}>Password</span>
        <div className={`${FIELD} flex flex-wrap items-center justify-between gap-x-4`}>
          <span className="text-sm text-mute">Used to sign in with your email.</span>
          <TextLink href="/setup-password" className="min-h-[44px] text-[13px]">
            Change it
          </TextLink>
        </div>
      </div>

      {(error || message) && (
        <div className="space-y-3 pt-6">
          {error && <Banner tone="error">{error}</Banner>}
          {message && <Banner tone="success">{message}</Banner>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-7">
        <div className="flex gap-2">
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="ghost" size="lg" className="px-4" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
        <SignOutButton />
      </div>
    </form>
  )
}
