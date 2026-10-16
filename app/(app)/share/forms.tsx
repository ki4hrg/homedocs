'use client'

import { useActionState, useState, useTransition } from 'react'
import { CopyButton } from '@/components/CopyButton'
import type { FormAction } from '@/components/ActionForm'
import { buttonClass } from '@/components/ui/Button'
import { Field, Select, SubmitButton, TextInput } from '@/components/ui/Field'
import { PlaceSelect } from '@/components/PlaceSelect'
import type { ActionResult } from '@/lib/web/action'

function randomPin(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000
  return String(n).padStart(6, '0')
}

export function ShareForm({ action, places }: { action: FormAction; places: { id: string; label: string }[] }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, {})
  const [pin, setPin] = useState('')
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Who is it for?">
        <TextInput name="label" placeholder="Sarah – Thanksgiving week" required />
      </Field>
      <Field label="Works for">
        <Select name="days" defaultValue="7">
          {[1, 3, 7, 14, 30].map((d) => (
            <option key={d} value={d}>
              {d === 1 ? '1 day' : `${d} days`}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="PIN (optional)"
        hint="Shows codes and the address away from the house. Send it separately from the link."
      >
        <div className="flex gap-2">
          <TextInput name="pin" inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          <button type="button" className={buttonClass('secondary', 'shrink-0')} onClick={() => setPin(randomPin())}>
            Make one
          </button>
        </div>
      </Field>
      {places.length ? (
        <Field label="Limit to a place" hint="Fixtures with no place always show.">
          <PlaceSelect name="rootSpaceId" options={places} emptyLabel="The whole property" />
        </Field>
      ) : null}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.message ? (
        <div className="flex flex-col gap-2 rounded-control bg-accent-soft p-3">
          <p className="text-sm text-accent">
            Here’s the link — it’s shown only now.{pin ? ` Send the PIN (${pin}) separately.` : ''}
          </p>
          <code className="break-all rounded bg-card px-2 py-1.5 text-xs text-ink">{state.message}</code>
          <CopyButton text={state.message} label="Copy link" />
        </div>
      ) : (
        <SubmitButton pendingText="Making link…">Make link</SubmitButton>
      )}
    </form>
  )
}

export function RevokeLink({ action }: { action: () => Promise<unknown> }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass('danger', 'min-h-9 px-3 text-sm')}
      onClick={() => {
        if (confirm('Turn this link off now? Anyone using it will lose access.')) start(async () => void (await action()))
      }}
    >
      Turn off
    </button>
  )
}
