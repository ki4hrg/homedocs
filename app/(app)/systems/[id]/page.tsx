import Link from 'next/link'
import { NoteList } from '@/components/NoteList'
import { LinkButton } from '@/components/ui/Button'
import { Card, EmptyState, List, Pill, Row, Section } from '@/components/ui/Card'
import { Icon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { telHref } from '@/lib/contacts/contacts'
import { roleAtLeast } from '@/lib/core/types'
import { db } from '@/lib/db'
import { listNotes } from '@/lib/notes/notes'
import { systemOverview, type SystemFixture } from '@/lib/systems/systems'
import { viewer } from '@/lib/web/context'

/*
 * One system, the way you'd hand it over: what to reach for first (the guide
 * fixtures, with their photos and instructions), who to call, then everything
 * else in it by place, the parts it takes, and what happened before.
 */
export default async function SystemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { scope, user } = await viewer()
  const [{ system, fixtures, parts, contacts }, notes] = await Promise.all([
    systemOverview(db, scope, id),
    listNotes(db, scope, { systemId: id, limit: 10 }),
  ])
  const canEdit = roleAtLeast(user.role, 'member')
  const first = fixtures.filter((f) => f.inGuide)
  const rest = fixtures.filter((f) => !f.inGuide)
  const byPlace = new Map<string, SystemFixture[]>()
  for (const f of rest) byPlace.set(f.where, [...(byPlace.get(f.where) ?? []), f])
  const addFixture = canEdit ? (
    <Link href={`/fixtures/new?system=${id}`} className="text-sm text-accent">
      Add fixture
    </Link>
  ) : null

  return (
    <>
      <PageHeader
        title={system.name}
        subtitle={fixtures.length ? `${fixtures.length} fixture${fixtures.length === 1 ? '' : 's'}` : undefined}
        back={{ href: '/systems', label: 'Systems' }}
        actions={canEdit ? <LinkButton href={`/systems/${id}/edit`}>Edit</LinkButton> : null}
      />

      {system.notes ? (
        <Card className="mb-2 px-4 py-3">
          <p className="whitespace-pre-wrap text-[15px] text-ink-2">{system.notes}</p>
        </Card>
      ) : null}

      {first.length ? (
        <Section title="First, find these">
          <div className="flex flex-col gap-3">
            {first.map((f) => (
              <Card key={f.id} className="overflow-hidden">
                <Link href={`/fixtures/${f.id}`} className="block hover:bg-sunk">
                  {f.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- served by our own guarded route
                    <img src={`/api/files/${f.photo}?thumb=1`} alt={f.name} className="max-h-56 w-full object-cover" />
                  ) : null}
                  <span className="block px-4 py-3">
                    <span className="block text-[17px] font-semibold text-ink">{f.name}</span>
                    <span className="block text-sm text-ink-3">{f.where}</span>
                    {f.guideNote ? <span className="mt-2 block whitespace-pre-wrap text-[15px] text-ink-2">{f.guideNote}</span> : null}
                  </span>
                </Link>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      {contacts.length ? (
        <Section title="Who to call">
          <List>
            {contacts.map((c) => (
              <Row
                key={c.id}
                href={`/contacts/${c.id}`}
                icon="contact"
                title={c.name}
                detail={[c.company, c.trade[0]!.toUpperCase() + c.trade.slice(1)].filter(Boolean).join(' · ')}
                trailing={
                  c.phone ? (
                    <a
                      href={telHref(c.phone)}
                      aria-label={`Call ${c.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent"
                    >
                      <Icon name="phone" />
                    </a>
                  ) : null
                }
              />
            ))}
          </List>
        </Section>
      ) : system.trades.length && canEdit ? (
        <Section title="Who to call">
          <p className="px-1 text-sm text-ink-3">
            No contact for {system.trades.join(' or ')} yet.{' '}
            <Link href="/contacts/new" className="text-accent underline">
              Add one
            </Link>{' '}
            and mark them preferred.
          </p>
        </Section>
      ) : null}

      <Section title={first.length ? 'Everything else' : 'Fixtures'} action={addFixture}>
        {fixtures.length === 0 ? (
          <EmptyState>
            Nothing is in {system.name} yet. Add its shutoffs and equipment, or pick this system when you edit a fixture.
          </EmptyState>
        ) : rest.length === 0 ? (
          <p className="px-1 text-sm text-ink-3">Everything in it is above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...byPlace].map(([where, items]) => (
              <div key={where}>
                <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-ink-3">{where}</p>
                <List>
                  {items.map((f) => (
                    <Row key={f.id} href={`/fixtures/${f.id}`} icon="fixture" title={f.name} detail={f.category || undefined} />
                  ))}
                </List>
              </div>
            ))}
          </div>
        )}
      </Section>

      {parts.length ? (
        <Section title="What it takes">
          <List>
            {parts.map((p) => (
              <Row key={p.id} href={`/parts/${p.id}`} icon="part" title={p.name} detail={p.usedBy.join(', ')} />
            ))}
          </List>
        </Section>
      ) : null}

      {notes.length ? (
        <Section title="Notes">
          <NoteList rows={notes} />
        </Section>
      ) : null}

      {first.length === 0 && fixtures.length > 0 && canEdit ? (
        <p className="mt-6 px-1 text-xs text-ink-3">
          <Pill>Tip</Pill> Mark a shutoff “Show on the house guide” and it appears at the top here, and under {system.name} on the guide.
        </p>
      ) : null}
    </>
  )
}
