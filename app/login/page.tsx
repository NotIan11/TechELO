import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'

function AuthFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-orange-400" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <LoginForm />
    </Suspense>
  )
}
