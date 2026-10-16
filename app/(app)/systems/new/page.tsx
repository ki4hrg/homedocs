import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { COMMON_TRADES } from '@/lib/contacts/contacts'
import { createSystemAction } from '../actions'
import { SystemForm } from '../system-form'

export const metadata = { title: 'New system' }

export default async function NewSystemPage() {
  await requireRole('member')
  return (
    <>
      <PageHeader title="New system" subtitle="One part of how the house works: a pool, solar panels, a well" back={{ href: '/systems', label: 'Systems' }} />
      <SystemForm action={createSystemAction} trades={COMMON_TRADES} submit="Add system" />
    </>
  )
}
