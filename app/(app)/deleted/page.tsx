import { EmptyState, List } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { roleAtLeast } from '@/lib/core/types'
import { db } from '@/lib/db'
import { listDeleted } from '@/lib/trash/trash'
import { timeAgo } from '@/lib/web/format'
import { viewer } from '@/lib/web/context'
import { RestoreButton } from './restore-button'

export const metadata = { title: 'Recently deleted' }

const LABEL = { place: 'Place', thing: 'Thing', part: 'Part', note: 'Note', person: 'Person', project: 'Project' } as const

export default async function DeletedPage() {
  const { scope, user } = await viewer()
  const rows = await listDeleted(db, scope)
  const canEdit = roleAtLeast(user.role, 'member')
  return (
    <>
      <PageHeader title="Recently deleted" subtitle="The last 90 days. Bring anything back." back={{ href: '/more', label: 'More' }} />
      {rows.length ? (
        <List>
          {rows.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">{r.title}</span>
                <span className="block text-sm text-ink-3">
                  {LABEL[r.kind]} · deleted {timeAgo(r.deletedAt)}
                  {r.by ? ` by ${r.by}` : ''}
                </span>
              </span>
              {canEdit ? <RestoreButton kind={r.kind} id={r.id} /> : null}
            </li>
          ))}
        </List>
      ) : (
        <EmptyState>Nothing has been deleted.</EmptyState>
      )}
    </>
  )
}
