/* Startup checks, Node runtime only (imported from instrumentation.ts). */

export function checkEnvAtBoot(): void {
  if (process.env.NODE_ENV !== 'production') return
  const key = process.env.INTEGRATIONS_KEY ?? ''
  if (key.length < 32) {
    console.error('[boot] INTEGRATIONS_KEY must be set (32+ characters). It encrypts stored codes and tokens.')
    process.exit(1)
  }
  if (key === process.env.SESSION_SECRET) {
    console.error('[boot] INTEGRATIONS_KEY must differ from SESSION_SECRET, so signing everyone out does not destroy stored codes.')
    process.exit(1)
  }
}
