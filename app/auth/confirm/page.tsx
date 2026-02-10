import { redirect } from 'next/navigation'
import ConfirmEmail from '@/components/auth/ConfirmEmail'

type SearchParams = { token_hash?: string; type?: string }

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const tokenHash = params.token_hash ?? null
  const type = params.type ?? null

  return <ConfirmEmail tokenHash={tokenHash} type={type} />
}
