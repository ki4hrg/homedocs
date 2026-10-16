'use client'

import { useTransition } from 'react'
import { buttonClass } from '@/components/ui/Button'
import { restoreAction } from './actions'

export function RestoreButton({ kind, id }: { kind: string; id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass('secondary', 'min-h-9 px-3 text-sm')}
      onClick={() =>
        start(async () => {
          const r = await restoreAction(kind, id)
          if (r.error) alert(r.error)
        })
      }
    >
      {pending ? 'Restoring…' : 'Restore'}
    </button>
  )
}
