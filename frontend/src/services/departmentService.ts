import api from '@/lib/api'
import type { Department } from '@/types'

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
