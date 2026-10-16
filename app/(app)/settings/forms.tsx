'use client'

import { ActionForm, type FormAction } from '@/components/ActionForm'
import { Field, SubmitButton, TextArea, TextInput } from '@/components/ui/Field'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password-policy'

export function NameForm({ action, name }: { action: FormAction; name: string }) {
  return (
    <ActionForm action={action}>
      <Field label="Your name">
        <TextInput name="displayName" defaultValue={name} required />
      </Field>
      <SubmitButton variant="secondary">Save</SubmitButton>
    </ActionForm>
  )
}

export function PasswordForm({ action, hasPassword }: { action: FormAction; hasPassword: boolean }) {
  return (
    <ActionForm action={action} resetOnSuccess>
      {hasPassword ? (
        <Field label="Current password">
          <TextInput name="current" type="password" autoComplete="current-password" required />
        </Field>
      ) : null}
      <Field label="New password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <TextInput name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
      </Field>
      <SubmitButton variant="secondary">{hasPassword ? 'Change password' : 'Set a password'}</SubmitButton>
    </ActionForm>
  )
}

export function HomeForm({
  action,
  initial,
  seenAs,
}: {
  action: FormAction
  initial: { name: string; address: string; homeNetworks: string[]; homeHostname: string }
  seenAs: string | null
}) {
  return (
    <ActionForm action={action}>
      <Field label="Name">
        <TextInput name="name" defaultValue={initial.name} required />
      </Field>
      <Field label="Address" hint="Shown on the house guide, for a housesitter giving directions or calling 911.">
        <TextArea name="address" rows={2} defaultValue={initial.address} />
      </Field>
      <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink-2">Home network</legend>
        <p className="text-sm text-ink-3">
          On the house guide, codes (alarm, lockbox) show without a PIN when the phone is on the home network.
          {seenAs ? (
            <>
              {' '}
              Right now this device is seen as <code className="rounded bg-sunk px-1">{seenAs}</code>.
            </>
          ) : null}
        </p>
        <Field label="Home network ranges" hint="e.g. 192.168.1.0/24 — one per line or comma-separated.">
          <TextArea name="homeNetworks" rows={2} defaultValue={initial.homeNetworks.join('\n')} />
        </Field>
        <Field label="Home internet address name" hint="Your dynamic-DNS name (home.example.com). Its address counts as home too.">
          <TextInput name="homeHostname" defaultValue={initial.homeHostname} />
        </Field>
      </fieldset>
      <SubmitButton variant="secondary">Save</SubmitButton>
    </ActionForm>
  )
}

export function IntegrationForm({
  action,
  system,
  initial,
}: {
  action: FormAction
  system: 'homebox' | 'paperless'
  initial?: { baseUrl: string; lastStatus: string }
}) {
  const homebox = system === 'homebox'
  return (
    <ActionForm action={action}>
      {initial?.lastStatus ? <p className="text-sm text-accent">Connected: {initial.lastStatus}</p> : null}
      <Field label="Address" hint={homebox ? 'Where you open Homebox, e.g. https://homebox.example.com' : 'Where you open paperless, e.g. https://paperless.example.com'}>
        <TextInput name="baseUrl" type="url" inputMode="url" defaultValue={initial?.baseUrl} required />
      </Field>
      <Field
        label={homebox ? 'API key' : 'API token'}
        hint={
          initial
            ? 'Leave blank to keep the saved one.'
            : homebox
              ? 'In Homebox (0.26 or newer): profile → API keys → create. It starts with hb_.'
              : 'In paperless: My Profile → API Auth Token. Best from a paperless user that can only see home documents.'
        }
      >
        <TextInput name="token" type="password" autoComplete="off" required={!initial} />
      </Field>
      <SubmitButton variant="secondary" pendingText="Testing…">
        {initial ? 'Save and test' : 'Connect'}
      </SubmitButton>
    </ActionForm>
  )
}

export function RebuildSearch({ action }: { action: FormAction }) {
  return (
    <ActionForm action={action}>
      <p className="text-sm text-ink-3">After restoring a backup, or if search ever misses something it shouldn’t.</p>
      <SubmitButton variant="secondary" pendingText="Rebuilding…">Rebuild search</SubmitButton>
    </ActionForm>
  )
}
