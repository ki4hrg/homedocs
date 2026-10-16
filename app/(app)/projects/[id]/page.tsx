import Link from 'next/link'
import { LinksSection } from '@/components/LinksSection'
import { NoteList } from '@/components/NoteList'
import { PaperlessDocs } from '@/components/PaperlessDocs'
import { PhotoUpload } from '@/components/PhotoUpload'
import { Photos } from '@/components/Photos'
import { LinkButton } from '@/components/ui/Button'
import { Card, Pill, Section } from '@/components/ui/Card'
import { Icon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { roleAtLeast } from '@/lib/core/types'
import { db } from '@/lib/db'
import { listAttachments } from '@/lib/files/attachments'
import { listNotes } from '@/lib/notes/notes'
import { listContacts } from '@/lib/contacts/contacts'
import { buildTree, flattenTree, listSpaces } from '@/lib/places/places'
import { getProject, PRIORITY_LABEL, STATUS_LABEL } from '@/lib/projects/projects'
import { editedBy } from '@/lib/web/attribution'
import { viewer } from '@/lib/web/context'
import { formatDay, formatMoney } from '@/lib/web/format'
import { removeAttachmentAction } from '@/lib/web/shared-actions'
import {
  addItemAction,
  addQuoteAction,
  removeItemAction,
  removeQuoteAction,
  setQuoteStatusAction,
  setStatusAction,
  toggleItemAction,
} from '../actions'
import { Checklist, QuoteButtons, QuoteForm, StatusStepper } from './parts'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { scope, user } = await viewer()
  const project = await getProject(db, scope, id)
  const [notes, photos, contacts, spaces, edited] = await Promise.all([
    listNotes(db, scope, { projectId: id, limit: 20 }),
    listAttachments(db, scope, { kind: 'project', id }),
    listContacts(db, scope),
    listSpaces(db, scope),
    editedBy(project),
  ])
  const canEdit = roleAtLeast(user.role, 'member')
  const quoteLabel = new Map(
    project.quotes.map(({ quote, contactName }) => [quote.id, contactName ?? (quote.amount ? formatMoney(quote.amount) : 'a quote')]),
  )

  return (
    <>
      <PageHeader
        title={project.title}
        subtitle={[
          STATUS_LABEL[project.status],
          project.priority !== 'normal' ? PRIORITY_LABEL[project.priority] : '',
          project.targetDate ? `by ${formatDay(project.targetDate)}` : '',
        ]
          .filter(Boolean)
          .join(' · ')}
        back={{ href: '/projects', label: 'Projects' }}
        actions={canEdit ? <LinkButton href={`/projects/${id}/edit`}>Edit</LinkButton> : null}
      />

      {project.status !== 'dropped' ? (
        <StatusStepper status={project.status} setStatus={setStatusAction.bind(null, id)} canEdit={canEdit} />
      ) : (
        <Pill tone="neutral">Dropped</Pill>
      )}

      {project.summary ? (
        <Card className="mt-4 px-4 py-3">
          <p className="whitespace-pre-wrap text-[15px] text-ink-2">{project.summary}</p>
        </Card>
      ) : null}

      {project.places.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {project.places.map((p) => (
            <Link key={p.id} href={`/places/${p.id}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm text-ink-2">
              <Icon name="place" className="h-4 w-4 text-accent" />
              {p.name}
            </Link>
          ))}
        </div>
      ) : null}

      <Section title="To do">
        <Checklist
          items={project.items.map(({ item, spaceName }) => ({
            id: item.id,
            text: item.text,
            done: item.done,
            spaceName,
            quoteLabel: item.quoteId ? (quoteLabel.get(item.quoteId) ?? null) : null,
          }))}
          toggle={toggleItemAction}
          remove={removeItemAction}
          add={addItemAction.bind(null, id)}
          places={flattenTree(buildTree(spaces))}
          quotes={[...quoteLabel].map(([qid, label]) => ({ id: qid, label }))}
          canEdit={canEdit}
        />
      </Section>

      <Section title="Quotes">
        <div className="flex flex-col gap-3">
          {project.quotes.map(({ quote, contactName, contactCompany }) => (
            <Card key={quote.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold text-ink">{formatMoney(quote.amount) || 'No amount yet'}</p>
                  <p className="text-sm text-ink-3">
                    {quote.contactId ? (
                      <Link href={`/contacts/${quote.contactId}`} className="text-accent">
                        {contactName}
                        {contactCompany ? ` (${contactCompany})` : ''}
                      </Link>
                    ) : (
                      'Unknown contractor'
                    )}
                    {quote.receivedOn ? ` · ${formatDay(quote.receivedOn)}` : ''}
                  </p>
                </div>
                <Pill tone={quote.status === 'accepted' ? 'accent' : quote.status === 'declined' ? 'neutral' : 'warn'}>
                  {quote.status === 'pending' ? 'Pending' : quote.status === 'accepted' ? 'Accepted' : 'Declined'}
                </Pill>
              </div>
              {quote.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{quote.notes}</p> : null}
              {canEdit ? (
                <div className="mt-3 flex flex-col gap-3">
                  <QuoteButtons
                    status={quote.status}
                    setStatus={setQuoteStatusAction.bind(null, quote.id)}
                    remove={removeQuoteAction.bind(null, quote.id)}
                  />
                  <PhotoUpload owner={`quote:${quote.id}`} label="Attach quote" />
                </div>
              ) : null}
              <QuoteFiles quoteId={quote.id} canEdit={canEdit} />
            </Card>
          ))}
          {canEdit ? (
            <QuoteForm add={addQuoteAction.bind(null, id)} contacts={contacts.map((p) => ({ id: p.id, label: p.company ? `${p.name} (${p.company})` : p.name }))} />
          ) : project.quotes.length === 0 ? (
            <p className="px-1 text-sm text-ink-3">No quotes yet.</p>
          ) : null}
        </div>
      </Section>

      <Section
        title="Notes"
        action={canEdit ? <Link href={`/notes/new?project=${id}`} className="text-sm text-accent">Add note</Link> : null}
      >
        {notes.length ? <NoteList rows={notes} /> : <p className="px-1 text-sm text-ink-3">None yet.</p>}
      </Section>

      <PaperlessDocs owner={{ kind: 'project', id }} kind="tag" canEdit={canEdit} />

      <Section title="Photos and files">
        <div className="flex flex-col gap-3">
          <Photos items={photos} remove={canEdit ? removeAttachmentAction : undefined} />
          {canEdit ? <PhotoUpload owner={`project:${id}`} /> : null}
        </div>
      </Section>

      <LinksSection owner={{ kind: 'project', id }} canEdit={canEdit} />

      <p className="mt-8 px-1 text-xs text-ink-3">{edited}</p>
    </>
  )
}

async function QuoteFiles({ quoteId, canEdit }: { quoteId: string; canEdit: boolean }) {
  const { scope } = await viewer()
  const files = await listAttachments(db, scope, { kind: 'quote', id: quoteId })
  if (files.length === 0) return null
  return (
    <div className="mt-3">
      <Photos items={files} remove={canEdit ? removeAttachmentAction : undefined} />
    </div>
  )
}
