import type { Attachment } from '@/lib/files/attachments'
import { DeleteButton } from './DeleteButton'
import { Icon } from './ui/icons'

/* A grid of a record's photos and files. `base` is where files are served from. */
export function Photos({
  items,
  remove,
  base = '/api/files',
}: {
  items: Attachment[]
  remove?: (id: string) => Promise<unknown>
  base?: string
}) {
  if (items.length === 0) return null
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((a) => (
        <li key={a.id} className="relative overflow-hidden rounded-card border border-line bg-card">
          <a href={`${base}/${a.sha256}`} target="_blank" rel="noreferrer" className="block">
            {a.mime.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element -- served from our own authenticated route
              <img
                src={`${base}/${a.sha256}?thumb=1`}
                alt={a.caption || 'Photo'}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <span className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-ink-3">
                <Icon name="note" className="h-8 w-8" />
                <span className="px-2 text-center text-xs">{a.originalName || 'Document'}</span>
              </span>
            )}
          </a>
          {a.caption ? <p className="px-2 py-1.5 text-xs text-ink-2">{a.caption}</p> : null}
          {remove ? (
            <div className="absolute right-1 top-1 rounded-full bg-card/90">
              <DeleteButton compact recoverable={false} what="this photo" label="Remove" action={() => remove(a.id)} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
