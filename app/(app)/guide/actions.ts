'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { deleteSecret, deleteSection, saveSecret, saveSection } from '@/lib/guide/guide'
import { act, checkbox, field, readUpdatedAt, type ActionResult } from '@/lib/web/action'

export async function saveSectionAction(id: string | null, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await saveSection(db, scope, actor, id, { title: field(fd, 'title'), body: field(fd, 'body'), sensitive: checkbox(fd, 'sensitive') }, readUpdatedAt(fd))
  })
  if (r.error) return r
  redirect('/guide/edit')
}

export async function deleteSectionAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteSection(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/guide/edit')
}

export async function saveSecretAction(id: string | null, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await saveSecret(db, scope, actor, id, {
      kind: field(fd, 'kind'),
      label: field(fd, 'label'),
      // Blank on an edit keeps the stored value.
      value: field(fd, 'value') || (id ? undefined : ''),
      ssid: field(fd, 'ssid'),
      security: field(fd, 'security'),
      gate: field(fd, 'gate'),
      inGuide: checkbox(fd, 'inGuide'),
      notes: field(fd, 'notes'),
    })
  })
  if (r.error) return r
  redirect('/guide/edit')
}

export async function deleteSecretAction(id: string): Promise<ActionResult> {
  const r = await act(async ({ scope, actor }) => {
    await deleteSecret(db, scope, actor, id)
  })
  if (r.error) return r
  redirect('/guide/edit')
}
