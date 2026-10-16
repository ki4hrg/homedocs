'use client'

import { useState } from 'react'
import { ActionForm, type FormAction } from '@/components/ActionForm'
import { Checkbox, Field, SubmitButton, TextArea, TextInput } from '@/components/ui/Field'

type Method = { label: string; value: string }

function Methods({ prefix, label, type, initial, placeholder }: { prefix: string; label: string; type: string; initial: Method[]; placeholder: string }) {
  const rows = [...initial, { label: '', value: '' }, { label: '', value: '' }].slice(0, Math.max(2, initial.length + 1))
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium text-ink-2">{label}</legend>
      {rows.map((m, i) => (
        <div key={i} className="grid grid-cols-[7rem_1fr] gap-2">
          <TextInput name={`${prefix}Label`} defaultValue={m.label} placeholder={i === 0 ? 'Office' : 'Cell'} aria-label={`${label} ${i + 1} label`} />
          <TextInput name={`${prefix}Value`} type={type} defaultValue={m.value} placeholder={placeholder} aria-label={`${label} ${i + 1}`} />
        </div>
      ))}
    </fieldset>
  )
}

export function PersonForm({
  action,
  trades: common,
  initial,
  submit,
}: {
  action: FormAction
  trades: string[]
  initial?: {
    name?: string
    company?: string
    phones?: Method[]
    emails?: Method[]
    website?: string
    notes?: string
    accountNumber?: string
    inGuide?: boolean
    trades?: { trade: string; preferred: boolean }[]
    updatedAt?: string
  }
  submit: string
}) {
  const initialTrades = initial?.trades ?? []
  const [chosen, setChosen] = useState<string[]>(initialTrades.map((t) => t.trade))
  const known = [...new Set([...common, ...initialTrades.map((t) => t.trade)])]
  const preferred = new Set(initialTrades.filter((t) => t.preferred).map((t) => t.trade))

  return (
    <ActionForm action={action}>
      {initial?.updatedAt ? <input type="hidden" name="updatedAt" value={initial.updatedAt} /> : null}
      <Field label="Name">
        <TextInput name="name" defaultValue={initial?.name} placeholder="Mike Rivera, or Ace Plumbing" required autoFocus={!initial?.name} />
      </Field>
      <Field label="Company">
        <TextInput name="company" defaultValue={initial?.company} />
      </Field>
      <Methods prefix="phone" label="Phone" type="tel" initial={initial?.phones ?? []} placeholder="(555) 123-4567" />
      <Methods prefix="email" label="Email" type="email" initial={initial?.emails ?? []} placeholder="name@example.com" />
      <Field label="Website">
        <TextInput name="website" type="url" inputMode="url" defaultValue={initial?.website} />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-2">What do they do?</legend>
        <div className="flex flex-wrap gap-2">
          {known.map((t) => {
            const on = chosen.includes(t)
            return (
              <label
                key={t}
                className={`inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3 text-sm capitalize ${
                  on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-card text-ink-2'
                }`}
              >
                <input
                  type="checkbox"
                  name="trades"
                  value={t}
                  checked={on}
                  onChange={(e) => setChosen((c) => (e.target.checked ? [...c, t] : c.filter((x) => x !== t)))}
                  className="sr-only"
                />
                {t}
              </label>
            )
          })}
        </div>
        <TextInput name="customTrades" className="mt-2" placeholder="Something else? e.g. chimney sweep" aria-label="Other trades" />
      </fieldset>

      {chosen.length ? (
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-ink-2">Our go-to for…</legend>
          <p className="mb-1 text-xs text-ink-3">The one we call first. Shown on Home and the house guide.</p>
          {chosen.map((t) => (
            <Checkbox key={t} name="preferred" value={t} label={`Our ${t}`} defaultChecked={preferred.has(t)} />
          ))}
        </fieldset>
      ) : null}

      <Checkbox
        name="inGuide"
        label="Show on the house guide"
        hint="For people a housesitter might need to call."
        defaultChecked={initial?.inGuide}
      />
      <Field label="Account number" hint="For utilities and services. Never shown on the house guide.">
        <TextInput name="accountNumber" defaultValue={initial?.accountNumber} />
      </Field>
      <Field label="Notes" hint="What they did for us, how much it cost, whether we'd use them again.">
        <TextArea name="notes" defaultValue={initial?.notes} />
      </Field>
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  )
}
