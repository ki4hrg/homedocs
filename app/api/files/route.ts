/*
 * Upload a photo or PDF onto a record. Guard: requireApiRole('member').
 *
 * A Route Handler rather than a Server Action because Server Actions cap the
 * body at 1 MB and phone photos are 3–8 MB. The browser shrinks photos before
 * sending (components/PhotoUpload.tsx); the cap here is for everything else.
 */

import { requireApiRole } from '@/lib/auth/guards'
import { AppError } from '@/lib/core/types'
import { db } from '@/lib/db'
import { attach, ownerProperty, parseOwner } from '@/lib/files/attachments'
import { MAX_UPLOAD_BYTES, storeUpload } from '@/lib/files/store'
import { webActor } from '@/lib/web/context'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireApiRole('member')
  if ('response' in auth) return auth.response

  // Refuse an oversized body before reading it.
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return Response.json({ error: 'That file is too big (25 MB at most).' }, { status: 413 })
  }

  const url = new URL(request.url)
  const owner = parseOwner(url.searchParams.get('owner'))
  if (!owner) return Response.json({ error: 'Say what this file belongs to.' }, { status: 400 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'The upload did not arrive in one piece. Try again.' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) return Response.json({ error: 'Choose a file.' }, { status: 400 })

  const propertyId = await ownerProperty(db, owner)
  if (!propertyId) return Response.json({ error: 'That record no longer exists.' }, { status: 404 })

  try {
    const stored = await storeUpload(Buffer.from(await file.arrayBuffer()), file.type)
    const row = await attach(db, { propertyId }, webActor(auth.user), owner, {
      ...stored,
      originalName: file.name,
      caption: String(form.get('caption') ?? ''),
    })
    return Response.json({ id: row.id, sha256: row.sha256 })
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.message }, { status: 400 })
    throw err
  }
}
