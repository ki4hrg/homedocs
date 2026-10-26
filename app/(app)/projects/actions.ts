'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import {
  addItem,
  addQuote,
  createProject,
  deleteProject,
  removeItem,
  removeQuote,
  setProjectStatus,
  updateItem,
  updateProject,
  updateQuote,
  type Quote,
} from '@/lib/projects/projects'
import {
  addMaterial,
  copySeriesLineToProject,
  removeMaterial,
  updateMaterial,
  updateSeriesFromProject,
  type MaterialOwner,
} from '@/lib/projects/materials'
import { appendLessonToHowTo, createSeriesFromProject } from '@/lib/projects/series'
import { act, checkbox, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

function input(fd: FormData) {
  return {
    title: field(fd, 'title'),
    status: field(fd, 'status') || undefined,
    priority: field(fd, 'priority') || undefined,
    targetDate: field(fd, 'targetDate'),
    summary: field(fd, 'summary'),
    spaceIds: fd.getAll('spaceIds').map(String).filter(Boolean),
    contactId: field(fd, 'contactId') || null,
  }
}

function date(raw: string): Date | undefined {
  const d = new Date(raw)
  return raw && !Number.isNaN(d.getTime()) ? d : undefined
}

export async function createProjectAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({
    id: (await createProject(db, scope, actor, { ...input(fd), seriesId: field(fd, 'seriesId') || null })).id,
  }))
  if (r.error) return r
  redirect(`/projects/${r.id}`)
}

export async function updateProjectAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updateProject(db, scope, actor, id, input(fd), readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect(`/projects/${id}`)
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteProject(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/projects')
}

export async function setStatusAction(id: string, status: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await setProjectStatus(db, scope, actor, id, status)
  })
}

export async function addItemAction(projectId: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await addItem(db, scope, actor, projectId, {
      text: field(fd, 'text'),
      spaceId: field(fd, 'spaceId') || null,
      quoteId: field(fd, 'quoteId') || null,
      oneOff: checkbox(fd, 'oneOff'),
    })
  })
}

export async function setItemOneOffAction(id: string, oneOff: boolean): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await updateItem(db, scope, actor, id, { oneOff })
  })
}

export async function toggleItemAction(id: string, done: boolean): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await updateItem(db, scope, actor, id, { done })
  })
}

export async function removeItemAction(id: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await removeItem(db, scope, actor, id)
  })
}

export async function addQuoteAction(projectId: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await addQuote(db, scope, actor, projectId, {
      contactId: field(fd, 'contactId') || null,
      amount: field(fd, 'amount'),
      receivedOn: field(fd, 'receivedOn'),
      notes: field(fd, 'notes'),
    })
  })
}

export async function setQuoteStatusAction(id: string, status: Quote['status']): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await updateQuote(db, scope, actor, id, { status })
  })
}

export async function removeQuoteAction(id: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await removeQuote(db, scope, actor, id)
  })
}

// ─── materials ───────────────────────────────────────────────────────────────

function materialInput(fd: FormData) {
  return {
    name: field(fd, 'name'),
    supplyId: field(fd, 'supplyId') || null,
    quantity: field(fd, 'quantity'),
    unit: field(fd, 'unit'),
    spaceId: field(fd, 'spaceId') || null,
    notes: field(fd, 'notes'),
  }
}

export async function addMaterialAction(owner: 'project' | 'series', ownerId: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const where: MaterialOwner = owner === 'project' ? { projectId: ownerId } : { seriesId: ownerId }
  return act(async ({ scope, actor }) => {
    await addMaterial(db, scope, actor, where, { ...materialInput(fd), oneOff: owner === 'project' && checkbox(fd, 'oneOff') })
  })
}

export async function updateMaterialAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await updateMaterial(db, scope, actor, id, materialInput(fd))
  })
}

export async function setMaterialOneOffAction(id: string, oneOff: boolean): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await updateMaterial(db, scope, actor, id, { oneOff })
  })
}

export async function removeMaterialAction(id: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await removeMaterial(db, scope, actor, id)
  })
}

// ─── the project's series ────────────────────────────────────────────────────

/** Runs only after the person confirmed the listed changes; `seenAt` is the series as that list showed it. */
export async function updateSeriesAction(
  projectId: string,
  pick: 'all' | { materials?: string[]; items?: string[] },
  seenAt: string,
): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    const { applied } = await updateSeriesFromProject(db, scope, actor, projectId, pick, date(seenAt))
    return { message: applied === 1 ? 'Series updated.' : `Series updated (${applied} changes).` }
  })
}

/** One row: a changed or added project line, or a series line missing here (which removes it from the series). */
export async function sendLineToSeriesAction(projectId: string, kind: 'material' | 'item', seenAt: string, rowId: string) {
  return updateSeriesAction(projectId, kind === 'material' ? { materials: [rowId] } : { items: [rowId] }, seenAt)
}

export async function copySeriesLineAction(projectId: string, kind: 'material' | 'item', seriesRowId: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await copySeriesLineToProject(db, scope, actor, projectId, kind === 'material' ? { material: seriesRowId } : { item: seriesRowId })
  })
}

export async function addLessonToHowToAction(noteId: string, seenAt: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await appendLessonToHowTo(db, scope, actor, noteId, date(seenAt))
  })
}

export async function makeSeriesAction(projectId: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({ id: (await createSeriesFromProject(db, scope, actor, projectId)).id }))
  if (r.error) return r
  redirect(`/projects/series/${r.id}`)
}
