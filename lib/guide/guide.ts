/*
 * The house guide: what a housesitter (or a family member in a hurry) needs.
 *
 * There is one source of truth. The emergency card is *generated* from things
 * marked "show on the house guide" (shutoffs, the panel) and from people (the
 * preferred person per trade, plus anyone marked for the guide). Guide sections
 * are free text only — trash day, the dog's routine, which door sticks.
 *
 * What is gated: secrets with gate `home_or_pin`, sections marked sensitive,
 * and the street address. A viewer sees them when signed in, on the home
 * network, or after the link's PIN. Nothing gated is ever put in the offline
 * snapshot (offlineHtml below).
 */

import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { recordAudit } from '../core/audit'
import { assertFresh, inTransaction, liveIn } from '../core/internal'
import { cleanText, requireText, softDelete } from '../core/records'
import { assertCanEdit, NotFoundError, ValidationError, type ActorContext, type Executor, type PropertyScope } from '../core/types'
import { seal, tryUnseal } from '../crypto/sealed'
import { attachments, contacts, contactTrades, fixtures, guideSections, properties, secrets } from '../db/schema'
import { spacePath, subtreeIds } from '../search/rebuild'

export type GuideSection = typeof guideSections.$inferSelect
export type Secret = typeof secrets.$inferSelect
export type SecretKind = Secret['kind']

export const SECRET_KINDS: { value: SecretKind; label: string }[] = [
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'alarm', label: 'Alarm code' },
  { value: 'lockbox', label: 'Lockbox / key safe' },
  { value: 'gate', label: 'Gate or garage code' },
  { value: 'other', label: 'Other' },
]

// ─── sections ────────────────────────────────────────────────────────────────

export async function listSections(exec: Executor, scope: PropertyScope) {
  return exec
    .select()
    .from(guideSections)
    .where(and(eq(guideSections.propertyId, scope.propertyId), isNull(guideSections.deletedAt)))
    .orderBy(asc(guideSections.sort), asc(guideSections.createdAt))
}

export async function getSection(exec: Executor, scope: PropertyScope, id: string) {
  const [row] = await exec.select().from(guideSections).where(liveIn(guideSections, scope.propertyId, id))
  if (!row) throw new NotFoundError('guide section')
  return row
}

export type SectionInput = { title: string; body?: string; sensitive?: boolean; sort?: number }

export async function saveSection(
  exec: Executor,
  scope: PropertyScope,
  actor: ActorContext,
  id: string | null,
  input: SectionInput,
  expectedUpdatedAt?: Date,
) {
  assertCanEdit(actor)
  const values = {
    title: requireText(input.title, 'Give the section a title, like “Trash day” or “The dog”.'),
    body: cleanText(input.body),
    sensitive: input.sensitive ?? false,
    ...(input.sort !== undefined ? { sort: input.sort } : {}),
  }
  return inTransaction(exec, async (tx) => {
    if (id) {
      const [current] = await tx.select().from(guideSections).where(liveIn(guideSections, scope.propertyId, id)).for('update')
      assertFresh('guide section', current, expectedUpdatedAt)
      await tx
        .update(guideSections)
        .set({ ...values, updatedAt: new Date(), updatedBy: actor.userId })
        .where(eq(guideSections.id, id))
      await recordAudit(tx, actor, { action: 'update', entityType: 'guide_section', entityId: id, after: { title: values.title } })
      return id
    }
    const [row] = await tx
      .insert(guideSections)
      .values({ ...values, propertyId: scope.propertyId, sort: input.sort ?? Date.now() % 2_000_000_000, createdBy: actor.userId, updatedBy: actor.userId })
      .returning({ id: guideSections.id })
    await recordAudit(tx, actor, { action: 'create', entityType: 'guide_section', entityId: row!.id, after: { title: values.title } })
    return row!.id
  })
}

export async function deleteSection(exec: Executor, scope: PropertyScope, actor: ActorContext, id: string) {
  return inTransaction(exec, (tx) => softDelete(tx, guideSections, 'guide_section', scope, id, actor))
}

// ─── secrets ─────────────────────────────────────────────────────────────────

/** Secrets without their values — for lists and editors. */
export async function listSecrets(exec: Executor, scope: PropertyScope) {
  const rows = await exec
    .select()
    .from(secrets)
    .where(and(eq(secrets.propertyId, scope.propertyId), isNull(secrets.deletedAt)))
    .orderBy(asc(secrets.sort), asc(secrets.createdAt))
  // The sealed value never leaves this module through a list.
  return rows.map((row) => {
    const { sealedValue, ...rest } = row
    void sealedValue
    return rest
  })
}

