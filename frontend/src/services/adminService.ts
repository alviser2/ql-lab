import api from '@/lib/api'
import type { Role } from '@/types'
import type { AdminUser, CreateAdminUserInput } from '@/types/admin'

function normalizeUser(u: any): AdminUser {
  return {
    id: String(u.id),
    username: String(u.username ?? ''),
    full_name: String(u.full_name ?? ''),
    role_id: u.role_id as Role,
    dept_id: (u.dept_id as string | null) ?? null,
    is_active: Boolean(u.is_active),
    created_at: String(u.created_at ?? new Date().toISOString()),
    updated_at: String(u.updated_at ?? new Date().toISOString()),
    role_name: u.role_name,
    dept_name: u.dept_name,
    managed_department_ids: Array.isArray(u.managed_department_ids)
      ? u.managed_department_ids.map(String)
      : [],
  }
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await api.get('/admin/users')
  return res.data.map(normalizeUser)
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const res = await api.post('/admin/users', input)
  return normalizeUser(res.data)
}

export async function changeAdminUserPassword(userId: string, password: string) {
  await api.patch(`/admin/users/${userId}/password`, { password })
}

export async function updateAdminUserRole(
  userId: string,
  payload: {
    role_id: Role
    dept_id?: string | null
    managed_department_ids?: string[]
  },
) {
  await api.patch(`/admin/users/${userId}/role`, payload)
}

export async function updateAdminUserActive(userId: string, isActive: boolean) {
  await api.patch(`/admin/users/${userId}/active`, { is_active: isActive })
}

export async function deleteAdminUser(userId: string) {
  await api.delete(`/admin/users/${userId}`)
}
