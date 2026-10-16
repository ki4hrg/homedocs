import Link from 'next/link'
import { db } from '@/lib/db'
import { homeboxItemsHere, listIntegrations } from '@/lib/integrations/integrations'
import { addFixtureFromHomeboxAction, linkPickedAction } from '@/lib/web/link-actions'
import { viewer } from '@/lib/web/context'
import { AddFromHomebox } from './AddFromHomebox'
import { LinkPicker } from './LinkPicker'
import { List, Section } from './ui/Card'
import { Icon } from './ui/icons'

/*
 * What Homebox has stored in this place's Homebox location. Each item already
 * linked to a fixture shows that fixture; the rest can be added with one tap
 * (as a fixture in this place, linked back to the item). Nothing shows when
 * Homebox isn't connected.
 */
export async function HomeboxHere({ spaceId, placeName, canEdit }: { spaceId: string; placeName: string; canEdit: boolean }) {
  const { scope } = await viewer()
  const connected = (await listIntegrations(db, scope)).some((i) => i.system === 'homebox')
  if (!connected) return null
  const here = await homeboxItemsHere(db, scope, spaceId)

  if (here.state === 'none') {
    if (!canEdit) return null
    return (
      <Section title="In Homebox">
        <div className="flex flex-col gap-2">
          <p className="px-1 text-sm text-ink-3">
            Link this place to its Homebox location to see what’s kept here, and add any of it in one tap.
          </p>
          <LinkPicker
            systems={[{ system: 'homebox', name: 'Homebox', locations: true, label: 'Pick the Homebox location' }]}
            initialQuery={placeName}
            link={linkPickedAction.bind(null, `space:${spaceId}`)}
          />
        </div>
      </Section>
    )
  }

  const open = (
    <a href={here.location.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-accent">
      Open <Icon name="external" className="h-4 w-4" />
    </a>
  )

  if (here.state === 'error') {
    return (
      <Section title={`In Homebox · ${here.location.title}`} action={open}>
        <p className="px-1 text-sm text-warn">{here.message}</p>
      </Section>
    )
  }

  return (
    <Section title={`In Homebox · ${here.location.title}`} action={open}>
      {here.items.length ? (
        <>
          <List>
            {here.items.map((item) => (
              <li key={item.externalId} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{item.title}</span>
                  {item.fixture ? (
                    <Link href={`/fixtures/${item.fixture.id}`} className="block truncate text-sm text-accent">
                      Fixture: {item.fixture.name}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm text-ink-3">Not in homedocs yet</span>
                  )}
                </span>
                {!item.fixture && canEdit ? (
                  <AddFromHomebox name={item.title} add={addFixtureFromHomeboxAction.bind(null, spaceId, item.externalId)} />
                ) : null}
              </li>
            ))}
          </List>
          {here.total > here.items.length ? (
            <p className="mt-2 px-1 text-xs text-ink-3">
              Showing {here.items.length} of {here.total}. Open Homebox for the rest.
            </p>
          ) : null}
        </>
      ) : (
        <p className="px-1 text-sm text-ink-3">Nothing is stored in this Homebox location.</p>
      )}
    </Section>
  )
}
