'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createFixture, deleteFixture, updateFixture } from '@/lib/fixtures/fixtures'
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

export async function createFixtureAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({ id: (await createFixture(db, scope, actor, input(fd))).id }))
  if (r.error) return r
  redirect(`/fixtures/${r.id}`)
}

export async function updateFixtureAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updateFixture(db, scope, actor, id, input(fd), readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect(`/fixtures/${id}`)
}

export async function deleteFixtureAction(id: string, back: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteFixture(db, scope, actor, id)
  })
  if (r.error) return r
  redirect(back)
}
