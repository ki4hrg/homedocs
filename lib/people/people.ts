/*
 * People: the plumber, the electrician, the HOA, the utilities.
 *
 * Trades are rows, not a column, so one person can be "plumber" and "gas" and a
 * trade can have one *preferred* person — which is what "who's our plumber?"
 * means, and what the house guide's emergency card shows.
 */

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { diff, recordAudit } from '../core/audit'
import { assertFresh, inTransaction, liveIn } from '../core/internal'
import { cleanText, cleanUrl, requireText, softDelete } from '../core/records'
import { assertCanEdit, NotFoundError, type ActorContext, type Executor, type PropertyScope } from '../core/types'
import { contacts, contactTrades, type ContactMethod } from '../db/schema'
import { cascadeContact, rebuildContact } from '../search/rebuild'

export type Contact = typeof contacts.$inferSelect

export const COMMON_TRADES = [
  'plumber',
  'electrician',
  'hvac',
  'handyman',
  'roofer',
  'landscaper',
  'pest control',
  'appliance repair',
  'locksmith',
  'painter',
  'pool',
  'utility',
  'hoa',
  'neighbor',
  'vet',
]

export type PersonInput = {
  name: string
  company?: string
  phones?: ContactMethod[]
  emails?: ContactMethod[]
  website?: string
  notes?: string
  accountNumber?: string
  inGuide?: boolean
  /** Lower-cased trade names; `preferred` is the subset this person is "our" one for. */
  trades?: string[]
  preferred?: string[]
}

function cleanMethods(list: ContactMethod[] | undefined): ContactMethod[] {
  return (list ?? [])
    .map((m) => ({ label: cleanText(m.label, 40), value: cleanText(m.value, 200) }))
    .filter((m) => m.value !== '')
    .slice(0, 6)
}

export function normalizeTrades(raw: string[] | undefined): string[] {
  return [...new Set((raw ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12)
}

async function writeTrades(tx: Executor, scope: PropertyScope, contactId: string, trades: string[], preferred: string[]) {
  await tx.delete(contactTrades).where(eq(contactTrades.contactId, contactId))
  if (trades.length === 0) return
  const pref = new Set(preferred.filter((p) => trades.includes(p)))
  // Only one preferred person per trade in this home: claiming it clears the others.
  if (pref.size > 0) {
    await tx
      .update(contactTrades)
      .set({ preferred: false })
      .where(
        and(
          inArray(contactTrades.trade, [...pref]),
          sql`${contactTrades.contactId} in (select id from contacts where property_id = ${scope.propertyId})`,
        ),
      )
  }
  await tx.insert(contactTrades).values(trades.map((trade) => ({ contactId, trade, preferred: pref.has(trade) })))
}

export async function listPeople(exec: Executor, scope: PropertyScope) {
  const rows = await exec
    .select()
    .from(contacts)
    .where(and(eq(contacts.propertyId, scope.propertyId), isNull(contacts.deletedAt)))
    .orderBy(asc(contacts.name))
  const trades = rows.length
    ? await exec.select().from(contactTrades).where(inArray(contactTrades.contactId, rows.map((r) => r.id)))
    : []
  return rows.map((r) => ({ ...r, trades: trades.filter((t) => t.contactId === r.id) }))
}

export type Person = Awaited<ReturnType<typeof listPeople>>[number]

export async function getPerson(exec: Executor, scope: PropertyScope, id: string) {
  const [row] = await exec.select().from(contacts).where(liveIn(contacts, scope.propertyId, id))
  if (!row) throw new NotFoundError('person')
  const trades = await exec.select().from(contactTrades).where(eq(contactTrades.contactId, id)).orderBy(asc(contactTrades.trade))
  return { ...row, trades }
}

/** The preferred person for each trade — "our plumber". */
export async function preferredByTrade(exec: Executor, scope: PropertyScope) {
  return exec
    .select({ trade: contactTrades.trade, contact: contacts })
    .from(contactTrades)
    .innerJoin(contacts, eq(contacts.id, contactTrades.contactId))
    .where(
      and(eq(contactTrades.preferred, true), eq(contacts.propertyId, scope.propertyId), isNull(contacts.deletedAt)),
    )
    .orderBy(asc(contactTrades.trade))
}

export async function createPerson(exec: Executor, scope: PropertyScope, actor: ActorContext, input: PersonInput) {
  assertCanEdit(actor)
  return inTransaction(exec, async (tx) => {
    const [row] = await tx
      .insert(contacts)
      .values({
        propertyId: scope.propertyId,
        name: requireText(input.name, 'Give the person or company a name.'),
        company: cleanText(input.company, 200),
        phones: cleanMethods(input.phones),
        emails: cleanMethods(input.emails),
        website: cleanUrl(input.website),
        notes: cleanText(input.notes),
        accountNumber: cleanText(input.accountNumber, 100),
        inGuide: input.inGuide ?? false,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning()
    await writeTrades(tx, scope, row!.id, normalizeTrades(input.trades), normalizeTrades(input.preferred))
    await rebuildContact(tx, row!.id)
    await recordAudit(tx, actor, { action: 'create', entityType: 'contact', entityId: row!.id, after: { name: row!.name } })
    return row!
  })
}

export async function updatePerson(
  exec: Executor,
  scope: PropertyScope,
  actor: ActorContext,
  id: string,
  input: Partial<PersonInput>,
  expectedUpdatedAt?: Date,
) {
  assertCanEdit(actor)
  return inTransaction(exec, async (tx) => {
    const [current] = await tx.select().from(contacts).where(liveIn(contacts, scope.propertyId, id)).for('update')
    assertFresh('person', current, expectedUpdatedAt)
    const patch: Partial<Contact> = {}
    if (input.name !== undefined) patch.name = requireText(input.name, 'Give the person or company a name.')
    if (input.company !== undefined) patch.company = cleanText(input.company, 200)
    if (input.phones !== undefined) patch.phones = cleanMethods(input.phones)
    if (input.emails !== undefined) patch.emails = cleanMethods(input.emails)
    if (input.website !== undefined) patch.website = cleanUrl(input.website)
    if (input.notes !== undefined) patch.notes = cleanText(input.notes)
    if (input.accountNumber !== undefined) patch.accountNumber = cleanText(input.accountNumber, 100)
    if (input.inGuide !== undefined) patch.inGuide = input.inGuide
    const changes = diff(current!, patch)
    if (input.trades !== undefined) {
      await writeTrades(tx, scope, id, normalizeTrades(input.trades), normalizeTrades(input.preferred))
      changes.after.trades = normalizeTrades(input.trades)
    }
    if (Object.keys(changes.after).length === 0) return current!
    const [row] = await tx
      .update(contacts)
      .set({ ...patch, updatedAt: new Date(), updatedBy: actor.userId })
      .where(eq(contacts.id, id))
      .returning()
    await cascadeContact(tx, id)
    await recordAudit(tx, actor, { action: 'update', entityType: 'contact', entityId: id, ...changes })
    return row!
  })
}

export async function deletePerson(exec: Executor, scope: PropertyScope, actor: ActorContext, id: string) {
  return inTransaction(exec, (tx) => softDelete(tx, contacts, 'contact', scope, id, actor))
}

/** "tel:" link for a phone number as typed. */
export function telHref(value: string): string {
  return `tel:${value.replace(/[^\d+]/g, '')}`
}
