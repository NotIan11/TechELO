import Link from 'next/link'
import UserButton from '@/components/auth/UserButton'

export default function NavBar() {
  return (
    <nav className="bg-gray-800 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-white">
              Tech ELO
            </Link>
            <div className="hidden md:flex gap-4">
              <Link href="/" className="text-sm text-gray-300 hover:text-white">
                Leaderboard
              </Link>
              <Link href="/inbox" className="text-sm text-gray-300 hover:text-white">
                Inbox
              </Link>
              <Link href="/matches" className="text-sm text-gray-300 hover:text-white">
                Matches
              </Link>
              <Link href="/dorms" className="text-sm text-gray-300 hover:text-white">
                Houses
              </Link>
              <Link href="/profile" className="text-sm text-gray-300 hover:text-white">
                Profile
              </Link>
            </div>
          </div>
          <UserButton />
        </div>
      </div>
    </nav>
  )
}
