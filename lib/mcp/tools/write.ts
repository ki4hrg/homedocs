/*
 * Write tools (homedocs:write). Each calls the same domain function the web app
 * does, so the same validation, audit row (source: mcp) and search rebuild
 * happen. Nothing here deletes: removing things is done in the app, where
 * "Recently deleted" is one tap away.
 */

import { z } from 'zod'
import { createNote } from '../../notes/notes'
import { addUse, createPart } from '../../parts/parts'
import { CATEGORIES } from '../../parts/templates'
import { createPerson } from '../../people/people'
import { createSpace } from '../../places/places'
import { addItem, createProject, setProjectStatus, STATUSES } from '../../projects/projects'
import { createThing } from '../../things/things'
import { scopeOf } from './read'
import { optionalRef, resolveRef } from './resolve'
import { defineTool, ToolRefusal } from './types'

const ref = (what: string) => z.string().min(1).describe(`The ${what}'s id, or its name`)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')

export const writeTools = [
  defineTool({
    name: 'add_note',
    title: 'Add a note',
    description:
      'Record something that happened — mulch put down, a filter changed, a repair — optionally about a place, ' +
      'thing, part, person or project, with a quantity, cost, and a "next time" lesson and reminder date.',
    scope: 'homedocs:write',
    input: z.object({
      title: z.string().min(1).max(200),
      happened_on: day.optional().describe('Defaults to today'),
      place: ref('place').optional(),
      thing: ref('thing').optional(),
      part: ref('part').optional(),
      person: ref('person').optional(),
      project: ref('project').optional(),
      quantity: z.number().nonnegative().optional(),
      unit: z.string().max(30).optional(),
      cost: z.number().nonnegative().optional(),
      next_time: z.string().max(2000).optional().describe('The lesson for next time, e.g. "needed 3 more bags"'),
      remind_after: day.optional().describe('When to bring the lesson back up'),
      details: z.string().max(20_000).optional(),
    }),
    handler: async (input, ctx) => {
      const scope = await scopeOf(ctx)
      const note = await createNote(ctx.exec, scope, ctx.actor, {
        title: input.title,
        happenedOn: input.happened_on,
        spaceId: await optionalRef(ctx.exec, scope, 'place', input.place),
        fixtureId: await optionalRef(ctx.exec, scope, 'thing', input.thing),
        supplyId: await optionalRef(ctx.exec, scope, 'part', input.part),
        contactId: await optionalRef(ctx.exec, scope, 'person', input.person),
        projectId: await optionalRef(ctx.exec, scope, 'project', input.project),
        quantity: input.quantity?.toString(),
        unit: input.unit,
        cost: input.cost?.toString(),
        nextTime: input.next_time,
        remindAfter: input.remind_after,
        body: input.details,
      })
      return { id: note.id, title: note.title, date: note.happenedOn }
    },
  }),

  defineTool({
    name: 'create_place',
    title: 'Create a place',
    description: 'Add a room, floor or outdoor area, optionally inside another place.',
    scope: 'homedocs:write',
    input: z.object({
      name: z.string().min(1).max(200),
      inside: ref('parent place').optional(),
      kind: z.enum(['room', 'floor', 'outdoor', 'area', 'other']).optional(),
      notes: z.string().max(20_000).optional(),
    }),
    handler: async (input, ctx) => {
      const scope = await scopeOf(ctx)
      const row = await createSpace(ctx.exec, scope, ctx.actor, {
        name: input.name,
        parentId: await optionalRef(ctx.exec, scope, 'place', input.inside),
        kind: input.kind,
        notes: input.notes,
      })
      return { id: row.id, name: row.name }
    },
  }),

  defineTool({
    name: 'create_thing',
    title: 'Create a thing',
    description: 'Add an installed thing (light, fan, shutoff valve, appliance) in a place. Serial numbers and warranties belong in Homebox.',
    scope: 'homedocs:write',
    input: z.object({
      name: z.string().min(1).max(200),
      place: ref('place').optional().describe('Leave out for whole-house things like the main shutoff'),
      category: z.string().max(100).optional(),
      notes: z.string().max(20_000).optional(),
    }),
    handler: async (input, ctx) => {
      const scope = await scopeOf(ctx)
      const row = await createThing(ctx.exec, scope, ctx.actor, {
        name: input.name,
        spaceId: await optionalRef(ctx.exec, scope, 'place', input.place),
        category: input.category,
        notes: input.notes,
      })
      return { id: row.id, name: row.name }
    },
  }),

  defineTool({
    name: 'create_part',
    title: 'Create a part',
    description:
      `Define a reusable part once (then link it with link_part). Categories: ${CATEGORIES.join(', ')}. ` +
      'Fields by category — bulb: base, shape, color_temp, brightness, dimmable, smart, brand; paint: brand, ' +
      'color_name, color_code, product_line, base, formula, store; filter: size, rating, brand, interval; ' +
      'battery: size, count, chemistry; landscaping: product, bag_size, brand; other: brand, model, size. ' +
      'Paint sheen is not a part field — give it as `finish` on link_part.',
    scope: 'homedocs:write',
    input: z.object({
      category: z.enum(CATEGORIES as [string, ...string[]]),
      name: z.string().max(200).optional().describe('Made from the fields when left out'),
      fields: z.record(z.string(), z.string()).optional(),
      buy_url: z.string().max(2000).optional(),
      notes: z.string().max(20_000).optional(),
    }),
    handler: async (input, ctx) => {
      const scope = await scopeOf(ctx)
      const row = await createPart(ctx.exec, scope, ctx.actor, {
        category: input.category,
        name: input.name ?? '',
        fields: input.fields,
        buyUrl: input.buy_url,
        notes: input.notes,
      })
      return { id: row.id, name: row.name, fields: row.fields }
    },
  }),

  defineTool({
    name: 'link_part',
    title: 'Link a part',
    description:
      'Say that a thing or place uses a part: the overhead light takes 3 of this bulb; the bedroom walls are this ' +
      'paint in eggshell; the front bed took 12 bags (really needs 15).',
    scope: 'homedocs:write',
    input: z.object({
      part: ref('part'),
      thing: ref('thing').optional(),
      place: ref('place').optional(),
      quantity: z.number().nonnegative().optional(),
      unit: z.string().max(30).optional(),
      really_needs: z.number().nonnegative().optional(),
      surface: z.string().max(100).optional().describe('walls, trim, ceiling…'),
      finish: z.string().max(60).optional().describe('Paint sheen: eggshell, semi-gloss…'),
      notes: z.string().max(2000).optional(),
    }),
    handler: async (input, ctx) => {
      const scope = await scopeOf(ctx)
      if (Boolean(input.thing) === Boolean(input.place)) throw new ToolRefusal('Give exactly one of thing or place.')
      const use = await addUse(ctx.exec, scope, ctx.actor, {
        supplyId: await resolveRef(ctx.exec, scope, 'part', input.part),
        fixtureId: await optionalRef(ctx.exec, scope, 'thing', input.thing),
        spaceId: await optionalRef(ctx.exec, scope, 'place', input.place),
        quantity: input.quantity?.toString(),
        unit: input.unit,
        quantityNeeded: input.really_needs?.toString(),
        surface: input.surface,
        finish: input.finish,
        notes: input.notes,
      })
      return { id: use.id }
    },
  }),

  defineTool({
    name: 'create_person',
    title: 'Create a person',
    description: 'Add a contractor, service or contact, with trades and which trades they are our go-to for.',
    scope: 'homedocs:write',
    input: z.object({
      name: z.string().min(1).max(200),
      company: z.string().max(200).optional(),
      phone: z.string().max(60).optional(),
      email: z.string().max(200).optional(),
      website: z.string().max(2000).optional(),
      trades: z.array(z.string().max(60)).max(12).optional(),
      preferred_for: z.array(z.string().max(60)).max(12).optional().describe('Trades they are our go-to for'),
      notes: z.string().max(20_000).optional(),
    }),
    handler: async (input, ctx) => {
      const scope = await scopeOf(ctx)
      const row = await createPerson(ctx.exec, scope, ctx.actor, {
        name: input.name,
        company: input.company,
        phones: input.phone ? [{ label: '', value: input.phone }] : [],
        emails: input.email ? [{ label: '', value: input.email }] : [],
        website: input.website,
        trades: [...(input.trades ?? []), ...(input.preferred_for ?? [])],
        preferred: input.preferred_for,
        notes: input.notes,
      })
      return { id: row.id, name: row.name }
    },
  }),

  defineTool({
    name: 'create_project',
    title: 'Create a project',
    description: 'Start tracking a job around the house.',
    scope: 'homedocs:write',
    input: z.object({
      title: z.string().min(1).max(200),
      summary: z.string().max(20_000).optional(),
      status: z.enum(STATUSES as [string, ...string[]]).optional(),
      priority: z.enum(['low', 'normal', 'high']).optional(),
      places: z.array(ref('place')).max(20).optional(),
    }),
    handler: async (input, ctx) => {
      const scope = await scopeOf(ctx)
      const spaceIds = []
      for (const p of input.places ?? []) spaceIds.push(await resolveRef(ctx.exec, scope, 'place', p))
      const row = await createProject(ctx.exec, scope, ctx.actor, {
        title: input.title,
        summary: input.summary,
        status: input.status,
        priority: input.priority,
        spaceIds,
      })
      return { id: row.id, title: row.title, status: row.status }
    },
  }),

  defineTool({
    name: 'add_project_item',
    title: 'Add to a project checklist',
    description: 'Add a to-do to a project — e.g. "2 outlets in the garage while the electrician is here".',
    scope: 'homedocs:write',
    input: z.object({ project: ref('project'), text: z.string().min(1).max(500), place: ref('place').optional() }),
    handler: async (input, ctx) => {
      const scope = await scopeOf(ctx)
      const item = await addItem(ctx.exec, scope, ctx.actor, await resolveRef(ctx.exec, scope, 'project', input.project), {
        text: input.text,
        spaceId: await optionalRef(ctx.exec, scope, 'place', input.place),
      })
      return { id: item.id, text: item.text }
    },
  }),

  defineTool({
    name: 'set_project_status',
    title: 'Set project status',
    description: `Move a project along: ${STATUSES.join(' → ')}.`,
    scope: 'homedocs:write',
    input: z.object({ project: ref('project'), status: z.enum(STATUSES as [string, ...string[]]) }),
    handler: async (input, ctx) => {
      const scope = await scopeOf(ctx)
      const row = await setProjectStatus(ctx.exec, scope, ctx.actor, await resolveRef(ctx.exec, scope, 'project', input.project), input.status)
      return { id: row.id, title: row.title, status: row.status }
    },
  }),
]
