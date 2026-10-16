/*
 * Search Homebox (items, or `kind=location`) or paperless (documents, or `kind=tag`) for the link picker. Guard: requireApiRole('member')
 * — viewers cannot link, so they have no reason to search the other apps.
 * The token never leaves the server; the browser gets titles and ids.
 */

import { requireApiRole } from '@/lib/auth/guards'
import { AppError } from '@/lib/core/types'
import { db } from '@/lib/db'
import { searchSystem } from '@/lib/integrations/integrations'
import { listProperties } from '@/lib/property/property'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireApiRole('member')
  if ('response' in auth) return auth.response
  const url = new URL(request.url)
  const system = url.searchParams.get('system')
  if (system !== 'homebox' && system !== 'paperless') return Response.json({ error: 'Unknown app.' }, { status: 400 })
  const [property] = await listProperties()
  if (!property) return Response.json({ hits: [] })
  try {
    const kind = url.searchParams.get('kind')
    const locations = system === 'homebox' && kind === 'location'
    const tags = system === 'paperless' && kind === 'tag'
    const hits = await searchSystem(db, { propertyId: property.id }, system, url.searchParams.get('q') ?? '', { locations, tags })
    return Response.json({ hits }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.message }, { status: 400 })
    throw err
  }
}
