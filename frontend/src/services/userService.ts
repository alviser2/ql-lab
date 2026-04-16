import api from '@/lib/api'
import type { User } from '@/types'

function normalizeUser(u: any): User {
  return {
    id: u.id,
    name: u.full_name ?? u.name ?? '',
    email: u.email ?? (u.username ? `${u.username}@benhvien.vn` : ''),
    role: (u.role_id ?? u.role) as User['role'],
    roleName: u.role_name ?? u.roleName,
    departmentId: u.dept_id ?? u.departmentId ?? null,
    managedDepartmentIds: u.managedDepartmentIds ?? [],
    title: u.role_name ?? u.title,
  }
}

export async function getUsers(): Promise<User[]> {
  const res = await api.get('/users')
  return res.data.map(normalizeUser)
}
