import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { COMMON_TRADES } from '@/lib/people/people'
import { createPersonAction } from '../actions'
import { PersonForm } from '../person-form'

export const metadata = { title: 'New person' }

export default async function NewPersonPage() {
  await requireRole('member')
  return (
    <>
      <PageHeader title="New person" back={{ href: '/people', label: 'People' }} />
      <PersonForm action={createPersonAction} trades={COMMON_TRADES} submit="Add person" />
    </>
  )
}
