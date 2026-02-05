import Link from 'next/link'
import NavBar from '@/components/layout/NavBar'

type SearchParams = { type?: string }

export default async function InboxConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { type } = await searchParams
  const title = type === 'result' ? 'Result submitted' : 'Match start accepted'
  const message =
    type === 'result'
      ? 'Your result has been recorded. If both players agree, the match will be completed and ELO updated.'
      : 'The match has started. Good luck!'

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-gray-800 p-8 shadow text-center">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-2 text-gray-300">{message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/inbox"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Back to Inbox
            </Link>
            <Link
              href="/matches"
              className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              View Matches
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
