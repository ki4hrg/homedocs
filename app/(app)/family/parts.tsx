'use client'

import { useActionState, useTransition } from 'react'
import { CopyButton } from '@/components/CopyButton'
import type { FormAction } from '@/components/ActionForm'
import { buttonClass } from '@/components/ui/Button'
import { Field, Select, SubmitButton, TextInput } from '@/components/ui/Field'
import type { ActionResult } from '@/lib/web/action'

export const ROLE_HELP = {
  admin: 'Admin — can change anything, invite people, share the guide',
  member: 'Member — can look things up, add and change them',
  viewer: 'Viewer — can look things up',
} as const

/* A made link is shown once, with a copy button: it is not stored anywhere readable. */
function MadeLink({ url, kind }: { url: string; kind: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-control bg-accent-soft p-3">
      <p className="text-sm text-accent">Send this {kind} link — it works once, for 7 days:</p>
      <code className="break-all rounded bg-card px-2 py-1.5 text-xs text-ink">{url}</code>
      <CopyButton text={url} />
    </div>
  )
}

export function InviteForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, {})
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label="Who is it for?" hint="Just so you can tell links apart.">
        <TextInput name="label" placeholder="Mom" />
      </Field>
      <Field label="What can they do?">
        <Select name="role" defaultValue="member">
          {Object.entries(ROLE_HELP).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.message ? <MadeLink url={state.message} kind="invite" /> : null}
      <SubmitButton pendingText="Making link…">Make invite link</SubmitButton>
    </form>
  )
}

export function ResetLink({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, {})
  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.message ? <MadeLink url={state.message} kind="password reset" /> : null}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {!state.message ? (
        <SubmitButton variant="ghost" className="min-h-9 self-start px-2 text-sm" pendingText="…">
          Make a password reset link
        </SubmitButton>
      ) : null}
    </form>
  )
}

export function RoleSelect({
  role,
  setRole,
  disabled,
}: {
  role: string
  setRole: (r: string) => Promise<ActionResult>
  disabled?: boolean
}) {
  const [pending, start] = useTransition()
  return (
    <Select
      aria-label="Role"
      defaultValue={role}
      disabled={disabled || pending}
      onChange={(e) =>
        start(async () => {
          const r = await setRole(e.target.value)
          if (r.error) {
            alert(r.error)
            location.reload()
          }
        })
      }
      className="w-auto"
    >
      <option value="admin">Admin</option>
      <option value="member">Member</option>
      <option value="viewer">Viewer</option>
    </Select>
  )
}

export function RevokeButton({ action }: { action: () => Promise<unknown> }) {
  const [pending, start] = useTransition()
  return (
    <button type="button" disabled={pending} className={buttonClass('ghost', 'min-h-9 px-2 text-sm')} onClick={() => start(async () => void (await action()))}>
      Cancel link
    </button>
  )
}

