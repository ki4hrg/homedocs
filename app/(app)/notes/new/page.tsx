import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { getPart } from '@/lib/parts/parts'
import { getThing } from '@/lib/things/things'
import { viewer } from '@/lib/web/context'
import { noteOptions } from '@/lib/web/note-options'
import { createNoteAction } from '../actions'
import { NoteForm } from '../note-form'

export const metadata = { title: 'New note' }

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ space?: string; thing?: string; part?: string; person?: string; project?: string }>
}) {
  await requireRole('member')
  const { scope } = await viewer()
  const p = await searchParams
  const options = await noteOptions(scope)
  // A note about a thing is also about its place; a note about a part uses its unit.
  const thing = p.thing ? await getThing(db, scope, p.thing) : null
  const part = p.part ? await getPart(db, scope, p.part) : null
  const back = p.thing ? `/things/${p.thing}` : p.space ? `/places/${p.space}` : p.part ? `/parts/${p.part}` : p.project ? `/projects/${p.project}` : p.person ? `/people/${p.person}` : '/notes'
  return (
    <>
      <PageHeader title="New note" subtitle="Something that happened, and what to remember" back={{ href: back, label: 'Back' }} />
      <NoteForm
        action={createNoteAction}
        options={options}
        initial={{
          spaceId: p.space ?? thing?.spaceId ?? null,
          fixtureId: p.thing ?? null,
          supplyId: p.part ?? null,
          contactId: p.person ?? null,
          projectId: p.project ?? null,
          unit: part?.unit ?? null,
        }}
        submit="Save note"
      />
    </>
  )
}
