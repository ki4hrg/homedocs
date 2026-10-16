import Link from 'next/link'
import { SearchBox } from '@/components/SearchBox'
import { EmptyState, List, Row, Section } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/Button'
import { Icon } from '@/components/ui/icons'
import { db } from '@/lib/db'
import { comingUp, listNotes } from '@/lib/notes/notes'
import { preferredByTrade, telHref } from '@/lib/people/people'
import { listProjects, OPEN_STATUSES, STATUS_LABEL } from '@/lib/projects/projects'
import { roleAtLeast } from '@/lib/core/types'
import { formatDay } from '@/lib/web/format'
import { viewer } from '@/lib/web/context'

export default async function HomePage() {
  const { scope, user } = await viewer()
  const [upcoming, recent, preferred, projects] = await Promise.all([
    comingUp(db, scope),
    listNotes(db, scope, { limit: 5 }),
    preferredByTrade(db, scope),
    listProjects(db, scope, { statuses: OPEN_STATUSES }),
  ])
  const canEdit = roleAtLeast(user.role, 'member')

  return (
    <>
      <h1 className="sr-only">Home</h1>
      <SearchBox />

      {preferred.length > 0 ? (
        <Section title="Our people" action={<Link href="/people" className="text-sm text-accent">All</Link>}>
          <List>
            {preferred.slice(0, 6).map(({ trade, contact }) => {
              const phone = contact.phones[0]?.value
              return (
                <Row
                  key={`${trade}-${contact.id}`}
                  href={`/people/${contact.id}`}
                  icon="person"
                  title={contact.name}
                  detail={trade[0]!.toUpperCase() + trade.slice(1)}
                  trailing={
                    phone ? (
                      <a
                        href={telHref(phone)}
                        aria-label={`Call ${contact.name}`}
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
        </Section>
      ) : null}

      {upcoming.length > 0 ? (
        <Section title="Coming up">
          <List>
            {upcoming.map(({ note, spaceName, fixtureName, supplyName }) => (
              <Row
                key={note.id}
                href={`/notes/${note.id}`}
                icon="note"
                title={note.nextTime || note.title}
                detail={[formatDay(note.remindAfter), supplyName ?? fixtureName ?? spaceName, `from “${note.title}”`]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title="Projects" action={<Link href="/projects" className="text-sm text-accent">All</Link>}>
        {projects.length > 0 ? (
          <List>
            {projects.slice(0, 5).map((p) => (
              <Row
                key={p.id}
                href={`/projects/${p.id}`}
                icon="project"
                title={p.title}
                detail={`${STATUS_LABEL[p.status]}${p.openItems ? ` · ${p.openItems} to do` : ''}`}
              />
            ))}
          </List>
        ) : (
          <EmptyState action={canEdit ? <LinkButton href="/projects/new">Add a project</LinkButton> : null}>
            Nothing planned. Jobs you want done around the house go here.
          </EmptyState>
        )}
      </Section>

      <Section title="Recent notes" action={<Link href="/notes" className="text-sm text-accent">All</Link>}>
        {recent.length > 0 ? (
          <List>
            {recent.map(({ note, spaceName, fixtureName, supplyName }) => (
              <Row
                key={note.id}
                href={`/notes/${note.id}`}
                icon="note"
                title={note.title}
                detail={[formatDay(note.happenedOn), fixtureName ?? spaceName ?? supplyName].filter(Boolean).join(' · ')}
              />
            ))}
          </List>
        ) : (
          <EmptyState action={canEdit ? <LinkButton href="/places">Start with your places</LinkButton> : null}>
            Nothing written down yet. Start by adding the rooms and outdoor areas of the house.
          </EmptyState>
        )}
      </Section>
    </>
  )
}
