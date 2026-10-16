import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { buildTree, flattenTree, listSpaces } from '@/lib/places/places'
import { FIXTURE_CATEGORIES } from '@/lib/fixtures/fixtures'
import { viewer } from '@/lib/web/context'
import { createFixtureAction } from '../actions'
import { FixtureForm } from '../fixture-form'

export const metadata = { title: 'New fixture' }

export default async function NewFixturePage({ searchParams }: { searchParams: Promise<{ space?: string }> }) {
  await requireRole('member')
  const { scope } = await viewer()
  const places = flattenTree(buildTree(await listSpaces(db, scope)))
  const { space } = await searchParams
  return (
    <>
      <PageHeader
        title="New fixture"
        subtitle="Something installed: a light, a fan, a shutoff, an appliance"
        back={{ href: space ? `/places/${space}` : '/fixtures', label: 'Back' }}
      />
      <FixtureForm action={createFixtureAction} places={places} categories={FIXTURE_CATEGORIES} initial={{ spaceId: space }} submit="Add fixture" />
    </>
  )
}
