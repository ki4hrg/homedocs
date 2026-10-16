import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { isCategory } from '@/lib/parts/templates'
import { viewer } from '@/lib/web/context'
import { ownerFromParams } from '@/lib/web/owner'
import { createPartAction } from '../actions'
import { PartForm } from '../part-form'

export const metadata = { title: 'New part' }

export default async function NewPartPage({
  searchParams,
}: {
  searchParams: Promise<{ thing?: string; space?: string; category?: string }>
}) {
  await requireRole('member')
  const { scope } = await viewer()
  const params = await searchParams
  const owner = await ownerFromParams(scope, params)
  return (
    <>
      <PageHeader
        title="New part"
        subtitle={owner ? `Used by ${owner.name}` : 'A bulb, paint colour, filter or battery — defined once, used anywhere'}
        back={owner ? { href: owner.href, label: owner.name } : { href: '/parts', label: 'Parts' }}
      />
      <PartForm
        action={createPartAction}
        owner={owner}
        initial={{ category: params.category && isCategory(params.category) ? params.category : undefined }}
        submit={owner ? `Add to ${owner.name}` : 'Add part'}
      />
    </>
  )
}
