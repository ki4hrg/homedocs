import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { TRADE_GROUPS } from '@/lib/contacts/contacts'
import { createContactAction } from '../actions'
import { ContactForm } from '../contact-form'

export const metadata = { title: 'New contact' }

export default async function NewContactPage() {
  await requireRole('member')
  return (
    <>
      <PageHeader title="New contact" back={{ href: '/contacts', label: 'Contacts' }} />
      <ContactForm action={createContactAction} groups={TRADE_GROUPS} submit="Add contact" />
    </>
  )
}
