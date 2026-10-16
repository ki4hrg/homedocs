'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createContact, deleteContact, updateContact } from '@/lib/contacts/contacts'
import { act, checkbox, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

function methods(fd: FormData, prefix: string) {
  const labels = fd.getAll(`${prefix}Label`).map(String)
  return fd
    .getAll(`${prefix}Value`)
    .map((v, i) => ({ label: labels[i] ?? '', value: String(v) }))
}

function input(fd: FormData) {
  const custom = field(fd, 'customTrades')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return {
    name: field(fd, 'name'),
    company: field(fd, 'company'),
    phones: methods(fd, 'phone'),
    emails: methods(fd, 'email'),
    website: field(fd, 'website'),
    notes: field(fd, 'notes'),
    accountNumber: field(fd, 'accountNumber'),
    inGuide: checkbox(fd, 'inGuide'),
    trades: [...fd.getAll('trades').map(String), ...custom],
    preferred: fd.getAll('preferred').map(String).concat(checkbox(fd, 'preferCustom') ? custom : []),
  }
}

export async function createContactAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({ id: (await createContact(db, scope, actor, input(fd))).id }))
  if (r.error) return r
  redirect(`/contacts/${r.id}`)
}

export async function updateContactAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updateContact(db, scope, actor, id, input(fd), readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect(`/contacts/${id}`)
}

export async function deleteContactAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteContact(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/contacts')
}
