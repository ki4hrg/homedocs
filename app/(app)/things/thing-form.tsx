'use client'

import { ActionForm, type FormAction } from '@/components/ActionForm'
import { PlaceSelect } from '@/components/PlaceSelect'
import { Checkbox, Field, SubmitButton, TextArea, TextInput } from '@/components/ui/Field'
import { useState } from 'react'

export function ThingForm({
  action,
  places,
  categories,
  initial,
  submit,
}: {
  action: FormAction
  places: { id: string; label: string }[]
  categories: string[]
  initial?: {
    name?: string
    spaceId?: string | null
    category?: string
    notes?: string
    inGuide?: boolean
    guideNote?: string
    updatedAt?: string
  }
  submit: string
}) {
  const [inGuide, setInGuide] = useState(initial?.inGuide ?? false)
  return (
    <ActionForm action={action}>
      {initial?.updatedAt ? <input type="hidden" name="updatedAt" value={initial.updatedAt} /> : null}
      <Field label="Name">
        <TextInput name="name" defaultValue={initial?.name} placeholder="Overhead light, Main water shutoff" required autoFocus={!initial?.name} />
      </Field>
      <Field label="Where is it?">
        <PlaceSelect name="spaceId" defaultValue={initial?.spaceId ?? ''} options={places} />
      </Field>
      <Field label="Kind of thing" hint="Pick one or type your own.">
        <TextInput name="category" list="thing-categories" defaultValue={initial?.category} />
        <datalist id="thing-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Notes" hint="Quirks, how it works, what to watch for.">
        <TextArea name="notes" defaultValue={initial?.notes} />
      </Field>
      <Checkbox
        name="inGuide"
        label="Show on the house guide"
        hint="For shutoffs, the breaker panel, the water heater — what a housesitter might need in a hurry."
        checked={inGuide}
        onChange={(e) => setInGuide(e.target.checked)}
      />
      {inGuide ? (
        <Field label="What should a housesitter know?" hint="e.g. “Turn the red handle a quarter turn to shut off all water.”">
          <TextArea name="guideNote" defaultValue={initial?.guideNote} />
        </Field>
      ) : (
        <input type="hidden" name="guideNote" value={initial?.guideNote ?? ''} />
      )}
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  )
}
