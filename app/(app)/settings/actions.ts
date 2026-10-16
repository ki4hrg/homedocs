'use server'

import { setDisplayName, setPassword } from '@/lib/auth/users'
import { assertAdmin, ValidationError } from '@/lib/core/types'
import { rebuildAll } from '@/lib/search/rebuild'
import { updateProperty } from '@/lib/property/property'
import { act, field, type ActionResult } from '@/lib/web/action'
import { verifyPassword } from '@/lib/auth/password'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revokeGrant } from '@/lib/oauth/grants'
import { removeIntegration, requirePaperlessTag, saveIntegration, unrequirePaperlessTag } from '@/lib/integrations/integrations'

export async function nameAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ user, actor }) => {
    await setDisplayName(user.id, field(fd, 'displayName'), actor)
    return { message: 'Saved.' }
  })
}

export async function passwordAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ user, actor }) => {
    const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id))
    if (row?.hash && !(await verifyPassword(row.hash, String(fd.get('current') ?? '')))) {
      throw new ValidationError('Your current password isn’t right.')
    }
    await setPassword(user.id, String(fd.get('password') ?? ''), actor)
    // setPassword signs out every session, this one included.
    return { message: 'Password changed. Sign in again with the new one.' }
  })
}

export async function homeAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ property, actor }) => {
    await updateProperty(
      property.id,
      {
        name: field(fd, 'name'),
        address: field(fd, 'address'),
        homeNetworks: field(fd, 'homeNetworks'),
        homeHostname: field(fd, 'homeHostname'),
      },
      actor,
    )
    return { message: 'Saved.' }
  })
}

export async function revokeConnectorAction(clientId: string): Promise<ActionResult> {
  return act(async ({ user }) => {
    await revokeGrant(db, { userId: user.id, clientId })
  })
}

export async function saveIntegrationAction(system: 'homebox' | 'paperless', _: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    const result = await saveIntegration(db, scope, actor, system, { baseUrl: field(fd, 'baseUrl'), token: field(fd, 'token') })
    return { message: result.warning ? `Connected: ${result.summary}. ${result.warning}` : `Connected: ${result.summary}.` }
  })
}

export async function removeIntegrationAction(system: 'homebox' | 'paperless'): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await removeIntegration(db, scope, actor, system)
  })
}

/** After a restore, or if search ever misses something: rebuild every search document. */
export async function rebuildSearchAction(): Promise<ActionResult> {
  return act(async ({ actor }) => {
    assertAdmin(actor)
    await rebuildAll(db)
    return { message: 'Search rebuilt.' }
  })
}

export async function requirePaperlessTagAction(system: string, externalId: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    if (system !== 'paperless') throw new Error('bad system')
    await requirePaperlessTag(db, scope, actor, externalId)
  })
}

export async function unrequirePaperlessTagAction(tagId: number): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await unrequirePaperlessTag(db, scope, actor, tagId)
  })
}
