import Link from 'next/link'
import { Lessons } from '@/components/Lessons'
import { LinksSection } from '@/components/LinksSection'
import { NoteList } from '@/components/NoteList'
import { PhotoUpload } from '@/components/PhotoUpload'
import { Photos } from '@/components/Photos'
import { UseList } from '@/components/UseList'
import { LinkButton } from '@/components/ui/Button'
import { Card, Pill, Section } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { roleAtLeast } from '@/lib/core/types'
import { db } from '@/lib/db'
import { listAttachments } from '@/lib/files/attachments'
import { lessons, listNotes } from '@/lib/notes/notes'
import { listUses } from '@/lib/parts/parts'
import { getThing } from '@/lib/things/things'
import { editedBy } from '@/lib/web/attribution'
import { viewer } from '@/lib/web/context'
import { removeAttachmentAction } from '@/lib/web/shared-actions'

export default async function ThingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { scope, user } = await viewer()
  const thing = await getThing(db, scope, id)
  const [uses, notes, photos, tips, edited] = await Promise.all([
    listUses(db, scope, { fixtureId: id }),
    listNotes(db, scope, { fixtureId: id, limit: 20 }),
    listAttachments(db, scope, { kind: 'fixture', id }),
    lessons(db, scope, { fixtureId: id }),
    editedBy(thing),
  ])
  const canEdit = roleAtLeast(user.role, 'member')
  const place = thing.path.at(-1)

  return (
    <>
      <PageHeader
        title={thing.name}
        subtitle={[thing.path.map((p) => p.name).join(' › ') || 'Whole house', thing.category].filter(Boolean).join(' · ')}
        back={place ? { href: `/places/${place.id}`, label: place.name } : { href: '/things', label: 'Things' }}
        actions={canEdit ? <LinkButton href={`/things/${id}/edit`}>Edit</LinkButton> : null}
      />

      {photos[0]?.mime.startsWith('image/') ? (
        <a href={`/api/files/${photos[0].sha256}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-card border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element -- our own authenticated file route */}
          <img src={`/api/files/${photos[0].sha256}?thumb=1`} alt={photos[0].caption || thing.name} className="max-h-72 w-full object-cover" />
        </a>
      ) : null}

      <Lessons rows={tips} />

      <Section
        title="Uses"
        action={canEdit ? <Link href={`/use?thing=${id}`} className="text-sm text-accent">Add part</Link> : null}
      >
        {uses.length ? (
          <UseList uses={uses} show="part" />
        ) : (
          <p className="px-1 text-sm text-ink-3">
            No parts yet. Add the bulb, filter or battery it takes, so nobody has to climb up and check.
          </p>
        )}
      </Section>

      {thing.notes ? (
        <Section title="About">
          <Card className="px-4 py-3">
            <p className="whitespace-pre-wrap text-[15px] text-ink-2">{thing.notes}</p>
          </Card>
        </Section>
      ) : null}

      {thing.inGuide ? (
        <Section title="On the house guide">
          <Card className="px-4 py-3">
            <Pill tone="accent">Shown to housesitters</Pill>
            {thing.guideNote ? <p className="mt-2 whitespace-pre-wrap text-[15px] text-ink-2">{thing.guideNote}</p> : null}
          </Card>
        </Section>
      ) : null}

      <Section
        title="Notes"
        action={canEdit ? <Link href={`/notes/new?thing=${id}`} className="text-sm text-accent">Add note</Link> : null}
      >
        {notes.length ? <NoteList rows={notes} /> : <p className="px-1 text-sm text-ink-3">Nothing logged yet.</p>}
      </Section>

      <Section title="Photos">
        <div className="flex flex-col gap-3">
          <Photos items={photos} remove={canEdit ? removeAttachmentAction : undefined} />
          {canEdit ? <PhotoUpload owner={`fixture:${id}`} /> : null}
        </div>
      </Section>

      <LinksSection owner={{ kind: 'fixture', id }} canEdit={canEdit} />

      <p className="mt-8 px-1 text-xs text-ink-3">{edited}</p>
    </>
  )
}
