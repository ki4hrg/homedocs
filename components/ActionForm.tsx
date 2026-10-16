'use client'

/*
 * A form bound to a server action, with the refusal shown inline.
 *
 * useActionState keeps it working before hydration: without JS the browser
 * posts it and the page re-renders with the same state. Actions that create
 * something redirect on success, so most forms never see `ok`; the ones that
 * stay put (inline edits, toggles) can reset or show a short confirmation.
 */

import { useActionState, useEffect, useRef, type ReactNode } from 'react'
import { FormError } from './ui/Field'
import type { ActionResult } from '@/lib/web/action'

export type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>

export function ActionForm({
  action,
  children,
  className = 'flex flex-col gap-4',
  resetOnSuccess = false,
  successText,
  onSuccess,
}: {
  action: FormAction
  children: ReactNode
  className?: string
  resetOnSuccess?: boolean
  successText?: string
  onSuccess?: (result: ActionResult) => void
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, {})
  const ref = useRef<HTMLFormElement>(null)
  const seen = useRef<ActionResult | null>(null)

  useEffect(() => {
    if (!state.ok || seen.current === state) return
    seen.current = state
    if (resetOnSuccess) ref.current?.reset()
    onSuccess?.(state)
  }, [state, resetOnSuccess, onSuccess])

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <FormError>{state.error}</FormError>
      {state.ok && (state.message || successText) ? (
        <p role="status" className="text-sm text-accent">
          {state.message ?? successText}
        </p>
      ) : null}
    </form>
  )
}
