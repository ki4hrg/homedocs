/*
 * Things: installed fixtures and systems — the overhead light, the water
 * heater, the main shutoff. Not inventory: serial numbers, warranties and
 * manuals belong to Homebox, and a thing links to its Homebox item instead.
 */

import { and, asc, eq, isNull } from 'drizzle-orm'
import { diff, recordAudit } from '../core/audit'
import { assertFresh, inTransaction, liveIn } from '../core/internal'
import { cleanText, requireText, softDelete } from '../core/records'
import {
  assertCanEdit,
  NotFoundError,
  ValidationError,
  type ActorContext,
  type Executor,
  type PropertyScope,
} from '../core/types'
import { fixtures, spaces } from '../db/schema'
import { cascadeFixture, rebuildFixture, spacePath } from '../search/rebuild'

export type Fixture = typeof fixtures.$inferSelect

/** Suggestions for the category box; free text is fine too. */
export const THING_CATEGORIES = [
  'Light fixture',
  'Ceiling fan',
  'Shutoff valve',
  'Electrical panel',
  'Water heater',
  'HVAC',
  'Appliance',
  'Plumbing fixture',
  'Smoke / CO detector',
  'Door / lock',
  'Window',
  'Irrigation',
  'Other',
]

export type ThingInput = {
  name: string
  spaceId?: string | null
  category?: string
  notes?: string
  inGuide?: boolean
  guideNote?: string
}

async function assertSpace(exec: Executor, scope: PropertyScope, spaceId: string | null) {
  if (!spaceId) return
  const [row] = await exec.select({ id: spaces.id }).from(spaces).where(liveIn(spaces, scope.propertyId, spaceId))
  if (!row) throw new ValidationError('That place no longer exists.')
}

export async function listThings(exec: Executor, scope: PropertyScope, filter: { spaceId?: string } = {}) {
  return exec
    .select()
    .from(fixtures)
    .where(
      and(
        eq(fixtures.propertyId, scope.propertyId),
        isNull(fixtures.deletedAt),
        filter.spaceId ? eq(fixtures.spaceId, filter.spaceId) : undefined,
      ),
    )
    .orderBy(asc(fixtures.name))
}

export async function getThing(exec: Executor, scope: PropertyScope, id: string) {
  const [row] = await exec.select().from(fixtures).where(liveIn(fixtures, scope.propertyId, id))
  if (!row) throw new NotFoundError('thing')
  return { ...row, path: await spacePath(exec, row.spaceId) }
}

export async function createThing(exec: Executor, scope: PropertyScope, actor: ActorContext, input: ThingInput) {
  assertCanEdit(actor)
  return inTransaction(exec, async (tx) => {
    const spaceId = input.spaceId || null
    await assertSpace(tx, scope, spaceId)
    const [row] = await tx
      .insert(fixtures)
      .values({
        propertyId: scope.propertyId,
        spaceId,
        name: requireText(input.name, 'Give the thing a name.'),
        category: cleanText(input.category, 100),
        notes: cleanText(input.notes),
        inGuide: input.inGuide ?? false,
        guideNote: cleanText(input.guideNote, 2000),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning()
    await rebuildFixture(tx, row!.id)
    await recordAudit(tx, actor, { action: 'create', entityType: 'fixture', entityId: row!.id, after: { name: row!.name } })
    return row!
  })
}

export async function updateThing(
  exec: Executor,
  scope: PropertyScope,
  actor: ActorContext,
  id: string,
  input: Partial<ThingInput>,
  expectedUpdatedAt?: Date,
) {
  assertCanEdit(actor)
  return inTransaction(exec, async (tx) => {
    const [current] = await tx.select().from(fixtures).where(liveIn(fixtures, scope.propertyId, id)).for('update')
    assertFresh('thing', current, expectedUpdatedAt)
    const patch: Partial<Fixture> = {}
    if (input.name !== undefined) patch.name = requireText(input.name, 'Give the thing a name.')
    if (input.category !== undefined) patch.category = cleanText(input.category, 100)
    if (input.notes !== undefined) patch.notes = cleanText(input.notes)
    if (input.inGuide !== undefined) patch.inGuide = input.inGuide
    if (input.guideNote !== undefined) patch.guideNote = cleanText(input.guideNote, 2000)
    if (input.spaceId !== undefined) {
      patch.spaceId = input.spaceId || null
      await assertSpace(tx, scope, patch.spaceId)
    }
    const changes = diff(current!, patch)
    if (Object.keys(changes.after).length === 0) return current!
    const [row] = await tx
      .update(fixtures)
      .set({ ...patch, updatedAt: new Date(), updatedBy: actor.userId })
      .where(eq(fixtures.id, id))
      .returning()
    if ('name' in changes.after || 'spaceId' in changes.after) await cascadeFixture(tx, id)
    else await rebuildFixture(tx, id)
    await recordAudit(tx, actor, { action: 'update', entityType: 'fixture', entityId: id, ...changes })
    return row!
  })
}

export async function deleteThing(exec: Executor, scope: PropertyScope, actor: ActorContext, id: string) {
  return inTransaction(exec, (tx) => softDelete(tx, fixtures, 'fixture', scope, id, actor))
}
