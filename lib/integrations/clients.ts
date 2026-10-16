/*
 * Server-side clients for Homebox and paperless-ngx.
 *
 * Every call goes through the server, never the browser: Homebox has no CORS
 * setup for third-party origins, and a token in the browser is a token anyone
 * with the page can read. Only fixed paths on the admin-configured base URL are
 * ever requested, with ids validated first — nothing a visitor types becomes
 * part of a URL.
 *
 * Targets:
 *   Homebox ≥ 0.26 — `/api/v1/entities` (0.26 replaced /items and /locations),
 *     long-lived `hb_` API keys sent as `Authorization: Bearer`.
 *   paperless-ngx, API version 10 — `Authorization: Token`, and the version is
 *     pinned in Accept so a server upgrade cannot reshape responses under us.
 *
 * These shapes come from the projects' published API docs and have not been
 * exercised against every version; parsing is deliberately defensive.
 */

export type System = 'homebox' | 'paperless'

export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'missing' | 'unreachable' | 'unexpected',
  ) {
    super(message)
  }
}

export type Connection = { system: System; baseUrl: string; token: string }

export type Hit = { externalId: string; title: string; subtitle: string; url: string; hasThumb: boolean }

const TIMEOUT_MS = 8_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validExternalId(system: System, id: string): boolean {
  return system === 'homebox' ? UUID.test(id) : /^\d{1,12}$/.test(id)
}

function base(conn: Connection): string {
  return conn.baseUrl.replace(/\/+$/, '')
}

function headers(conn: Connection, accept = 'application/json'): Record<string, string> {
  return conn.system === 'homebox'
    ? { Authorization: `Bearer ${conn.token}`, Accept: accept }
    : { Authorization: `Token ${conn.token}`, Accept: accept === 'application/json' ? 'application/json; version=10' : accept }
}

async function request(conn: Connection, path: string, accept?: string): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${base(conn)}${path}`, {
      headers: headers(conn, accept),
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch {
    throw new IntegrationError(`Couldn’t reach ${conn.system === 'homebox' ? 'Homebox' : 'paperless'}.`, 'unreachable')
  }
  if (res.status === 401 || res.status === 403) {
    throw new IntegrationError('The saved token was refused. Reconnect in Settings.', 'auth')
  }
  if (res.status === 404) throw new IntegrationError('Not found.', 'missing')
  if (!res.ok) throw new IntegrationError(`Unexpected answer (${res.status}).`, 'unexpected')
  return res
}

async function json<T>(conn: Connection, path: string): Promise<T> {
  const res = await request(conn, path)
  try {
    return (await res.json()) as T
  } catch {
    throw new IntegrationError('The answer was not JSON — is the address right?', 'unexpected')
  }
}

// ─── Homebox ─────────────────────────────────────────────────────────────────

type HbEntity = {
  id: string
  name?: string
  description?: string
  parent?: { id?: string; name?: string } | null
  location?: { id?: string; name?: string } | null
  entityType?: { name?: string } | string | null
  thumbnailId?: string | null
  imageId?: string | null
}

function hbHit(conn: Connection, e: HbEntity): Hit {
  const place = e.parent?.name ?? e.location?.name ?? ''
  const type = typeof e.entityType === 'string' ? e.entityType : (e.entityType?.name ?? '')
  return {
    externalId: e.id,
    title: e.name || 'Untitled item',
    subtitle: [place, type].filter(Boolean).join(' · '),
    url: `${base(conn)}/item/${e.id}`,
    hasThumb: Boolean(e.thumbnailId || e.imageId),
  }
}

// ─── paperless ───────────────────────────────────────────────────────────────

type PlDoc = { id: number; title?: string; created?: string; created_date?: string; original_file_name?: string }

function plHit(conn: Connection, d: PlDoc): Hit {
  const created = (d.created_date ?? d.created ?? '').slice(0, 10)
  return {
    externalId: String(d.id),
    title: d.title || d.original_file_name || `Document #${d.id}`,
    subtitle: created ? `Added ${created}` : '',
    url: `${base(conn)}/documents/${d.id}/details`,
    hasThumb: true,
  }
}

// ─── the shared surface ──────────────────────────────────────────────────────

/** What "Test connection" reports: a version, a document count — or throws. */
export async function probe(conn: Connection): Promise<{ summary: string; warning?: string }> {
  if (conn.system === 'homebox') {
    const status = await json<{ build?: { version?: string }; version?: string }>(conn, '/api/v1/status')
    const version = status.build?.version ?? status.version ?? 'unknown'
    // Prove the key works and the 0.26 entities API exists.
    await json(conn, '/api/v1/entities?pageSize=1')
    const old = /^v?0\.(\d+)\./.exec(version)
    return {
      summary: `Homebox ${version}`,
      warning: old && Number(old[1]) < 26 ? 'homedocs needs Homebox 0.26 or newer.' : undefined,
    }
  }
  const page = await json<{ count?: number }>(conn, '/api/documents/?page_size=1')
  const count = page.count ?? 0
  return {
    summary: `paperless — this token can see ${count} document${count === 1 ? '' : 's'}`,
    // Anyone in the family can search through this token, so it should not see the tax returns.
    warning:
      count > 500
        ? 'That’s a lot of documents. Everyone who can edit homedocs can search them — consider a paperless user that only sees home documents.'
        : undefined,
  }
}

export async function searchRemote(conn: Connection, query: string): Promise<Hit[]> {
  const q = encodeURIComponent(query.trim().slice(0, 100))
  if (conn.system === 'homebox') {
    const page = await json<{ items?: HbEntity[] }>(conn, `/api/v1/entities?q=${q}&pageSize=20`)
    return (page.items ?? []).filter((e) => UUID.test(e.id)).map((e) => hbHit(conn, e))
  }
  const page = await json<{ results?: PlDoc[] }>(conn, `/api/documents/?query=${q}&page_size=20`)
  return (page.results ?? []).filter((d) => Number.isInteger(d.id)).map((d) => plHit(conn, d))
}

export async function fetchRemote(conn: Connection, externalId: string): Promise<Hit> {
  if (!validExternalId(conn.system, externalId)) throw new IntegrationError('Not found.', 'missing')
  if (conn.system === 'homebox') return hbHit(conn, await json<HbEntity>(conn, `/api/v1/entities/${externalId}`))
  return plHit(conn, await json<PlDoc>(conn, `/api/documents/${externalId}/`))
}

/** The thumbnail bytes, or null when the record has none. */
export async function fetchThumb(conn: Connection, externalId: string): Promise<Buffer | null> {
  if (!validExternalId(conn.system, externalId)) throw new IntegrationError('Not found.', 'missing')
  if (conn.system === 'homebox') {
    const e = await json<HbEntity>(conn, `/api/v1/entities/${externalId}`)
    const attachment = e.thumbnailId ?? e.imageId
    if (!attachment || !UUID.test(attachment)) return null
    const res = await request(conn, `/api/v1/entities/${externalId}/attachments/${attachment}`, 'image/*')
    return Buffer.from(await res.arrayBuffer())
  }
  const res = await request(conn, `/api/documents/${externalId}/thumb/`, 'image/*')
  return Buffer.from(await res.arrayBuffer())
}
