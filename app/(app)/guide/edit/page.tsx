import Link from 'next/link'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState, List, Pill, Row, Section } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { listSecrets, listSections, SECRET_KINDS } from '@/lib/guide/guide'
import { listPeople } from '@/lib/people/people'
import { listThings } from '@/lib/things/things'
import { viewer } from '@/lib/web/context'

export const metadata = { title: 'Edit the guide' }

export default async function EditGuidePage() {
  await requireRole('member')
  const { scope } = await viewer()
  const [sections, codes, things, people] = await Promise.all([
    listSections(db, scope),
    listSecrets(db, scope),
    listThings(db, scope),
    listPeople(db, scope),
  ])
  const guideThings = things.filter((t) => t.inGuide)
  const guidePeople = people.filter((p) => p.inGuide || p.trades.some((t) => t.preferred))
  return (
    <>
      <PageHeader title="Edit the guide" back={{ href: '/guide', label: 'House guide' }} />

      <Section title="Emergency things">
        <p className="mb-2 px-1 text-sm text-ink-3">
          Shutoffs, the breaker panel, the water heater. Open a thing and tick “Show on the house guide” to add it.
        </p>
        {guideThings.length ? (
          <List>
            {guideThings.map((t) => (
              <Row key={t.id} href={`/things/${t.id}/edit`} icon="thing" title={t.name} detail={t.guideNote || 'No note for housesitters yet'} />
            ))}
          </List>
        ) : (
          <EmptyState action={<LinkButton href="/things">Pick from things</LinkButton>}>None yet.</EmptyState>
        )}
      </Section>

      <Section title="People">
        <p className="mb-2 px-1 text-sm text-ink-3">
          Our go-to person for each trade shows automatically, plus anyone marked for the guide.
        </p>
        {guidePeople.length ? (
          <List>
            {guidePeople.map((p) => (
              <Row key={p.id} href={`/people/${p.id}/edit`} icon="person" title={p.name} detail={p.trades.map((t) => t.trade).join(', ')} />
            ))}
          </List>
        ) : (
          <EmptyState action={<LinkButton href="/people">Go to people</LinkButton>}>None yet.</EmptyState>
        )}
      </Section>

      <Section title="Codes" action={<Link href="/guide/codes/new" className="text-sm text-accent">Add</Link>}>
        {codes.length ? (
          <List>
            {codes.map((c) => (
              <Row
                key={c.id}
                href={`/guide/codes/${c.id}`}
                icon="key"
                title={c.kind === 'wifi' && c.meta.ssid ? `Wi-Fi: ${c.meta.ssid}` : c.label}
                detail={`${SECRET_KINDS.find((k) => k.value === c.kind)?.label} · ${c.gate === 'always' ? 'anyone with the link' : 'at the house or with PIN'}${c.inGuide ? '' : ' · not on guide'}`}
              />
            ))}
          </List>
        ) : (
          <EmptyState action={<LinkButton href="/guide/codes/new">Add Wi-Fi or a code</LinkButton>}>No codes yet.</EmptyState>
        )}
      </Section>

      <Section title="Notes for the housesitter" action={<Link href="/guide/sections/new" className="text-sm text-accent">Add</Link>}>
        {sections.length ? (
          <List>
            {sections.map((s) => (
              <Row
                key={s.id}
                href={`/guide/sections/${s.id}`}
                icon="guide"
                title={s.title}
                trailing={s.sensitive ? <Pill tone="warn">Private</Pill> : undefined}
              />
            ))}
          </List>
        ) : (
          <EmptyState action={<LinkButton href="/guide/sections/new">Add a note</LinkButton>}>
            Trash day, the pets, the thermostat, the door that sticks.
          </EmptyState>
        )}
      </Section>
    </>
  )
}
