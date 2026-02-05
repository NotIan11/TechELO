import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
