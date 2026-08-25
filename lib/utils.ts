import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize phone to E.164 for Twilio (digits only; 10-digit US gets +1).
 * Returns null if too short or invalid.
 */
export function normalizePhoneToE164(phone: string | null | undefined): string | null {
  if (phone == null || typeof phone !== 'string') return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

/** Challenge (pending_start match) expires after this many milliseconds (1 hour) */
export const CHALLENGE_EXPIRY_MS = 60 * 60 * 1000

/**
 * Returns true if a challenge created at createdAt is past the expiry window (1 hour).
 */
export function isChallengeExpired(createdAt: string | number | Date): boolean {
  const created = typeof createdAt === 'object' && createdAt instanceof Date
    ? createdAt.getTime()
    : new Date(createdAt).getTime()
  return Date.now() - created > CHALLENGE_EXPIRY_MS
}

/**
 * True when a Supabase RPC failed because the function doesn't exist yet
 * (i.e. migration 012 hasn't been applied). Callers fall back to legacy paths.
 */
export function isMissingRpc(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return (
    error.code === 'PGRST202' ||
    /could not find the function/i.test(error.message ?? '') ||
    /function .* does not exist/i.test(error.message ?? '')
  )
}

/** Maps stable error codes raised by the migration-012 match RPCs to user-facing messages */
export function matchRpcErrorMessage(message: string | null | undefined): string {
  const msg = message ?? ''
  if (msg.includes('MATCH_NOT_FOUND')) return 'Match not found.'
  if (msg.includes('NOT_YOUR_CHALLENGE')) return 'Only the challenged player can do that.'
  if (msg.includes('NOT_A_PLAYER')) return 'You are not part of this match.'
  if (msg.includes('WRONG_STATUS')) return 'This match is not in a state that allows that action.'
  if (msg.includes('ALREADY_REPORTED')) return 'You already reported a result for this match.'
  if (msg.includes('INVALID_WINNER')) return 'Winner must be one of the players.'
  return msg || 'Something went wrong.'
}

/** User-facing label for match status (e.g. "Challenge expired", "Cancelled") */
export function getMatchStatusLabel(status: string): string {
  if (status === 'challenge_expired') return 'Challenge expired'
  if (status === 'cancelled') return 'Cancelled'
  return status.replace(/_/g, ' ')
}

/**
 * Validate if email is from university domain
 */
export function isValidUniversityEmail(email: string, domain: string): boolean {
  if (!domain.startsWith('@')) {
    domain = '@' + domain
  }
  return email.toLowerCase().endsWith(domain.toLowerCase())
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Default gray for unknown/missing house */
const DEFAULT_HOUSE_COLOR = '#4b5563'

/** House name -> hex color for Houses tab and profile */
export const HOUSE_COLORS: Record<string, string> = {
  Lloyd: '#d9b65a',
  Page: '#3180c3',
  Venerable: '#003060',
  Avery: '#a279b6',
  Ricketts: '#0b0b0b',
  Fleming: '#b30119',
  Dabney: '#015a21',
  Blacker: '#000000',
}

export function getHouseColor(houseName: string | null | undefined): string {
  if (houseName == null || houseName === '') return DEFAULT_HOUSE_COLOR
  const trimmed = houseName.trim()
  return HOUSE_COLORS[trimmed] ?? DEFAULT_HOUSE_COLOR
}

/** Returns 'black' for light house colors (e.g. Lloyd), 'white' otherwise — computed from luminance */
export function getHouseTextColor(houseName: string | null | undefined): 'black' | 'white' {
  const hex = getHouseColor(houseName).replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? 'black' : 'white'
}

/** Up to two initials from a display name ("Ian Kim" -> "IK") */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/** Compact relative time ("just now", "5m ago", "3h ago", "2d ago", then a date) */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(d)
}
