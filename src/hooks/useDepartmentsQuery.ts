import { useQuery } from '@tanstack/react-query'
import { getDepartments } from '@/services/departmentService'

export function useDepartmentsQuery() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}
