import { EmptyState, List, Row } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/Button'
import { Icon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { roleAtLeast } from '@/lib/core/types'
import { db } from '@/lib/db'
import { listPeople, telHref } from '@/lib/people/people'
import { viewer } from '@/lib/web/context'

export const metadata = { title: 'People' }

export default async function PeoplePage() {
  const { scope, user } = await viewer()
  const people = await listPeople(db, scope)
  const canEdit = roleAtLeast(user.role, 'member')
  return (
    <>
      <PageHeader
        title="People"
        subtitle="Who we call"
        actions={canEdit ? <LinkButton href="/people/new" variant="primary">Add</LinkButton> : null}
      />
      {people.length ? (
        <List>
          {people.map((p) => {
            const phone = p.phones[0]?.value
            const ours = p.trades.filter((t) => t.preferred).map((t) => `our ${t.trade}`)
            const other = p.trades.filter((t) => !t.preferred).map((t) => t.trade)
            return (
              <Row
                key={p.id}
                href={`/people/${p.id}`}
                icon="person"
                title={p.name}
                detail={[p.company, [...ours, ...other].join(', ')].filter(Boolean).join(' · ')}
                trailing={
                  phone ? (
                    <a
                      href={telHref(phone)}
                      aria-label={`Call ${p.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"
                    >
                      <Icon name="phone" />
                    </a>
                  ) : null
                }
              />
            )
          })}
        </List>
      ) : (
        <EmptyState action={canEdit ? <LinkButton href="/people/new" variant="primary">Add someone</LinkButton> : null}>
          Plumber, electrician, HVAC, the HOA, utilities — whoever you’d have to look up in a hurry.
        </EmptyState>
      )}
    </>
  )
}
