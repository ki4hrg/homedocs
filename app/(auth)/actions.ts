'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ValidationError } from '@/lib/core/types'
import { redeemInvite } from '@/lib/auth/invites'
import { signInOptions } from '@/lib/auth/oidc'
import { verifyPassword } from '@/lib/auth/password'
import { safeNext } from '@/lib/auth/redirects'
import { SESSION_COOKIE, cookieOptions, createSession, revokeSession } from '@/lib/auth/sessions'
import { createFirstAdmin, findUserByEmail, needsSetup } from '@/lib/auth/users'
import { loginLimiter } from '@/lib/web/limits'
import { clientIp } from '@/lib/web/client-ip'

export type FormState = { error?: string }

async function requestMeta() {
  const h = await headers()
  return { userAgent: h.get('user-agent'), ip: clientIp(h) }
}

async function startSession(userId: string) {
  const session = await createSession(userId, await requestMeta())
  const jar = await cookies()
  jar.set(SESSION_COOKIE, session.token, cookieOptions)
}

export async function setupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await createFirstAdmin({
      email: String(formData.get('email') ?? ''),
      displayName: String(formData.get('displayName') ?? ''),
      password: String(formData.get('password') ?? ''),
      homeName: String(formData.get('homeName') ?? ''),
    })
    await startSession(user.id)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    throw err
  }
  // Outside the try: redirect() signals by throwing.
  redirect('/')
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next')?.toString())

  if (await needsSetup()) redirect('/setup')

  // The app is on the internet; a password form without a limit is a target.
  const { ip } = await requestMeta()
  if (!loginLimiter.take(`ip:${ip ?? 'unknown'}`) || !loginLimiter.take(`email:${email.trim().toLowerCase()}`)) {
    return { error: 'Too many attempts. Wait a few minutes and try again.' }
  }

  /* OIDC_ONLY is enforced here, not by hiding the form: a post does not need the form. */
  const options = await signInOptions()
  if (!options.password) return { error: `Sign in with ${options.sso?.name ?? 'single sign-on'}.` }

  const user = await findUserByEmail(email)
  /* Verify even when the address is unknown, against a hash that cannot match,
     so "no such user" is not measurably faster than "wrong password". */
  const storedHash =
    user?.passwordHash ??
    '$argon2id$v=19$m=19456,t=2,p=1$aG9tZWRvY3MtZHVtbXktc2FsdA$0000000000000000000000000000000000000000000'
  const ok = await verifyPassword(storedHash, password)
  if (!user || !ok) return { error: 'That email and password do not match.' }

  await startSession(user.id)
  redirect(next)
}

export async function joinAction(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await redeemInvite(token, {
      email: formData.get('email')?.toString(),
      displayName: formData.get('displayName')?.toString(),
      password: String(formData.get('password') ?? ''),
    })
    await startSession(user.id)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    throw err
  }
  redirect('/')
}

export async function logoutAction() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) await revokeSession(token)
  jar.delete(SESSION_COOKIE)
  redirect('/login')
}
