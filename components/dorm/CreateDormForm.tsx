'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateDormForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!name.trim()) {
      setError('House name is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/dorms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create house')
      }

      router.push(`/dorms/${data.dorm.id}`)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-gray-800 p-6 shadow">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300">
          House Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="e.g., North Hall"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Optional description of your house..."
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-900/20 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create House'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md bg-gray-700 px-4 py-2 text-gray-300 hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
