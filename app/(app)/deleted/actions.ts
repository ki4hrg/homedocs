'use server'

import { db } from '@/lib/db'
import { isTrashKind, restore } from '@/lib/trash/trash'
import { ValidationError } from '@/lib/core/types'
import { act } from '@/lib/web/action'

export async function restoreAction(kind: string, id: string) {
  return act(async ({ scope, actor }) => {
    if (!isTrashKind(kind)) throw new ValidationError('That can’t be restored.')
    await restore(db, scope, actor, kind, id)
  })
}
