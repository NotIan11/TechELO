import { redirect } from 'next/navigation'

// Redirect old dashboard route to profile
export default function DashboardPage() {
  redirect('/profile')
}
