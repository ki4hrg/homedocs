/*
 * Homebox and paperless through a fake server that answers in their documented
 * shapes (Homebox 0.26 entities, paperless API v10). What matters most: tokens
 * go in the right header and never anywhere else, a picked link is fetched
 * server-side, the thumbnail proxy only serves linked ids, and a deleted or
 * refused record is reported rather than crashing a page.
 */

import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq, sql } from 'drizzle-orm'
import { externalRefs } from '../lib/db/schema'
import { linkedThumb, linkPicked, listIntegrations, refreshStale, saveIntegration, searchSystem } from '../lib/integrations/integrations'
import { parseExternalUrl } from '../lib/links/links'
import { createThing } from '../lib/things/things'
import { db, resetBetweenTests } from './helpers/db'
import { household } from './helpers/fixtures'

resetBetweenTests()
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'homedocs-int-'))

const ITEM = '0b8e1f5c-1d2a-4c6e-9a51-3e0f2b7c9d11'
const THUMB = '7d1e2f3a-4b5c-4d6e-8f90-a1b2c3d4e5f6'
let png: Buffer
const seen: { url: string; auth: string | undefined; accept: string | undefined }[] = []
let deleted = false
let server: Server
let base = ''

beforeAll(async () => {
  png = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#336699' } }).png().toBuffer()
  server = createServer((req: IncomingMessage, res) => {
    seen.push({ url: req.url ?? '', auth: req.headers.authorization, accept: req.headers.accept })
    const send = (status: number, body: unknown, type = 'application/json') => {
      res.writeHead(status, { 'content-type': type })
      res.end(type === 'application/json' ? JSON.stringify(body) : (body as Buffer))
    }
    const url = new URL(req.url ?? '/', 'http://x')
    const hbAuth = req.headers.authorization === 'Bearer hb_good'
    const plAuth = req.headers.authorization === 'Token pl_good'
    if (url.pathname.startsWith('/hb/api/v1')) {
      if (!hbAuth) return send(401, { error: 'unauthorized' })
      const p = url.pathname.slice('/hb/api/v1'.length)
      if (p === '/status') return send(200, { build: { version: 'v0.26.2' } })
      if (p === '/entities') {
        const q = url.searchParams.get('q') ?? ''
        const items = q.includes('heater') || !q ? [{ id: ITEM, name: 'Water heater', parent: { name: 'Basement' }, thumbnailId: THUMB }] : []
        return send(200, { items, page: 1, pageSize: 20, total: items.length })
      }
      if (p === `/entities/${ITEM}`) return deleted ? send(404, {}) : send(200, { id: ITEM, name: 'Water heater', parent: { name: 'Basement' }, thumbnailId: THUMB })
      if (p === `/entities/${ITEM}/attachments/${THUMB}`) return send(200, png, 'image/png')
      return send(404, {})
    }
    if (url.pathname.startsWith('/pl/api')) {
      if (!plAuth) return send(401, { detail: 'Invalid token.' })
      const p = url.pathname.slice('/pl/api'.length)
      if (p === '/documents/') {
        if (url.searchParams.get('page_size') === '1' && !url.searchParams.get('query')) return send(200, { count: 1234, results: [] })
        return send(200, { count: 1, results: [{ id: 42, title: 'Water heater manual', created_date: '2024-05-01' }] })
      }
      if (p === '/documents/42/') return send(200, { id: 42, title: 'Water heater manual', created_date: '2024-05-01' })
      if (p === '/documents/42/thumb/') return send(200, png, 'image/png')
      return send(404, {})
    }
    send(404, {})
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => new Promise<void>((r) => server.close(() => r())))

describe('connecting', () => {
  it('refuses a bad token without saving, and saves a good one sealed', async () => {
    const { scope, admin } = await household()
    await expect(saveIntegration(db, scope, admin, 'homebox', { baseUrl: `${base}/hb`, token: 'hb_bad' })).rejects.toThrow(/refused/)
    expect(await listIntegrations(db, scope)).toEqual([])

    const ok = await saveIntegration(db, scope, admin, 'homebox', { baseUrl: `${base}/hb`, token: 'hb_good' })
    expect(ok.summary).toBe('Homebox v0.26.2')
    const [row] = [...(await db.execute(sql`select sealed_token from integrations`))] as { sealed_token: string }[]
    expect(row!.sealed_token).not.toContain('hb_good')
    // The token is never in the audit log.
    expect(JSON.stringify([...(await db.execute(sql`select * from audit_log`))])).not.toContain('hb_good')
  })

  it('warns when the paperless token can see a lot', async () => {
    const { scope, admin } = await household()
    const r = await saveIntegration(db, scope, admin, 'paperless', { baseUrl: `${base}/pl`, token: 'pl_good' })
    expect(r.summary).toMatch(/1234 documents/)
    expect(r.warning).toMatch(/only sees home documents/)
    // API version pinned.
    expect(seen.filter((s) => s.url.startsWith('/pl/')).every((s) => s.accept?.includes('version=10'))).toBe(true)
  })

  it('is admin-only', async () => {
    const { scope, member } = await household()
    await expect(saveIntegration(db, scope, member, 'homebox', { baseUrl: `${base}/hb`, token: 'hb_good' })).rejects.toThrow(/Only an admin/)
  })
})

describe('linking and thumbnails', () => {
  it('searches, links a picked item, and proxies only linked thumbnails', async () => {
    const { scope, admin, member } = await household()
    await saveIntegration(db, scope, admin, 'homebox', { baseUrl: `${base}/hb`, token: 'hb_good' })
    await saveIntegration(db, scope, admin, 'paperless', { baseUrl: `${base}/pl`, token: 'pl_good' })
    const heater = await createThing(db, scope, member, { name: 'Water heater' })

    const hits = await searchSystem(db, scope, 'homebox', 'heater')
    expect(hits[0]).toMatchObject({ externalId: ITEM, title: 'Water heater', subtitle: 'Basement' })

    // Not linked yet: the proxy refuses to fetch it.
    expect(await linkedThumb(db, scope, 'paperless', '42')).toBeNull()

    await linkPicked(db, scope, member, { kind: 'fixture', id: heater.id }, 'homebox', ITEM)
    await linkPicked(db, scope, member, { kind: 'fixture', id: heater.id }, 'paperless', '42')
    const thumb = await linkedThumb(db, scope, 'homebox', ITEM)
    expect((await sharp(thumb!).metadata()).format).toBe('jpeg')
    expect(await linkedThumb(db, scope, 'paperless', '42')).not.toBeNull()
    // A path-traversal id is refused before any request.
    expect(await linkedThumb(db, scope, 'paperless', '../../admin')).toBeNull()

    const [doc] = await db.select().from(externalRefs).where(eq(externalRefs.system, 'paperless'))
    expect(doc!.url).toBe(`${base}/pl/documents/42/details`)
  })

  it('marks a deleted item as missing, keeping its title', async () => {
    const { scope, admin, member } = await household()
    await saveIntegration(db, scope, admin, 'homebox', { baseUrl: `${base}/hb`, token: 'hb_good' })
    const heater = await createThing(db, scope, member, { name: 'Water heater' })
    const ref = await linkPicked(db, scope, member, { kind: 'fixture', id: heater.id }, 'homebox', ITEM)
    await db.update(externalRefs).set({ lastCheckedAt: new Date(Date.now() - 2 * 86_400_000) }).where(eq(externalRefs.id, ref.id))
    deleted = true
    try {
      await refreshStale(db, scope, [ref.id], 5000)
    } finally {
      deleted = false
    }
    const [after] = await db.select().from(externalRefs).where(eq(externalRefs.id, ref.id))
    expect(after).toMatchObject({ status: 'missing', title: 'Water heater' })
  })
})

describe('pasted links', () => {
  it('recognises Homebox, paperless and Home Assistant addresses', () => {
    expect(parseExternalUrl(`https://hb.example/item/${ITEM}`)).toMatchObject({ system: 'homebox', externalId: ITEM })
    expect(parseExternalUrl('https://docs.example/documents/42/details')).toMatchObject({ system: 'paperless', externalId: '42' })
    expect(parseExternalUrl('https://ha.example/config/devices/device/abc123')).toMatchObject({ system: 'homeassistant', externalId: 'device:abc123' })
    expect(parseExternalUrl('https://ha.example/history?entity_id=light.living_room')).toMatchObject({ externalId: 'entity:light.living_room' })
    expect(parseExternalUrl('https://example.com/whatever')).toBeNull()
  })
})