export type SecretInput = {
  kind: string
  label: string
  /** Undefined on an edit means "keep the stored value". */
  value?: string
  ssid?: string
  security?: string
  gate?: string
  inGuide?: boolean
  notes?: string
}

function kindOf(raw: string): SecretKind {
  const hit = SECRET_KINDS.find((k) => k.value === raw)
  if (!hit) throw new ValidationError('Pick what kind of code this is.')
  return hit.value
}

export async function saveSecret(
  exec: Executor,
  scope: PropertyScope,
  actor: ActorContext,
  id: string | null,
  input: SecretInput,
) {
  assertCanEdit(actor)
  const kind = kindOf(input.kind)
  const gate = input.gate === 'always' ? 'always' : 'home_or_pin'
  const meta: Record<string, string> = {}
  if (kind === 'wifi') {
    if (input.ssid?.trim()) meta.ssid = input.ssid.trim().slice(0, 64)
    meta.security = ['WPA', 'WEP', 'nopass'].includes(input.security ?? '') ? input.security! : 'WPA'
  }
  const label = cleanText(input.label, 100) || SECRET_KINDS.find((k) => k.value === kind)!.label
  const base = { kind, label, meta, gate: gate as Secret['gate'], inGuide: input.inGuide ?? true, notes: cleanText(input.notes, 2000) }
  return inTransaction(exec, async (tx) => {
    if (id) {
      const [current] = await tx.select({ id: secrets.id }).from(secrets).where(liveIn(secrets, scope.propertyId, id))
      if (!current) throw new NotFoundError('code')
      const value = input.value?.trim()
      await tx
        .update(secrets)
        .set({ ...base, ...(value ? { sealedValue: seal(value) } : {}), updatedAt: new Date(), updatedBy: actor.userId })
        .where(eq(secrets.id, id))
      // The value itself is never written to the audit log.
      await recordAudit(tx, actor, { action: 'update', entityType: 'secret', entityId: id, after: { label, valueChanged: Boolean(value) } })
      return id
    }
    const value = (input.value ?? '').trim()
    if (!value && kind !== 'wifi') throw new ValidationError('Enter the code.')
    const [row] = await tx
      .insert(secrets)
      .values({ ...base, propertyId: scope.propertyId, sealedValue: seal(value), createdBy: actor.userId, updatedBy: actor.userId })
      .returning({ id: secrets.id })
    await recordAudit(tx, actor, { action: 'create', entityType: 'secret', entityId: row!.id, after: { label } })
    return row!.id
  })
}

export async function deleteSecret(exec: Executor, scope: PropertyScope, actor: ActorContext, id: string) {
  return inTransaction(exec, (tx) => softDelete(tx, secrets, 'secret', scope, id, actor))
}

// ─── the assembled guide ─────────────────────────────────────────────────────

export type GuideThing = {
  id: string
  name: string
  where: string
  note: string
  photos: { sha256: string; caption: string }[]
}

export type GuidePerson = { id: string; name: string; company: string; roles: string[]; phones: { label: string; value: string }[] }

export type GuideSecret = {
  id: string
  kind: SecretKind
  label: string
  notes: string
  gated: boolean
  /** Present only when the viewer may see it. */
  value?: string
  error?: string
  ssid?: string
  security?: string
}

export type Guide = {
  homeName: string
  /** Present only when unlocked. */
  address?: string
  things: GuideThing[]
  people: GuidePerson[]
  sections: { id: string; title: string; body: string; sensitive: boolean; hidden: boolean }[]
  secrets: GuideSecret[]
  /** Something is held back that unlocking would show. */
  locked: boolean
  /** Files this guide may serve, by hash. */
  files: Set<string>
}

