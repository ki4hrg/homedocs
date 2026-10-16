/*
 * The shape every server action shares.
 *
 * A server action is a public endpoint whatever page it is called from, so each
 * one authenticates here rather than relying on the layout. A refusal the domain
 * layer can explain goes back as `error` for the form to show; anything else is
 * a bug and is thrown.
 */

import { revalidatePath } from 'next/cache'
import { AppError } from '../core/types'
import { viewer, type Viewer } from './context'

export type ActionResult = { error?: string; ok?: boolean; id?: string; message?: string }

export async function act(
  work: (v: Viewer) => Promise<void | Omit<ActionResult, 'error'>>,
): Promise<ActionResult> {
  const v = await viewer()
  let done: void | Omit<ActionResult, 'error'>
  try {
    done = await work(v)
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    if (isInvalidUuid(err)) return { error: 'That no longer exists.' }
    throw err
  }
  // Small pages and a handful of users: refreshing everything is simpler than
  // tracking which lists a record appears in.
  revalidatePath('/', 'layout')
  return { ok: true, ...(done ?? {}) }
}

/* 22P02: Postgres comparing a uuid column with something that is not one. */
function isInvalidUuid(err: unknown): boolean {
  let current: unknown = err
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    if ((current as Error & { code?: string }).code === '22P02') return true
    current = current.cause
  }
  return false
}

export function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim()
}

export function optionalField(formData: FormData, name: string): string | undefined {
  const value = formData.get(name)
  return value === null ? undefined : String(value).trim()
}

export function checkbox(formData: FormData, name: string): boolean {
  const value = formData.get(name)
  return value === 'on' || value === 'true' || value === '1'
}

/** An `updatedAt` a form carried, for optimistic concurrency. */
export function readUpdatedAt(formData: FormData): Date | undefined {
  const raw = field(formData, 'updatedAt')
  if (!raw) return undefined
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? undefined : date
}
