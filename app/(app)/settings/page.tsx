import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { Card, Section } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { clientIp } from '@/lib/web/client-ip'
import { viewer } from '@/lib/web/context'
import { homeAction, nameAction, passwordAction, rebuildSearchAction, removeIntegrationAction, revokeConnectorAction, saveIntegrationAction } from './actions'
import { listIntegrations } from '@/lib/integrations/integrations'
import { DeleteButton } from '@/components/DeleteButton'
import { List } from '@/components/ui/Card'
import { listGrants } from '@/lib/oauth/grants'
import { absoluteUrl } from '@/lib/web/urls'
import { timeAgo } from '@/lib/web/format'
import { CopyButton } from '@/components/CopyButton'
import { HomeForm, IntegrationForm, NameForm, PasswordForm, RebuildSearch } from './forms'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const { user, property, scope } = await viewer()
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id))
  const seenAs = clientIp(await headers())
  const grants = await listGrants(db, user.id)
  const mcpUrl = absoluteUrl('/mcp')
  const connected = user.role === 'admin' ? await listIntegrations(db, scope) : []
  return (
    <>
      <PageHeader title="Settings" back={{ href: '/more', label: 'More' }} />
      <Section title="You">
        <Card className="flex flex-col gap-6 p-4">
          <NameForm action={nameAction} name={user.displayName} />
          <PasswordForm action={passwordAction} hasPassword={Boolean(row?.hash)} />
        </Card>
      </Section>
      <Section title="Connected apps">
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm text-ink-3">
            Add this as a custom connector in Claude:
          </p>
          <code className="break-all rounded bg-sunk px-2 py-1.5 text-xs text-ink">{mcpUrl}</code>
          <CopyButton text={mcpUrl} label="Copy address" />
        </Card>
        {grants.length ? (
          <div className="mt-3">
            <List>
              {grants.map((g) => (
                <li key={g.clientId} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{g.clientName}</span>
                    <span className="block text-sm text-ink-3">
                      {g.scopes.includes('homedocs:write') ? 'Can look up and change' : 'Can look up'}
                      {g.lastUsedAt ? ` · used ${timeAgo(g.lastUsedAt)}` : ''}
                    </span>
                  </span>
                  <DeleteButton compact what={g.clientName} recoverable={false} label="Disconnect" action={revokeConnectorAction.bind(null, g.clientId)} />
                </li>
              ))}
            </List>
          </div>
        ) : null}
      </Section>
      {user.role === 'admin' ? (
        <Section title="The home">
          <Card className="p-4">
            <HomeForm action={homeAction} initial={property} seenAs={seenAs} />
          </Card>
        </Section>
      ) : null}
      {user.role === 'admin' ? (
        <Section title="Homebox and paperless">
          <p className="mb-2 px-1 text-sm text-ink-3">
            For searching and linking their items and documents.
          </p>
          <div className="flex flex-col gap-3">
            {(['homebox', 'paperless'] as const).map((system) => {
              const row = connected.find((c) => c.system === system)
              return (
                <Card key={system} className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-ink">{system === 'homebox' ? 'Homebox' : 'paperless-ngx'}</p>
                    {row ? (
                      <DeleteButton compact recoverable={false} what={`the ${system} connection`} label="Disconnect" action={removeIntegrationAction.bind(null, system)} />
                    ) : null}
                  </div>
                  <IntegrationForm action={saveIntegrationAction.bind(null, system)} system={system} initial={row ? { baseUrl: row.baseUrl, lastStatus: row.lastStatus } : undefined} />
                </Card>
              )
            })}
          </div>
        </Section>
      ) : null}
      {user.role === 'admin' ? (
        <Section title="Maintenance">
          <Card className="p-4">
            <RebuildSearch action={rebuildSearchAction} />
          </Card>
        </Section>
      ) : null}
    </>
  )
}
