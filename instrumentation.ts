/*
 * Where background work starts. Next calls `register()` once per server
 * process, before any request is served.
 */

export async function register() {
  /* The Edge runtime evaluates this file too and can load none of what follows. */
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  /* Imported inside the function: `next build` evaluates this file, and a
     top-level import would pull the database driver into a build with no
     DATABASE_URL. */

  // Half-set single sign-on stops the container here, with the reason.
  const { checkOidcAtBoot } = await import('./lib/auth/oidc')
  checkOidcAtBoot()

  const { checkEnvAtBoot } = await import('./lib/boot')
  checkEnvAtBoot()

  const { startJobs } = await import('./lib/jobs')
  if (startJobs()) console.log('[jobs] scheduler started')
}
