import { redirect } from 'next/navigation'
import { signInOptions } from '@/lib/auth/oidc'
import { needsSetup } from '@/lib/auth/users'
import { SsoButton } from '../login/sso-button'
import { SetupForm } from './setup-form'

export const metadata = { title: 'Set Up' }

/*
 * Disables itself once a user exists — checked here so the form never renders,
 * and again inside createFirstAdmin under an advisory lock so a direct POST
 * cannot race past it.
 */
export default async function SetupPage() {
  if (!(await needsSetup())) redirect('/login')
  const { sso } = await signInOptions()
  return (
    <>
      <h2 className="mb-2 text-xl font-semibold text-ink">Welcome</h2>
      <p className="mb-6 text-[15px] text-ink-3">
        Create the first account. You’ll be the admin and can invite the family later.
      </p>
      {sso ? (
        <div className="mb-4 flex flex-col gap-4">
          <SsoButton name={sso.name} only={false} />
          <p className="text-center text-sm text-ink-3">or</p>
        </div>
      ) : null}
      <SetupForm />
    </>
  )
}
