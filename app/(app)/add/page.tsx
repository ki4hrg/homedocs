import { List, Row } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'

export const metadata = { title: 'Add' }

export default async function AddPage() {
  await requireRole('member')
  return (
    <>
      <PageHeader title="Add something" subtitle="Tip: open a place first and tap + there — it fills in where." />
      <List>
        <Row href="/notes/new" icon="note" title="Note" detail="Something that happened: mulch put down, filter changed, repair" />
        <Row href="/things/new" icon="thing" title="Thing" detail="Something installed: a light, a shutoff valve, the water heater" />
        <Row href="/parts/new" icon="part" title="Part" detail="What something takes: a bulb, a paint colour, a filter" />
        <Row href="/places/new" icon="place" title="Place" detail="A room, floor, or outdoor area" />
        <Row href="/people/new" icon="person" title="Person" detail="A plumber, electrician, utility, neighbor" />
        <Row href="/projects/new" icon="project" title="Project" detail="A job you want done, with quotes and a to-do list" />
      </List>
    </>
  )
}
