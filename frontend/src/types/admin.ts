import type { Role } from '@/types'

export interface AdminUser {
  id: string
  username: string
  full_name: string
  role_id: Role
  dept_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  role_name?: string
  dept_name?: string | null
  managed_department_ids?: string[]
}

export interface CreateAdminUserInput {
  username: string
  full_name: string
  password: string
  role_id: Role
  dept_id?: string | null
  managed_department_ids?: string[]
  is_active?: boolean
}
