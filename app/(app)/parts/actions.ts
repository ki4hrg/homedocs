'use server'

import { redirect } from 'next/navigation'
import { ValidationError } from '@/lib/core/types'
import { db } from '@/lib/db'
import { addUse, createPart, deletePart, removeUse, updatePart, updateUse } from '@/lib/parts/parts'
import { TEMPLATES, isCategory } from '@/lib/parts/templates'
import { act, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

function partInput(fd: FormData) {
  const category = field(fd, 'category')
  const fields: Record<string, string> = {}
  if (isCategory(category)) for (const f of TEMPLATES[category].fields) fields[f.key] = field(fd, `f_${f.key}`)
  const [unit = '', ...extraUnits] = field(fd, 'units').split(',').map((u) => u.trim())
  return { category, name: field(fd, 'name'), fields, unit, extraUnits, buyUrl: field(fd, 'buyUrl'), notes: field(fd, 'notes') }
}

function useInput(fd: FormData) {
  return {
    surface: field(fd, 'surface'),
    finish: field(fd, 'finish'),
    quantity: field(fd, 'quantity'),
    unit: field(fd, 'useUnit'),
    quantityNeeded: field(fd, 'quantityNeeded'),
    notes: field(fd, 'useNotes'),
  }
}

/** Where to go after: back to the fixture or place the part was added from, or the part. */
function after(fd: FormData, partId: string) {
  const fixtureId = field(fd, 'fixtureId')
  const spaceId = field(fd, 'spaceId')
  if (fixtureId) return `/fixtures/${fixtureId}`
  if (spaceId) return `/places/${spaceId}`
  return `/parts/${partId}`
}

export async function createPartAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    const part = await createPart(db, scope, actor, partInput(fd))
    const fixtureId = field(fd, 'fixtureId') || null
    const spaceId = field(fd, 'spaceId') || null
    if (fixtureId || spaceId) await addUse(db, scope, actor, { supplyId: part.id, fixtureId, spaceId, ...useInput(fd) })
    return { id: part.id }
  })
  if (r.error) return r
  redirect(after(fd, r.id!))
}

export async function updatePartAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updatePart(db, scope, actor, id, partInput(fd), readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect(`/parts/${id}`)
}

export async function deletePartAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deletePart(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/parts')
}

/** Link an existing part to a fixture or place. */
export async function addUseAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const supplyId = field(fd, 'supplyId')
  const r = await act(async ({ scope, actor }) => {
    if (!supplyId) throw new ValidationError('Pick a part.')
    await addUse(db, scope, actor, {
      supplyId,
      fixtureId: field(fd, 'fixtureId') || null,
      spaceId: field(fd, 'spaceId') || null,
      ...useInput(fd),
    })
  })
  if (r.error) return r
  redirect(after(fd, supplyId))
}

export async function updateUseAction(id: string, back: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updateUse(db, scope, actor, id, useInput(fd))
  })
  if (r.error) return r
  redirect(back)
}

export async function removeUseAction(id: string, back: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await removeUse(db, scope, actor, id)
  })
  if (r.error) return r
  redirect(back)
}
