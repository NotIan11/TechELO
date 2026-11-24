import Tabs, { type TabItem } from '@/components/ui/Tabs'

interface PokerTabsProps {
  active: 'ledger' | 'sessions' | 'guests'
  /** Sessions on the list */
  sessions?: number | null
  /** Guests still without an account */
  guests?: number | null
  signedIn: boolean
  className?: string
}

/** Ledger · Sessions · Guests, shared by the three poker index pages */
export default function PokerTabs({ active, sessions, guests, signedIn, className }: PokerTabsProps) {
  const items: TabItem[] = [
    { href: '/poker', label: 'Ledger', active: active === 'ledger' },
    { href: '/poker/sessions', label: 'Sessions', count: sessions ?? null, active: active === 'sessions' },
  ]
  if (signedIn) items.push({ href: '/poker/guests', label: 'Guests', count: guests ? guests : null, active: active === 'guests' })
  return <Tabs items={items} className={className ?? 'mt-9'} />
}
