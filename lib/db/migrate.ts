/*
 * Applied at container boot by docker-entrypoint.sh, before the server listens.
 *
 * Not part of the Next build: `output: 'standalone'` only traces what the
 * application imports, so this is bundled separately with esbuild into
 * dist/migrate.cjs.
 *
 * When there is something to apply and BACKUP_DIR is set, the database is
 * dumped first. A migration is the one moment the app itself rewrites data
 * wholesale, and the nightly dump can be up to a day old.
 *
 * A failed migration (or a failed snapshot) exits non-zero, which `set -e` in
 * the entrypoint turns into a container crash. That is deliberate: a
 * half-migrated database should not serve traffic.
 */

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const MIGRATIONS_FOLDER = process.env.MIGRATIONS_FOLDER ?? 'lib/db/migrations'

async function pendingCount(sql: postgres.Sql): Promise<number> {
  const journal = JSON.parse(readFileSync(join(MIGRATIONS_FOLDER, 'meta/_journal.json'), 'utf8')) as {
    entries: unknown[]
  }
  const [exists] = await sql`select to_regclass('drizzle.__drizzle_migrations') as t`
  if (!exists?.t) return journal.entries.length
  const [row] = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`
  return journal.entries.length - Number(row?.n ?? 0)
}

function snapshot(url: string, dir: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = join(dir, `homedocs-premigrate-${stamp}.dump`)
  const result = spawnSync('pg_dump', ['-Fc', '-f', file, url], { stdio: 'inherit', env: process.env })
  if (result.error || result.status !== 0) {
    throw new Error(`pre-migration snapshot failed: ${result.error?.message ?? `exit ${result.status}`}`)
  }
  console.log(JSON.stringify({ level: 'info', msg: 'pre-migration snapshot written', file }))
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  // max: 1 — migrations are serial, and a pool here would outlive the process.
  const sql = postgres(url, { max: 1 })
  try {
    const pending = await pendingCount(sql)
    // A fresh database has nothing worth snapshotting.
    const fresh = pending > 0 && (await sql`select to_regclass('public.users') as t`)[0]?.t == null
    if (pending > 0 && !fresh && process.env.BACKUP_DIR) snapshot(url, process.env.BACKUP_DIR)
    await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_FOLDER })
    console.log(JSON.stringify({ level: 'info', msg: 'migrations applied', pending }))
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ level: 'error', msg: 'migration failed', err: String(err) }))
  process.exit(1)
})
