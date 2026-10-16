import { PageHeader } from '@/components/ui/PageHeader'
import { requireRole } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { buildTree, flattenTree, listSpaces } from '@/lib/places/places'
import { viewer } from '@/lib/web/context'
import { createProjectAction } from '../actions'
import { ProjectForm } from '../project-form'

export const metadata = { title: 'New project' }

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ space?: string }> }) {
  await requireRole('member')
  const { scope } = await viewer()
  const { space } = await searchParams
  const places = flattenTree(buildTree(await listSpaces(db, scope)))
  return (
    <>
      <PageHeader title="New project" back={{ href: '/projects', label: 'Projects' }} />
      <ProjectForm action={createProjectAction} places={places} initial={{ spaceIds: space ? [space] : [] }} submit="Add project" />
    </>
  )
}
