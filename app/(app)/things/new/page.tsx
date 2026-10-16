import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { buildTree, flattenTree, listSpaces } from '@/lib/places/places'
import { THING_CATEGORIES } from '@/lib/things/things'
import { viewer } from '@/lib/web/context'
import { createThingAction } from '../actions'
import { ThingForm } from '../thing-form'

export const metadata = { title: 'New thing' }

export default async function NewThingPage({ searchParams }: { searchParams: Promise<{ space?: string }> }) {
  await requireRole('member')
  const { scope } = await viewer()
  const places = flattenTree(buildTree(await listSpaces(db, scope)))
  const { space } = await searchParams
  return (
    <>
      <PageHeader
        title="New thing"
        subtitle="Something installed: a light, a fan, a shutoff, an appliance"
        back={{ href: space ? `/places/${space}` : '/things', label: 'Back' }}
      />
      <ThingForm action={createThingAction} places={places} categories={THING_CATEGORIES} initial={{ spaceId: space }} submit="Add thing" />
    </>
  )
}
