/*
 * The external origin, in one place.
 *
 * PUBLIC_BASE_URL is what share links, OAuth discovery and the sign-on callback
 * are built from, so it has to be the HTTPS origin people actually type — not the
 * container's own address. Missing in production is fatal rather than guessed.
 */

export function baseUrl(): string {
  const raw = process.env.PUBLIC_BASE_URL
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PUBLIC_BASE_URL must be set — share links and OAuth are built from it')
    }
    return 'http://localhost:3000'
  }
  return raw.replace(/\/+$/, '')
}

export function absoluteUrl(path: string): string {
  return `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
