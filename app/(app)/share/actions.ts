'use server'

import { db } from '@/lib/db'
import { createShareLink, revokeShareLink } from '@/lib/guide/share-links'
import { act, field, type ActionResult } from '@/lib/web/action'

export async function createShareAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    const { url } = await createShareLink(db, scope, actor, {
      label: field(fd, 'label'),
      days: Number(field(fd, 'days') || 7),
      pin: field(fd, 'pin'),
      rootSpaceId: field(fd, 'rootSpaceId') || null,
    })
    return { message: url }
  })
}

export async function revokeShareAction(id: string): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    await revokeShareLink(db, scope, actor, id)
  })
}
