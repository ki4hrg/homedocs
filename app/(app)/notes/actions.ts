'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { supplyUses } from '@/lib/db/schema'
import { createNote, deleteNote, getNote, suggestedNeed, updateNote } from '@/lib/notes/notes'
import { updateUse } from '@/lib/parts/parts'
import { ValidationError } from '@/lib/core/types'
import { act, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

function input(fd: FormData) {
  return {
    title: field(fd, 'title'),
    happenedOn: field(fd, 'happenedOn'),
    body: field(fd, 'body'),
    spaceId: field(fd, 'spaceId') || null,
    fixtureId: field(fd, 'fixtureId') || null,
    supplyId: field(fd, 'supplyId') || null,
    contactId: field(fd, 'contactId') || null,
    projectId: field(fd, 'projectId') || null,
    quantity: field(fd, 'quantity'),
    unit: field(fd, 'unit'),
    cost: field(fd, 'cost'),
    nextTime: field(fd, 'nextTime'),
    remindAfter: field(fd, 'remindAfter'),
  }
}

export async function createNoteAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => ({ id: (await createNote(db, scope, actor, input(fd))).id }))
  if (r.error) return r
  redirect(`/notes/${r.id}`)
}

export async function updateNoteAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await updateNote(db, scope, actor, id, input(fd), readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect(`/notes/${id}`)
}

export async function deleteNoteAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteNote(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/notes')
}

/** "Update needed amount to 15?" — carry a note's lesson onto the part's use. */
export async function applyNeedAction(noteId: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    const note = await getNote(db, scope, noteId)
    const need = suggestedNeed(note)
    if (need === null || !note.supplyId || !(note.spaceId || note.fixtureId)) {
      throw new ValidationError('There’s no amount to carry over from this note.')
    }
    const uses = await db
      .select({ id: supplyUses.id })
      .from(supplyUses)
      .where(
        and(
          eq(supplyUses.supplyId, note.supplyId),
          note.fixtureId ? eq(supplyUses.fixtureId, note.fixtureId) : eq(supplyUses.spaceId, note.spaceId!),
          isNull(supplyUses.deletedAt),
        ),
      )
    if (uses.length !== 1) throw new ValidationError('Link the part to that place first, then try again.')
    await updateUse(db, scope, actor, uses[0]!.id, { quantityNeeded: String(need) })
    return { message: `Saved: it really needs ${need}.` }
  })
}
