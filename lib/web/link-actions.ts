'use server'

import { db } from '../db'
import { parseOwner } from '../files/attachments'
import { addLink, removeLink } from '../links/links'
import { linkPicked } from '../integrations/integrations'
import { act, field, type ActionResult } from './action'

export async function addLinkAction(owner: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ scope, actor }) => {
    const parsed = parseOwner(owner)
    if (!parsed) throw new Error('bad owner')
    await addLink(db, scope, actor, parsed, { url: field(fd, 'url'), title: field(fd, 'title') })
    return { message: 'Linked.' }
  })
}

export async function removeLinkAction(id: string) {
  return act(async ({ scope, actor }) => {
    await removeLink(db, scope, actor, id)
  })
}

export async function linkPickedAction(owner: string, system: string, externalId: string) {
  return act(async ({ scope, actor }) => {
    const parsed = parseOwner(owner)
    if (!parsed || (system !== 'homebox' && system !== 'paperless')) throw new Error('bad link')
    await linkPicked(db, scope, actor, parsed, system, externalId)
  })
}
