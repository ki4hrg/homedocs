'use server'

import { createInvite, createReset, revokeInvite } from '@/lib/auth/invites'
import { addFamilyMember, removeUser, setUserRole } from '@/lib/auth/users'
import { ValidationError, type Role } from '@/lib/core/types'
import { act, field, type ActionResult } from '@/lib/web/action'

function role(raw: string): Role {
  if (raw === 'admin' || raw === 'member' || raw === 'viewer') return raw
  throw new ValidationError('Pick what they can do.')
}

export async function inviteAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ actor }) => {
    const { url } = await createInvite({ role: role(field(fd, 'role')), label: field(fd, 'label') }, actor)
    return { message: url }
  })
}

export async function addMemberAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return act(async ({ actor }) => {
    const user = await addFamilyMember(
      { displayName: field(fd, 'displayName'), email: field(fd, 'email'), role: role(field(fd, 'role')), password: String(fd.get('password') ?? '') },
      actor,
    )
    return { message: `${user.displayName} can sign in now.` }
  })
}

export async function resetAction(userId: string): Promise<ActionResult> {
  return act(async ({ actor }) => {
    const { url } = await createReset(userId, actor)
    return { message: url }
  })
}

export async function setRoleAction(userId: string, next: string): Promise<ActionResult> {
  return act(async ({ actor }) => {
    await setUserRole(userId, role(next), actor)
  })
}

export async function removeUserAction(userId: string): Promise<ActionResult> {
  return act(async ({ actor }) => {
    await removeUser(userId, actor)
  })
}

export async function revokeInviteAction(id: string): Promise<ActionResult> {
  return act(async ({ actor }) => {
    await revokeInvite(id, actor)
  })
}
