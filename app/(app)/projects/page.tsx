import { EmptyState, List, Row, Section } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { roleAtLeast } from '@/lib/core/types'
import { db } from '@/lib/db'
import { listProjects, PRIORITY_LABEL, STATUS_LABEL, STATUSES } from '@/lib/projects/projects'
import { formatDay } from '@/lib/web/format'
import { viewer } from '@/lib/web/context'

export const metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const { scope, user } = await viewer()
  const projects = await listProjects(db, scope)
  const canEdit = roleAtLeast(user.role, 'member')
  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Jobs around the house, from idea to done"
        actions={canEdit ? <LinkButton href="/projects/new" variant="primary">Add</LinkButton> : null}
      />
      {projects.length === 0 ? (
        <EmptyState action={canEdit ? <LinkButton href="/projects/new" variant="primary">Add a project</LinkButton> : null}>
          Replace the electrical panel, regrade the yard, paint the hall — anything you’ll want to track to done.
        </EmptyState>
      ) : (
        STATUSES.filter((s) => projects.some((p) => p.status === s)).map((s) => (
          <Section key={s} title={STATUS_LABEL[s]}>
            <List>
              {projects
                .filter((p) => p.status === s)
                .map((p) => (
                  <Row
                    key={p.id}
                    href={`/projects/${p.id}`}
                    icon="project"
                    title={p.title}
                    detail={[
                      p.priority !== 'normal' ? PRIORITY_LABEL[p.priority] : '',
                      p.targetDate ? `by ${formatDay(p.targetDate)}` : '',
                      p.openItems ? `${p.openItems} to do` : '',
                      p.quoteCount ? `${p.quoteCount} quote${p.quoteCount === 1 ? '' : 's'}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                ))}
            </List>
          </Section>
        ))
      )}
    </>
  )
}
