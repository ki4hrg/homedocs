import { DeleteButton } from '@/components/DeleteButton'
import { Card, List, Pill, Section } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { listOpenInvites } from '@/lib/auth/invites'
import { requireRole } from '@/lib/auth/guards'
import { listUsers } from '@/lib/auth/users'
import { formatDay, localDay } from '@/lib/web/format'
import { inviteAction, removeUserAction, resetAction, revokeInviteAction, setRoleAction } from './actions'
import { InviteForm, ResetLink, RevokeButton, RoleSelect, ROLE_HELP } from './parts'

export const metadata = { title: 'Family' }

export default async function FamilyPage() {
  const me = await requireRole('admin')
  const [people, invites] = await Promise.all([listUsers(), listOpenInvites()])
  return (
    <>
      <PageHeader title="Family" subtitle="Who can sign in, and what they can do" back={{ href: '/more', label: 'More' }} />
      <List>
        {people.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">
                  {p.displayName} {p.id === me.id ? <Pill>You</Pill> : null}
                </span>
                <span className="block truncate text-sm text-ink-3">
                  {p.email}
                  {p.sso ? ' · single sign-on' : ''}
                </span>
              </span>
              <RoleSelect role={p.role} setRole={setRoleAction.bind(null, p.id)} disabled={p.id === me.id} />
            </div>
            {p.id !== me.id ? (
              <div className="flex items-center justify-between gap-2">
                {p.hasPassword ? <ResetLink action={resetAction.bind(null, p.id)} /> : <span />}
                <DeleteButton compact what={p.displayName} recoverable={false} label="Remove" action={removeUserAction.bind(null, p.id)} />
              </div>
            ) : null}
          </li>
        ))}
      </List>

      <Section title="Invite someone">
        <Card className="p-4">
          <InviteForm action={inviteAction} />
        </Card>
      </Section>

      {invites.length ? (
        <Section title="Open invite links">
          <List>
            {invites.map((i) => (
              <li key={i.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-ink">
                    {i.kind === 'reset' ? `Password reset for ${i.label}` : i.label || 'Invite'}
                  </span>
                  <span className="block text-sm text-ink-3">
                    {i.kind === 'invite' ? `${ROLE_HELP[i.role].split(' —')[0]} · ` : ''}expires {formatDay(localDay(i.expiresAt))}
                  </span>
                </span>
                <RevokeButton action={revokeInviteAction.bind(null, i.id)} />
              </li>
            ))}
          </List>
        </Section>
      ) : null}
    </>
  )
}
