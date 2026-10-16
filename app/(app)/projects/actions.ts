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
import { act, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

function input(fd: FormData) {
  return {
    title: field(fd, 'title'),
    status: field(fd, 'status') || undefined,
    priority: field(fd, 'priority') || undefined,
    targetDate: field(fd, 'targetDate'),
    summary: field(fd, 'summary'),
    spaceIds: fd.getAll('spaceIds').map(String).filter(Boolean),
  }
}

export async function createProjectAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({ id: (await createProject(db, scope, actor, input(fd))).id }))
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
    })
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
