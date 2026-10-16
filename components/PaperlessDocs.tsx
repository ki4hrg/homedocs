import { db } from '@/lib/db'
import type { Owner } from '@/lib/files/attachments'
import { listIntegrations, paperlessDocsFor } from '@/lib/integrations/integrations'
import { linkPickedAction, removeLinkAction } from '@/lib/web/link-actions'
import { viewer } from '@/lib/web/context'
import { DeleteButton } from './DeleteButton'
import { LinkPicker } from './LinkPicker'
import { LinkThumb } from './LinkThumb'
import { List, Section } from './ui/Card'
import { Icon } from './ui/icons'

/*
 * The documents paperless has filed under a record's tag (a place, project or
 * system) or correspondent (a contact): manuals, receipts, invoices. File a
 * document in paperless and it shows here; nothing to link one by one.
 * Nothing shows when paperless isn't connected.
 */
export async function PaperlessDocs({
  owner,
  kind,
  canEdit,
}: {
  owner: Owner
  kind: 'tag' | 'correspondent'
  canEdit: boolean
}) {
  const { scope } = await viewer()
  const connected = (await listIntegrations(db, scope)).some((i) => i.system === 'paperless')
  if (!connected) return null
  const docs = await paperlessDocsFor(db, scope, owner, kind)

  if (docs.state === 'none') {
    if (!canEdit) return null
    return (
      <Section title="Documents">
        <LinkPicker
          systems={[{ system: 'paperless', name: 'paperless', kind, label: `Show a paperless ${kind}’s documents` }]}
          link={linkPickedAction.bind(null, `${owner.kind}:${owner.id}`)}
        />
      </Section>
    )
  }

  const action = (
    <span className="flex items-center gap-1">
      <a href={docs.filter.url} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-1 px-1 text-sm text-accent">
        Open <Icon name="external" className="h-4 w-4" />
      </a>
      {canEdit ? (
        <DeleteButton compact what={`the ${kind} ${docs.filter.title}`} label="Unlink" recoverable={false} action={removeLinkAction.bind(null, docs.filter.id)} />
      ) : null}
    </span>
  )
  const title = `Documents · ${docs.filter.title}`

  if (docs.state === 'error') {
    return (
      <Section title={title} action={action}>
        <p className="px-1 text-sm text-warn">{docs.message}</p>
      </Section>
    )
  }

  return (
    <Section title={title} action={action}>
      {docs.documents.length ? (
        <>
          <List>
            {docs.documents.map((d) => (
              <li key={d.externalId}>
                <a href={d.url} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <LinkThumb src={`/api/ext/paperless/${d.externalId}/thumb`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{d.title}</span>
                    {d.subtitle ? <span className="block truncate text-sm text-ink-3">{d.subtitle}</span> : null}
                  </span>
                </a>
              </li>
            ))}
          </List>
          {docs.total > docs.documents.length ? (
            <p className="mt-2 px-1 text-xs text-ink-3">
              Newest {docs.documents.length} of {docs.total}.
            </p>
          ) : null}
        </>
      ) : (
        <p className="px-1 text-sm text-ink-3">No documents yet.</p>
      )}
    </Section>
  )
}
