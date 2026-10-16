'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, TextInput } from '@/components/ui/Field'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password-policy'
import { setupAction, type FormState } from '../actions'

export function SetupForm() {
  const [state, action] = useActionState<FormState, FormData>(setupAction, {})
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="What do you call your home?" hint="Shown at the top of every page. You can change it later.">
        <TextInput name="homeName" placeholder="The Maple Street house" required autoFocus />
      </Field>
      <Field label="Your name">
        <TextInput name="displayName" autoComplete="name" required />
      </Field>
      <Field label="Email">
        <TextInput name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <TextInput name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
      </Field>
      <FormError>{state.error}</FormError>
      <SubmitButton pendingText="Creating…">Create account</SubmitButton>
    </form>
  )
}
