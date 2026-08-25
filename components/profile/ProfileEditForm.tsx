'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface Profile {
  id: string
  display_name: string
  profile_image_url: string | null
}

interface ProfileEditFormProps {
  profile: Profile
}

export default function ProfileEditForm({ profile }: ProfileEditFormProps) {
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

      setMessage('Profile updated!')
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
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div>
          <p className="label">Profile Picture</p>
          <div className="flex items-center gap-5">
            <Avatar src={previewUrl} name={displayName || profile.display_name} size="xl" />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Change picture
              </Button>
              {profileImage && <p className="mt-1.5 text-xs text-slate-500">{profileImage.name}</p>}
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="label">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
            placeholder="Your display name"
          />
        </div>

        {error && <Banner tone="error">{error}</Banner>}
        {message && <Banner tone="success">{message}</Banner>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
