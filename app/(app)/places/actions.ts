'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createSpace, deleteSpace, updateSpace } from '@/lib/places/places'
import { act, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

export async function createPlaceAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    const row = await createSpace(db, scope, actor, {
      name: field(fd, 'name'),
      parentId: field(fd, 'parentId') || null,
      kind: field(fd, 'kind'),
      notes: field(fd, 'notes'),
    })
    return { id: row.id }
  })
  if (r.error) return r
  redirect(`/places/${r.id}`)
}

export async function updatePlaceAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updateSpace(
      db,
      scope,
      actor,
      id,
      { name: field(fd, 'name'), parentId: field(fd, 'parentId') || null, kind: field(fd, 'kind'), notes: field(fd, 'notes') },
      readUpdatedAt(fd),
    )
  })
  if (r.error) return r
  redirect(`/places/${id}`)
}

export async function deletePlaceAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteSpace(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/places')
}
