import { login as loginAction, logout as logoutAction } from '@/actions/auth'
import { getUserProfile } from '@/actions/user'
import type { User } from '@/types/auth'

export async function login(formData: FormData): Promise<{ error?: string }> {
  return (await loginAction(null, formData)) as { error?: string }
}

export async function logout(): Promise<void> {
  await logoutAction()
}

export async function getCurrentUser(): Promise<User | null> {
  return await getUserProfile()
}
