import { DeleteButton } from '@/components/DeleteButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { COMMON_TRADES, getPerson } from '@/lib/people/people'
import { viewer } from '@/lib/web/context'
import { deletePersonAction, updatePersonAction } from '../../actions'
import { PersonForm } from '../../person-form'

export const metadata = { title: 'Edit person' }

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('member')
  const { id } = await params
  const { scope } = await viewer()
  const person = await getPerson(db, scope, id)
  return (
    <>
      <PageHeader title={`Edit ${person.name}`} back={{ href: `/people/${id}`, label: person.name }} />
      <PersonForm
        action={updatePersonAction.bind(null, id)}
        trades={COMMON_TRADES}
        initial={{ ...person, updatedAt: person.updatedAt.toISOString() }}
        submit="Save"
      />
      <div className="mt-8 border-t border-line pt-6">
        <DeleteButton action={deletePersonAction.bind(null, id)} what={`“${person.name}”`} />
      </div>
    </>
  )
}
