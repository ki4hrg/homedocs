import { DeleteButton } from '@/components/DeleteButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { buildTree, flattenTree, listSpaces } from '@/lib/places/places'
import { getThing, THING_CATEGORIES } from '@/lib/things/things'
import { viewer } from '@/lib/web/context'
import { deleteThingAction, updateThingAction } from '../../actions'
import { ThingForm } from '../../thing-form'

export const metadata = { title: 'Edit thing' }

export default async function EditThingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('member')
  const { id } = await params
  const { scope } = await viewer()
  const thing = await getThing(db, scope, id)
  const places = flattenTree(buildTree(await listSpaces(db, scope)))
  return (
    <>
      <PageHeader title={`Edit ${thing.name}`} back={{ href: `/things/${id}`, label: thing.name }} />
      <ThingForm
        action={updateThingAction.bind(null, id)}
        places={places}
        categories={THING_CATEGORIES}
        initial={{ ...thing, updatedAt: thing.updatedAt.toISOString() }}
        submit="Save"
      />
      <div className="mt-8 border-t border-line pt-6">
        <DeleteButton
          action={deleteThingAction.bind(null, id, thing.spaceId ? `/places/${thing.spaceId}` : '/things')}
          what={`“${thing.name}”`}
        />
      </div>
    </>
  )
}
