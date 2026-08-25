import { Suspense } from 'react'
import SignupForm from '@/components/auth/SignupForm'
import { PageSpinner } from '@/components/ui/Spinner'

export default function SignupPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SignupForm />
    </Suspense>
  )
}
