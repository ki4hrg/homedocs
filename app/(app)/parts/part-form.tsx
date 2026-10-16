'use client'

import { useState } from 'react'
import { ActionForm, type FormAction } from '@/components/ActionForm'
import { Field, Select, SubmitButton, TextArea, TextInput } from '@/components/ui/Field'
import { CATEGORIES, TEMPLATES, type Category } from '@/lib/parts/templates'
import { UseFields } from './use-fields'

export function PartForm({
  action,
  initial,
  owner,
  submit,
}: {
  action: FormAction
  initial?: {
    category?: Category
    name?: string
    fields?: Record<string, string>
    unit?: string
    buyUrl?: string
    notes?: string
    updatedAt?: string
  }
  /** Set when adding from a fixture or place page: the part is linked there too. */
  owner?: { kind: 'fixture' | 'place'; id: string; name: string }
  submit: string
}) {
  const [category, setCategory] = useState<Category>(initial?.category ?? 'bulb')
  const template = TEMPLATES[category]
  return (
    <ActionForm action={action}>
      {initial?.updatedAt ? <input type="hidden" name="updatedAt" value={initial.updatedAt} /> : null}
      {owner ? <input type="hidden" name={owner.kind === 'fixture' ? 'fixtureId' : 'spaceId'} value={owner.id} /> : null}
      <Field label="What kind of part?">
        <Select name="category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {TEMPLATES[c].label}
            </option>
          ))}
        </Select>
      </Field>
      {template.tip ? <p className="rounded-control bg-accent-soft px-3 py-2 text-sm text-accent">{template.tip}</p> : null}
      {template.fields.map((f) => (
        <Field key={`${category}-${f.key}`} label={f.label} hint={f.hint}>
          {f.multiline ? (
            <TextArea name={`f_${f.key}`} defaultValue={initial?.fields?.[f.key]} placeholder={f.placeholder} />
          ) : (
            <TextInput name={`f_${f.key}`} defaultValue={initial?.fields?.[f.key]} placeholder={f.placeholder} />
          )}
        </Field>
      ))}
      <Field label="Name" hint="Leave blank and we’ll make one from the details above.">
        <TextInput name="name" defaultValue={initial?.name} />
      </Field>
      <input type="hidden" name="unit" value={initial?.unit ?? template.unit} />
      <Field label="Where to buy it" hint="A link to the product page, if you have one.">
        <TextInput name="buyUrl" type="url" inputMode="url" defaultValue={initial?.buyUrl} />
      </Field>
      <Field label="Notes">
        <TextArea name="notes" defaultValue={initial?.notes} />
      </Field>
      {owner ? <UseFields key={category} unit={template.unit} finishes={template.finishes} ownerKind={owner.kind} /> : null}
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  )
}
