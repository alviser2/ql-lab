import api from '@/lib/api'
import type { Department } from '@/types'

export interface CreateDepartmentInput {
  name: string
  code: string
  type?: 'LAM_SANG' | 'CAN_LAM_SANG' | 'HANH_CHINH'
}

function normalizeDepartment(d: any): Department {
  return {
    id: d.id,
    name: d.name,
    code: d.code,
    type: d.type,
  }
}

export async function getDepartments(): Promise<Department[]> {
  const res = await api.get('/departments')
  return res.data.map(normalizeDepartment)
}

export async function createDepartment(input: CreateDepartmentInput): Promise<Department> {
  const res = await api.post('/departments', input)
  return normalizeDepartment(res.data)
}

export async function deleteDepartment(departmentId: string) {
  const res = await api.delete(`/departments/${departmentId}`)
  return res.data as {
    deleted: boolean
    department?: Department
  }
}
