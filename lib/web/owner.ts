import { db } from '../db'
import type { PropertyScope } from '../core/types'
import { getSpace } from '../places/places'
import { getThing } from '../things/things'

/** The thing or place a page was opened from (?thing= or ?space=), for "add here" flows. */
export async function ownerFromParams(
  scope: PropertyScope,
  params: { thing?: string; space?: string },
): Promise<{ kind: 'thing' | 'place'; id: string; name: string; href: string } | undefined> {
  if (params.thing) {
    const t = await getThing(db, scope, params.thing)
    return { kind: 'thing', id: t.id, name: t.name, href: `/things/${t.id}` }
  }
  if (params.space) {
    const s = await getSpace(db, scope, params.space)
    return { kind: 'place', id: s.id, name: s.name, href: `/places/${s.id}` }
  }
  return undefined
}
