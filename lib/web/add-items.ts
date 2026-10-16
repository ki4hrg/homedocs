/*
 * What "+" can add, shared by the header menu and the /add page (the app
 * shortcut). Opened on a place, fixture or system, the choices fill in where.
 */

import type { IconName } from '@/components/ui/icons'

export type AddItem = { href: string; icon: IconName; title: string; detail: string }

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export function addItems(pathname = '/'): AddItem[] {
  const at = (kind: string) => new RegExp(`^/${kind}/(${UUID})(?:/|$)`, 'i').exec(pathname)?.[1]
  const space = at('places')
  const fixture = at('fixtures')
  const project = at('projects')
  const contact = at('contacts')
  const system = at('systems')
  const noteFor = space ? `?space=${space}` : fixture ? `?fixture=${fixture}` : project ? `?project=${project}` : contact ? `?contact=${contact}` : ''

  return [
    { href: `/notes/new${noteFor}`, icon: 'note', title: 'Note', detail: 'Something that happened: mulch put down, filter changed, repair' },
    { href: `/fixtures/new${space ? `?space=${space}` : system ? `?system=${system}` : ''}`, icon: 'fixture', title: 'Fixture', detail: 'Something installed: a light, a shutoff valve, the water heater' },
    space || fixture
      ? { href: `/use?${space ? `space=${space}` : `fixture=${fixture}`}`, icon: 'part', title: 'Part', detail: 'What it takes or what we used: a bulb, paint, mulch' }
      : { href: '/parts/new', icon: 'part', title: 'Part', detail: 'What something takes: a bulb, a paint colour, a filter' },
    { href: `/places/new${space ? `?parent=${space}` : ''}`, icon: 'place', title: 'Place', detail: space ? 'A room or area inside this place' : 'A room, floor, or outdoor area' },
    { href: '/contacts/new', icon: 'contact', title: 'Contact', detail: 'A plumber, electrician, utility, neighbor' },
    { href: '/projects/new', icon: 'project', title: 'Project', detail: 'A job you want done, with quotes and a to-do list' },
  ]
}
