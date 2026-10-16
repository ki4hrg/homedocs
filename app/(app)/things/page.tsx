import { EmptyState, List, Row } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { roleAtLeast } from '@/lib/core/types'
import { db } from '@/lib/db'
import { buildTree, flattenTree, listSpaces } from '@/lib/places/places'
import { listThings } from '@/lib/things/things'
import { viewer } from '@/lib/web/context'

export const metadata = { title: 'Things' }

export default async function ThingsPage() {
  const { scope, user } = await viewer()
  const [things, spaceRows] = await Promise.all([listThings(db, scope), listSpaces(db, scope)])
  const labels = new Map(flattenTree(buildTree(spaceRows)).map((p) => [p.id, p.label]))
  const canEdit = roleAtLeast(user.role, 'member')
  const sorted = [...things].sort((a, b) =>
    `${labels.get(a.spaceId ?? '') ?? ''} ${a.name}`.localeCompare(`${labels.get(b.spaceId ?? '') ?? ''} ${b.name}`),
  )
  return (
    <>
      <PageHeader
        title="Things"
        subtitle="Everything installed, by place"
        back={{ href: '/more', label: 'More' }}
        actions={canEdit ? <LinkButton href="/things/new" variant="primary">Add</LinkButton> : null}
      />
      {sorted.length ? (
        <List>
          {sorted.map((t) => (
            <Row
              key={t.id}
              href={`/things/${t.id}`}
              icon="thing"
              title={t.name}
              detail={[labels.get(t.spaceId ?? '') ?? 'Whole house', t.category].filter(Boolean).join(' · ')}
            />
          ))}
        </List>
      ) : (
        <EmptyState>No things yet. Open a place and tap “What’s here?”.</EmptyState>
      )}
    </>
  )
}
