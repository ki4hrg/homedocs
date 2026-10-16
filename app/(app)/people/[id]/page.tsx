import Link from 'next/link'
import { LinksSection } from '@/components/LinksSection'
import { NoteList } from '@/components/NoteList'
import { PhotoUpload } from '@/components/PhotoUpload'
import { Photos } from '@/components/Photos'
import { LinkButton } from '@/components/ui/Button'
import { Card, Facts, List, Pill, Section } from '@/components/ui/Card'
import { Icon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { roleAtLeast } from '@/lib/core/types'
import { db } from '@/lib/db'
import { listAttachments } from '@/lib/files/attachments'
import { listNotes } from '@/lib/notes/notes'
import { getPerson, telHref } from '@/lib/people/people'
import { editedBy } from '@/lib/web/attribution'
import { viewer } from '@/lib/web/context'
import { removeAttachmentAction } from '@/lib/web/shared-actions'

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { scope, user } = await viewer()
  const person = await getPerson(db, scope, id)
  const [notes, photos, edited] = await Promise.all([
    listNotes(db, scope, { contactId: id, limit: 20 }),
    listAttachments(db, scope, { kind: 'contact', id }),
    editedBy(person),
  ])
  const canEdit = roleAtLeast(user.role, 'member')

  return (
    <>
      <PageHeader
        title={person.name}
        subtitle={person.company || undefined}
        back={{ href: '/people', label: 'People' }}
        actions={canEdit ? <LinkButton href={`/people/${id}/edit`}>Edit</LinkButton> : null}
      />

      {person.trades.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {person.trades.map((t) => (
            <Pill key={t.trade} tone={t.preferred ? 'accent' : 'neutral'}>
              {t.preferred ? `Our ${t.trade}` : t.trade}
            </Pill>
          ))}
          {person.inGuide ? <Pill tone="neutral">On the house guide</Pill> : null}
        </div>
      ) : null}

      {person.phones.length || person.emails.length || person.website ? (
        <List>
          {person.phones.map((p, i) => (
            <li key={`p${i}`}>
              <a href={telHref(p.value)} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-sunk">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-ink">
                  <Icon name="phone" />
                </span>
                <span>
                  <span className="block text-[17px] font-medium text-ink">{p.value}</span>
                  {p.label ? <span className="block text-sm text-ink-3">{p.label}</span> : null}
                </span>
              </a>
            </li>
          ))}
          {person.emails.map((e, i) => (
            <li key={`e${i}`}>
              <a href={`mailto:${e.value}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-sunk">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="mail" />
                </span>
                <span>
                  <span className="block text-[15px] text-ink">{e.value}</span>
                  {e.label ? <span className="block text-sm text-ink-3">{e.label}</span> : null}
                </span>
              </a>
            </li>
          ))}
          {person.website ? (
            <li>
              <a href={person.website} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-sunk">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="external" />
                </span>
                <span className="truncate text-[15px] text-ink">{person.website.replace(/^https?:\/\//, '')}</span>
              </a>
            </li>
          ) : null}
        </List>
      ) : null}

      <div className="mt-4">
        <Facts items={[{ label: 'Account number', value: person.accountNumber }]} />
      </div>

      {person.notes ? (
        <Section title="Notes">
          <Card className="px-4 py-3">
            <p className="whitespace-pre-wrap text-[15px] text-ink-2">{person.notes}</p>
          </Card>
        </Section>
      ) : null}

      <Section
        title="Work they’ve done"
        action={canEdit ? <Link href={`/notes/new?person=${id}`} className="text-sm text-accent">Add note</Link> : null}
      >
        {notes.length ? <NoteList rows={notes} /> : <p className="px-1 text-sm text-ink-3">Nothing logged yet.</p>}
      </Section>

      <Section title="Photos and files">
        <div className="flex flex-col gap-3">
          <Photos items={photos} remove={canEdit ? removeAttachmentAction : undefined} />
          {canEdit ? <PhotoUpload owner={`contact:${id}`} label="Add business card or file" /> : null}
        </div>
      </Section>

      <LinksSection owner={{ kind: 'contact', id }} canEdit={canEdit} />

      <p className="mt-8 px-1 text-xs text-ink-3">{edited}</p>
    </>
  )
}
