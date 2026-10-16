/*
 * The MCP server through the real protocol: what each role sees, and the four
 * questions homedocs exists to answer, asked the way a model would.
 */

import { describe, expect, it } from 'vitest'
import { createNote } from '../lib/notes/notes'
import { addUse, createPart } from '../lib/parts/parts'
import { createContact } from '../lib/contacts/contacts'
import { createSpace } from '../lib/places/places'
import { createFixture } from '../lib/fixtures/fixtures'
import { saveSecret } from '../lib/guide/guide'
import { db, resetBetweenTests } from './helpers/db'
import { household } from './helpers/fixtures'
import { connect, dataOf, identityFor, textOf } from './helpers/mcp'
import { sql } from 'drizzle-orm'

resetBetweenTests()

async function seeded() {
  const h = await household()
  const { scope, member } = h
  const living = await createSpace(db, scope, member, { name: 'Living room' })
  const bedroom = await createSpace(db, scope, member, { name: 'Bedroom' })
  const bed = await createSpace(db, scope, member, { name: 'Front flowerbed', kind: 'outdoor' })
  const light = await createFixture(db, scope, member, { name: 'Overhead light', spaceId: living.id })
  const bulb = await createPart(db, scope, member, { category: 'bulb', name: '', fields: { base: 'E26', shape: 'A19', color_temp: '2700K' } })
  await addUse(db, scope, member, { supplyId: bulb.id, fixtureId: light.id, quantity: '3' })
  const paint = await createPart(db, scope, member, { category: 'paint', name: '', fields: { brand: 'Sherwin-Williams', color_code: 'SW 7015', color_name: 'Repose Gray' } })
  await addUse(db, scope, member, { supplyId: paint.id, spaceId: bedroom.id, surface: 'walls', finish: 'Eggshell' })
  const mulch = await createPart(db, scope, member, { category: 'landscaping', name: 'Hardwood mulch' })
  await addUse(db, scope, member, { supplyId: mulch.id, spaceId: bed.id, quantity: '12', quantityNeeded: '15' })
  await createNote(db, scope, member, { title: 'Spring mulch', spaceId: bed.id, supplyId: mulch.id, quantity: '12', nextTime: 'Needed 3 more bags' })
  await createContact(db, scope, member, { name: 'Ace Plumbing', phones: [{ label: '', value: '555-0100' }], trades: ['plumber'], preferred: ['plumber'] })
  await saveSecret(db, scope, h.admin, null, { kind: 'alarm', label: 'Alarm', value: '4815' })
  return h
}

describe('mcp', () => {
  it('lists tools by role: a viewer gets read tools only, and a write is refused at the call', async () => {
    const { users } = await household()
    const viewer = await connect(identityFor(users.viewer.id, 'viewer', ['homedocs:read']))
    const names = (await viewer.client.listTools()).tools.map((t) => t.name)
    expect(names).toContain('find_part_for')
    expect(names).not.toContain('add_note')
    const refused = await viewer.call('add_note', { title: 'x' })
    expect(refused.isError).toBe(true)
    expect(textOf(refused)).toMatch(/viewer account/)
    await viewer.close()

    // Even a token that somehow carries write is refused for a viewer (scope ∩ role).
    const stale = await connect(identityFor(users.viewer.id, 'viewer', ['homedocs:read', 'homedocs:write']))
    const r = await stale.call('add_note', { title: 'x' })
    expect(r.isError).toBe(true)
    await stale.close()
  })

  it('answers the four questions', async () => {
    const { users } = await seeded()
    const m = await connect(identityFor(users.member.id, 'member'))

    const bulb = dataOf<{ parts: { name: string; details: Record<string, string>; quantity: number }[] }>(
      await m.call('find_part_for', { fixture: 'overhead light' }),
    )
    expect(bulb.parts[0]).toMatchObject({ details: { Base: 'E26', Shape: 'A19' }, quantity: 3 })

    const mulch = dataOf<{ used_here: { really_needs: number; quantity: number }[]; next_time: string[] }>(
      await m.call('find_part_for', { place: 'front flowerbed' }),
    )
    expect(mulch.used_here[0]).toMatchObject({ quantity: 12, really_needs: 15 })
    expect(mulch.next_time).toEqual(['Needed 3 more bags'])

    const paint = dataOf<{ used_here: { details: Record<string, string>; finish: string; surface: string }[] }>(
      await m.call('find_part_for', { place: 'Bedroom' }),
    )
    expect(paint.used_here[0]).toMatchObject({ details: { 'Colour code': 'SW 7015' }, finish: 'Eggshell', surface: 'walls' })

    const plumber = dataOf<{ contacts: { name: string; preferred: boolean; phones: { value: string }[] }[] }>(
      await m.call('who_to_call', { trade: 'plumber' }),
    )
    expect(plumber.contacts[0]).toMatchObject({ name: 'Ace Plumbing', preferred: true })
    await m.close()
  })

  it('never exposes codes', async () => {
    const { users } = await seeded()
    const admin = await connect(identityFor(users.admin.id, 'admin'))
    for (const tool of (await admin.client.listTools()).tools) {
      expect(JSON.stringify(tool)).not.toMatch(/secret|alarm code|password/i)
    }
    const hits = await admin.call('search', { query: 'alarm' })
    expect(textOf(hits)).not.toContain('4815')
    await admin.close()
  })

  it('writes through the domain layer, audited as mcp', async () => {
    const { users } = await seeded()
    const m = await connect(identityFor(users.member.id, 'member'))
    const r = await m.call('add_note', { title: 'Replaced bulb', fixture: 'Overhead light', quantity: 1, unit: 'bulb' })
    expect(r.isError).toBeFalsy()
    const [row] = [...(await db.execute(sql`select source from audit_log where entity_type = 'log' order by id desc limit 1`))]
    expect(row).toMatchObject({ source: 'mcp' })

    const ambiguous = await m.call('find_part_for', { fixture: 'light' })
    // One fixture matches "light", so it resolves; a made-up one is refused with a hint.
    expect(ambiguous.isError).toBeFalsy()
    const missing = await m.call('get_fixture', { fixture: 'garage door opener' })
    expect(missing.isError).toBe(true)
    expect(textOf(missing)).toMatch(/No fixture is called/)
    await m.close()
  })
})
