import { Suspense } from 'react'
import SignupForm from '@/components/auth/SignupForm'

function AuthFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-orange-400" />
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <SignupForm />
    </Suspense>
  )
}
