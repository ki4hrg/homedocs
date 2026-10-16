'use client'

import { useState } from 'react'
import { ActionForm, type FormAction } from './ActionForm'
import { buttonClass } from './ui/Button'
import { Field, SubmitButton, TextInput } from './ui/Field'
import { Icon } from './ui/icons'

export function LinkForm({ action }: { action: FormAction }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" className={buttonClass('secondary')} onClick={() => setOpen(true)}>
        <Icon name="link" />
        Link from Homebox, paperless…
      </button>
    )
  }
  return (
    <ActionForm action={action} resetOnSuccess onSuccess={() => setOpen(false)}>
      <Field label="Address" hint="Open the item or document in the other app and copy the address bar.">
        <TextInput name="url" type="url" inputMode="url" placeholder="https://homebox.example/item/…" required autoFocus />
      </Field>
      <Field label="Label (optional)" hint="e.g. “Manual”, “Purchase receipt”, “Water heater in Homebox”">
        <TextInput name="title" />
      </Field>
      <div className="flex gap-2">
        <SubmitButton>Link</SubmitButton>
        <button type="button" className={buttonClass('ghost')} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </ActionForm>
  )
}
