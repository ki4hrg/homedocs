'use server'

/* Actions used across record pages. */

import { db } from '../db'
import { removeAttachment } from '../files/attachments'
import { act } from './action'

export async function removeAttachmentAction(id: string) {
  return act(async ({ scope, actor }) => {
    await removeAttachment(db, scope, actor, id)
  })
}
