'use client'

import { useState } from 'react'
import { ActionForm, type FormAction } from '@/components/ActionForm'
import { Icon } from '@/components/ui/icons'
import { Field, SubmitButton, TextArea, TextInput } from '@/components/ui/Field'
import { SYSTEM_ICONS, type SystemIcon } from '@/lib/systems/seeds'

const ICON_LABEL: Record<SystemIcon, string> = {
  water: 'Water',
  bolt: 'Electric',
  climate: 'Heating & cooling',
  flame: 'Gas / fire',
  drain: 'Drain',
  leaf: 'Yard',
  shield: 'Safety',
  wifi: 'Network',
  system: 'Other',
}

export function SystemForm({
  action,
  trades,
  initial,
  submit,
}: {
  action: FormAction
  /** Every trade a contact can have, so "who to call" can be ticked rather than typed. */
  trades: string[]
  initial?: { name?: string; icon?: string; trades?: string[]; notes?: string; updatedAt?: string }
  submit: string
}) {
  const [icon, setIcon] = useState(initial?.icon ?? 'system')
  const [chosen, setChosen] = useState<string[]>(initial?.trades ?? [])
  const shown = [...new Set([...trades, ...chosen])]
  return (
    <ActionForm action={action}>
      {initial?.updatedAt ? <input type="hidden" name="updatedAt" value={initial.updatedAt} /> : null}
      <Field label="Name">
        <TextInput name="name" defaultValue={initial?.name} placeholder="Pool, Solar, Water softener" required autoFocus={!initial?.name} />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-2">Icon</legend>
        <div className="flex flex-wrap gap-2">
          {SYSTEM_ICONS.map((i) => (
            <label
              key={i}
              className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border ${
                icon === i ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-card text-ink-2'
              }`}
            >
              <input type="radio" name="icon" value={i} checked={icon === i} onChange={() => setIcon(i)} className="sr-only" aria-label={ICON_LABEL[i]} />
              <Icon name={i} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-2">Who to call for it</legend>
        <p className="mb-2 text-xs text-ink-3">The system page shows your preferred contact for each one you tick.</p>
        <div className="flex flex-wrap gap-2">
          {shown.map((t) => {
            const on = chosen.includes(t)
            return (
              <label
                key={t}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-sm capitalize ${
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
        <TextInput name="customTrades" className="mt-2" placeholder="Something else? e.g. pool service, solar" aria-label="Other trades" />
      </fieldset>

      <Field label="Notes" hint="How it works, its quirks, what to check first.">
        <TextArea name="notes" defaultValue={initial?.notes} />
      </Field>
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  )
}
