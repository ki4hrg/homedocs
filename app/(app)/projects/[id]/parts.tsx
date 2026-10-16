'use client'

import { useState, useTransition } from 'react'
import { ActionForm, type FormAction } from '@/components/ActionForm'
import { DeleteButton } from '@/components/DeleteButton'
import { buttonClass } from '@/components/ui/Button'
import { Field, Select, SubmitButton, TextArea, TextInput } from '@/components/ui/Field'
import { Icon } from '@/components/ui/icons'

const FLOW = [
  ['idea', 'Idea'],
  ['planning', 'Planning'],
  ['quoted', 'Quotes'],
  ['scheduled', 'Scheduled'],
  ['in_progress', 'Doing'],
  ['done', 'Done'],
] as const

/* The status as a row of steps; tapping one moves the project there. */
export function StatusStepper({
  status,
  setStatus,
  canEdit,
}: {
  status: string
  setStatus: (s: string) => Promise<unknown>
  canEdit: boolean
}) {
  const [pending, start] = useTransition()
  const index = FLOW.findIndex(([s]) => s === status)
  return (
    <ol className="grid grid-cols-6 gap-1" aria-label="Status">
      {FLOW.map(([s, label], i) => {
        const current = s === status
        const past = index >= 0 && i < index
        return (
          <li key={s}>
            <button
              type="button"
              disabled={!canEdit || pending || current}
              aria-current={current ? 'step' : undefined}
              onClick={() => start(async () => void (await setStatus(s)))}
              className={`flex w-full flex-col items-center gap-1 rounded-control px-0.5 py-2 text-[10.5px] font-medium leading-tight ${
                current ? 'bg-accent text-accent-ink' : past ? 'bg-accent-soft text-accent' : 'bg-sunk text-ink-3'
              } disabled:cursor-default`}
            >
              {past ? <Icon name="check" className="h-4 w-4" /> : <span className="h-4 w-4 text-center">{i + 1}</span>}
              {label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function Checklist({
  items,
  toggle,
  remove,
  add,
  places,
  quotes,
  canEdit,
}: {
  items: { id: string; text: string; done: boolean; spaceName: string | null; quoteLabel: string | null }[]
  toggle: (id: string, done: boolean) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
  add: FormAction
  places: { id: string; label: string }[]
  quotes: { id: string; label: string }[]
  canEdit: boolean
}) {
  const [, start] = useTransition()
  const [details, setDetails] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      {items.length ? (
        <ul className="divide-y divide-line rounded-card border border-line bg-card">
          {items.map((item) => (
            <li key={item.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <input
                type="checkbox"
                checked={item.done}
                disabled={!canEdit}
                aria-label={item.text}
                onChange={(e) => start(async () => void (await toggle(item.id, e.target.checked)))}
                className="h-6 w-6 shrink-0 accent-[var(--color-accent)]"
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] ${item.done ? 'text-ink-3 line-through' : 'text-ink'}`}>{item.text}</span>
                {item.spaceName || item.quoteLabel ? (
                  <span className="block text-xs text-ink-3">
                    {[item.spaceName, item.quoteLabel ? `in ${item.quoteLabel}’s quote` : ''].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </span>
              {canEdit ? <DeleteButton compact what={`“${item.text}”`} label="Remove" action={() => remove(item.id)} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canEdit ? (
        <ActionForm action={add} resetOnSuccess className="flex flex-col gap-2">
          <div className="flex gap-2">
            <TextInput name="text" placeholder="Add a to-do" aria-label="New to-do" required />
            <SubmitButton pendingText="…">Add</SubmitButton>
          </div>
          {details ? (
            <div className="grid grid-cols-2 gap-2">
              <Select name="spaceId" aria-label="Where" defaultValue="">
                <option value="">Where?</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Select name="quoteId" aria-label="Covered by quote" defaultValue="">
                <option value="">In a quote?</option>
                {quotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <button type="button" className="self-start text-sm text-accent" onClick={() => setDetails(true)}>
              + where, and which quote covers it
            </button>
          )}
        </ActionForm>
      ) : null}
    </div>
  )
}

export function QuoteForm({ add, contacts }: { add: FormAction; contacts: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" className={buttonClass('secondary')} onClick={() => setOpen(true)}>
        Add a quote
      </button>
    )
  }
  return (
    <ActionForm action={add} resetOnSuccess onSuccess={() => setOpen(false)}>
      <Field label="From" hint={contacts.length ? undefined : 'Add them under Contacts first.'}>
        <Select name="contactId" defaultValue="">
          <option value="">—</option>
          {contacts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          <TextInput name="amount" inputMode="decimal" placeholder="$" />
        </Field>
        <Field label="Date">
          <TextInput name="receivedOn" type="date" />
        </Field>
      </div>
      <Field label="What’s included">
        <TextArea name="notes" />
      </Field>
      <div className="flex gap-2">
        <SubmitButton>Add quote</SubmitButton>
        <button type="button" className={buttonClass('ghost')} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </ActionForm>
  )
}

export function QuoteButtons({
  status,
  setStatus,
  remove,
}: {
  status: string
  setStatus: (s: 'pending' | 'accepted' | 'declined') => Promise<unknown>
  remove: () => Promise<unknown>
}) {
  const [pending, start] = useTransition()
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'accepted' ? (
        <button type="button" disabled={pending} className={buttonClass('primary', 'min-h-9 px-3 text-sm')} onClick={() => start(async () => void (await setStatus('accepted')))}>
          Accept
        </button>
      ) : null}
      {status === 'pending' ? (
        <button type="button" disabled={pending} className={buttonClass('secondary', 'min-h-9 px-3 text-sm')} onClick={() => start(async () => void (await setStatus('declined')))}>
          Decline
        </button>
      ) : (
        <button type="button" disabled={pending} className={buttonClass('ghost', 'min-h-9 px-3 text-sm')} onClick={() => start(async () => void (await setStatus('pending')))}>
          Undo
        </button>
      )}
      <DeleteButton compact what="this quote" recoverable={false} label="Remove" action={remove} />
    </div>
  )
}
