'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createSystem, deleteSystem, updateSystem } from '@/lib/systems/systems'
import { act, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

function input(fd: FormData) {
  const custom = field(fd, 'customTrades').split(',')
  return {
    name: field(fd, 'name'),
    icon: field(fd, 'icon'),
    trades: [...fd.getAll('trades').map(String), ...custom],
    notes: field(fd, 'notes'),
  }
}

export async function createSystemAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({ id: (await createSystem(db, scope, actor, input(fd))).id }))
  if (r.error) return r
  redirect(`/systems/${r.id}`)
}

export async function updateSystemAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updateSystem(db, scope, actor, id, input(fd), readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect(`/systems/${id}`)
}

export async function deleteSystemAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteSystem(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/systems')
}
