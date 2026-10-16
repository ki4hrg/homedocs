'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createThing, deleteThing, updateThing } from '@/lib/things/things'
import { act, checkbox, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

function input(fd: FormData) {
  return {
    name: field(fd, 'name'),
    spaceId: field(fd, 'spaceId') || null,
    category: field(fd, 'category'),
    notes: field(fd, 'notes'),
    inGuide: checkbox(fd, 'inGuide'),
    guideNote: field(fd, 'guideNote'),
  }
}

export async function createThingAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({ id: (await createThing(db, scope, actor, input(fd))).id }))
  if (r.error) return r
  redirect(`/things/${r.id}`)
}

export async function updateThingAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updateThing(db, scope, actor, id, input(fd), readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect(`/things/${id}`)
}

export async function deleteThingAction(id: string, back: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteThing(db, scope, actor, id)
  })
  if (r.error) return r
  redirect(back)
}
