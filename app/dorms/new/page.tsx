import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateDormForm from '@/components/dorm/CreateDormForm'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'

export default async function NewDormPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/dorms/new')
  }

  return (
    <AppShell width="2xl">
      <PageHeader title="New House" subtitle="Creating a house also makes you its first member" />
      <CreateDormForm />
    </AppShell>
  )
}
