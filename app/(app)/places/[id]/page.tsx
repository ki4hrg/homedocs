import Link from 'next/link'
import { Lessons } from '@/components/Lessons'
import { LinksSection } from '@/components/LinksSection'
import { NoteList } from '@/components/NoteList'
import { PhotoUpload } from '@/components/PhotoUpload'
import { Photos } from '@/components/Photos'
import { UseList } from '@/components/UseList'
import { LinkButton } from '@/components/ui/Button'
import { List, Row, Section } from '@/components/ui/Card'
import { Icon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { roleAtLeast } from '@/lib/core/types'
import { db } from '@/lib/db'
import { listAttachments } from '@/lib/files/attachments'
import { lessons, listNotes } from '@/lib/notes/notes'
import { listUses } from '@/lib/parts/parts'
import { getSpace } from '@/lib/places/places'
import { listThings } from '@/lib/things/things'
import { editedBy } from '@/lib/web/attribution'
import { viewer } from '@/lib/web/context'
import { removeAttachmentAction } from '@/lib/web/shared-actions'

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { scope, user } = await viewer()
  const place = await getSpace(db, scope, id)
  const [things, uses, notes, photos, tips, edited] = await Promise.all([
    listThings(db, scope, { spaceId: id }),
    listUses(db, scope, { spaceId: id }),
    listNotes(db, scope, { spaceId: id, limit: 20 }),
    listAttachments(db, scope, { kind: 'space', id }),
    lessons(db, scope, { spaceId: id }),
    editedBy(place),
  ])
  const canEdit = roleAtLeast(user.role, 'member')
  const parent = place.path.at(-1)

  return (
    <>
      <PageHeader
        title={place.name}
        subtitle={place.path.length ? place.path.map((p) => p.name).join(' › ') : undefined}
        back={parent ? { href: `/places/${parent.id}`, label: parent.name } : { href: '/places', label: 'Places' }}
        actions={canEdit ? <LinkButton href={`/places/${id}/edit`}>Edit</LinkButton> : null}
      />

      {canEdit ? (
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Add to this place">
          {[
            { href: `/things/new?space=${id}`, label: 'What’s here?', sub: 'A thing', icon: 'thing' as const },
            { href: `/use?space=${id}`, label: 'What did we use?', sub: 'Paint, mulch…', icon: 'part' as const },
            { href: `/notes/new?space=${id}`, label: 'What happened?', sub: 'A note', icon: 'note' as const },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-1 rounded-card border border-line bg-card px-2 py-3 text-center hover:bg-sunk"
            >
              <Icon name={a.icon} className="h-6 w-6 text-accent" />
              <span className="text-[13px] font-medium leading-tight text-ink">{a.label}</span>
              <span className="text-[11px] text-ink-3">{a.sub}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <Lessons rows={tips} />

      {place.notes ? <p className="mt-4 whitespace-pre-wrap px-1 text-[15px] text-ink-2">{place.notes}</p> : null}

      {place.children.length > 0 || canEdit ? (
        <Section
          title="Places inside"
          action={canEdit ? <Link href={`/places/new?parent=${id}`} className="text-sm text-accent">Add</Link> : null}
        >
          {place.children.length ? (
            <List>
              {place.children.map((c) => (
                <Row key={c.id} href={`/places/${c.id}`} icon="place" title={c.name} />
              ))}
            </List>
          ) : (
            <p className="px-1 text-sm text-ink-3">None.</p>
          )}
        </Section>
      ) : null}

      <Section title="Things here">
        {things.length ? (
          <List>
            {things.map((t) => (
              <Row key={t.id} href={`/things/${t.id}`} icon="thing" title={t.name} detail={t.category} />
            ))}
          </List>
        ) : (
          <p className="px-1 text-sm text-ink-3">No things yet — lights, fans, shutoffs, appliances.</p>
        )}
      </Section>

      {uses.length ? (
        <Section title="Used here">
          <UseList uses={uses} show="part" />
        </Section>
      ) : null}

      {notes.length ? (
        <Section title="Notes" action={<Link href={`/notes?space=${id}`} className="text-sm text-accent">All</Link>}>
          <NoteList rows={notes.slice(0, 5)} />
        </Section>
      ) : null}

      <Section title="Photos">
        <div className="flex flex-col gap-3">
          <Photos items={photos} remove={canEdit ? removeAttachmentAction : undefined} />
          {canEdit ? <PhotoUpload owner={`space:${id}`} /> : photos.length ? null : <p className="px-1 text-sm text-ink-3">None.</p>}
        </div>
      </Section>

      <LinksSection owner={{ kind: 'space', id }} canEdit={canEdit} />

      <p className="mt-8 px-1 text-xs text-ink-3">{edited}</p>
    </>
  )
}
