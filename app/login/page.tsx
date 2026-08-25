import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import { PageSpinner } from '@/components/ui/Spinner'

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginForm />
    </Suspense>
  )
}
