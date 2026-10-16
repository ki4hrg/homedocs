'use client'

import { useTransition } from 'react'
import { buttonClass, type Variant } from './ui/Button'
import { Icon } from './ui/icons'

/* Asks first, then runs the action. Deletes are recoverable from "Recently deleted". */
export function DeleteButton({
  action,
  what,
  label = 'Delete',
  variant = 'danger',
  compact = false,
  recoverable = true,
}: {
  action: () => Promise<unknown>
  what: string
  label?: string
  variant?: Variant
  compact?: boolean
  /** False when there is no "Recently deleted" to bring it back from. */
  recoverable?: boolean
}) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={compact ? `${label} ${what}` : undefined}
      className={compact ? 'flex h-10 w-10 items-center justify-center rounded-full text-ink-3 hover:bg-sunk hover:text-danger' : buttonClass(variant)}
      onClick={() => {
        const note = recoverable ? ' You can bring it back from “Recently deleted”.' : ''
        if (!confirm(`${label} ${what}?${note}`)) return
        start(async () => {
          const result = (await action()) as { error?: string } | undefined
          if (result?.error) alert(result.error)
        })
      }}
    >
      {compact ? <Icon name="trash" className="h-[18px] w-[18px]" /> : pending ? 'Deleting…' : label}
    </button>
  )
}
