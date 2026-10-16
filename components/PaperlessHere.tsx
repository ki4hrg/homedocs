import { db } from '@/lib/db'
import { listIntegrations, paperlessDocsHere } from '@/lib/integrations/integrations'
import { linkPickedAction } from '@/lib/web/link-actions'
import { viewer } from '@/lib/web/context'
import { LinkPicker } from './LinkPicker'
import { LinkThumb } from './LinkThumb'
import { List, Section } from './ui/Card'
import { Icon } from './ui/icons'

/*
 * The documents paperless has filed under this place's tag: manuals, receipts,
 * warranties, inspection reports. Tag a document in paperless and it shows
 * here; nothing to link one by one. Nothing shows when paperless isn't connected.
 */
export async function PaperlessHere({ spaceId, placeName, canEdit }: { spaceId: string; placeName: string; canEdit: boolean }) {
  const { scope } = await viewer()
  const connected = (await listIntegrations(db, scope)).some((i) => i.system === 'paperless')
  if (!connected) return null
  const here = await paperlessDocsHere(db, scope, spaceId)

  if (here.state === 'none') {
    if (!canEdit) return null
    return (
      <Section title="Documents">
        <div className="flex flex-col gap-2">
          <p className="px-1 text-sm text-ink-3">
            Link this place to a paperless tag, and every document with that tag shows up here on its own.
          </p>
          <LinkPicker
            systems={[{ system: 'paperless', name: 'paperless', kind: 'tag', label: 'Pick the paperless tag' }]}
            initialQuery={placeName}
            link={linkPickedAction.bind(null, `space:${spaceId}`)}
          />
        </div>
      </Section>
    )
  }

  const open = (
    <a href={here.tag.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-accent">
      Open <Icon name="external" className="h-4 w-4" />
    </a>
  )
  const title = `Documents · ${here.tag.title}`

  if (here.state === 'error') {
    return (
      <Section title={title} action={open}>
        <p className="px-1 text-sm text-warn">{here.message}</p>
      </Section>
    )
  }

  return (
    <Section title={title} action={open}>
      {here.documents.length ? (
        <>
          <List>
            {here.documents.map((d) => (
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
          {here.total > here.documents.length ? (
            <p className="mt-2 px-1 text-xs text-ink-3">
              Showing the newest {here.documents.length} of {here.total}. Open paperless for the rest.
            </p>
          ) : null}
        </>
      ) : (
        <p className="px-1 text-sm text-ink-3">Nothing in paperless has this tag yet.</p>
      )}
    </Section>
  )
}
