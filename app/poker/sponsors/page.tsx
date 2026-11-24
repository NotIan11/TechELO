import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageIntro from '@/components/ui/PageIntro'
import TextLink from '@/components/ui/TextLink'
import SponsorLibrary from '@/components/poker/SponsorLibrary'
import { numberWord, plural } from '@/lib/poker/phrases'
import { loadIsOfficer, loadSponsors } from '@/lib/poker/queries'

export default async function PokerSponsorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirect=/poker/sponsors')
  }
  const isOfficer = await loadIsOfficer(supabase, user.id)
  if (!isOfficer) {
    redirect('/poker')
  }
  const sponsors = await loadSponsors(supabase)
  const logos = sponsors.filter((s) => s.logo_url).length

  return (
    <AppShell width="4xl">
      <PageIntro
        kicker={
          <>
            <TextLink href="/poker" muted>
              Poker
            </TextLink>
            <span>· officers only</span>
          </>
        }
        title="Sponsors"
        lede={
          sponsors.length === 0
            ? 'No sponsors on file yet. The ones you add here can be attached to any official tournament.'
            : `${numberWord(sponsors.length, true)} ${plural(sponsors.length, 'sponsor')} on file, ${logos === sponsors.length ? (logos === 1 ? 'with a logo' : 'all with logos') : `${numberWord(logos)} with a logo`}. They show on every official tournament you attach them to.`
        }
        actions={
          <TextLink href="/play?kind=tournament" className="text-sm">
            Schedule a tournament
          </TextLink>
        }
      />
      <SponsorLibrary sponsors={sponsors} />
    </AppShell>
  )
}
