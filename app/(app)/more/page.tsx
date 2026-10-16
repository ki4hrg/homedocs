import { List, Row, Section } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { logoutAction } from '@/app/(auth)/actions'
import { buttonClass } from '@/components/ui/Button'
import { viewer } from '@/lib/web/context'

export const metadata = { title: 'More' }

export default async function MorePage() {
  const { user } = await viewer()
  const admin = user.role === 'admin'
  return (
    <>
      <PageHeader title="More" subtitle={`Signed in as ${user.displayName}`} />
      <List>
        <Row href="/parts" icon="part" title="Parts" detail="Bulbs, paint colours, filters, batteries" />
        <Row href="/fixtures" icon="fixture" title="Fixtures" detail="Everything installed, by place" />
        <Row href="/notes" icon="note" title="Notes" detail="What happened, newest first" />
        <Row href="/guide" icon="guide" title="House guide" detail="Emergency info and the housesitter handoff" />
      </List>
      <Section title="Settings">
        <List>
          {admin ? <Row href="/share" icon="link" title="Share links" detail="Send the house guide to a housesitter" /> : null}
          {admin ? <Row href="/family" icon="contact" title="Family" detail="Who can sign in, and invite links" /> : null}
          <Row href="/deleted" icon="trash" title="Recently deleted" detail="Bring back something deleted by mistake" />
          <Row href="/settings" icon="edit" title="Settings" detail={admin ? 'Your account, and the home' : 'Your name and password'} />
        </List>
      </Section>
      <form action={logoutAction} className="mt-6">
        <button type="submit" className={buttonClass('secondary', 'w-full')}>
          Sign out
        </button>
      </form>
    </>
  )
}
