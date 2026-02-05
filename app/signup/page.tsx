import { Suspense } from 'react'
import SignupForm from '@/components/auth/SignupForm'

function SignupFallback() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-lg">
          <div>
            <h1 className="text-3xl font-bold text-center text-white">Create Account</h1>
            <p className="mt-2 text-center text-gray-400">Sign up for HouseRank</p>
          </div>
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  )
}
