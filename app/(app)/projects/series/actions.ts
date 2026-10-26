'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { addSeriesItem, createSeries, deleteSeries, removeSeriesItem, updateSeries } from '@/lib/projects/series'
import { act, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

function input(fd: FormData) {
  return {
    title: field(fd, 'title'),
    howTo: field(fd, 'howTo'),
    contactId: field(fd, 'contactId') || null,
    spaceIds: fd.getAll('spaceIds').map(String).filter(Boolean),
  }
}

export async function createSeriesAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({ id: (await createSeries(db, scope, actor, input(fd))).id }))
  if (r.error) return r
  redirect(`/projects/series/${r.id}`)
}

export async function saveSeriesAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updateSeries(db, scope, actor, id, input(fd), readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect(`/projects/series/${id}`)
}

export async function deleteSeriesAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteSeries(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/projects')
}

export async function addSeriesItemAction(seriesId: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await addSeriesItem(db, scope, actor, seriesId, { text: field(fd, 'text'), spaceId: field(fd, 'spaceId') || null })
  })
}

export async function removeSeriesItemAction(id: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await removeSeriesItem(db, scope, actor, id)
  })
}