export async function buildGuide(
  exec: Executor,
  scope: PropertyScope,
  opts: { unlocked: boolean; rootSpaceId?: string | null },
): Promise<Guide> {
  const [property] = await exec.select().from(properties).where(eq(properties.id, scope.propertyId))
  if (!property) throw new NotFoundError('home')

  // Things: everything marked for the guide, limited to the link's part of the
  // property when it has one. Whole-house things (no place) always show —
  // the main shutoff matters wherever you are.
  const within = opts.rootSpaceId ? new Set(await subtreeIds(exec, opts.rootSpaceId)) : null
  const thingRows = (
    await exec
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.propertyId, scope.propertyId), isNull(fixtures.deletedAt), eq(fixtures.inGuide, true)))
      .orderBy(asc(fixtures.name))
  ).filter((t) => !within || !t.spaceId || within.has(t.spaceId))

  const photoRows = thingRows.length
    ? await exec
        .select({ fixtureId: attachments.fixtureId, sha256: attachments.sha256, caption: attachments.caption, mime: attachments.mime })
        .from(attachments)
        .where(and(inArray(attachments.fixtureId, thingRows.map((t) => t.id)), isNull(attachments.deletedAt)))
        .orderBy(asc(attachments.sort), asc(attachments.createdAt))
    : []

  const things: GuideThing[] = []
  for (const t of thingRows) {
    const path = await spacePath(exec, t.spaceId)
    things.push({
      id: t.id,
      name: t.name,
      where: path.map((p) => p.name).join(' › ') || 'Whole house',
      note: t.guideNote || t.notes,
      photos: photoRows
        .filter((p) => p.fixtureId === t.id && p.mime.startsWith('image/'))
        .map((p) => ({ sha256: p.sha256, caption: p.caption })),
    })
  }

  // People: the preferred person for each trade, and anyone marked for the guide.
  const contactRows = await exec
    .select()
    .from(contacts)
    .where(and(eq(contacts.propertyId, scope.propertyId), isNull(contacts.deletedAt)))
    .orderBy(asc(contacts.name))
  const trades = contactRows.length
    ? await exec.select().from(contactTrades).where(inArray(contactTrades.contactId, contactRows.map((c) => c.id)))
    : []
  const people: GuidePerson[] = contactRows
    .map((c) => {
      const preferred = trades.filter((t) => t.contactId === c.id && t.preferred).map((t) => t.trade)
      return { c, preferred }
    })
    .filter(({ c, preferred }) => c.inGuide || preferred.length > 0)
    .map(({ c, preferred }) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      roles: preferred.length ? preferred : trades.filter((t) => t.contactId === c.id).map((t) => t.trade),
      phones: c.phones,
    }))

  const sectionRows = await listSections(exec, scope)
  const sections = sectionRows.map((s) => ({
    id: s.id,
    title: s.title,
    body: s.sensitive && !opts.unlocked ? '' : s.body,
    sensitive: s.sensitive,
    hidden: s.sensitive && !opts.unlocked,
  }))

  const secretRows = await exec
    .select()
    .from(secrets)
    .where(and(eq(secrets.propertyId, scope.propertyId), isNull(secrets.deletedAt), eq(secrets.inGuide, true)))
    .orderBy(asc(secrets.sort), asc(secrets.createdAt))
  const secretList: GuideSecret[] = secretRows.map((s) => {
    const gated = s.gate === 'home_or_pin'
    const visible = !gated || opts.unlocked
    const base: GuideSecret = { id: s.id, kind: s.kind, label: s.label, notes: s.notes, gated, ssid: s.meta.ssid, security: s.meta.security }
    if (!visible) return base
    const opened = tryUnseal(s.sealedValue)
    return 'value' in opened ? { ...base, value: opened.value } : { ...base, error: opened.error }
  })

  const locked =
    !opts.unlocked && (secretList.some((s) => s.gated) || sections.some((s) => s.hidden) || property.address !== '')

  return {
    homeName: property.name,
    address: opts.unlocked && property.address ? property.address : undefined,
    things,
    people,
    sections,
    secrets: secretList,
    locked,
    files: new Set(things.flatMap((t) => t.photos.map((p) => p.sha256))),
  }
}

/** Record that a signed-in person opened the codes. */
export async function auditReveal(exec: Executor, actor: ActorContext, propertyId: string) {
  await recordAudit(exec, actor, { action: 'reveal', entityType: 'guide', entityId: propertyId })
}

/** Wi-Fi network string for a QR code (the format phones understand). */
export function wifiQrText(ssid: string, password: string, security = 'WPA'): string {
  const esc = (v: string) => v.replace(/([\\;,:"])/g, '\\$1')
  return `WIFI:T:${security === 'nopass' ? 'nopass' : security};S:${esc(ssid)};P:${esc(password)};;`
}

