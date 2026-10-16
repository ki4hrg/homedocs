'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createPerson, deletePerson, updatePerson } from '@/lib/people/people'
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

export async function createPersonAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({ id: (await createPerson(db, scope, actor, input(fd))).id }))
  if (r.error) return r
  redirect(`/people/${r.id}`)
}

export async function updatePersonAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updatePerson(db, scope, actor, id, input(fd), readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect(`/people/${id}`)
}

export async function deletePersonAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deletePerson(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/people')
}
