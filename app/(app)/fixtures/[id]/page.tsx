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
import { getFixture } from '@/lib/fixtures/fixtures'
import { editedBy } from '@/lib/web/attribution'
import { viewer } from '@/lib/web/context'
import { removeAttachmentAction } from '@/lib/web/shared-actions'

export default async function FixturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { scope, user } = await viewer()
  const fixture = await getFixture(db, scope, id)
  const [uses, notes, photos, tips, edited] = await Promise.all([
    listUses(db, scope, { fixtureId: id }),
    listNotes(db, scope, { fixtureId: id, limit: 20 }),
    listAttachments(db, scope, { kind: 'fixture', id }),
    lessons(db, scope, { fixtureId: id }),
    editedBy(fixture),
  ])
  const canEdit = roleAtLeast(user.role, 'member')
  const place = fixture.path.at(-1)

  return (
    <>
      <PageHeader
        title={fixture.name}
        subtitle={[fixture.path.map((p) => p.name).join(' › ') || 'Whole house', fixture.category].filter(Boolean).join(' · ')}
        back={place ? { href: `/places/${place.id}`, label: place.name } : { href: '/fixtures', label: 'Fixtures' }}
        actions={canEdit ? <LinkButton href={`/fixtures/${id}/edit`}>Edit</LinkButton> : null}
      />

      {photos.length ? (
        <div className="flex flex-col gap-2">
          <Photos items={photos} hero remove={canEdit ? removeAttachmentAction : undefined} />
          {canEdit ? <PhotoUpload owner={`fixture:${id}`} label="Add another photo" /> : null}
        </div>
      ) : canEdit ? (
        <PhotoUpload
          owner={`fixture:${id}`}
          tile={{ title: 'Add a photo', hint: 'Where it is, and its label. A picture beats directions when you’re looking for a shutoff.' }}
        />
      ) : null}

      <Lessons rows={tips} />

      <Section
        title="Uses"
        action={canEdit ? <Link href={`/use?fixture=${id}`} className="text-sm text-accent">Add part</Link> : null}
      >
        {uses.length ? (
          <UseList uses={uses} show="part" />
        ) : (
          <p className="px-1 text-sm text-ink-3">
            No parts yet. Add the bulb, filter or battery it takes, so nobody has to climb up and check.
          </p>
        )}
      </Section>

      {fixture.notes ? (
        <Section title="About">
          <Card className="px-4 py-3">
            <p className="whitespace-pre-wrap text-[15px] text-ink-2">{fixture.notes}</p>
          </Card>
        </Section>
      ) : null}

      {fixture.inGuide ? (
        <Section title="On the house guide">
          <Card className="px-4 py-3">
            <Pill tone="accent">Shown to housesitters</Pill>
            {fixture.guideNote ? <p className="mt-2 whitespace-pre-wrap text-[15px] text-ink-2">{fixture.guideNote}</p> : null}
          </Card>
        </Section>
      ) : null}

      <Section
        title="Notes"
        action={canEdit ? <Link href={`/notes/new?fixture=${id}`} className="text-sm text-accent">Add note</Link> : null}
      >
        {notes.length ? <NoteList rows={notes} /> : <p className="px-1 text-sm text-ink-3">Nothing logged yet.</p>}
      </Section>

      <LinksSection owner={{ kind: 'fixture', id }} canEdit={canEdit} />

      <p className="mt-8 px-1 text-xs text-ink-3">{edited}</p>
    </>
  )
}
